import Link from "next/link"
import { Button } from "@/app/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table"
import type { HorseTrend } from "@/app/lib/timeIndex"
import {
  formatRaceTime,
  formatTimeIndex,
  timeIndexHref,
  toTimeIndexSearchParams,
  FILTER_PARAM_KEYS,
  type TimeIndexFilter,
} from "@/app/lib/timeIndexFilters"
import { BaselineCell, ConditionCell, ConfidenceBadge, RaceLinkCell, TimeIndexCell } from "./TimeIndexTable"

const CHART_WIDTH = 640
const CHART_HEIGHT = 240
const PADDING = { top: 16, right: 32, bottom: 32, left: 40 }
const MARKER_RADIUS = 4
/** 縦軸の目盛が多すぎて読めなくならないよう、範囲に応じて刻みを選ぶ */
const Y_TICK_STEPS = [5, 10, 20, 50]
const MAX_Y_TICKS = 8

function pickTickStep(range: number): number {
  return Y_TICK_STEPS.find((step) => range / step <= MAX_Y_TICKS) ?? Y_TICK_STEPS[Y_TICK_STEPS.length - 1]
}

/** 馬名検索。現在の絞り込み条件は hidden で引き継ぎ、ページ番号は1に戻す */
export function HorseSearchForm({ filter }: { filter: TimeIndexFilter }) {
  const hidden = toTimeIndexSearchParams(filter, { horse: undefined, page: 1 })
  return (
    <form method="get" action="/time-index#horse-trend" className="flex flex-col sm:flex-row gap-2">
      {Array.from(hidden.entries()).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
      <label className="sr-only" htmlFor="time-index-horse">馬名</label>
      <input
        id="time-index-horse"
        type="search"
        name={FILTER_PARAM_KEYS.horse}
        defaultValue={filter.horse ?? ""}
        placeholder="馬名（カタカナ）"
        className="flex-1 border rounded px-3 py-2 text-sm bg-white"
      />
      <Button type="submit">推移を表示</Button>
    </form>
  )
}

/**
 * 指数の時系列を折れ線で描く。横軸は出走順で等間隔に置き、日付はラベルで示す。
 * 100（同条件の標準的な勝ち時計）に基準線を引く。
 */
function TrendChart({ trend }: { trend: HorseTrend }) {
  const points = trend.runs
    .map((run, index) => ({ run, index }))
    .filter((point): point is { run: typeof point.run & { timeIndex: number }; index: number } =>
      point.run.timeIndex !== null
    )

  if (points.length === 0) {
    return <p className="text-center py-4 text-gray-500">指数が算出された走がありません</p>
  }

  const plotWidth = CHART_WIDTH - PADDING.left - PADDING.right
  const plotHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom
  const values = points.map((point) => point.run.timeIndex)
  const tickStep = pickTickStep(Math.max(100, ...values) - Math.min(100, ...values) + 4)
  const yMin = Math.floor((Math.min(100, ...values) - 2) / tickStep) * tickStep
  const yMax = Math.ceil((Math.max(100, ...values) + 2) / tickStep) * tickStep
  const stepCount = trend.runs.length - 1
  const xOf = (index: number) => PADDING.left + (stepCount === 0 ? plotWidth / 2 : (index / stepCount) * plotWidth)
  const yOf = (value: number) => PADDING.top + plotHeight - ((value - yMin) / (yMax - yMin)) * plotHeight

  const yTicks: number[] = []
  for (let tick = yMin; tick <= yMax; tick += tickStep) yTicks.push(tick)
  // 横軸の日付ラベルは重ならないよう最大6個に間引く
  const labelEvery = Math.max(1, Math.ceil(trend.runs.length / 6))
  const linePath = points.map((point, i) => `${i === 0 ? "M" : "L"}${xOf(point.index)},${yOf(point.run.timeIndex)}`).join(" ")

  return (
    <svg
      viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
      className="w-full h-auto"
      role="img"
      aria-label={`${trend.horseName}のタイム指数の推移`}
    >
      {yTicks.map((tick) => (
        <g key={tick}>
          <line
            x1={PADDING.left}
            x2={CHART_WIDTH - PADDING.right}
            y1={yOf(tick)}
            y2={yOf(tick)}
            stroke={tick === 100 ? "#9ca3af" : "#e5e7eb"}
            strokeWidth={1}
            strokeDasharray={tick === 100 ? "4 3" : undefined}
          />
          <text x={PADDING.left - 6} y={yOf(tick) + 4} textAnchor="end" fontSize={11} fill="#6b7280">{tick}</text>
        </g>
      ))}
      <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth={2} strokeLinejoin="round" />
      {points.map((point) => (
        <circle
          key={point.run.id}
          cx={xOf(point.index)}
          cy={yOf(point.run.timeIndex)}
          r={MARKER_RADIUS}
          fill="#3b82f6"
          stroke="#ffffff"
          strokeWidth={2}
        >
          <title>{`${point.run.raceDate} ${point.run.racecourse} ${point.run.surface}${point.run.distance}m: ${formatTimeIndex(point.run.timeIndex)}`}</title>
        </circle>
      ))}
      {trend.runs.map((run, index) =>
        index % labelEvery === 0 || index === trend.runs.length - 1 ? (
          <text key={run.id} x={xOf(index)} y={CHART_HEIGHT - 10} textAnchor="middle" fontSize={10} fill="#6b7280">
            {run.raceDate.slice(2)}
          </text>
        ) : null
      )}
    </svg>
  )
}

function TrendTable({ trend }: { trend: HorseTrend }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>開催日</TableHead>
          <TableHead>レース</TableHead>
          <TableHead>条件</TableHead>
          <TableHead className="text-right">馬番</TableHead>
          <TableHead className="text-right">走破タイム</TableHead>
          <TableHead className="text-right">基準タイム</TableHead>
          <TableHead>信頼度</TableHead>
          <TableHead className="text-right">指数</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[...trend.runs].reverse().map((row) => (
          <TableRow key={row.id}>
            <TableCell className="whitespace-nowrap tabular-nums">{row.raceDate}</TableCell>
            <TableCell className="whitespace-nowrap"><RaceLinkCell row={row} /></TableCell>
            <TableCell><ConditionCell row={row} /></TableCell>
            <TableCell className="text-right tabular-nums">{row.horseNumber}</TableCell>
            <TableCell className="text-right tabular-nums">{formatRaceTime(row.timeSeconds)}</TableCell>
            <TableCell className="text-right tabular-nums"><BaselineCell row={row} /></TableCell>
            <TableCell><ConfidenceBadge confidence={row.baselineConfidence} /></TableCell>
            <TableCell className="text-right"><TimeIndexCell row={row} /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

type Props = {
  filter: TimeIndexFilter
  /** 馬名が未指定なら null */
  trend: HorseTrend | null
}

export function TimeIndexHorseTrend({ filter, trend }: Props) {
  return (
    <Card id="horse-trend">
      <CardHeader>
        <CardTitle>馬ごとの推移</CardTitle>
        <p className="text-sm text-gray-500">
          馬名で検索すると指数の時系列を表示します。上の絞り込み条件は適用せず、その馬の全走を対象にします。
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <HorseSearchForm filter={filter} />
        {trend === null ? null : trend.runs.length > 0 ? (
          <>
            <h3 className="text-lg font-semibold">
              {trend.horseName}
              <span className="ml-2 text-sm font-normal text-gray-500">{trend.runs.length}走</span>
            </h3>
            <TrendChart trend={trend} />
            <TrendTable trend={trend} />
          </>
        ) : trend.candidates.length > 0 ? (
          <div>
            <p className="text-sm text-gray-600 mb-2">「{trend.horseName}」に一致する馬はいません。名前に含む馬:</p>
            <ul className="flex flex-wrap gap-2">
              {trend.candidates.map((name) => (
                <li key={name}>
                  <Link
                    href={`${timeIndexHref(filter, { horse: name, page: 1 })}#horse-trend`}
                    className="inline-block rounded border px-3 py-1 text-sm text-blue-600 hover:bg-blue-50"
                  >
                    {name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-gray-600">「{trend.horseName}」に一致する馬はいません。</p>
        )}
      </CardContent>
    </Card>
  )
}
