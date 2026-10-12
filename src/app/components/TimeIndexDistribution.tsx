import type { TimeIndexDistribution as Distribution } from "@/app/lib/timeIndex"
import {
  type HistogramTone,
  buildHistogramDisplay,
  confidenceShares,
  histogramAriaLabel,
  histogramTicks,
  histogramWarning,
  timeIndexTone,
} from "@/app/lib/timeIndexChart"
import { HISTOGRAM_BIN_WIDTH } from "@/app/lib/timeIndexFilters"

const BAR_CLASS: Record<HistogramTone, string> = {
  primary: "bg-primary",
  slow: "bg-slow",
  neutral: "bg-muted-foreground",
}

const SHARE_CLASS: Record<string, string> = {
  high: "bg-foreground",
  medium: "bg-muted-foreground",
  low: "bg-border",
  unavailable: "bg-muted",
}

function formatNumber(value: number | null, digits = 1): string {
  return value === null ? "—" : value.toFixed(digits)
}

function WarningIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="mt-0.5 shrink-0"
    >
      <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
    </svg>
  )
}

function Histogram({ distribution }: { distribution: Distribution }) {
  const bars = buildHistogramDisplay(distribution)
  return (
    <>
      <div
        role="img"
        aria-label={histogramAriaLabel(bars)}
        className="relative mt-4 flex h-[220px] items-end gap-px border-b border-muted-foreground"
      >
        {bars.map((bar) => (
          <div
            key={bar.key}
            title={bar.title}
            data-testid={bar.edge ? `bar-${bar.edge}` : undefined}
            className={`flex-1 rounded-t-[2px] ${BAR_CLASS[bar.tone]}`}
            style={{ height: `${Math.max(bar.count > 0 ? 1 : 0, bar.heightRatio * 100)}%` }}
          />
        ))}
      </div>
      <div aria-hidden="true" className="numeric relative mt-1.5 h-4 text-[11px] text-muted-foreground">
        {histogramTicks().map((tick) => (
          <span
            key={tick.label}
            className={`absolute -translate-x-1/2 ${tick.label === "100" ? "font-semibold text-foreground" : ""}`}
            style={{ left: `${tick.position}%` }}
          >
            {tick.label}
          </span>
        ))}
      </div>
    </>
  )
}

function Summary({ distribution }: { distribution: Distribution }) {
  const warning = histogramWarning(distribution)
  const shares = confidenceShares(distribution)
  const minTone = distribution.min !== null && timeIndexTone(distribution.min) === "slow" ? "text-slow" : ""
  const maxTone = distribution.max !== null && timeIndexTone(distribution.max) === "primary" ? "text-primary" : ""
  return (
    <div className="flex flex-[1_1_300px] flex-col gap-4 rounded-xl border border-border bg-card p-5">
      <h2 className="text-lg font-bold">この条件の概要</h2>
      {warning && (
        <p role="note" className="flex gap-2 text-[13px] text-warning">
          <WarningIcon />
          <span>{warning}</span>
        </p>
      )}
      <dl className="grid grid-cols-2 gap-4">
        <div>
          <dt className="text-xs text-muted-foreground">指数あり / 全走</dt>
          <dd className="numeric text-[26px] font-semibold">
            {distribution.indexedCount.toLocaleString("ja-JP")}
            <span className="text-[15px] text-muted-foreground"> / {distribution.totalCount.toLocaleString("ja-JP")}</span>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">平均</dt>
          <dd className="numeric text-[26px] font-semibold">{formatNumber(distribution.average)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">最小</dt>
          <dd className={`numeric text-[26px] font-semibold ${minTone}`}>{formatNumber(distribution.min)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">最大</dt>
          <dd className={`numeric text-[26px] font-semibold ${maxTone}`}>{formatNumber(distribution.max)}</dd>
        </div>
      </dl>
      <div>
        <div className="mb-1.5 text-xs text-muted-foreground">基準タイムの信頼度</div>
        <div aria-hidden="true" className="flex h-2.5 gap-0.5 overflow-hidden rounded-full">
          {shares
            .filter((share) => share.ratio > 0)
            .map((share) => (
              <div
                key={share.confidence}
                className={SHARE_CLASS[share.confidence] ?? "bg-muted"}
                style={{ width: `${share.ratio * 100}%` }}
              />
            ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-3.5 gap-y-1 text-xs text-foreground">
          {shares.map((share) => (
            <span key={share.confidence}>
              {share.label} <span className="numeric">{(share.ratio * 100).toFixed(1)}%</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export function TimeIndexDistribution({ distribution }: { distribution: Distribution }) {
  return (
    <section id="distribution" aria-label="分布と概要" className="flex flex-wrap gap-4">
      <div className="min-w-0 flex-[2_1_560px] rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-lg font-bold">分布</h2>
          <span className="text-xs text-muted-foreground">{HISTOGRAM_BIN_WIDTH}ポイント刻み · 指数の無い走を除く</span>
        </div>
        {distribution.indexedCount === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">指数が算出された走がありません</p>
        ) : (
          <Histogram distribution={distribution} />
        )}
      </div>
      <Summary distribution={distribution} />
    </section>
  )
}
