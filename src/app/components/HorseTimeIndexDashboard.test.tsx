import { expect, test } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import type { HorseTimeIndexDashboardData } from "@/app/lib/horseTimeIndexData"
import type { TimeIndexRow } from "@/app/lib/timeIndex"
import { HorseTimeIndexCandidates, HorseTimeIndexDashboard, HorseTimeIndexHeading, HorseTimeIndexSearch } from "./HorseTimeIndexDashboard"
import { TimeIndexFilterForm } from "./TimeIndexFilterForm"

const latest: TimeIndexRow = {
  id: 1, horseName: "テスト馬", horseNumber: 3, raceDate: "2026-10-01", racecourse: "東京", surface: "芝", distance: 1600, className: "1勝クラス", going: "良",
  raceId: null, netkeibaRaceId: "202605010101", raceNumber: 1, timeIndex: null, timeSeconds: null, baselineSeconds: 95, baselineSampleSize: 12, baselineConfidence: "unavailable", baselineVersion: "v2", unavailableReason: "time_missing",
}
function data(): HorseTimeIndexDashboardData {
  return {
    summary: { total: 101, indexed: 1, average: 105, firstDate: "2024-01-01", lastDate: "2026-10-01", generatedAt: "2026-11-01T00:00:00Z", latest, recent: { count: 0, average: null }, best: { ...latest, id: 2, timeIndex: 105, raceDate: "2024-01-01" } },
    trend: { horseName: "テスト馬", runs: [latest], candidates: [] },
    page: { rows: [latest], total: 101, page: 1, pageCount: 3 },
    racecourses: [{ label: "東京", total: 101, indexed: 1, average: 105, max: 105 }], surfaces: [], distances: [],
  }
}

test("検索と候補に収録期間を示し、選択リンクに条件を保持する", () => {
  expect(renderToStaticMarkup(<HorseTimeIndexSearch q="馬" />)).toContain('name="q"')
  const html = renderToStaticMarkup(<HorseTimeIndexCandidates horses={[{ name: "テスト馬", firstDate: "2024-01-01", lastDate: "2026-10-01", generatedAt: null }]} hasMore filter={{ q: "馬", startDate: "2024-01-01", page: 4 }} />)
  expect(html).toContain("競走馬を選択")
  expect(html).toContain("先頭20件")
  expect(html).toContain("収録 2024-01-01 〜 2026-10-01")
  expect(html).toContain("horse=")
  expect(html).toContain("start=2024-01-01")
  expect(html).not.toContain("page=4")
})

test("更新日時はJST、収録日付は保存日付のまま表示する", () => {
  const html = renderToStaticMarkup(<HorseTimeIndexHeading horse={{ name: "テスト馬", firstDate: "2024-01-01", lastDate: "2026-10-01", generatedAt: "2026-11-01T00:00:00Z" }} />)
  expect(html).toContain("2026-11-01 09:00")
  expect(html).toContain("生涯出走数とは異なります")
})

test("前走の欠測理由、直近平均の有効件数、省略と少数の案内、条件別内訳を表示する", () => {
  const html = renderToStaticMarkup(<HorseTimeIndexDashboard data={data()} filter={{ horse: "テスト馬", view: "horses", page: 1 }} version="v2" />)
  expect(html).toContain("走破タイムなし")
  expect(html).toContain("有効 0走 / 直近5走")
  expect(html).toContain("全101走のうち直近1走")
  expect(html).toContain("有効な指数が1走のみ")
  expect(html).toContain("競馬場別")
  expect(html).toContain("芝・ダート別")
  expect(html).toContain("距離帯別")
  expect(html).toContain("この条件のデータはありません")
  expect(html).toContain("page=2")
  expect(html).not.toContain('href="/races/')
})

test("選択条件0走と指数算出0走を区別して表示する", () => {
  const none = data()
  none.summary.total = 0
  none.summary.indexed = 0
  expect(renderToStaticMarkup(<HorseTimeIndexDashboard data={none} filter={{ page: 1 }} version="v2" />)).toContain("選択した条件のデータはありません")
  none.summary.total = 1
  expect(renderToStaticMarkup(<HorseTimeIndexDashboard data={none} filter={{ page: 1 }} version="v2" />)).toContain("指数を算出できた走はありません")
})

test("馬別フォームは馬名・検索語・表示方法・バージョンを保持し、リセットでも馬を保つ", () => {
  const html = renderToStaticMarkup(<TimeIndexFilterForm filter={{ horse: "テスト馬", q: "馬", view: "horses", page: 3 }} period={{}} version="v2" options={{ racecourses: [], surfaces: [], distances: [], classNames: [], goings: [], versions: ["v2"], latestRaceDate: "2026-10-01" }} />)
  for (const name of ["horse", "q", "view", "version"]) expect(html).toContain(`name="${name}"`)
  expect(html).not.toContain('name="page"')
  expect(html).toContain("収録全期間")
  expect(html).not.toContain('value="2026-10-01"')
  expect(html).toContain("horse=%E3%83%86%E3%82%B9%E3%83%88%E9%A6%AC&amp;view=horses")
})
