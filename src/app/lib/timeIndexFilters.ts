import type { Prisma } from "@prisma/client"
// 生成済みクライアント（prisma generate）に依存せずテストできるよう、SQLタグはランタイムから直接読む
import { join, sqltag, type Sql } from "@prisma/client/runtime/client"
import { formatInTimeZone } from "date-fns-tz"

// タイム指数ダッシュボードの純粋なヘルパー。DBアクセスは timeIndex.ts に置く。

/** 一覧の1ページあたり件数 */
export const TIME_INDEX_PAGE_SIZE = 50
/** 期間未指定時に表示する日数（直近の開催週） */
export const DEFAULT_PERIOD_DAYS = 7

export const CONFIDENCE_LEVELS = ["high", "medium", "low", "unavailable"] as const
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number]

export const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  high: "高",
  medium: "中",
  low: "低",
  unavailable: "算出不可",
}

export function isConfidenceLevel(value: string): value is ConfidenceLevel {
  return (CONFIDENCE_LEVELS as readonly string[]).includes(value)
}

/** ヒストグラムの範囲と刻み。範囲外は両端の階級に丸める */
export const HISTOGRAM_MIN = 70
export const HISTOGRAM_MAX = 130
export const HISTOGRAM_BIN_WIDTH = 2
export const HISTOGRAM_BIN_COUNT = (HISTOGRAM_MAX - HISTOGRAM_MIN) / HISTOGRAM_BIN_WIDTH

export const RACECOURSE_ORDER = ["札幌", "函館", "福島", "新潟", "東京", "中山", "中京", "京都", "阪神", "小倉"]
export const SURFACE_ORDER = ["芝", "ダート", "障害"]
export const GOING_ORDER = ["良", "稍重", "重", "不良"]

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export type SearchParamsInput = Record<string, string | string[] | undefined>

/** URLのクエリから読み取った絞り込み条件。未指定の項目は undefined */
export type TimeIndexFilter = {
  racecourse?: string
  surface?: string
  distance?: number
  className?: string
  going?: string
  confidence?: ConfidenceLevel
  version?: string
  startDate?: string
  endDate?: string
  horse?: string
  page: number
}

export const FILTER_PARAM_KEYS = {
  racecourse: "racecourse",
  surface: "surface",
  distance: "distance",
  className: "class",
  going: "going",
  confidence: "confidence",
  version: "version",
  startDate: "start",
  endDate: "end",
  horse: "horse",
  page: "page",
} as const

function firstValue(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value
  const trimmed = raw?.trim()
  return trimmed ? trimmed : undefined
}

function isValidDateString(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && formatInTimeZone(date, "UTC", "yyyy-MM-dd") === value
}

/**
 * クエリ文字列を絞り込み条件に変換する。不正な値は無視して未指定扱いにする。
 * 開始日が終了日より後なら期間は無効なので両方捨てる。
 */
export function parseTimeIndexSearchParams(searchParams: SearchParamsInput): TimeIndexFilter {
  const get = (key: string) => firstValue(searchParams[key])

  const distanceRaw = get(FILTER_PARAM_KEYS.distance)
  const distance = distanceRaw && /^\d+$/.test(distanceRaw) ? Number(distanceRaw) : undefined

  const pageRaw = get(FILTER_PARAM_KEYS.page)
  const page = pageRaw && /^\d+$/.test(pageRaw) && Number(pageRaw) >= 1 ? Number(pageRaw) : 1

  const confidenceRaw = get(FILTER_PARAM_KEYS.confidence)
  const confidence = confidenceRaw && isConfidenceLevel(confidenceRaw) ? confidenceRaw : undefined

  let startDate = get(FILTER_PARAM_KEYS.startDate)
  let endDate = get(FILTER_PARAM_KEYS.endDate)
  if (startDate && !isValidDateString(startDate)) startDate = undefined
  if (endDate && !isValidDateString(endDate)) endDate = undefined
  if (startDate && endDate && startDate > endDate) {
    startDate = undefined
    endDate = undefined
  }

  return {
    racecourse: get(FILTER_PARAM_KEYS.racecourse),
    surface: get(FILTER_PARAM_KEYS.surface),
    distance: distance && distance > 0 ? distance : undefined,
    className: get(FILTER_PARAM_KEYS.className),
    going: get(FILTER_PARAM_KEYS.going),
    confidence,
    version: get(FILTER_PARAM_KEYS.version),
    startDate,
    endDate,
    horse: get(FILTER_PARAM_KEYS.horse),
    page,
  }
}

/** 絞り込み条件をクエリ文字列に戻す。ページングや馬名検索のリンク生成に使う */
export function toTimeIndexSearchParams(
  filter: TimeIndexFilter,
  overrides: Partial<TimeIndexFilter> = {}
): URLSearchParams {
  const merged = { ...filter, ...overrides }
  const params = new URLSearchParams()
  const set = (key: string, value: string | number | undefined) => {
    if (value !== undefined && value !== "") params.set(key, String(value))
  }
  set(FILTER_PARAM_KEYS.racecourse, merged.racecourse)
  set(FILTER_PARAM_KEYS.surface, merged.surface)
  set(FILTER_PARAM_KEYS.distance, merged.distance)
  set(FILTER_PARAM_KEYS.className, merged.className)
  set(FILTER_PARAM_KEYS.going, merged.going)
  set(FILTER_PARAM_KEYS.confidence, merged.confidence)
  set(FILTER_PARAM_KEYS.version, merged.version)
  set(FILTER_PARAM_KEYS.startDate, merged.startDate)
  set(FILTER_PARAM_KEYS.endDate, merged.endDate)
  set(FILTER_PARAM_KEYS.horse, merged.horse)
  // 1ページ目はURLを短く保つため省略する
  if (merged.page > 1) set(FILTER_PARAM_KEYS.page, merged.page)
  return params
}

export function timeIndexHref(filter: TimeIndexFilter, overrides: Partial<TimeIndexFilter> = {}): string {
  const query = toTimeIndexSearchParams(filter, overrides).toString()
  return query ? `/time-index?${query}` : "/time-index"
}

export type Period = {
  startDate?: string
  endDate?: string
}

export function addDays(date: string, days: number): string {
  const base = new Date(`${date}T00:00:00Z`)
  base.setUTCDate(base.getUTCDate() + days)
  return formatInTimeZone(base, "UTC", "yyyy-MM-dd")
}

/**
 * 表示期間を決める。両方未指定なら最新開催日を終端とする直近1週間にし、
 * 条件を絞らない初期表示でも約33万行を走査しないようにする。
 * 片方だけ指定された場合はもう一方を開放する（全期間を見たいという明示的な指定とみなす）。
 */
export function resolvePeriod(filter: TimeIndexFilter, latestRaceDate: string | null): Period {
  if (filter.startDate || filter.endDate) {
    return { startDate: filter.startDate, endDate: filter.endDate }
  }
  if (!latestRaceDate) {
    return {}
  }
  return {
    startDate: addDays(latestRaceDate, -(DEFAULT_PERIOD_DAYS - 1)),
    endDate: latestRaceDate,
  }
}

function dateAtUtc(date: string): Date {
  return new Date(`${date}T00:00:00Z`)
}

/** Prisma の where 条件。一覧・集計・ヒストグラムで同じ条件を使う */
export function buildTimeIndexWhere(
  filter: TimeIndexFilter,
  period: Period,
  version: string | null
): Prisma.HorseTimeIndexWhereInput {
  const where: Prisma.HorseTimeIndexWhereInput = {}
  if (period.startDate || period.endDate) {
    where.race_date = {
      ...(period.startDate ? { gte: dateAtUtc(period.startDate) } : {}),
      ...(period.endDate ? { lte: dateAtUtc(period.endDate) } : {}),
    }
  }
  if (filter.racecourse) where.racecourse = filter.racecourse
  if (filter.surface) where.surface = filter.surface
  if (filter.distance) where.distance = filter.distance
  if (filter.className) where.class_name = filter.className
  if (filter.going) where.going = filter.going
  if (filter.confidence) where.baseline_confidence = filter.confidence
  if (version) where.baseline_version = version
  return where
}

/**
 * ヒストグラム用の生SQLの WHERE 句。buildTimeIndexWhere と同じ条件を表す。
 * 指数が算出できていない行は階級に入れないため常に除外する。
 */
export function buildTimeIndexWhereSql(
  filter: TimeIndexFilter,
  period: Period,
  version: string | null
): Sql {
  const conditions: Sql[] = [sqltag`"horecast_time_index_raw" IS NOT NULL`]
  if (period.startDate) conditions.push(sqltag`"race_date" >= ${dateAtUtc(period.startDate)}::date`)
  if (period.endDate) conditions.push(sqltag`"race_date" <= ${dateAtUtc(period.endDate)}::date`)
  if (filter.racecourse) conditions.push(sqltag`"racecourse" = ${filter.racecourse}`)
  if (filter.surface) conditions.push(sqltag`"surface" = ${filter.surface}`)
  if (filter.distance) conditions.push(sqltag`"distance" = ${filter.distance}`)
  if (filter.className) conditions.push(sqltag`"class_name" = ${filter.className}`)
  if (filter.going) conditions.push(sqltag`"going" = ${filter.going}`)
  if (filter.confidence) conditions.push(sqltag`"baseline_confidence" = ${filter.confidence}`)
  if (version) conditions.push(sqltag`"baseline_version" = ${version}`)
  return join(conditions, " AND ")
}

/**
 * netkeiba のレースIDは「年4桁 + 競馬場2桁 + 回2桁 + 日2桁 + レース2桁」。
 * 末尾2桁をレース番号として読む。形式が違えば null
 */
export function raceNumberFromNetkeibaRaceId(netkeibaRaceId: string): number | null {
  if (!/^\d{12}$/.test(netkeibaRaceId)) return null
  const number = Number(netkeibaRaceId.slice(-2))
  return number >= 1 && number <= 12 ? number : null
}

export function sortByKnownOrder(values: Iterable<string>, order: string[]): string[] {
  return Array.from(values).sort((a, b) => {
    const ia = order.indexOf(a)
    const ib = order.indexOf(b)
    if (ia === -1 && ib === -1) return a.localeCompare(b, "ja")
    if (ia === -1) return 1
    if (ib === -1) return -1
    return ia - ib
  })
}

export type HistogramBin = {
  /** 階級の下限（この値以上） */
  from: number
  /** 階級の上限（この値未満） */
  to: number
  count: number
}

/**
 * width_bucket の結果を階級に並べる。範囲外（bucket 0 と最終+1）は両端の階級に含める。
 */
export function toHistogramBins(rows: Array<{ bucket: number; count: number }>): HistogramBin[] {
  const bins: HistogramBin[] = Array.from({ length: HISTOGRAM_BIN_COUNT }, (_, i) => ({
    from: HISTOGRAM_MIN + i * HISTOGRAM_BIN_WIDTH,
    to: HISTOGRAM_MIN + (i + 1) * HISTOGRAM_BIN_WIDTH,
    count: 0,
  }))
  for (const row of rows) {
    const index = Math.min(Math.max(row.bucket, 1), HISTOGRAM_BIN_COUNT) - 1
    bins[index].count += row.count
  }
  return bins
}

/** 走破タイム（秒）を「1:35.3」形式にする */
export function formatRaceTime(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return "-"
  const minutes = Math.floor(seconds / 60)
  const rest = seconds - minutes * 60
  const restText = rest.toFixed(1).padStart(4, "0")
  return minutes > 0 ? `${minutes}:${restText}` : restText
}

export function formatTimeIndex(value: number | null): string {
  return value === null ? "-" : value.toFixed(1)
}
