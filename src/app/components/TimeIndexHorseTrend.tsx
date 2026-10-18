import Link from "next/link"
import type { HorseTrend } from "@/app/lib/timeIndex"
import {
  TONE_TEXT_CLASS,
  TREND_HEIGHT,
  TREND_WIDTH,
  buildTrendChart,
  formatShortDate,
  timeIndexTone,
  trendSummary,
} from "@/app/lib/timeIndexChart"
import {
  FILTER_PARAM_KEYS,
  formatRaceTime,
  formatTimeIndex,
  timeIndexHref,
  toTimeIndexSearchParams,
  type TimeIndexFilter,
} from "@/app/lib/timeIndexFilters"
import { ConfidencePill } from "./ConfidencePill"
import { ConditionCell, RaceLinkCell } from "./TimeIndexTable"

/** 馬名検索。現在の絞り込み条件は hidden で引き継ぎ、ページ番号は1に戻す */
export function HorseSearchForm({ filter }: { filter: TimeIndexFilter }) {
  const hidden = toTimeIndexSearchParams(filter, { horse: undefined, page: 1 })
  return (
    <form method="get" action="/time-index#horse-trend" role="search" className="mt-3 flex flex-wrap items-center gap-2">
      {Array.from(hidden.entries()).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
      <label htmlFor="time-index-horse" className="text-xs text-muted-foreground">
        馬名
      </label>
      <input
        id="time-index-horse"
        type="search"
        name={FILTER_PARAM_KEYS.horse}
        defaultValue={filter.horse ?? ""}
        placeholder="馬名（カタカナ）"
        className="min-h-11 max-w-80 flex-[1_1_220px] rounded-lg border border-input bg-input-background px-3 text-sm text-foreground"
      />
      <button
        type="submit"
        className="min-h-11 rounded-lg border border-primary px-4 text-sm font-bold text-primary transition-colors hover:bg-accent"
      >
        推移を表示
      </button>
      <span className="text-xs text-muted-foreground">上の絞り込みに関係なく、その馬の全走を表示</span>
    </form>
  )
}

/** 指数の時系列。横軸は出走順で等間隔、100 に基準線。信頼度 低は白抜きの丸 */
function TrendChart({ trend }: { trend: HorseTrend }) {
  const chart = buildTrendChart(trend.runs)
  if (!chart) {
    return <p className="py-6 text-center text-sm text-muted-foreground">指数が算出された走がありません</p>
  }
  return (
    <svg
      viewBox={`0 0 ${TREND_WIDTH} ${TREND_HEIGHT}`}
      className="mt-4 h-auto w-full"
      role="img"
      aria-label={`${trend.horseName}のタイム指数の推移`}
    >
      {chart.yTicks.map((tick) => (
        <g key={tick.value}>
          <line
            x1={40}
            x2={TREND_WIDTH - 32}
            y1={tick.y}
            y2={tick.y}
            className={tick.value === 100 ? "stroke-muted-foreground" : "stroke-border"}
            strokeWidth={1}
            strokeDasharray={tick.value === 100 ? "4 3" : undefined}
          />
          <text
            x={34}
            y={tick.y + 4}
            textAnchor="end"
            className={`numeric ${tick.value === 100 ? "fill-foreground" : "fill-muted-foreground"}`}
            fontSize={11}
          >
            {tick.value}
          </text>
        </g>
      ))}
      <path d={chart.linePath} fill="none" className="stroke-primary" strokeWidth={2} strokeLinejoin="round" />
      {chart.markers.map((marker) => (
        <g key={marker.key}>
          <circle
            cx={marker.x}
            cy={marker.y}
            r={5}
            data-testid={marker.lowConfidence ? "marker-low" : "marker"}
            className={marker.lowConfidence ? "fill-card stroke-primary" : "fill-primary stroke-primary"}
            strokeWidth={2}
          >
            <title>{marker.title}</title>
          </circle>
          <text x={marker.x} y={marker.y - 10} textAnchor="middle" className="numeric fill-foreground" fontSize={11} fontWeight={600}>
            {formatTimeIndex(marker.value)}
          </text>
        </g>
      ))}
      {chart.labels.map((label) => (
        <text
          key={label.key}
          x={label.x}
          y={TREND_HEIGHT - 10}
          textAnchor="middle"
          className="numeric fill-muted-foreground"
          fontSize={10}
        >
          {label.text}
        </text>
      ))}
    </svg>
  )
}

/** 直近の走。新しい順。レースのリンクと走破・基準を保つ */
function RecentRuns({ trend }: { trend: HorseTrend }) {
  return (
    <div className="flex flex-[1_1_300px] flex-col">
      <div className="mb-1.5 text-[13px] font-bold text-muted-foreground">直近の走</div>
      {[...trend.runs].reverse().map((run) => (
        <div
          key={run.id}
          className="grid grid-cols-[84px_minmax(0,1fr)_56px_40px] items-center gap-2.5 border-t border-border py-2 text-[13px]"
        >
          <span className="numeric text-muted-foreground">
            <time dateTime={run.raceDate}>{formatShortDate(run.raceDate)}</time>
          </span>
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-x-2">
              <RaceLinkCell row={run} />
              <ConditionCell row={run} />
            </span>
            <span className="numeric block text-[11px] text-muted-foreground">
              走破 {run.timeSeconds === null ? "—" : formatRaceTime(run.timeSeconds)} · 基準{" "}
              {run.baselineSeconds === null ? "—" : formatRaceTime(run.baselineSeconds)}
            </span>
          </span>
          <span
            className={`numeric text-right font-semibold ${run.timeIndex === null ? "text-muted-foreground" : TONE_TEXT_CLASS[timeIndexTone(run.timeIndex)]}`}
            title={run.unavailableReason ?? undefined}
          >
            {run.timeIndex === null ? "—" : formatTimeIndex(run.timeIndex)}
          </span>
          <span className="text-right">
            <ConfidencePill confidence={run.baselineConfidence} />
          </span>
        </div>
      ))}
    </div>
  )
}

type Props = {
  filter: TimeIndexFilter
  /** 馬名が未指定なら null */
  trend: HorseTrend | null
}

export function TimeIndexHorseTrend({ filter, trend }: Props) {
  const hasRuns = trend !== null && trend.runs.length > 0
  return (
    <section id="horse-trend" aria-labelledby="trend-title" className="flex flex-wrap gap-6 rounded-xl border border-border bg-card p-5">
      <div className="min-w-0 flex-[2_1_560px]">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="trend-title" className="text-lg font-bold">
            馬ごとの推移{hasRuns && ` · ${trendSummary(trend)}`}
          </h2>
          <span className="text-xs text-muted-foreground">白丸は信頼度 低</span>
        </div>
        <HorseSearchForm filter={filter} />
        {trend === null ? null : hasRuns ? (
          <TrendChart trend={trend} />
        ) : trend.candidates.length > 0 ? (
          <div className="mt-4">
            <p className="mb-2 text-sm text-muted-foreground">「{trend.horseName}」に一致する馬はいません。名前に含む馬:</p>
            <ul className="flex flex-wrap gap-2">
              {trend.candidates.map((name) => (
                <li key={name}>
                  <Link
                    href={`${timeIndexHref(filter, { horse: name, page: 1 })}#horse-trend`}
                    className="inline-block rounded-lg border border-border px-3 py-1 text-sm text-primary transition-colors hover:bg-accent"
                  >
                    {name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">「{trend.horseName}」に一致する馬はいません。</p>
        )}
      </div>
      {hasRuns && <RecentRuns trend={trend} />}
    </section>
  )
}
