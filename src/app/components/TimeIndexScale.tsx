import { HISTOGRAM_MAX, HISTOGRAM_MIN } from "@/app/lib/timeIndexFilters"

const RANGE = HISTOGRAM_MAX - HISTOGRAM_MIN
const positionOf = (value: number) => ((value - HISTOGRAM_MIN) / RANGE) * 100

/** 指数の目盛り。70〜130 の帯に 100（標準的な勝ち時計）と 110（約1%速い）の位置を示す */
export function TimeIndexScale() {
  return (
    <section
      aria-label="指数の目盛り"
      className="flex-[1_1_480px] max-w-[620px] rounded-xl border border-border bg-card px-5 pb-3 pt-4"
    >
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>← 遅い</span>
        <span>速い →</span>
      </div>
      <div className="relative mt-1.5 h-14" aria-hidden="true">
        <div className="absolute inset-x-0 top-3.5 h-2 rounded-full bg-border" />
        <div className="absolute left-0 top-3.5 h-2 rounded-l-full bg-slow" style={{ width: `${positionOf(90)}%` }} />
        <div className="absolute right-0 top-3.5 h-2 rounded-r-full bg-primary" style={{ left: `${positionOf(110)}%` }} />
        <div className="absolute top-1 h-7 w-0.5 bg-foreground" style={{ left: `${positionOf(100)}%` }} />
        <div className="absolute top-2 h-5 w-0.5 bg-primary" style={{ left: `${positionOf(110)}%` }} />
        <span className="numeric absolute left-0 top-8 text-xs text-muted-foreground">{HISTOGRAM_MIN}</span>
        <span className="numeric absolute top-8 -translate-x-1/2 text-xs text-muted-foreground" style={{ left: `${positionOf(90)}%` }}>
          90
        </span>
        <span className="numeric absolute top-8 -translate-x-1/2 text-[13px] font-semibold" style={{ left: `${positionOf(100)}%` }}>
          100
        </span>
        <span className="numeric absolute top-8 -translate-x-1/2 text-xs text-primary" style={{ left: `${positionOf(110)}%` }}>
          110
        </span>
        <span className="numeric absolute right-0 top-8 text-xs text-muted-foreground">{HISTOGRAM_MAX}</span>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground">
        <span>
          <strong className="numeric">100</strong> 同条件の標準的な勝ち時計
        </span>
        <span>
          <strong className="numeric text-primary">110</strong> 基準より約1%速い
        </span>
      </div>
    </section>
  )
}
