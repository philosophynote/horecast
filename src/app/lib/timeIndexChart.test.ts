import { describe, expect, test } from "vitest"
import type { TimeIndexDistribution, TimeIndexRow } from "@/app/lib/timeIndex"
import { HISTOGRAM_BIN_COUNT, toHistogramBins } from "@/app/lib/timeIndexFilters"
import {
  UNDERFLOW_WARNING_SHARE,
  buildHistogramDisplay,
  buildTrendChart,
  confidenceShares,
  formatShortDate,
  histogramAriaLabel,
  histogramTicks,
  histogramWarning,
  pageRangeLabel,
  timeIndexDeviation,
  timeIndexTone,
  trendSummary,
} from "./timeIndexChart"

describe("timeIndexTone", () => {
  test("110 以上は強調、90 未満は遅い色", () => {
    expect(timeIndexTone(110)).toBe("primary")
    expect(timeIndexTone(109.9)).toBe("foreground")
    expect(timeIndexTone(90)).toBe("foreground")
    expect(timeIndexTone(89.9)).toBe("slow")
    expect(timeIndexTone(-5)).toBe("slow")
  })
})

describe("分布", () => {
  // bucket 0 = 70未満, 1..30 = 70〜130, 31 = 130以上
  const distribution = (): Pick<TimeIndexDistribution, "bins" | "underflowCount" | "overflowCount" | "indexedCount" | "totalCount" | "confidences"> => ({
    bins: toHistogramBins([
      { bucket: 0, count: 12 },
      { bucket: 1, count: 3 },
      { bucket: 16, count: 45 },
      { bucket: 21, count: 7 },
      { bucket: 30, count: 2 },
      { bucket: 31, count: 1 },
    ]),
    underflowCount: 12,
    overflowCount: 1,
    indexedCount: 70,
    totalCount: 80,
    confidences: [
      { confidence: "high", count: 40 },
      { confidence: "medium", count: 20 },
      { confidence: "low", count: 10 },
      { confidence: "unavailable", count: 10 },
      { confidence: "weird", count: 0 },
    ],
  })

  test("70未満と130以上を端の棒にし、畳まれた分を差し引いて32本にする", () => {
    const bars = buildHistogramDisplay(distribution())
    expect(bars).toHaveLength(HISTOGRAM_BIN_COUNT + 2)
    expect(bars[0]).toMatchObject({ edge: "under", count: 12, tone: "slow", title: "70未満: 12件" })
    expect(bars[1]).toMatchObject({ from: 70, to: 72, count: 3, tone: "slow" })
    expect(bars[30]).toMatchObject({ from: 128, to: 130, count: 2, tone: "primary" })
    expect(bars[31]).toMatchObject({ edge: "over", count: 1, tone: "primary", title: "130以上: 1件" })
    expect(bars[16]).toMatchObject({ from: 100, to: 102, count: 45, tone: "neutral", heightRatio: 1 })
    expect(bars[0].heightRatio).toBeCloseTo(12 / 45)
  })

  test("色は階級の下端で決まる（88〜90 は遅い、110〜112 は強調）", () => {
    const bars = buildHistogramDisplay(distribution())
    expect(bars.find((b) => b.from === 88)?.tone).toBe("slow")
    expect(bars.find((b) => b.from === 90)?.tone).toBe("neutral")
    expect(bars.find((b) => b.from === 108)?.tone).toBe("neutral")
    expect(bars.find((b) => b.from === 110)?.tone).toBe("primary")
  })

  test("目盛りは境界の位置、両端は棒の中央", () => {
    const ticks = histogramTicks()
    expect(ticks[0]).toEqual({ position: (0.5 / 32) * 100, label: "<70" })
    expect(ticks.find((t) => t.label === "100")?.position).toBeCloseTo((16 / 32) * 100)
    expect(ticks.find((t) => t.label === "70")).toBeUndefined()
    expect(ticks.find((t) => t.label === "130")).toBeUndefined()
    expect(ticks.map((t) => t.label)).toEqual(["<70", "80", "90", "100", "110", "120", "130+"])
    expect(ticks[ticks.length - 1]).toEqual({ position: (31.5 / 32) * 100, label: "130+" })
  })

  test("aria-label は最多の階級と端の件数", () => {
    expect(histogramAriaLabel(buildHistogramDisplay(distribution()))).toBe(
      "タイム指数の分布（2ポイント刻み）。最多は 100〜102 の 45件、70未満 12件、130以上 1件",
    )
    expect(histogramAriaLabel(buildHistogramDisplay({ bins: toHistogramBins([]), underflowCount: 0, overflowCount: 0 }))).toContain("ありません")
  })

  test("警告は 70未満が指数ありの 10% 以上のときだけ", () => {
    expect(UNDERFLOW_WARNING_SHARE).toBe(0.1)
    expect(histogramWarning({ indexedCount: 70, underflowCount: 12 })).toBe(
      "70未満の走が12件（17%）と多い。標本の少ない条件では基準タイムが振れやすいので、信頼度と合わせて見てほしい。",
    )
    expect(histogramWarning({ indexedCount: 200, underflowCount: 12 })).toBeNull()
    expect(histogramWarning({ indexedCount: 0, underflowCount: 0 })).toBeNull()
  })

  test("信頼度の割合はラベル付き。未知の値はそのまま、0件なら割合 0", () => {
    const shares = confidenceShares(distribution())
    expect(shares[0]).toEqual({ confidence: "high", label: "高", count: 40, ratio: 0.5 })
    expect(shares[4]).toEqual({ confidence: "weird", label: "weird", count: 0, ratio: 0 })
    expect(confidenceShares({ confidences: [{ confidence: "high", count: 0 }], totalCount: 0 })[0].ratio).toBe(0)
  })
})

describe("一覧", () => {
  test("偏差の棒は 100 を中心に ±30 を満幅とし、範囲外はクリップ", () => {
    expect(timeIndexDeviation(100)).toEqual({ left: 50, width: 0 })
    expect(timeIndexDeviation(115)).toEqual({ left: 50, width: 25 })
    expect(timeIndexDeviation(85)).toEqual({ left: 25, width: 25 })
    expect(timeIndexDeviation(200)).toEqual({ left: 50, width: 50 })
    expect(timeIndexDeviation(-23.1)).toEqual({ left: 0, width: 50 })
    expect(timeIndexDeviation(null)).toBeNull()
  })

  test("ページの範囲", () => {
    expect(pageRangeLabel({ total: 901, page: 1 })).toBe("1–50 / 901件")
    expect(pageRangeLabel({ total: 901, page: 19 })).toBe("901–901 / 901件")
    expect(pageRangeLabel({ total: 0, page: 1 })).toBe("0件")
    expect(pageRangeLabel({ total: 10, page: 999 })).toBe("0件 / 10件")
  })

  test("短い日付", () => {
    expect(formatShortDate("2026-09-28")).toBe("26/9/28")
    expect(formatShortDate("broken")).toBe("broken")
  })
})

describe("馬ごとの推移", () => {
  const run = (id: number, raceDate: string, timeIndex: number | null, confidence = "high"): TimeIndexRow => ({
    id,
    netkeibaRaceId: String(id),
    raceId: null,
    raceNumber: null,
    horseNumber: 5,
    horseName: "テスト馬",
    raceDate,
    racecourse: "東京",
    surface: "芝",
    distance: 1800,
    className: "2勝クラス",
    going: "良",
    timeSeconds: 106.3,
    baselineSeconds: 106.8,
    baselineSampleSize: 19,
    baselineConfidence: confidence,
    baselineVersion: "v1",
    timeIndex,
    unavailableReason: timeIndex === null ? "標本不足" : null,
  })

  test("指数のある走が無ければ null", () => {
    expect(buildTrendChart([])).toBeNull()
    expect(buildTrendChart([run(1, "2026-01-01", null)])).toBeNull()
  })

  test("1走なら中央に点だけ", () => {
    const chart = buildTrendChart([run(1, "2026-09-28", 104.7, "low")])
    expect(chart?.markers).toHaveLength(1)
    expect(chart?.markers[0]).toMatchObject({ x: 324, value: 104.7, lowConfidence: true, title: "2026-09-28 東京 芝1800m: 104.7" })
    expect(chart?.linePath.startsWith("M324,")).toBe(true)
    expect(chart?.labels.map((l) => l.text)).toEqual(["26/9/28"])
  })

  test("指数の無い走も横軸に数え、100 の基準線と目盛りを持つ", () => {
    const chart = buildTrendChart([
      run(1, "2025-11-02", 96),
      run(2, "2025-12-14", null),
      run(3, "2026-02-08", 104, "low"),
    ])
    expect(chart?.markers.map((m) => m.key)).toEqual([1, 3])
    expect(chart?.markers[1].x).toBe(608)
    expect(chart?.markers[1].lowConfidence).toBe(true)
    expect(chart?.yTicks.some((t) => t.value === 100)).toBe(true)
    expect(chart?.baselineY).toBe(chart?.yTicks.find((t) => t.value === 100)?.y)
    expect(chart?.labels).toHaveLength(3)
  })

  test("負の値や 130 超でも範囲に収まり、目盛りが増えすぎない", () => {
    const chart = buildTrendChart([run(1, "2026-01-01", -23.1), run(2, "2026-02-01", 133.8)])
    expect(chart?.yTicks.length).toBeLessThanOrEqual(10)
    expect(chart?.yTicks[0].value).toBeLessThanOrEqual(-23.1)
    expect(chart?.yTicks[chart.yTicks.length - 1].value).toBeGreaterThanOrEqual(133.8)
    for (const marker of chart?.markers ?? []) {
      expect(marker.y).toBeGreaterThanOrEqual(0)
      expect(marker.y).toBeLessThanOrEqual(240)
    }
  })

  test("見出しの要約", () => {
    expect(trendSummary({ horseName: "テスト馬", runs: [run(1, "2026-01-01", 100)] })).toBe("テスト馬 · 1走")
  })
})
