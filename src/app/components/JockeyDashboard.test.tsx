import { expect, test } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { JockeyDashboard, JockeySearchForm } from "./JockeyDashboard"
import type { JockeyDashboardRecord } from "@/app/lib/jockeyDashboard"

const record: JockeyDashboardRecord = {
  period: "all", racecourse: "all", surface: "all", distance_band: "all",
  rides: 10, wins: 2, seconds: 1, thirds: 1,
  first_race_date: new Date("2025-01-01Z"), last_race_date: new Date("2026-10-30Z"),
  generated_at: new Date("2026-11-01T18:00:00Z"),
}
const filter = { q: "武", jockeyId: 1, period: "all", racecourse: "all", surface: "all", distanceBand: "all" }
const render = (records: JockeyDashboardRecord[], extra = {}) => renderToStaticMarkup(
  <JockeyDashboard jockey={{ id: 1, name: "武豊" }} records={records} filter={{ ...filter, ...extra }} />,
)

test("検索欄にラベルと名前の一部で検索できる案内を出す", () => {
  const html = renderToStaticMarkup(<JockeySearchForm q="武" />)
  expect(html).toContain('for="jockey-search"')
  expect(html).toContain('action="/jockeys"')
  expect(html).toContain('value="武"')
  expect(html).toContain("名前の一部でも検索できます")
})

test("率、少数の注意、対象レースの日付とJSTの更新日時を表示する", () => {
  const html = render([record, { ...record, racecourse: "東京" }])
  expect(html).toContain("武豊")
  expect(html).toContain("20.0%")
  expect(html).toContain("30.0%")
  expect(html).toContain("40.0%")
  expect(html).toContain("率は参考値です")
  expect(html).toContain("少数")
  expect(html).toContain("2025-01-01")
  expect(html).toContain("2026-11-02 03:00")
  expect(html).toContain("overflow-auto")
})

test("ゼロ騎乗を0%とせず、率の算出ができない表示にする", () => {
  const html = render([{ ...record, rides: 0, wins: 0, seconds: 0, thirds: 0 }])
  expect(html).not.toContain("NaN")
  expect(html).not.toContain("Infinity")
  expect(html).not.toContain("0.0%")
  expect(html).toContain("—")
})

test("未集計の騎手と未集計の条件を区別する", () => {
  expect(render([])).toContain("この騎手の集計データはまだありません")
  expect(render([record], { racecourse: "東京" })).toContain("選択した条件の集計データはありません")
  expect(render([record], { racecourse: "東京" })).not.toContain("20.0%")
})
