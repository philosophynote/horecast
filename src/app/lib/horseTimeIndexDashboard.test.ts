import { expect, test } from "vitest"
import { horseTimeIndexHref, parseHorseTimeIndexParams, recentTimeIndexAverage, summarizeDistanceBands, timeIndexUnavailableReason } from "./horseTimeIndexDashboard"
import { parseTimeIndexSearchParams, timeIndexHref } from "./timeIndexFilters"

test("初期表示は検索画面、従来の絞り込みURLは全走画面になる", () => {
  expect(parseHorseTimeIndexParams({}).filter.view).toBe("horses")
  expect(parseHorseTimeIndexParams({ start: "2026-01-01", racecourse: "東京" }).filter.view).toBe("all")
  expect(parseHorseTimeIndexParams({ horse: "馬", start: "2026-01-01" }).filter.view).toBe("horses")
  expect(parseHorseTimeIndexParams({ view: "all", horse: "馬" }).filter.horse).toBeUndefined()
})

test("重複、長すぎる検索語、不正な条件はエラーにする", () => {
  for (const params of [{ q: ["馬", "別の馬"] }, { horse: "馬".repeat(101) }, { start: "2026-02-30" }, { start: "2026-11-01", end: "2026-01-01" }, { distance: "9007199254740993" }, { confidence: "broken" }, { view: "broken" }]) {
    expect(parseHorseTimeIndexParams(params).error).not.toBeNull()
  }
  expect(parseHorseTimeIndexParams({ horse: " 馬 ", start: "", end: "", distance: "" }).error).toBeNull()
})

test("ページ送りで検索語・馬名・表示方法と条件を保つ", () => {
  const filter = { page: 2, q: "馬", horse: "馬&名前", view: "horses" as const, startDate: "2026-01-01", version: "v2" }
  const url = timeIndexHref(filter, { page: 3 })
  expect(parseTimeIndexSearchParams(Object.fromEntries(new URL(url, "http://localhost").searchParams))).toMatchObject({ ...filter, page: 3 })
  expect(horseTimeIndexHref("馬&名前")).toBe("/time-index?horse=%E9%A6%AC%26%E5%90%8D%E5%89%8D")
  expect(parseHorseTimeIndexParams({ page: "9007199254740993" }).filter.page).toBe(1)
})

test("直近5走からnullだけを除いて平均し、0も有効値にする", () => {
  expect(recentTimeIndexAverage([null, 0, 100, null, 80, 200].map((timeIndex) => ({ timeIndex })))).toEqual({ count: 3, average: 60 })
  expect(recentTimeIndexAverage([{ timeIndex: null }])).toEqual({ count: 0, average: null })
})

test("距離帯の平均は有効件数で重み付けし、欠測を分母に含めない", () => {
  expect(summarizeDistanceBands([
    { distance: 1200, total: 2, indexed: 1, average: 90, max: 90 },
    { distance: 1400, total: 3, indexed: 3, average: 110, max: 120 },
    { distance: 1600, total: 1, indexed: 0, average: null, max: null },
  ])).toEqual([
    { label: "短距離", total: 5, indexed: 4, average: 105, max: 120 },
    { label: "マイル", total: 1, indexed: 0, average: null, max: null },
  ])
})

test("算出不可理由を表示用の日本語にする", () => {
  expect(timeIndexUnavailableReason("time_missing")).toBe("走破タイムなし")
  expect(timeIndexUnavailableReason("baseline_unavailable")).toBe("基準タイムなし")
  expect(timeIndexUnavailableReason("標本不足")).toBe("標本不足")
  expect(timeIndexUnavailableReason(null)).toBe("指数を算出できません")
})
