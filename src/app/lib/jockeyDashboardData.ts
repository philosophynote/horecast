import { getPrisma } from "@/lib/prisma"
import { JOCKEY_SEARCH_LIMIT } from "./jockeyDashboard"

/** 空の検索ではマスター全件を取得しない。余分な1件は検索の絞り直し案内に使う。 */
export async function searchJockeys(q: string) {
  if (!q) return { jockeys: [], hasMore: false }
  const matches = await getPrisma().jockeyMaster.findMany({
    where: {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { JockeyRacecourseRecord: { some: { jockey_name: { contains: q, mode: "insensitive" } } } },
      ],
    },
    select: { id: true, name: true },
    orderBy: [{ name: "asc" }, { id: "asc" }],
    take: JOCKEY_SEARCH_LIMIT + 1,
  })
  return { jockeys: matches.slice(0, JOCKEY_SEARCH_LIMIT), hasMore: matches.length > JOCKEY_SEARCH_LIMIT }
}

export async function getJockeyDashboardData(jockeyId: number) {
  return getPrisma().jockeyMaster.findUnique({
    where: { id: jockeyId },
    select: {
      id: true,
      name: true,
      JockeyRacecourseRecord: {
        select: {
          period: true,
          racecourse: true,
          surface: true,
          distance_band: true,
          rides: true,
          wins: true,
          seconds: true,
          thirds: true,
          first_race_date: true,
          last_race_date: true,
          generated_at: true,
        },
        orderBy: [{ generated_at: "desc" }, { id: "desc" }],
      },
    },
  })
}
