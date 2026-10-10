import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense, cache } from "react"
import { prisma } from "@/lib/prisma"
import { AiVerdict } from "@/app/components/AiVerdict"
import { EntryTable } from "@/app/components/EntryTable"
import { PayoutTable } from "@/app/components/PayoutTable"
import { RaceHeader } from "@/app/components/RaceHeader"
import { type AdjacentRace, RaceNavigation } from "@/app/components/RaceNavigation"
import {
  RacePredictionComments,
  RacePredictionCommentsSkeleton,
} from "@/app/components/RacePredictionComments"
import { RaceResultTable } from "@/app/components/RaceResultTable"
import { RecommendedBets, type RecommendedBetSection } from "@/app/components/RecommendedBets"
import { getHorseIndicatorLabelsByRaceId } from "@/app/lib/horseIndicators"
import {
  applyPayoutsToRecommendedBets,
  buildRecommendedBetsFromRanks,
} from "@/app/lib/predictionRecommendations"
import {
  agreedTopPick,
  buildBetSummary,
  buildOpenAiMarks,
  buildOriginalMarks,
  buildVerdictRows,
  groupBetsForDisplay,
  resolveSettlement,
} from "@/app/lib/raceDetail"
import { nowAsStoredClock } from "@/app/lib/raceList"

type PageProps = { params: Promise<{ id: string }> }

// generateMetadata とページで同じ取得を共有する（同一リクエスト内で1回だけ実行される）
const getRaceWithEntries = cache(async (id: number) =>
  prisma.race.findUnique({
    where: { id },
    include: {
      entries: { include: { HorseMaster: true, JockeyMaster: true } },
      predicts: true,
      results: true,
      payouts: true,
      recommended_bets: true,
    },
  }),
)

/** 前後のレース。race_time の前後で探すので競馬場をまたぐ */
async function getNavigation(raceTime: Date | null): Promise<{ prev: AdjacentRace | null; next: AdjacentRace | null }> {
  if (!raceTime) return { prev: null, next: null }
  const select = { id: true, track: true, number: true, name: true } as const
  const [prev, next] = await Promise.all([
    prisma.race.findFirst({ where: { race_time: { lt: raceTime } }, orderBy: { race_time: "desc" }, select }),
    prisma.race.findFirst({ where: { race_time: { gt: raceTime } }, orderBy: { race_time: "asc" }, select }),
  ])
  return { prev, next }
}

const MAX_INT4 = 2147483647

/** 数字だけで Postgres の Int に収まる id だけを通す。それ以外は Prisma に渡さず 404 にする */
function parseRaceId(idParam: string): number | null {
  if (!/^\d+$/.test(idParam)) return null
  const id = Number(idParam)
  return Number.isSafeInteger(id) && id <= MAX_INT4 ? id : null
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id: idParam } = await params
  const id = parseRaceId(idParam)
  const race = id === null ? null : await getRaceWithEntries(id)
  if (!race) return { title: "レースが見つかりません - Horecast" }
  return { title: `${race.track}${race.number}R ${race.name} - Horecast` }
}

export default async function RacePage({ params }: PageProps) {
  const { id: idParam } = await params
  const id = parseRaceId(idParam)
  if (id === null) notFound()

  const race = await getRaceWithEntries(id)
  if (!race) notFound()

  const [navigation, indicatorResult] = await Promise.all([
    getNavigation(race.race_time),
    getHorseIndicatorLabelsByRaceId(id),
  ])
  const { indicators, predictionRanks, expectedPace } = indicatorResult

  const isSettled = race.payouts.length > 0
  const settlement = resolveSettlement(
    { race_time: race.race_time, payoutCount: race.payouts.length },
    nowAsStoredClock(new Date()),
  )

  const originalMarks = buildOriginalMarks(race.predicts)
  const openAiMarks = buildOpenAiMarks(predictionRanks)

  // 払戻は保存値ではなく Payout 行から再計算し、統計・一覧と同じ値にする
  const originalBets = applyPayoutsToRecommendedBets(race.recommended_bets, race.payouts)
  const openAiBets = applyPayoutsToRecommendedBets(buildRecommendedBetsFromRanks(predictionRanks), race.payouts)

  const betSections: RecommendedBetSection[] = [
    {
      key: "original",
      title: "独自予想",
      summary: originalBets.length > 0 ? buildBetSummary(originalBets, isSettled) : null,
      groups: groupBetsForDisplay(originalBets),
      emptyMessage: "独自予想の推奨馬券はまだ登録されていません",
    },
    {
      key: "openai",
      title: "OpenAI",
      summary: openAiBets.length > 0 ? buildBetSummary(openAiBets, isSettled) : null,
      groups: groupBetsForDisplay(openAiBets),
      emptyMessage: "OpenAIの予想データはまだ登録されていません",
    },
  ]

  return (
    <main className="container mx-auto flex min-h-screen flex-col gap-7 bg-background px-4 py-6">
      <RaceHeader
        race={race}
        entryCount={race.entries.length}
        expectedPace={expectedPace}
        settlement={settlement}
        prev={navigation.prev}
        next={navigation.next}
      />

      <AiVerdict
        agreedHorseNumber={agreedTopPick(originalMarks, openAiMarks)}
        cards={[
          { title: "独自予想", engine: "独自予想モデル", rows: buildVerdictRows(originalMarks, race.entries, indicators) },
          { title: "OpenAI", engine: "OpenAI", rows: buildVerdictRows(openAiMarks, race.entries, indicators) },
        ]}
      />

      <EntryTable
        entries={race.entries}
        predicts={race.predicts}
        indicators={indicators}
        openAiPredictionRanks={predictionRanks}
        results={isSettled ? race.results : undefined}
      />

      <Suspense fallback={<RacePredictionCommentsSkeleton />}>
        <RacePredictionComments netkeibaRaceId={race.netkeiba_race_id} />
      </Suspense>

      <RecommendedBets
        isSettled={isSettled}
        sections={betSections}
        brackets={race.entries.map((entry) => ({ horseNumber: entry.horse_number, bracketNumber: entry.bracket_number }))}
      />

      {isSettled ? (
        <section
          aria-label="レース結果と払戻"
          className="grid grid-cols-[repeat(auto-fit,minmax(min(380px,100%),1fr))] gap-4"
        >
          {race.results.length > 0 && (
            <RaceResultTable results={race.results} originalMarks={originalMarks} openAiMarks={openAiMarks} />
          )}
          <PayoutTable payouts={race.payouts} originalBets={originalBets} openAiBets={openAiBets} />
        </section>
      ) : (
        <section className="rounded-xl border border-dashed border-border p-7 text-center text-muted-foreground">
          レース結果と払戻は確定後に表示されます
        </section>
      )}

      <RaceNavigation prev={navigation.prev} next={navigation.next} />
    </main>
  )
}
