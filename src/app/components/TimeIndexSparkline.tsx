import type { RecentTimeIndex } from "@/app/lib/indicatorLabels"
import { SPARKLINE_HEIGHT, SPARKLINE_WIDTH, buildTimeIndexSparkline } from "@/app/lib/raceDetail"
import { TONE_TEXT_CLASS, timeIndexTone } from "@/app/lib/timeIndexChart"

type TimeIndexSparklineProps = {
  /** 新しい順 */
  recentTimeIndexes: RecentTimeIndex[]
}

/** 直近5走のタイム指数の小さな折れ線と、前走の値・信頼度 */
export function TimeIndexSparkline({ recentTimeIndexes }: TimeIndexSparklineProps) {
  const spark = buildTimeIndexSparkline(recentTimeIndexes)
  if (!spark) {
    return <span className="text-xs text-muted-foreground">指数なし</span>
  }
  return (
    <span className="flex items-center gap-3">
      <svg
        width={SPARKLINE_WIDTH}
        height={SPARKLINE_HEIGHT}
        viewBox={`0 0 ${SPARKLINE_WIDTH} ${SPARKLINE_HEIGHT}`}
        role="img"
        aria-label={spark.ariaLabel}
        className="shrink-0"
      >
        <line
          x1={0}
          x2={SPARKLINE_WIDTH}
          y1={spark.baselineY}
          y2={spark.baselineY}
          className="stroke-border"
          strokeDasharray="2 3"
        />
        <polyline points={spark.points} fill="none" className="stroke-muted-foreground" strokeWidth={1.5} />
        <circle cx={spark.last.x} cy={spark.last.y} r={3} className="fill-primary" />
      </svg>
      <span>
        <span className={`numeric block text-lg font-semibold leading-tight ${TONE_TEXT_CLASS[timeIndexTone(spark.last.value)]}`}>
          {Math.round(spark.last.value)}
        </span>
        <span className="block text-[11px] text-muted-foreground">前走 · 信頼度{spark.last.confidenceLabel}</span>
      </span>
    </span>
  )
}
