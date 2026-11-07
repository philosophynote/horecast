import { beforeEach, expect, test, vi } from "vitest"
import { renderToReadableStream } from "react-dom/server"
import Page from "./page"
import { getHorseTimeIndexDashboard, getTimeIndexHorseProfile, searchTimeIndexHorses } from "@/app/lib/horseTimeIndexData"
import { getTimeIndexDistribution, getTimeIndexFilterOptions, getTimeIndexPage } from "@/app/lib/timeIndex"
import type { SearchParamsInput } from "@/app/lib/timeIndexFilters"

vi.mock("@/app/lib/horseTimeIndexData", () => ({ getHorseTimeIndexDashboard: vi.fn(), getTimeIndexHorseProfile: vi.fn(), searchTimeIndexHorses: vi.fn() }))
vi.mock("@/app/lib/timeIndex", () => ({
  getTimeIndexFilterOptions: vi.fn(), getTimeIndexPage: vi.fn(), getTimeIndexDistribution: vi.fn(),
  resolveVersion: (filter: { version?: string }, options: { versions: string[] }) => filter.version ?? options.versions[0] ?? null,
}))

const horse = { name: "テストホース", firstDate: "2024-01-01", lastDate: "2026-10-01", generatedAt: "2026-11-01T00:00:00Z" }
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(getTimeIndexHorseProfile).mockResolvedValue(horse)
  vi.mocked(searchTimeIndexHorses).mockResolvedValue({ horses: [], hasMore: false })
  vi.mocked(getTimeIndexFilterOptions).mockResolvedValue({ racecourses: ["東京"], surfaces: ["芝"], distances: [1600], classNames: ["1勝クラス"], goings: ["良"], versions: ["v2"], latestRaceDate: "2026-10-01" })
  vi.mocked(getHorseTimeIndexDashboard).mockResolvedValue({
    summary: { total: 0, indexed: 0, average: null, firstDate: null, lastDate: null, generatedAt: null, latest: null, recent: { count: 0, average: null }, best: null },
    page: { rows: [], total: 0, page: 1, pageCount: 1 }, trend: { horseName: horse.name, runs: [], candidates: [] }, racecourses: [], surfaces: [], distances: [],
  })
  vi.mocked(getTimeIndexPage).mockResolvedValue({ rows: [], total: 0, page: 1, pageCount: 1 })
  vi.mocked(getTimeIndexDistribution).mockResolvedValue({ bins: [], indexedCount: 0, totalCount: 0, average: null, min: null, max: null, confidences: [], underflowCount: 0, overflowCount: 0 })
})

async function render(params: SearchParamsInput) {
  const stream = await renderToReadableStream(await Page({ searchParams: Promise.resolve(params) }))
  await stream.allReady
  return new Response(stream).text()
}

test("検索前・不正入力では選択肢も履歴も取得しない", async () => {
  expect(await render({})).toContain("競走馬名を入力するとタイム指数を表示")
  expect(await render({ q: ["馬", "別の馬"] })).toContain('role="alert"')
  expect(getTimeIndexFilterOptions).not.toHaveBeenCalled()
  expect(searchTimeIndexHorses).not.toHaveBeenCalled()
  expect(getHorseTimeIndexDashboard).not.toHaveBeenCalled()
})

test("馬名指定では完全一致で直接表示し、全期間と最新の単一バージョンを使う", async () => {
  const html = await render({ horse: horse.name })
  expect(getTimeIndexHorseProfile).toHaveBeenCalledWith(horse.name)
  expect(searchTimeIndexHorses).not.toHaveBeenCalled()
  expect(getHorseTimeIndexDashboard).toHaveBeenCalledWith(expect.objectContaining({ horse: horse.name, view: "horses", startDate: undefined, endDate: undefined }), "v2")
  expect(html).toContain("選択条件のタイム指数")
  expect(html).toContain("収録全期間")
  expect(getTimeIndexDistribution).not.toHaveBeenCalled()
})

test("部分一致の1候補は直接表示し、複数なら選択してから履歴を取る", async () => {
  vi.mocked(searchTimeIndexHorses).mockResolvedValue({ horses: [horse], hasMore: false })
  await render({ q: "テスト" })
  expect(getHorseTimeIndexDashboard).toHaveBeenCalledWith(expect.objectContaining({ horse: horse.name }), "v2")
  vi.mocked(getHorseTimeIndexDashboard).mockClear()
  vi.mocked(searchTimeIndexHorses).mockResolvedValue({ horses: [horse, { ...horse, name: "テストノウマ" }], hasMore: false })
  expect(await render({ q: "テスト" })).toContain("競走馬を選択")
  expect(getHorseTimeIndexDashboard).not.toHaveBeenCalled()
})

test("旧horseクエリの部分一致と該当データなしも案内する", async () => {
  vi.mocked(getTimeIndexHorseProfile).mockResolvedValue(null)
  expect(await render({ horse: "不在" })).toContain("タイム指数は保存されていません")
  expect(searchTimeIndexHorses).toHaveBeenCalledWith("不在")
  vi.mocked(searchTimeIndexHorses).mockResolvedValue({ horses: [horse], hasMore: false })
  expect(await render({ horse: "テスト" })).toContain("選択条件のタイム指数")
})

test("全走画面では既定1週間と分布・一覧を維持する", async () => {
  const html = await render({ view: "all" })
  expect(html).toContain("全走一覧")
  expect(html).toContain("分布")
  expect(getTimeIndexPage).toHaveBeenCalledWith({ race_date: { gte: new Date("2026-09-25T00:00:00Z"), lte: new Date("2026-10-01T00:00:00Z") }, baseline_version: "v2" }, 1)
  expect(searchTimeIndexHorses).not.toHaveBeenCalled()
  expect(getHorseTimeIndexDashboard).not.toHaveBeenCalled()
})

test("選択した馬・期間・競馬場・ページ番号を取得処理へ渡す", async () => {
  await render({ horse: horse.name, start: "2024-01-01", end: "2026-01-01", racecourse: "東京", page: "2", version: "v2" })
  expect(getHorseTimeIndexDashboard).toHaveBeenCalledWith(expect.objectContaining({ horse: horse.name, startDate: "2024-01-01", endDate: "2026-01-01", racecourse: "東京", page: 2 }), "v2")
})
