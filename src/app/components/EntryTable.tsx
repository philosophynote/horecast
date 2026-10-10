import React from "react"
import { formatInTimeZone } from "date-fns-tz"
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
import {
  FALLBACK_NOTE,
  formatRate,
  INSUFFICIENT_RECORD_LABEL,
  MIN_RIDES,
  NO_RECORD_LABEL,
  type JockeyRecordLabel,
  type JockeyRecordSummary,
} from "@/app/lib/jockeyRecordLabels"

type EntryWithMasters = Entry & {
  HorseMaster: { name: string }
  JockeyMaster: { name: string }
}

type Props = {
  entries: EntryWithMasters[]
  predicts: Predict[]
  indicators?: HorseIndicatorLabels[]
  openAiPredictionRanks?: HorsePredictionRank[]
  /** 騎手成績。障害レースや取得失敗時は null で、列ごと表示しない */
  jockeyRecords?: JockeyRecordSummary | null
}

const sortByHorseNumber = (a: EntryWithMasters, b: EntryWithMasters) => {
  return a.horse_number - b.horse_number
}

/** JRA の枠色（1白 2黒 3赤 4青 5黄 6緑 7橙 8桃）。添字は枠番 */
const BRACKET_CLASSES: Record<number, string> = {
  1: "bg-white text-gray-900 border-gray-300",
  2: "bg-gray-900 text-white border-gray-900",
  3: "bg-red-600 text-white border-red-600",
  4: "bg-blue-600 text-white border-blue-600",
  5: "bg-yellow-300 text-gray-900 border-yellow-300",
  6: "bg-green-600 text-white border-green-600",
  7: "bg-orange-500 text-white border-orange-500",
  8: "bg-pink-300 text-gray-900 border-pink-300",
}

function BracketNumber({ bracketNumber }: { bracketNumber: number }) {
  const toneClass = BRACKET_CLASSES[bracketNumber] ?? "bg-gray-100 text-gray-700 border-gray-200"
  return (
    <span
      className={`inline-flex h-7 w-7 items-center justify-center rounded border text-sm font-bold ${toneClass}`}
    >
      {bracketNumber}
    </span>
  )
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

/**
 * 騎手名の下に、このレースの開催条件での勝率・複勝率と騎乗数を出す。
 * 条件を広げた値は「※」を付け、注記の本文はテーブル下の脚注にまとめる。
 */
function JockeyRecord({ label }: { label?: JockeyRecordLabel }) {
  if (!label || label.status === "none") {
    return <p className="text-xs text-gray-400">{NO_RECORD_LABEL}</p>
  }
  if (label.status === "insufficient") {
    return <p className="text-xs text-gray-400">{INSUFFICIENT_RECORD_LABEL}</p>
  }

  return (
    <div className="text-xs leading-tight">
      <p className="whitespace-nowrap text-gray-700">
        勝率 <span className="font-semibold">{formatRate(label.winRate)}</span>
        <span className="mx-1 text-gray-300">|</span>
        複勝率 <span className="font-semibold">{formatRate(label.placeRate)}</span>
        <span className="ml-1 text-gray-400">{label.rides}騎乗</span>
      </p>
      <p
        className={`whitespace-nowrap ${label.isFallback ? "text-amber-700" : "text-gray-400"}`}
        title={label.isFallback ? FALLBACK_NOTE : undefined}
      >
        {label.isFallback && "※"}
        {label.conditionLabel}
      </p>
    </div>
  )
}

function JockeyRecordFootnote({ summary }: { summary: JockeyRecordSummary }) {
  const hasFallback = summary.labels.some((label) => label.status === "ready" && label.isFallback)
  const generatedOn = summary.generatedAt
    ? formatInTimeZone(summary.generatedAt, "Asia/Tokyo", "yyyy-MM-dd")
    : null

  return (
    <div className="mt-3 space-y-0.5 text-xs text-gray-500">
      <p>
        騎手成績はJRA平地（障害・地方・海外を含まない）の集計で、勝率 = 1着 / 騎乗数、複勝率 = 3着以内
        / 騎乗数。
        {generatedOn && ` ${generatedOn} 時点。`}
      </p>
      {hasFallback && (
        <p className="text-amber-700">
          ※ 開催条件での騎乗数が{MIN_RIDES}未満のため、距離・芝ダ・競馬場の順に条件を広げた値です。
          {FALLBACK_NOTE}。
        </p>
      )}
    </div>
  )
}

export function EntryTable({
  entries,
  predicts,
  indicators = [],
  openAiPredictionRanks = [],
  jockeyRecords = null,
}: Props) {
  // 枠番でグループ化し、各グループ内で馬番順にソート
  const groupedEntries = Object.entries(groupBy(entries, "bracket_number"))
    .map(([bracketNumber, entriesInBracket]) => ({
      bracketNumber: Number.parseInt(bracketNumber),
      entries: [...entriesInBracket].sort(sortByHorseNumber),
    }))
    .sort((a, b) => a.bracketNumber - b.bracketNumber)

  const indicatorMap = new Map(indicators.map((indicator) => [indicator.horseNumber, indicator]))
  const jockeyRecordMap = new Map(
    (jockeyRecords?.labels ?? []).map((label) => [label.jockeyMasterId, label])
  )
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
  const hasJockeyRecords = jockeyRecords !== null

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
              <TableHead className="w-12 text-center">枠</TableHead>
              <TableHead className="w-12 text-center">馬番</TableHead>
              <TableHead>馬名</TableHead>
              <TableHead className="w-14 text-center">性齢</TableHead>
              <TableHead>騎手・負担重量</TableHead>
              <TableHead className="whitespace-nowrap text-center">
                予想印
                <span className="block text-[10px] font-normal">独自予想</span>
              </TableHead>
              {openAiPredictionRanks.length > 0 && (
                <TableHead className="whitespace-nowrap text-center">
                  予想印
                  <span className="block text-[10px] font-normal">OpenAI</span>
                </TableHead>
              )}
              {hasIndicators && <TableHead className="min-w-[240px]">AI指標</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {groupedEntries.map(({ bracketNumber, entries }) => (
              <React.Fragment key={bracketNumber}>
                {entries.map((entry, index) => (
                  <TableRow key={entry.id}>
                    {index === 0 && (
                      <TableCell rowSpan={entries.length} className="text-center">
                        <BracketNumber bracketNumber={bracketNumber} />
                      </TableCell>
                    )}
                    <TableCell className="text-center font-semibold">{entry.horse_number}</TableCell>
                    <TableCell className="whitespace-nowrap font-medium">
                      {entry.HorseMaster?.name ?? "不明"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-center">
                      {entry.sex}
                      {entry.age}
                    </TableCell>
                    <TableCell>
                      <p className="whitespace-nowrap">
                        {entry.JockeyMaster?.name ?? "不明"}
                        <span className="ml-1 text-xs text-gray-500">{entry.jockey_weight}</span>
                      </p>
                      {hasJockeyRecords && (
                        <div className="mt-0.5">
                          <JockeyRecord label={jockeyRecordMap.get(entry.jockey_master_id)} />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {predictMarks.get(entry.horse_number) ?? "×"}
                    </TableCell>
                    {openAiPredictionRanks.length > 0 && (
                      <TableCell className="text-center">
                        {openAiPredictMarks.get(entry.horse_number) ?? "×"}
                      </TableCell>
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
        {jockeyRecords && <JockeyRecordFootnote summary={jockeyRecords} />}
      </CardContent>
    </Card>
  )
}
