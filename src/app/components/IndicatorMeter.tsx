import type { IndicatorLabel } from "@/app/lib/indicatorLabels"
import {
  METER_PIP_COUNT,
  type MeterLevelCount,
  type MeterTone,
  meterFilledCount,
  meterTone,
} from "@/app/lib/indicatorMeter"

type IndicatorMeterProps = {
  /** 指標名（地力・条件適性など） */
  name: string
  indicator: IndicatorLabel
  /** 指標の段数。近走状態だけ4 */
  levelCount?: MeterLevelCount
  className?: string
}

const PIP_CLASS: Record<MeterTone, string> = {
  primary: "bg-primary",
  foreground: "bg-foreground",
  muted: "bg-muted-foreground",
}

const LABEL_CLASS: Record<MeterTone, string> = {
  primary: "text-primary",
  foreground: "text-foreground",
  muted: "text-muted-foreground",
}

/** AI指標の5段目盛り。判断材料不足は破線のチップにする */
export function IndicatorMeter({ name, indicator, levelCount = 5, className = "" }: IndicatorMeterProps) {
  if (indicator.level === null) {
    return (
      <span
        className={`inline-block rounded-md border border-dashed border-muted-foreground px-3 py-1 text-xs text-muted-foreground ${className}`}
      >
        {name}：{indicator.label}
      </span>
    )
  }

  const filled = meterFilledCount(indicator.level, levelCount)
  const tone = meterTone(indicator.level)

  return (
    <span className={`inline-flex flex-col gap-1 ${className}`}>
      <span
        role="img"
        aria-label={`${name}：${indicator.label}（${METER_PIP_COUNT}段中${filled}）`}
        className="flex gap-[3px]"
      >
        {Array.from({ length: METER_PIP_COUNT }, (_, index) => (
          <span
            key={index}
            data-filled={index < filled ? "true" : "false"}
            className={`h-1.5 w-3 rounded-[1px] ${index < filled ? PIP_CLASS[tone] : "bg-border"}`}
          />
        ))}
      </span>
      <span className={`text-xs ${LABEL_CLASS[tone]}`}>
        <span className="text-muted-foreground">{name}</span> {indicator.label}
      </span>
    </span>
  )
}
