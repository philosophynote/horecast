import { beforeEach, expect, test, vi } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import Page from "./page"
import { getJockeyDashboardData, searchJockeys } from "@/app/lib/jockeyDashboardData"

vi.mock("@/app/lib/jockeyDashboardData", () => ({
  searchJockeys: vi.fn(),
  getJockeyDashboardData: vi.fn(),
}))

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(searchJockeys).mockResolvedValue({ jockeys: [], hasMore: false })
  vi.mocked(getJockeyDashboardData).mockResolvedValue({ id: 12, name: "武豊", JockeyRacecourseRecord: [] })
})

test("検索候補が1件なら、選択操作なしで騎手成績を開く", async () => {
  vi.mocked(searchJockeys).mockResolvedValue({ jockeys: [{ id: 12, name: "武豊" }], hasMore: false })
  const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({ q: "武豊" }) }))
  expect(searchJockeys).toHaveBeenCalledWith("武豊")
  expect(getJockeyDashboardData).toHaveBeenCalledWith(12)
  expect(html).toContain("この騎手の集計データはまだありません")
})

test("候補が複数あるときは選択リンクを表示する", async () => {
  vi.mocked(searchJockeys).mockResolvedValue({ jockeys: [{ id: 12, name: "武豊" }, { id: 13, name: "武藤雅" }], hasMore: true })
  const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({ q: "武" }) }))
  expect(getJockeyDashboardData).not.toHaveBeenCalled()
  expect(html).toContain("騎手を選択")
  expect(html).toContain("先頭20件")
  expect(html).toContain("/jockeys?jockey=12&amp;q=")
})

test("出馬表からのID指定では名前検索をせず、直接取得する", async () => {
  await Page({ searchParams: Promise.resolve({ jockey: "12" }) })
  expect(searchJockeys).not.toHaveBeenCalled()
  expect(getJockeyDashboardData).toHaveBeenCalledWith(12)
})

test("不正な入力では検索もデータ取得も行わない", async () => {
  const html = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({ jockey: "0", q: "武" }) }))
  expect(searchJockeys).not.toHaveBeenCalled()
  expect(getJockeyDashboardData).not.toHaveBeenCalled()
  expect(html).toContain('role="alert"')
})

test("見つからない騎手と、検索前の案内を表示する", async () => {
  const empty = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({}) }))
  expect(empty).toContain("騎手名を入力すると成績を表示します")
  const missing = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({ q: "不在" }) }))
  expect(missing).toContain("該当する騎手が見つかりません")
  vi.mocked(getJockeyDashboardData).mockResolvedValue(null)
  const missingId = renderToStaticMarkup(await Page({ searchParams: Promise.resolve({ jockey: "999" }) }))
  expect(missingId).toContain("指定した騎手が見つかりません")
})
