import { beforeEach, expect, test, vi } from "vitest"
import type { HorseTimeIndex } from "@prisma/client"
import { Decimal } from "@prisma/client/runtime/client"
import { getHorseTimeIndexDashboard, getTimeIndexHorseProfile, searchTimeIndexHorses } from "./horseTimeIndexData"

const { table, races } = vi.hoisted(() => ({
  table: { groupBy: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), aggregate: vi.fn(), count: vi.fn() },
  races: { findMany: vi.fn() },
}))
vi.mock("@/lib/prisma", () => ({ prisma: { horseTimeIndex: table, race: races } }))
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }))

const d = (day: string) => new Date(`${day}T00:00:00Z`)
const decimal = (value: number | null) => value === null ? null : new Decimal(value)
const run = (id: number, index: number | null): HorseTimeIndex => ({
  id, netkeiba_race_id: `2026050101${String(id).padStart(2, "0")}`, horse_number: 1, horse_name: "テストホース",
  race_date: d(`2026-10-${String(id).padStart(2, "0")}`), racecourse: "東京", surface: "芝", distance: 1600, class_name: "1勝クラス", going: "良",
  time_seconds: decimal(index === null ? null : 95), baseline_seconds: decimal(96), baseline_sample_size: 30, baseline_confidence: index === null ? "unavailable" : "high",
  baseline_version: "v2", horecast_time_index_raw: decimal(index), unavailable_reason: index === null ? "time_missing" : null,
  generated_at: d("2026-11-01"), created_at: d("2026-11-01"), updated_at: d("2026-11-01"),
})
const aggregate = (total: number, indexed: number, average: number | null, max: number | null) => ({
  _count: { _all: total, horecast_time_index_raw: indexed },
  _avg: { horecast_time_index_raw: decimal(average) },
  _min: { race_date: total ? d("2026-01-01") : null },
  _max: { horecast_time_index_raw: decimal(max), race_date: total ? d("2026-10-01") : null, generated_at: total ? d("2026-11-01") : null },
})

beforeEach(() => {
  vi.resetAllMocks()
  races.findMany.mockResolvedValue([])
  table.groupBy.mockResolvedValue([])
  table.findMany.mockResolvedValue([])
  table.findFirst.mockResolvedValue(null)
  table.aggregate.mockResolvedValue(aggregate(0, 0, null, null))
  table.count.mockResolvedValue(0)
})

test("空・長すぎる検索ではDBへ問い合わせず、馬名の部分一致で21候補まで取得する", async () => {
  expect(await searchTimeIndexHorses(" ")).toEqual({ horses: [], hasMore: false })
  await searchTimeIndexHorses("馬".repeat(101))
  expect(table.groupBy).not.toHaveBeenCalled()
  table.groupBy.mockResolvedValue(Array.from({ length: 21 }, (_, id) => ({ horse_name: `馬${id}`, _min: { race_date: d("2026-01-01") }, _max: { race_date: d("2026-10-01"), generated_at: d("2026-11-01") } })))
  const result = await searchTimeIndexHorses(" 馬 ")
  expect(result.horses).toHaveLength(20)
  expect(result.hasMore).toBe(true)
  expect(table.groupBy).toHaveBeenCalledWith(expect.objectContaining({ by: ["horse_name"], where: { horse_name: { contains: "馬" } }, take: 21 }))
})

test("選択された馬は名前を完全一致させ、RaceやEntryの存在を条件にしない", async () => {
  table.groupBy.mockResolvedValue([{ horse_name: "テストホース", _min: { race_date: d("2026-01-01") }, _max: { race_date: d("2026-10-01"), generated_at: d("2026-11-01") } }])
  expect(await getTimeIndexHorseProfile("テストホース")).toMatchObject({ name: "テストホース", firstDate: "2026-01-01" })
  expect(table.groupBy).toHaveBeenCalledWith(expect.objectContaining({ where: { horse_name: "テストホース" } }))
  expect(races.findMany).not.toHaveBeenCalled()
})

test("全取得に馬名とバージョンを適用し、最新走の欠測を古い値で埋めず、直近5走だけで平均する", async () => {
  const latest = [run(6, null), run(5, 0), run(4, 100), run(3, null), run(2, 80)]
  table.aggregate.mockResolvedValue(aggregate(6, 4, 75, 120))
  table.count.mockResolvedValue(6)
  table.findFirst.mockResolvedValue(run(1, 120))
  table.findMany.mockImplementation(({ take }: { take: number }) => Promise.resolve(take === 5 ? latest : [...latest, run(1, 120)]))
  const data = await getHorseTimeIndexDashboard({ horse: "テストホース", page: 1 }, "v2")
  expect(data.summary.latest?.timeIndex).toBeNull()
  expect(data.summary.recent).toEqual({ count: 3, average: 60 })
  expect(data.summary.best?.timeIndex).toBe(120)
  expect(data.trend.runs.map((row) => row.id)).toEqual([1, 2, 3, 4, 5, 6])
  expect(data.page.rows.every((row) => row.raceId === null)).toBe(true)
  for (const mock of [table.aggregate, table.findMany, table.findFirst, table.count, table.groupBy]) {
    for (const [args] of mock.mock.calls) expect(args.where).toMatchObject({ horse_name: "テストホース", baseline_version: "v2" })
  }
  expect(table.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 100, orderBy: [{ race_date: "desc" }, { netkeiba_race_id: "desc" }, { horse_number: "asc" }] }))
})

test("条件別集計では比較軸だけを外し、履歴と推移には全条件を反映する", async () => {
  const filter = { horse: "テストホース", racecourse: "東京", surface: "芝", distance: 1600, confidence: "high" as const, startDate: "2026-01-01", page: 2 }
  await getHorseTimeIndexDashboard(filter, "v2")
  const groups = table.groupBy.mock.calls.map(([args]) => args)
  expect(groups.find((args) => args.by[0] === "racecourse").where).toEqual({ horse_name: "テストホース", surface: "芝", distance: 1600, baseline_confidence: "high", baseline_version: "v2", race_date: { gte: d("2026-01-01") } })
  expect(groups.find((args) => args.by[0] === "surface").where).not.toHaveProperty("surface")
  expect(groups.find((args) => args.by[0] === "surface").where).toHaveProperty("racecourse", "東京")
  expect(groups.find((args) => args.by[0] === "distance").where).not.toHaveProperty("distance")
  for (const [args] of table.findMany.mock.calls) expect(args.where).toMatchObject({ racecourse: "東京", surface: "芝", distance: 1600, race_date: { gte: d("2026-01-01") } })
  expect(table.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 50, take: 50 }))
})

test("データなしは平均null、履歴と推移は空になり、条件を広げない", async () => {
  const data = await getHorseTimeIndexDashboard({ horse: "テストホース", page: 1 }, "v2")
  expect(data.summary).toMatchObject({ total: 0, indexed: 0, average: null, latest: null, best: null, recent: { count: 0, average: null } })
  expect(data.page.rows).toEqual([])
  expect(data.trend.runs).toEqual([])
  expect(table.groupBy).toHaveBeenCalledTimes(3)
})
