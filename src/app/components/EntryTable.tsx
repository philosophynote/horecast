import React from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Badge } from "@/app/components/ui/badge"
import { Entry, Predict } from "@prisma/client"
import { groupBy } from "lodash"
import {
  HorseIndicatorLabels,
  IndicatorLabel,
  INSUFFICIENT_LABEL,
  RecentTimeIndex,
  TimeIndexConfidence,
} from "@/app/lib/indicatorLabels"
import type { HorsePredictionRank } from "@/app/lib/horseIndicators"

type EntryWithMasters = Entry & {
  HorseMaster: { name: string }
  JockeyMaster: { name: string }
}

type Props = {
  entries: EntryWithMasters[]
  predicts: Predict[]
  indicators?: HorseIndicatorLabels[]
  openAiPredictionRanks?: HorsePredictionRank[]
}

const sortByHorseNumber = (a: EntryWithMasters, b: EntryWithMasters) => {
  return a.horse_number - b.horse_number
}

/** 上位ほど暖色、下位ほど寒色。判断材料不足は無彩色 */
const LEVEL_CLASSES = [
  "bg-red-50 text-red-700 border-red-200",
  "bg-orange-50 text-orange-700 border-orange-200",
  "bg-gray-50 text-gray-700 border-gray-200",
  "bg-sky-50 text-sky-700 border-sky-200",
  "bg-slate-100 text-slate-500 border-slate-200",
]
const INSUFFICIENT_CLASS = "bg-gray-100 text-gray-500 border-dashed border-gray-300"

function IndicatorBadge({ name, indicator }: { name: string; indicator: IndicatorLabel }) {
  const toneClass = indicator.level === null ? INSUFFICIENT_CLASS : LEVEL_CLASSES[indicator.level]
  return (
    <Badge variant="outline" className={`whitespace-nowrap font-medium ${toneClass}`}>
      {name}：{indicator.label}
    </Badge>
  )
}

/** 信頼度が低い指数は色を落として注意を促す */
const TIME_INDEX_CLASSES: Record<TimeIndexConfidence, string> = {
  high: "bg-gray-50 text-gray-700 border-gray-200",
  medium: "bg-gray-50 text-gray-700 border-gray-200",
  low: "bg-gray-50 text-gray-400 border-gray-200",
}

/** 指数は小数1桁で保存されるが、出馬表では整数で十分読める */
const formatTimeIndex = (timeIndex: number) => String(Math.round(timeIndex))

const formatConfidence = (item: RecentTimeIndex) => `（信頼度 ${item.confidenceLabel}）`

/**
 * 地力の補足として直近1走のタイム指数を表示し、複数走あれば展開して最大5走を並べる。
 * サーバーコンポーネントのまま動かすため、開閉はネイティブの details/summary に任せる。
 */
function RecentTimeIndexBadge({ recentTimeIndexes }: { recentTimeIndexes: RecentTimeIndex[] }) {
  const [latest, ...older] = recentTimeIndexes
  if (!latest) {
    return null
  }

  const summaryText = `前走 ${formatTimeIndex(latest.timeIndex)}${formatConfidence(latest)}`
  const badgeClass = `whitespace-nowrap font-medium ${TIME_INDEX_CLASSES[latest.confidence]}`

  if (older.length === 0) {
    return (
      <Badge variant="outline" className={badgeClass}>
        {summaryText}
      </Badge>
    )
  }

  return (
    <details>
      <summary
        className="cursor-pointer list-none [&::-webkit-details-marker]:hidden"
        title="直近走の指数を表示"
      >
        <Badge variant="outline" className={`${badgeClass} cursor-pointer`}>
          {summaryText} ▾
        </Badge>
      </summary>
      <ul className="mt-1 space-y-0.5 text-xs">
        {recentTimeIndexes.map((item, index) => (
          <li
            key={`${item.netkeibaRaceId}-${item.raceDate}-${index}`}
            className={`whitespace-nowrap ${item.confidence === "low" ? "text-gray-400" : "text-gray-700"}`}
          >
            {item.raceDate} {item.racecourse} {formatTimeIndex(item.timeIndex)}
            {formatConfidence(item)}
          </li>
        ))}
      </ul>
    </details>
  )
}

function IndicatorBadges({ labels }: { labels?: HorseIndicatorLabels }) {
  if (!labels || labels.isInsufficient) {
    return (
      <Badge variant="outline" className={`whitespace-nowrap font-medium ${INSUFFICIENT_CLASS}`}>
        {INSUFFICIENT_LABEL}
      </Badge>
    )
  }

  // 直近指数を展開しても隣のバッジが伸びないよう上揃えにする
  return (
    <div className="flex flex-wrap items-start gap-1">
      <IndicatorBadge name="地力" indicator={labels.ability} />
      <RecentTimeIndexBadge recentTimeIndexes={labels.recentTimeIndexes} />
      <IndicatorBadge name="条件適性" indicator={labels.conditionFit} />
      <IndicatorBadge name="展開適性" indicator={labels.paceFit} />
      <IndicatorBadge name="近走状態" indicator={labels.freshness} />
    </div>
  )
}

export function EntryTable({
  entries,
  predicts,
  indicators = [],
  openAiPredictionRanks = [],
}: Props) {
  // 枠番でグループ化し、各グループ内で馬番順にソート
  const groupedEntries = Object.entries(groupBy(entries, "bracket_number"))
    .map(([bracketNumber, entriesInBracket]) => ({
      bracketNumber: Number.parseInt(bracketNumber),
      entries: [...entriesInBracket].sort(sortByHorseNumber),
    }))
    .sort((a, b) => a.bracketNumber - b.bracketNumber)

  const indicatorMap = new Map(indicators.map((indicator) => [indicator.horseNumber, indicator]))
  const marks = ["◎", "○", "▲", "△", "×"]
  const predictMarks = new Map(
    [...predicts]
      .sort((a, b) => b.score - a.score)
      .map((predict, index) => [predict.horse_number, marks[index] ?? "×"])
  )
  const openAiPredictMarks = new Map(
    openAiPredictionRanks.map((prediction) => [
      prediction.horseNumber,
      marks[prediction.rank - 1] ?? "×",
    ])
  )
  // 指標が1件も無いレースでは列そのものを表示しない
  const hasIndicators = indicators.length > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>出馬表</CardTitle>
      </CardHeader>
      <CardContent>
        {/* 指標列が増える分、狭い画面ではテーブルを潰さず横スクロールさせる */}
        <Table className={hasIndicators ? "min-w-[760px]" : undefined}>
          <TableHeader>
            <TableRow>
              <TableHead className="align-middle text-center">枠番</TableHead>
              <TableHead>馬番</TableHead>
              <TableHead>馬名</TableHead>
              <TableHead>性別</TableHead>
              <TableHead>馬齢</TableHead>
              <TableHead>騎手</TableHead>
              <TableHead>負担重量</TableHead>
              <TableHead>予想印（独自予想）</TableHead>
              {openAiPredictionRanks.length > 0 && <TableHead>予想印（OpenAI）</TableHead>}
              {hasIndicators && <TableHead className="min-w-[240px]">AI指標</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {groupedEntries.map(({ bracketNumber, entries }) => (
              <React.Fragment key={bracketNumber}>
                {entries.map((entry, index) => (
                  <TableRow key={entry.id}>
                    {index === 0 && (
                      <TableCell rowSpan={entries.length} className="align-middle text-center">
                        {bracketNumber}
                      </TableCell>
                    )}
                    <TableCell>{entry.horse_number}</TableCell>
                    <TableCell className="whitespace-nowrap">{entry.HorseMaster?.name ?? "不明"}</TableCell>
                    <TableCell>{entry.sex}</TableCell>
                    <TableCell>{entry.age}</TableCell>
                    <TableCell className="whitespace-nowrap">{entry.JockeyMaster?.name ?? "不明"}</TableCell>
                    <TableCell>{entry.jockey_weight}</TableCell>
                    <TableCell>{predictMarks.get(entry.horse_number) ?? "×"}</TableCell>
                    {openAiPredictionRanks.length > 0 && (
                      <TableCell>{openAiPredictMarks.get(entry.horse_number) ?? "×"}</TableCell>
                    )}
                    {hasIndicators && (
                      <TableCell className="min-w-[240px]">
                        <IndicatorBadges labels={indicatorMap.get(entry.horse_number)} />
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
