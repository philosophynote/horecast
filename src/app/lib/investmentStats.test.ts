import { describe, expect, test } from "vitest"
import type { BetStatistics } from "@/app/lib/statistics"
import {
  buildCumulativeProfit,
  buildTrackStatistics,
  hitBetsOf,
  isValidRange,
  matchesPreset,
  mergeCumulativeSeries,
  periodPreset,
  resolveStatisticsRange,
  returnRateBarWidth,
  thinDateTicks,
} from "./investmentStats"

const stats = (amount: number, ret: number, hitBets = 1, totalBets = 10): BetStatistics => ({
  totalBets,
  totalAmount: amount,
  totalReturn: ret,
  hitRate: (hitBets / totalBets) * 100,
  returnRate: amount > 0 ? (ret / amount) * 100 : 0,
  profit: ret - amount,
  betTypeStats: [
    { betType: "複勝", totalBets: 4, hitBets, totalAmount: amount * 0.625, totalReturn: ret, hitRate: 0, returnRate: 0 },
    { betType: "ワイド", totalBets: totalBets - 4, hitBets: 0, totalAmount: amount * 0.375, totalReturn: 0, hitRate: 0, returnRate: 0 },
  ],
})

const row = (raceId: number, date: string, track: string, amount: number, ret: number) => ({
  raceId,
  date,
  raceTime: `${date}T10:00:00.000Z`,
  track,
  raceNumber: 1,
  raceName: `レース${raceId}`,
  statistics: stats(amount, ret),
})

describe("期間", () => {
  const nowStored = new Date("2026-10-10T13:10:00Z")

  test("未指定なら今日を含めて30日", () => {
    const range = resolveStatisticsRange({ startDate: null, endDate: null }, nowStored)
    expect(range?.startDate).toBe("2026-09-11")
    expect(range?.endDate).toBe("2026-10-10")
    expect(range?.start.toISOString()).toBe("2026-09-11T00:00:00.000Z")
    expect(range?.endExclusive.toISOString()).toBe("2026-10-11T00:00:00.000Z")
  })

  test("片方だけ指定", () => {
    expect(resolveStatisticsRange({ startDate: "2026-10-01", endDate: null }, nowStored)?.endDate).toBe("2026-10-10")
    expect(resolveStatisticsRange({ startDate: null, endDate: "2026-10-05" }, nowStored)?.startDate).toBe("2026-09-06")
  })

  test("不正な文字列と開始 > 終了は null", () => {
    expect(resolveStatisticsRange({ startDate: "2026-13-45", endDate: null }, nowStored)).toBeNull()
    expect(resolveStatisticsRange({ startDate: null, endDate: "2026-10-10T00:00:00Z" }, nowStored)).toBeNull()
    expect(resolveStatisticsRange({ startDate: "2026-10-11", endDate: "2026-10-10" }, nowStored)).toBeNull()
    expect(resolveStatisticsRange({ startDate: "", endDate: null }, nowStored)).toBeNull()
  })

  test("終了日は常に含まれる（翌日 00:00 が exclusive）", () => {
    const range = resolveStatisticsRange({ startDate: "2026-10-10", endDate: "2026-10-10" }, nowStored)
    expect(range?.endExclusive.toISOString()).toBe("2026-10-11T00:00:00.000Z")
  })

  test("プリセットは今日を含めた日数", () => {
    expect(periodPreset(7, "2026-10-10")).toEqual({ startDate: "2026-10-04", endDate: "2026-10-10" })
    expect(periodPreset(30, "2026-10-10")).toEqual({ startDate: "2026-09-11", endDate: "2026-10-10" })
    expect(matchesPreset({ startDate: "2026-10-04", endDate: "2026-10-10" }, 7, "2026-10-10")).toBe(true)
    expect(matchesPreset({ startDate: "2026-10-03", endDate: "2026-10-10" }, 7, "2026-10-10")).toBe(false)
  })

  test("isValidRange", () => {
    expect(isValidRange({ startDate: "2026-10-01", endDate: "2026-10-10" })).toBe(true)
    expect(isValidRange({ startDate: "2026-10-11", endDate: "2026-10-10" })).toBe(false)
    expect(isValidRange({ startDate: "", endDate: "2026-10-10" })).toBe(false)
  })
})

describe("集計", () => {
  test("hitBetsOf は券種別の的中点数の合計", () => {
    expect(hitBetsOf(stats(1600, 800, 3))).toBe(3)
  })

  test("競馬場別は回収率の高い順、同率は名前順", () => {
    const tracks = buildTrackStatistics([
      row(1, "2026-10-04", "東京", 1600, 800),
      row(2, "2026-10-04", "京都", 1600, 2400),
      row(3, "2026-10-10", "東京", 1600, 2400),
      row(4, "2026-10-10", "中山", 1600, 1600),
      row(5, "2026-10-10", "阪神", 1600, 1600),
    ])
    expect(tracks.map((t) => t.track)).toEqual(["京都", "中山", "東京", "阪神"])
    expect(tracks[2]).toEqual({ track: "東京", totalRaces: 2, totalAmount: 3200, totalReturn: 3200, returnRate: 100, profit: 0 })
  })

  test("累積収支は開催日ごとに合計し日付昇順に累積する", () => {
    const points = buildCumulativeProfit([
      row(1, "2026-10-10", "東京", 1600, 800),
      row(2, "2026-10-04", "京都", 1600, 2400),
      row(3, "2026-10-10", "東京", 1600, 2400),
    ])
    expect(points).toEqual([
      { date: "2026-10-04", races: 1, dailyProfit: 800, cumulativeProfit: 800 },
      { date: "2026-10-10", races: 2, dailyProfit: 0, cumulativeProfit: 800 },
    ])
  })

  test("空なら空", () => {
    expect(buildCumulativeProfit([])).toEqual([])
    expect(buildTrackStatistics([])).toEqual([])
  })
})

describe("表示用", () => {
  test("回収率のバー幅は 0〜150% を 0〜100% に", () => {
    expect(returnRateBarWidth(0)).toBe(0)
    expect(returnRateBarWidth(75)).toBe(50)
    expect(returnRateBarWidth(150)).toBe(100)
    expect(returnRateBarWidth(300)).toBe(100)
    expect(returnRateBarWidth(-5)).toBe(0)
  })

  test("系列の結合は日付の和集合で、欠けた日は直前の値、始まる前は null", () => {
    const merged = mergeCumulativeSeries(
      [
        { date: "2026-10-03", races: 1, dailyProfit: 100, cumulativeProfit: 100 },
        { date: "2026-10-10", races: 1, dailyProfit: 50, cumulativeProfit: 150 },
      ],
      [{ date: "2026-10-04", races: 1, dailyProfit: -200, cumulativeProfit: -200 }],
    )
    expect(merged).toEqual([
      { date: "2026-10-03", original: 100, openai: null },
      { date: "2026-10-04", original: 100, openai: -200 },
      { date: "2026-10-10", original: 150, openai: -200 },
    ])
  })

  test("tick は先頭と末尾を残して間引く", () => {
    const dates = Array.from({ length: 25 }, (_, i) => `2026-09-${String(i + 1).padStart(2, "0")}`)
    const ticks = thinDateTicks(dates, 10)
    expect(ticks.length).toBeLessThanOrEqual(10)
    expect(ticks[0]).toBe("2026-09-01")
    expect(ticks[ticks.length - 1]).toBe("2026-09-25")
    expect(thinDateTicks(dates.slice(0, 5), 10)).toHaveLength(5)
  })
})
