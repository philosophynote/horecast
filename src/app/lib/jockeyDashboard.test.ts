import { describe, expect, test } from "vitest"
import {
  buildJockeyDashboard,
  jockeyDashboardHref,
  jockeyRates,
  parseJockeyDashboardParams,
  type JockeyDashboardFilter,
  type JockeyDashboardRecord,
} from "./jockeyDashboard"

const filter: JockeyDashboardFilter = { q: "", period: "all", racecourse: "all", surface: "all", distanceBand: "all" }
const row = (extra: Partial<JockeyDashboardRecord> = {}): JockeyDashboardRecord => ({
  period: "all", racecourse: "all", surface: "all", distance_band: "all",
  rides: 100, wins: 10, seconds: 20, thirds: 15,
  first_race_date: new Date("2025-01-01Z"), last_race_date: new Date("2026-11-01Z"),
  generated_at: new Date("2026-11-02T00:00:00Z"), ...extra,
})

describe("検索条件", () => {
  test("空欄や空白を既定値にし、騎手IDを厳密に検証する", () => {
    expect(parseJockeyDashboardParams({ q: " 武豊 ", jockey: "12", surface: " " })).toEqual({
      filter: { ...filter, q: "武豊", jockeyId: 12 }, error: null,
    })
    for (const jockey of ["1.2", "-1", "0", "1foo", "2147483648", "9007199254740992"]) {
      expect(parseJockeyDashboardParams({ jockey }).error).not.toBeNull()
    }
  })

  test("重複パラメータと長すぎる検索条件を拒否する", () => {
    for (const params of [{ q: ["武豊", "田辺"] }, { q: "あ".repeat(101) }, { period: ["all", "2026"] }]) {
      expect(parseJockeyDashboardParams(params).error).not.toBeNull()
    }
    expect(parseJockeyDashboardParams({ q: "あ".repeat(100) }).error).toBeNull()
  })

  test("検索語の記号をリンクのパラメータとしてエンコードする", () => {
    const url = new URL(jockeyDashboardHref(12, "武豊&surface=芝"), "https://example.com")
    expect(url.searchParams.get("q")).toBe("武豊&surface=芝")
    expect(url.searchParams.has("surface")).toBe(false)
  })
})

describe("保存済みの集計を表示する", () => {
  test("全体行と内訳を足さず、期間・条件の完全一致で選ぶ", () => {
    const records = [row(), row({ racecourse: "東京", rides: 60 }), row({ racecourse: "京都", rides: 40 }),
      row({ period: "2026", rides: 30 }), row({ racecourse: "東京", surface: "芝", rides: 35 })]
    const dashboard = buildJockeyDashboard(records, filter)
    expect(dashboard.summary?.rides).toBe(100)
    expect(dashboard.racecourses.map((r) => r.rides).sort()).toEqual([40, 60])
    expect(buildJockeyDashboard(records, { ...filter, period: "2026" }).summary?.rides).toBe(30)
    expect(buildJockeyDashboard(records, { ...filter, racecourse: "東京", surface: "芝" }).summary?.rides).toBe(35)
  })

  test("選択条件が未集計でも全体や別条件の数字に置き換えない", () => {
    const dashboard = buildJockeyDashboard([row(), row({ racecourse: "東京", rides: 10 })], { ...filter, racecourse: "東京", surface: "ダート" })
    expect(dashboard.summary).toBeNull()
    expect(dashboard.surfaces).toEqual([])
  })

  test("比較する軸以外は固定し、距離帯は短い順に並べる", () => {
    const records = [
      row({ racecourse: "東京", surface: "芝", distance_band: "長距離", rides: 25 }),
      row({ racecourse: "東京", surface: "芝", distance_band: "短距離", rides: 5 }),
      row({ racecourse: "東京", surface: "芝", distance_band: "マイル", rides: 50 }),
      row({ racecourse: "京都", surface: "芝", distance_band: "短距離", rides: 200 }),
      row({ racecourse: "東京", surface: "ダート", distance_band: "短距離", rides: 80 }),
    ]
    const dashboard = buildJockeyDashboard(records, { ...filter, racecourse: "東京", surface: "芝", distanceBand: "マイル" })
    expect(dashboard.distances.map((r) => r.rides)).toEqual([5, 50, 25])
    expect(dashboard.racecourses.map((r) => r.racecourse)).toEqual(["東京"])
  })

  test("同じ条件の別表記があるときは最新行を使い、合算しない", () => {
    const records = [row({ rides: 90, generated_at: new Date("2026-10-01Z") }), row()]
    expect(buildJockeyDashboard(records, filter).summary?.rides).toBe(100)
  })

  test("ゼロ騎乗では率を表示せず、少数の騎乗でも実際の割合を返す", () => {
    expect(jockeyRates(row({ rides: 0, wins: 0, seconds: 0, thirds: 0 }))).toEqual({ win: null, quinella: null, place: null })
    expect(jockeyRates(row({ rides: 10, wins: 2, seconds: 1, thirds: 1 }))).toEqual({ win: 0.2, quinella: 0.3, place: 0.4 })
  })
})
