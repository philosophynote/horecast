import { Prisma, type HorseTimeIndex } from "@prisma/client"
import { unstable_cache } from "next/cache"
import { formatInTimeZone } from "date-fns-tz"
import { prisma } from "@/lib/prisma"
import {
  CONFIDENCE_LEVELS,
  GOING_ORDER,
  HISTOGRAM_BIN_COUNT,
  HISTOGRAM_MAX,
  HISTOGRAM_MIN,
  RACECOURSE_ORDER,
  SURFACE_ORDER,
  TIME_INDEX_PAGE_SIZE,
  isConfidenceLevel,
  raceNumberFromNetkeibaRaceId,
  sortByKnownOrder,
  toHistogramBins,
  type HistogramBin,
  type TimeIndexFilter,
} from "@/app/lib/timeIndexFilters"

// タイム指数ダッシュボードのDBアクセス。絞り込み条件の組み立ては timeIndexFilters.ts を使う。

/** 馬ごとの推移で表示する最大走数 */
export const HORSE_TREND_LIMIT = 100

export type TimeIndexRow = {
  id: number
  netkeibaRaceId: string
  /** `Race` に存在する場合だけ入る。レース詳細へのリンクに使う */
  raceId: number | null
  raceNumber: number | null
  horseNumber: number
  horseName: string
  raceDate: string
  racecourse: string
  surface: string
  distance: number
  className: string
  going: string
  timeSeconds: number | null
  baselineSeconds: number | null
  baselineSampleSize: number
  baselineConfidence: string
  baselineVersion: string
  timeIndex: number | null
  unavailableReason: string | null
}

function toNumber(value: Prisma.Decimal | null): number | null {
  return value === null ? null : value.toNumber()
}

async function findLinkedRaces(netkeibaRaceIds: string[]): Promise<Map<string, { id: number; number: number }>> {
  if (netkeibaRaceIds.length === 0) return new Map()
  const races = await prisma.race.findMany({
    where: { netkeiba_race_id: { in: Array.from(new Set(netkeibaRaceIds)) } },
    select: { id: true, number: true, netkeiba_race_id: true },
  })
  return new Map(races.map((race) => [race.netkeiba_race_id, { id: race.id, number: race.number }]))
}

/** Decimal や Date を画面用の値に変換し、Race に存在する行にはレースIDを付ける */
async function toTimeIndexRows(records: HorseTimeIndex[]): Promise<TimeIndexRow[]> {
  const linked = await findLinkedRaces(records.map((record) => record.netkeiba_race_id))
  return records.map((record) => {
    const race = linked.get(record.netkeiba_race_id)
    return {
      id: record.id,
      netkeibaRaceId: record.netkeiba_race_id,
      raceId: race?.id ?? null,
      raceNumber: race?.number ?? raceNumberFromNetkeibaRaceId(record.netkeiba_race_id),
      horseNumber: record.horse_number,
      horseName: record.horse_name,
      raceDate: formatInTimeZone(record.race_date, "UTC", "yyyy-MM-dd"),
      racecourse: record.racecourse,
      surface: record.surface,
      distance: record.distance,
      className: record.class_name,
      going: record.going,
      timeSeconds: toNumber(record.time_seconds),
      baselineSeconds: toNumber(record.baseline_seconds),
      baselineSampleSize: record.baseline_sample_size,
      baselineConfidence: record.baseline_confidence,
      baselineVersion: record.baseline_version,
      timeIndex: toNumber(record.horecast_time_index_raw),
      unavailableReason: record.unavailable_reason,
    }
  })
}

export type TimeIndexFilterOptions = {
  racecourses: string[]
  surfaces: string[]
  distances: number[]
  classNames: string[]
  goings: string[]
  /** 生成日時の新しい順 */
  versions: string[]
  latestRaceDate: string | null
}

/**
 * 絞り込みの選択肢を実データから作る。
 * 全行の走査になるので1時間キャッシュする（データ更新は週次バッチのため十分）。
 */
export const getTimeIndexFilterOptions = unstable_cache(
  async (): Promise<TimeIndexFilterOptions> => {
    const [combinations, versions, latest] = await Promise.all([
      prisma.horseTimeIndex.groupBy({
        by: ["racecourse", "surface", "distance", "class_name", "going"],
      }),
      prisma.horseTimeIndex.groupBy({
        by: ["baseline_version"],
        _max: { generated_at: true },
      }),
      prisma.horseTimeIndex.findFirst({
        orderBy: { race_date: "desc" },
        select: { race_date: true },
      }),
    ])

    const sortedVersions = [...versions]
      .sort((a, b) => (b._max.generated_at?.getTime() ?? 0) - (a._max.generated_at?.getTime() ?? 0))
      .map((version) => version.baseline_version)

    return {
      racecourses: sortByKnownOrder(new Set(combinations.map((c) => c.racecourse)), RACECOURSE_ORDER),
      surfaces: sortByKnownOrder(new Set(combinations.map((c) => c.surface)), SURFACE_ORDER),
      distances: Array.from(new Set(combinations.map((c) => c.distance))).sort((a, b) => a - b),
      classNames: Array.from(new Set(combinations.map((c) => c.class_name))).sort((a, b) => a.localeCompare(b, "ja")),
      goings: sortByKnownOrder(new Set(combinations.map((c) => c.going)), GOING_ORDER),
      versions: sortedVersions,
      latestRaceDate: latest ? formatInTimeZone(latest.race_date, "UTC", "yyyy-MM-dd") : null,
    }
  },
  ["time-index-filter-options"],
  { revalidate: 60 * 60 }
)

/** 指定が無ければ最新バージョンだけを表示し、複数バージョンの行が混ざって二重に数えないようにする */
export function resolveVersion(filter: TimeIndexFilter, options: TimeIndexFilterOptions): string | null {
  if (filter.version) return filter.version
  return options.versions[0] ?? null
}

export type TimeIndexPage = {
  rows: TimeIndexRow[]
  total: number
  page: number
  pageCount: number
}

export async function getTimeIndexPage(where: Prisma.HorseTimeIndexWhereInput, page: number): Promise<TimeIndexPage> {
  const [records, total] = await Promise.all([
    prisma.horseTimeIndex.findMany({
      where,
      orderBy: [
        { race_date: "desc" },
        { racecourse: "asc" },
        { netkeiba_race_id: "asc" },
        { horse_number: "asc" },
      ],
      skip: (page - 1) * TIME_INDEX_PAGE_SIZE,
      take: TIME_INDEX_PAGE_SIZE,
    }),
    prisma.horseTimeIndex.count({ where }),
  ])

  return {
    rows: await toTimeIndexRows(records),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / TIME_INDEX_PAGE_SIZE)),
  }
}

export type ConfidenceBreakdown = {
  confidence: string
  count: number
}

export type TimeIndexDistribution = {
  bins: HistogramBin[]
  /** 指数が算出できた行数 */
  indexedCount: number
  /** 絞り込み条件に一致した全行数（算出不可を含む） */
  totalCount: number
  average: number | null
  min: number | null
  max: number | null
  confidences: ConfidenceBreakdown[]
}

export async function getTimeIndexDistribution(
  where: Prisma.HorseTimeIndexWhereInput,
  whereSql: Prisma.Sql
): Promise<TimeIndexDistribution> {
  const [histogram, aggregate, confidences] = await Promise.all([
    // 階級ごとの件数をDB側で数え、全期間を指定されても指数を全件取り出さないようにする
    prisma.$queryRaw<Array<{ bucket: number; count: number }>>(Prisma.sql`
      SELECT
        width_bucket("horecast_time_index_raw", ${HISTOGRAM_MIN}, ${HISTOGRAM_MAX}, ${HISTOGRAM_BIN_COUNT})::int AS bucket,
        count(*)::int AS count
      FROM "HorseTimeIndex"
      WHERE ${whereSql}
      GROUP BY bucket
      ORDER BY bucket
    `),
    prisma.horseTimeIndex.aggregate({
      where,
      _count: { _all: true, horecast_time_index_raw: true },
      _avg: { horecast_time_index_raw: true },
      _min: { horecast_time_index_raw: true },
      _max: { horecast_time_index_raw: true },
    }),
    prisma.horseTimeIndex.groupBy({
      by: ["baseline_confidence"],
      where,
      _count: { _all: true },
    }),
  ])

  const confidenceCounts = new Map(confidences.map((c) => [c.baseline_confidence, c._count._all]))
  const knownConfidences: ConfidenceBreakdown[] = CONFIDENCE_LEVELS.map((level) => ({
    confidence: level,
    count: confidenceCounts.get(level) ?? 0,
  }))
  // 想定外の値があっても隠さず末尾に並べる
  const unknownConfidences = confidences
    .filter((c) => !isConfidenceLevel(c.baseline_confidence))
    .map((c) => ({ confidence: c.baseline_confidence, count: c._count._all }))
    .sort((a, b) => b.count - a.count)

  return {
    bins: toHistogramBins(histogram),
    indexedCount: aggregate._count.horecast_time_index_raw,
    totalCount: aggregate._count._all,
    average: toNumber(aggregate._avg.horecast_time_index_raw),
    min: toNumber(aggregate._min.horecast_time_index_raw),
    max: toNumber(aggregate._max.horecast_time_index_raw),
    confidences: [...knownConfidences, ...unknownConfidences],
  }
}

export type HorseTrend = {
  horseName: string
  /** 古い走から順に並ぶ */
  runs: TimeIndexRow[]
  /** 完全一致する馬がいないときの候補名 */
  candidates: string[]
}

export async function getHorseTrend(horseName: string, version: string | null): Promise<HorseTrend> {
  const versionWhere = version ? { baseline_version: version } : {}
  const records = await prisma.horseTimeIndex.findMany({
    where: { horse_name: horseName, ...versionWhere },
    orderBy: [{ race_date: "asc" }, { netkeiba_race_id: "asc" }],
    take: HORSE_TREND_LIMIT,
  })

  if (records.length > 0) {
    return { horseName, runs: await toTimeIndexRows(records), candidates: [] }
  }

  const candidates = await prisma.horseTimeIndex.groupBy({
    by: ["horse_name"],
    where: { horse_name: { contains: horseName }, ...versionWhere },
    orderBy: { horse_name: "asc" },
    take: 20,
  })
  return { horseName, runs: [], candidates: candidates.map((c) => c.horse_name) }
}
