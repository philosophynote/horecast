import type { Prisma } from "@prisma/client"
import { formatInTimeZone } from "date-fns-tz"
import { prisma } from "@/lib/prisma"
import { getHorseTrend, getTimeIndexPage, toTimeIndexRows } from "./timeIndex"
import { buildTimeIndexWhere, type TimeIndexFilter } from "./timeIndexFilters"
import { HORSE_NAME_MAX_LENGTH, HORSE_SEARCH_LIMIT, horseDashboardPeriod, recentTimeIndexAverage, summarizeDistanceBands } from "./horseTimeIndexDashboard"

const dateText = (date: Date | null) => date ? formatInTimeZone(date, "UTC", "yyyy-MM-dd") : null
const numberValue = (value: Prisma.Decimal | null) => value?.toNumber() ?? null

const profileSelection = {
  by: ["horse_name"] as ["horse_name"],
  _min: { race_date: true as const },
  _max: { race_date: true as const, generated_at: true as const },
}

export type HorseTimeIndexProfile = {
  name: string
  firstDate: string | null
  lastDate: string | null
  generatedAt: string | null
}

function profile(row: { horse_name: string; _min: { race_date: Date | null }; _max: { race_date: Date | null; generated_at: Date | null } }): HorseTimeIndexProfile {
  return { name: row.horse_name, firstDate: dateText(row._min.race_date), lastDate: dateText(row._max.race_date), generatedAt: row._max.generated_at?.toISOString() ?? null }
}

export async function searchTimeIndexHorses(query: string) {
  const q = query.trim()
  if (!q || q.length > HORSE_NAME_MAX_LENGTH) return { horses: [], hasMore: false }
  const rows = await prisma.horseTimeIndex.groupBy({
    ...profileSelection,
    where: { horse_name: { contains: q } },
    orderBy: { horse_name: "asc" },
    take: HORSE_SEARCH_LIMIT + 1,
  })
  return { horses: rows.slice(0, HORSE_SEARCH_LIMIT).map(profile), hasMore: rows.length > HORSE_SEARCH_LIMIT }
}

export async function getTimeIndexHorseProfile(name: string): Promise<HorseTimeIndexProfile | null> {
  if (!name || name.length > HORSE_NAME_MAX_LENGTH) return null
  const rows = await prisma.horseTimeIndex.groupBy({ ...profileSelection, where: { horse_name: name } })
  return rows[0] ? profile(rows[0]) : null
}

const aggregateSelection = {
  _count: { _all: true as const, horecast_time_index_raw: true as const },
  _avg: { horecast_time_index_raw: true as const },
  _max: { horecast_time_index_raw: true as const },
}

type AggregateRow = {
  _count: { _all: number; horecast_time_index_raw: number }
  _avg: { horecast_time_index_raw: Prisma.Decimal | null }
  _max: { horecast_time_index_raw: Prisma.Decimal | null }
}
function condition(row: AggregateRow, label: string) {
  return { label, total: row._count._all, indexed: row._count.horecast_time_index_raw, average: numberValue(row._avg.horecast_time_index_raw), max: numberValue(row._max.horecast_time_index_raw) }
}

export async function getHorseTimeIndexDashboard(filter: TimeIndexFilter & { horse: string }, version: string) {
  const whereFor = (overrides: Partial<TimeIndexFilter> = {}) => ({
    ...buildTimeIndexWhere({ ...filter, ...overrides }, horseDashboardPeriod(filter), version),
    horse_name: filter.horse,
  })
  const where = whereFor()
  const [summary, latest, best, page, trend, racecourses, surfaces, distances] = await Promise.all([
    prisma.horseTimeIndex.aggregate({
      ...aggregateSelection, where,
      _min: { race_date: true },
      _max: { horecast_time_index_raw: true, race_date: true, generated_at: true },
    }),
    prisma.horseTimeIndex.findMany({ where, orderBy: [{ race_date: "desc" }, { netkeiba_race_id: "desc" }, { horse_number: "asc" }], take: 5 }),
    prisma.horseTimeIndex.findFirst({ where: { ...where, horecast_time_index_raw: { not: null } }, orderBy: [{ horecast_time_index_raw: "desc" }, { race_date: "desc" }, { netkeiba_race_id: "desc" }, { horse_number: "asc" }] }),
    getTimeIndexPage(where, filter.page),
    getHorseTrend(filter.horse, version, filter),
    prisma.horseTimeIndex.groupBy({ ...aggregateSelection, by: ["racecourse"], where: whereFor({ racecourse: undefined }), orderBy: { racecourse: "asc" } }),
    prisma.horseTimeIndex.groupBy({ ...aggregateSelection, by: ["surface"], where: whereFor({ surface: undefined }), orderBy: { surface: "asc" } }),
    prisma.horseTimeIndex.groupBy({ ...aggregateSelection, by: ["distance"], where: whereFor({ distance: undefined }), orderBy: { distance: "asc" } }),
  ])
  const linked = await toTimeIndexRows(best ? [...latest, best] : latest)
  const recent = linked.slice(0, latest.length)
  return {
    summary: {
      total: summary._count._all,
      indexed: summary._count.horecast_time_index_raw,
      average: numberValue(summary._avg.horecast_time_index_raw),
      firstDate: dateText(summary._min.race_date),
      lastDate: dateText(summary._max.race_date),
      generatedAt: summary._max.generated_at?.toISOString() ?? null,
      latest: recent.length ? recent[0] : null,
      recent: recentTimeIndexAverage(recent),
      best: best ? linked[linked.length - 1] : null,
    },
    page, trend,
    racecourses: racecourses.map((row) => condition(row, row.racecourse)),
    surfaces: surfaces.map((row) => condition(row, row.surface)),
    distances: summarizeDistanceBands(distances.map((row) => ({ ...condition(row, ""), distance: row.distance }))),
  }
}

export type HorseTimeIndexDashboardData = Awaited<ReturnType<typeof getHorseTimeIndexDashboard>>
