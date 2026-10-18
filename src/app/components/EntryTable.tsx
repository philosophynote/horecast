import type { Entry, Predict, Result } from "@prisma/client"
import { formatInTimeZone } from "date-fns-tz"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table"
import { type HorseIndicatorLabels, INSUFFICIENT_LABEL } from "@/app/lib/indicatorLabels"
import type { HorsePredictionRank } from "@/app/lib/horsePredictionRanks"
import { frameColorClass } from "@/app/lib/frameColors"
import {
  FALLBACK_NOTE,
  formatRate,
  INSUFFICIENT_RECORD_LABEL,
  type JockeyRecordLabel,
  type JockeyRecordSummary,
  MIN_RIDES,
  NO_RECORD_LABEL,
} from "@/app/lib/jockeyRecordLabels"
import { buildOpenAiMarks, buildOriginalMarks, sortResults } from "@/app/lib/raceDetail"
import { FrameNumber } from "./FrameNumber"
import { IndicatorMeter } from "./IndicatorMeter"
import { TimeIndexSparkline } from "./TimeIndexSparkline"

type EntryWithMasters = Pick<
  Entry,
  "id" | "horse_number" | "bracket_number" | "sex" | "age" | "jockey_master_id" | "jockey_weight"
> & {
  HorseMaster: { name: string } | null
  JockeyMaster: { name: string } | null
}

type Props = {
  entries: EntryWithMasters[]
  predicts: Pick<Predict, "horse_number" | "score">[]
  indicators?: HorseIndicatorLabels[]
  openAiPredictionRanks?: HorsePredictionRank[]
  /** 確定後の着順。渡したときだけ「着」列に値が入る */
  results?: Pick<Result, "rank" | "horse_number">[]
  /** 騎手成績。障害レースや取得失敗時は null で、成績も脚注も出さない */
  jockeyRecords?: JockeyRecordSummary | null
}

const INDICATOR_COLUMNS = ["地力", "条件適性", "展開適性", "近走状態"] as const

function Mark({ mark }: { mark: string | undefined }) {
  if (!mark) return <span className="text-border">·</span>
  return <span className={mark === "◎" ? "text-primary" : "text-foreground"}>{mark}</span>
}

function finishClass(rank: string): string {
  const value = Number.parseInt(rank, 10)
  return !Number.isNaN(value) && value <= 3 ? "text-primary" : "text-muted-foreground"
}

/**
 * 騎手名の下に、このレースの開催条件での勝率・複勝率と騎乗数を出す。
 * 条件を広げた値は ※ を付け、注記の本文はテーブル下の脚注にまとめる。
 */
function JockeyRecord({ label }: { label: JockeyRecordLabel | undefined }) {
  if (!label || label.status === "none") {
    return <span className="mt-0.5 block text-xs text-muted-foreground">{NO_RECORD_LABEL}</span>
  }
  if (label.status === "insufficient") {
    return <span className="mt-0.5 block text-xs text-muted-foreground">{INSUFFICIENT_RECORD_LABEL}</span>
  }
  return (
    <>
      <span className="mt-0.5 block whitespace-nowrap text-xs leading-snug text-muted-foreground">
        勝率 <span className="numeric font-semibold text-foreground">{formatRate(label.winRate)}</span>
        <span className="mx-1 text-border">|</span>
        複勝率 <span className="numeric font-semibold text-foreground">{formatRate(label.placeRate)}</span>{" "}
        <span className="numeric">{label.rides}騎乗</span>
      </span>
      <span
        className={`block whitespace-nowrap text-[11px] leading-snug ${label.isFallback ? "text-warning" : "text-muted-foreground"}`}
        title={label.isFallback ? FALLBACK_NOTE : undefined}
      >
        {label.isFallback && "※"}
        {label.conditionLabel}
      </span>
    </>
  )
}

function JockeyRecordFootnote({ summary }: { summary: JockeyRecordSummary }) {
  const hasFallback = summary.labels.some((label) => label.status === "ready" && label.isFallback)
  const generatedOn = summary.generatedAt ? formatInTimeZone(summary.generatedAt, "Asia/Tokyo", "yyyy-MM-dd") : null
  return (
    <div className="px-5 pb-4 text-xs leading-relaxed text-muted-foreground">
      <p>
        騎手成績はJRA平地（障害・地方・海外を含まない）の集計で、勝率 = 1着 / 騎乗数、複勝率 = 3着以内 / 騎乗数。
        {generatedOn && (
          <>
            {" "}
            <span className="numeric">{generatedOn}</span> 時点。
          </>
        )}
      </p>
      {hasFallback && (
        <p className="text-warning">
          ※ 開催条件での騎乗数が{MIN_RIDES}未満のため、距離・芝ダ・競馬場の順に条件を広げた値です。{FALLBACK_NOTE}。
        </p>
      )}
    </div>
  )
}

/** 出馬表とAI指標 */
export function EntryTable({
  entries,
  predicts,
  indicators = [],
  openAiPredictionRanks = [],
  results,
  jockeyRecords = null,
}: Props) {
  const rows = [...entries].sort((a, b) => a.horse_number - b.horse_number)
  const indicatorMap = new Map(indicators.map((indicator) => [indicator.horseNumber, indicator]))
  const originalMarks = buildOriginalMarks(predicts)
  const openAiMarks = buildOpenAiMarks(openAiPredictionRanks)
  const finishByHorse = new Map(results ? sortResults(results).map((result) => [result.horse_number, result.rank]) : [])
  const showIndicators = indicators.length > 0
  const showFinish = results !== undefined && results.length > 0
  const jockeyRecordMap = new Map((jockeyRecords?.labels ?? []).map((label) => [label.jockeyMasterId, label]))
  const showJockeyRecords = jockeyRecords !== null
  // 騎手成績の2行が入ると騎手列が広がるので、表の最小幅も合わせる
  const tableMinWidth = showIndicators
    ? showJockeyRecords
      ? "min-w-[1300px]"
      : "min-w-[1100px]"
    : showJockeyRecords
      ? "min-w-[760px]"
      : "min-w-[640px]"

  return (
    <section aria-labelledby="entries-title" className="rounded-xl border border-border bg-card">
      <div className="flex flex-wrap items-baseline justify-between gap-3 px-5 pb-1.5 pt-4">
        <h2 id="entries-title" className="text-xl font-bold">
          出馬表とAI指標
        </h2>
        {showIndicators && (
          <div className="flex flex-wrap items-center gap-3.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="flex gap-[3px]" aria-hidden="true">
                <span className="h-1.5 w-2.5 rounded-[1px] bg-primary" />
                <span className="h-1.5 w-2.5 rounded-[1px] bg-primary" />
                <span className="h-1.5 w-2.5 rounded-[1px] bg-primary" />
                <span className="h-1.5 w-2.5 rounded-[1px] bg-border" />
                <span className="h-1.5 w-2.5 rounded-[1px] bg-border" />
              </span>
              目盛りはレース内の相対評価
            </span>
            <span>指数は100が同条件の標準的な勝ち時計</span>
          </div>
        )}
      </div>
      <div className="overflow-x-auto px-2.5 pb-3">
        <Table className={tableMinWidth}>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10">着</TableHead>
              <TableHead className="w-8">枠</TableHead>
              <TableHead className="w-14">馬番</TableHead>
              <TableHead className="w-14 text-center">独自</TableHead>
              <TableHead className="w-16 text-center">OpenAI</TableHead>
              <TableHead className="min-w-[170px]">馬名</TableHead>
              <TableHead className={showJockeyRecords ? "min-w-[230px]" : "min-w-[120px]"}>騎手 · 斤量</TableHead>
              {showIndicators &&
                INDICATOR_COLUMNS.map((name) => (
                  <TableHead key={name} className="min-w-[120px]">
                    {name}
                  </TableHead>
                ))}
              {showIndicators && <TableHead className="min-w-[170px]">タイム指数（直近5走）</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((entry) => {
              const original = originalMarks.get(entry.horse_number)
              const openAi = openAiMarks.get(entry.horse_number)
              const labels = indicatorMap.get(entry.horse_number)
              const insufficient = !labels || labels.isInsufficient
              const highlighted = original === "◎" || openAi === "◎"
              const finish = finishByHorse.get(entry.horse_number)
              return (
                <TableRow key={entry.id} className={highlighted ? "bg-accent hover:bg-accent" : undefined}>
                  <TableCell className={`numeric text-base font-semibold ${finish ? finishClass(finish) : "text-muted-foreground"}`}>
                    {showFinish ? (finish ?? "—") : ""}
                  </TableCell>
                  <TableCell>
                    <span
                      aria-label={`${entry.bracket_number}枠`}
                      className={`block h-[30px] w-2.5 rounded-sm ${frameColorClass(entry.bracket_number)}`}
                    />
                  </TableCell>
                  <TableCell>
                    <FrameNumber bracketNumber={entry.bracket_number}>{entry.horse_number}</FrameNumber>
                  </TableCell>
                  <TableCell className="text-center text-xl">
                    <Mark mark={original} />
                  </TableCell>
                  <TableCell className="text-center text-xl">
                    <Mark mark={openAi} />
                  </TableCell>
                  <TableCell className="min-w-0">
                    <span className="block truncate text-[15px] font-bold">{entry.HorseMaster?.name ?? "不明"}</span>
                    <span className="block text-xs text-muted-foreground">
                      {entry.sex}
                      {entry.age}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="block whitespace-nowrap">
                      {entry.JockeyMaster?.name ?? "不明"}{" "}
                      <span className="numeric text-xs text-muted-foreground">{entry.jockey_weight}kg</span>
                    </span>
                    {showJockeyRecords && <JockeyRecord label={jockeyRecordMap.get(entry.jockey_master_id)} />}
                  </TableCell>
                  {showIndicators &&
                    (insufficient ? (
                      <TableCell colSpan={INDICATOR_COLUMNS.length}>
                        <span className="inline-block rounded-md border border-dashed border-muted-foreground px-3 py-1 text-xs text-muted-foreground">
                          {INSUFFICIENT_LABEL} · 国内の出走履歴がありません
                        </span>
                      </TableCell>
                    ) : (
                      <>
                        <TableCell>
                          <IndicatorMeter name="地力" indicator={labels.ability} />
                        </TableCell>
                        <TableCell>
                          <IndicatorMeter name="条件適性" indicator={labels.conditionFit} />
                        </TableCell>
                        <TableCell>
                          <IndicatorMeter name="展開適性" indicator={labels.paceFit} />
                        </TableCell>
                        <TableCell>
                          <IndicatorMeter name="近走状態" indicator={labels.freshness} levelCount={4} />
                        </TableCell>
                      </>
                    ))}
                  {showIndicators && (
                    <TableCell>
                      <TimeIndexSparkline recentTimeIndexes={labels?.recentTimeIndexes ?? []} />
                    </TableCell>
                  )}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
      {jockeyRecords && <JockeyRecordFootnote summary={jockeyRecords} />}
    </section>
  )
}
