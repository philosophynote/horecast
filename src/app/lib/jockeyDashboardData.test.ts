import { beforeEach, expect, test, vi } from "vitest"
import { getJockeyDashboardData, searchJockeys } from "./jockeyDashboardData"
import { getPrisma } from "@/lib/prisma"

vi.mock("@/lib/prisma", () => {
  const prisma = { jockeyMaster: { findMany: vi.fn(), findUnique: vi.fn() } }
  return { getPrisma: () => prisma }
})

const prisma = getPrisma()

beforeEach(() => vi.resetAllMocks())

test("空の検索ではデータベースへ問い合わせない", async () => {
  expect(await searchJockeys("")).toEqual({ jockeys: [], hasMore: false })
  expect(prisma.jockeyMaster.findMany).not.toHaveBeenCalled()
})

test("検索語をPrismaの条件に渡し、表示件数に上限を設ける", async () => {
  const matches = Array.from({ length: 21 }, (_, i) => ({
    id: i + 1, name: `騎手${i + 1}`, netkeiba_jockey_id: String(i + 1),
    created_at: new Date("2026-01-01Z"), updated_at: new Date("2026-01-01Z"),
  }))
  vi.mocked(prisma.jockeyMaster.findMany).mockResolvedValue(matches)
  const result = await searchJockeys("武")
  expect(result.jockeys).toHaveLength(20)
  expect(result.hasMore).toBe(true)
  expect(prisma.jockeyMaster.findMany).toHaveBeenCalledWith(expect.objectContaining({
    where: { OR: [
      { name: { contains: "武", mode: "insensitive" } },
      { JockeyRacecourseRecord: { some: { jockey_name: { contains: "武", mode: "insensitive" } } } },
    ] },
    take: 21,
  }))
})

test("成績は選択した騎手の関連行だけを取得する", async () => {
  vi.mocked(prisma.jockeyMaster.findUnique).mockResolvedValue(null)
  expect(await getJockeyDashboardData(12)).toBeNull()
  expect(prisma.jockeyMaster.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 12 } }))
})
