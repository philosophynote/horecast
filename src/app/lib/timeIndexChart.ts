import type { HorseTrend, TimeIndexDistribution, TimeIndexPage, TimeIndexRow } from "@/app/lib/timeIndex"
import {
  CONFIDENCE_LABELS,
  HISTOGRAM_BIN_COUNT,
  HISTOGRAM_BIN_WIDTH,
  HISTOGRAM_MAX,
  HISTOGRAM_MIN,
  TIME_INDEX_PAGE_SIZE,
  formatTimeIndex,
  isConfidenceLevel,
} from "@/app/lib/timeIndexFilters"

/**
 * タイム指数ダッシュボードの表示用の純粋な計算。
 * 分布の棒、一覧の偏差バー、馬ごとの推移の座標をここで作り、部品は描くだけにする。
 * DB の型は import type だけ（timeIndex.ts は prisma を読む）
 */

export type TimeIndexTone = "primary" | "slow" | "foreground"

/** 110 以上は強調、90 未満は遅い指数の色（issue #99 の規則。レース詳細のスパークラインも同じ） */
export function timeIndexTone(value: number): TimeIndexTone {
  if (value >= 110) return "primary"
  if (value < 90) return "slow"
  return "foreground"
}

export const TONE_TEXT_CLASS: Record<TimeIndexTone, string> = {
  primary: "text-primary",
  slow: "text-slow",
  foreground: "text-foreground",
}

/* ---------- 分布 ---------- */

export type HistogramTone = "primary" | "slow" | "neutral"

export type HistogramBar = {
  key: string
  /** 以上。70未満の棒は null */
  from: number | null
  /** 未満。130以上の棒は null */
  to: number | null
  count: number
  /** 32本の最大値に対する比（0〜1） */
  heightRatio: number
  tone: HistogramTone
  edge: "under" | "over" | null
  title: string
}

function histogramToneOf(from: number | null, edge: HistogramBar["edge"]): HistogramTone {
  if (edge === "under") return "slow"
  if (edge === "over") return "primary"
  if (from === null) return "neutral"
  if (from >= 110) return "primary"
  if (from < 90) return "slow"
  return "neutral"
}

function rangeLabel(from: number | null, to: number | null, edge: HistogramBar["edge"]): string {
  if (edge === "under") return `${HISTOGRAM_MIN}未満`
  if (edge === "over") return `${HISTOGRAM_MAX}以上`
  return `${from}〜${to}`
}

/** 70未満・30階級・130以上の 32 本。端の件数は畳まれた階級から差し引く */
export function buildHistogramDisplay(
  distribution: Pick<TimeIndexDistribution, "bins" | "underflowCount" | "overflowCount">,
): HistogramBar[] {
  const raw: Omit<HistogramBar, "heightRatio" | "title">[] = []
  raw.push({ key: "under", from: null, to: HISTOGRAM_MIN, count: distribution.underflowCount, tone: "slow", edge: "under" })
  distribution.bins.forEach((bin, index) => {
    let count = bin.count
    if (index === 0) count -= distribution.underflowCount
    if (index === distribution.bins.length - 1) count -= distribution.overflowCount
    raw.push({
      key: String(bin.from),
      from: bin.from,
      to: bin.to,
      count: Math.max(0, count),
      tone: histogramToneOf(bin.from, null),
      edge: null,
    })
  })
  raw.push({ key: "over", from: HISTOGRAM_MAX, to: null, count: distribution.overflowCount, tone: "primary", edge: "over" })
  const max = Math.max(1, ...raw.map((bar) => bar.count))
  return raw.map((bar) => ({
    ...bar,
    heightRatio: bar.count / max,
    title: `${rangeLabel(bar.from, bar.to, bar.edge)}: ${bar.count.toLocaleString("ja-JP")}件`,
  }))
}

export type HistogramTick = { position: number; label: string }

/** 目盛りは棒の境界に置く。両端は `<70` / `130+` を棒の中央に出し、70 と 130 は重なるので省く */
export function histogramTicks(): HistogramTick[] {
  const total = HISTOGRAM_BIN_COUNT + 2
  const ticks: HistogramTick[] = [{ position: (0.5 / total) * 100, label: `<${HISTOGRAM_MIN}` }]
  for (let value = HISTOGRAM_MIN + 10; value < HISTOGRAM_MAX; value += 10) {
    const index = 1 + (value - HISTOGRAM_MIN) / HISTOGRAM_BIN_WIDTH
    ticks.push({ position: (index / total) * 100, label: String(value) })
  }
  ticks.push({ position: ((total - 0.5) / total) * 100, label: `${HISTOGRAM_MAX}+` })
  return ticks
}

export function histogramAriaLabel(bars: HistogramBar[]): string {
  const total = bars.reduce((sum, bar) => sum + bar.count, 0)
  if (total === 0) return "タイム指数の分布。指数の算出された走がありません"
  const top = bars.reduce((best, bar) => (bar.count > best.count ? bar : best))
  const under = bars.find((bar) => bar.edge === "under")?.count ?? 0
  const over = bars.find((bar) => bar.edge === "over")?.count ?? 0
  return `タイム指数の分布（${HISTOGRAM_BIN_WIDTH}ポイント刻み）。最多は ${rangeLabel(top.from, top.to, top.edge)} の ${top.count}件、${HISTOGRAM_MIN}未満 ${under}件、${HISTOGRAM_MAX}以上 ${over}件`
}

/** 70未満がこの割合以上なら注意を促す */
export const UNDERFLOW_WARNING_SHARE = 0.1

export function histogramWarning(
  distribution: Pick<TimeIndexDistribution, "indexedCount" | "underflowCount">,
): string | null {
  if (distribution.indexedCount <= 0 || distribution.underflowCount <= 0) return null
  const share = distribution.underflowCount / distribution.indexedCount
  if (share < UNDERFLOW_WARNING_SHARE) return null
  return `${HISTOGRAM_MIN}未満の走が${distribution.underflowCount.toLocaleString("ja-JP")}件（${Math.round(share * 100)}%）と多い。標本の少ない条件では基準タイムが振れやすいので、信頼度と合わせて見てほしい。`
}

export type ConfidenceShare = { confidence: string; label: string; count: number; ratio: number }

export function confidenceShares(
  distribution: Pick<TimeIndexDistribution, "confidences" | "totalCount">,
): ConfidenceShare[] {
  return distribution.confidences.map((item) => ({
    confidence: item.confidence,
    label: isConfidenceLevel(item.confidence) ? CONFIDENCE_LABELS[item.confidence] : item.confidence,
    count: item.count,
    ratio: distribution.totalCount > 0 ? item.count / distribution.totalCount : 0,
  }))
}

/* ---------- 一覧 ---------- */

export const DEVIATION_FULL_RANGE = 30

/** 100 からの差を ±30 を満幅とした棒の位置（%）。範囲外はクリップ */
export function timeIndexDeviation(value: number | null): { left: number; width: number } | null {
  if (value === null || !Number.isFinite(value)) return null
  const delta = Math.max(-50, Math.min(50, ((value - 100) / DEVIATION_FULL_RANGE) * 50))
  return { left: 50 + Math.min(delta, 0), width: Math.abs(delta) }
}

/** 一覧の見出し用「1–50 / 901件」。範囲外のページは 0件 */
export function pageRangeLabel(page: Pick<TimeIndexPage, "total" | "page">): string {
  const total = page.total.toLocaleString("ja-JP")
  if (page.total === 0) return "0件"
  const first = (page.page - 1) * TIME_INDEX_PAGE_SIZE + 1
  const last = Math.min(page.total, page.page * TIME_INDEX_PAGE_SIZE)
  if (first > page.total) return `0件 / ${total}件`
  return `${first.toLocaleString("ja-JP")}–${last.toLocaleString("ja-JP")} / ${total}件`
}

/** yyyy-MM-dd → yy/M/d。年をまたぐ推移で月日だけにしない */
export function formatShortDate(raceDate: string): string {
  const match = /^\d{2}(\d{2})-(\d{2})-(\d{2})$/.exec(raceDate)
  if (!match) return raceDate
  return `${match[1]}/${Number(match[2])}/${Number(match[3])}`
}

/* ---------- 馬ごとの推移 ---------- */

export const TREND_WIDTH = 640
export const TREND_HEIGHT = 240
const TREND_PADDING = { top: 24, right: 32, bottom: 32, left: 40 }
/** 縦軸の目盛が多すぎて読めなくならないよう、範囲に応じて刻みを選ぶ */
const Y_TICK_STEPS = [5, 10, 20, 50]
const MAX_Y_TICKS = 8
const MAX_X_LABELS = 6

function pickTickStep(range: number): number {
  return Y_TICK_STEPS.find((step) => range / step <= MAX_Y_TICKS) ?? Y_TICK_STEPS[Y_TICK_STEPS.length - 1]
}

export type TrendMarker = {
  key: number
  x: number
  y: number
  value: number
  lowConfidence: boolean
  title: string
}

export type TrendChart = {
  yTicks: { value: number; y: number }[]
  baselineY: number
  linePath: string
  markers: TrendMarker[]
  labels: { key: number; x: number; text: string }[]
}

type TrendRun = Pick<
  TimeIndexRow,
  "id" | "raceDate" | "racecourse" | "surface" | "distance" | "timeIndex" | "baselineConfidence"
>

/**
 * 指数の時系列の座標。横軸は指数の無い走も含めて出走順に等間隔、100 に基準線。
 * 指数のある走が無ければ null
 */
export function buildTrendChart(runs: TrendRun[]): TrendChart | null {
  const points = runs
    .map((run, index) => ({ run, index }))
    .filter((point): point is { run: TrendRun & { timeIndex: number }; index: number } => point.run.timeIndex !== null)
  if (points.length === 0) return null

  const plotWidth = TREND_WIDTH - TREND_PADDING.left - TREND_PADDING.right
  const plotHeight = TREND_HEIGHT - TREND_PADDING.top - TREND_PADDING.bottom
  const values = points.map((point) => point.run.timeIndex)
  const low = Math.min(100, ...values)
  const high = Math.max(100, ...values)
  const tickStep = pickTickStep(high - low + 4)
  const yMin = Math.floor((low - 2) / tickStep) * tickStep
  const yMax = Math.ceil((high + 2) / tickStep) * tickStep
  const stepCount = runs.length - 1
  const round = (n: number) => Math.round(n * 10) / 10
  const xOf = (index: number) =>
    round(TREND_PADDING.left + (stepCount === 0 ? plotWidth / 2 : (index / stepCount) * plotWidth))
  const yOf = (value: number) => round(TREND_PADDING.top + plotHeight - ((value - yMin) / (yMax - yMin)) * plotHeight)

  const yTicks: TrendChart["yTicks"] = []
  for (let tick = yMin; tick <= yMax; tick += tickStep) yTicks.push({ value: tick, y: yOf(tick) })
  const labelEvery = Math.max(1, Math.ceil(runs.length / MAX_X_LABELS))

  return {
    yTicks,
    baselineY: yOf(100),
    linePath: points.map((point, i) => `${i === 0 ? "M" : "L"}${xOf(point.index)},${yOf(point.run.timeIndex)}`).join(" "),
    markers: points.map((point) => ({
      key: point.run.id,
      x: xOf(point.index),
      y: yOf(point.run.timeIndex),
      value: point.run.timeIndex,
      lowConfidence: point.run.baselineConfidence === "low",
      title: `${point.run.raceDate} ${point.run.racecourse} ${point.run.surface}${point.run.distance}m: ${formatTimeIndex(point.run.timeIndex)}`,
    })),
    labels: runs
      .map((run, index) => ({ run, index }))
      .filter(({ index }) => index % labelEvery === 0 || index === runs.length - 1)
      .map(({ run, index }) => ({ key: run.id, x: xOf(index), text: formatShortDate(run.raceDate) })),
  }
}

/** 推移の見出し用: 「ハヤテノシンゲン」 + 走数 */
export function trendSummary(trend: Pick<HorseTrend, "horseName" | "runs">): string {
  return `${trend.horseName} · ${trend.runs.length}走`
}
