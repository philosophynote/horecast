import { DISTANCE_BANDS, toDistanceBand } from "./jockeyRecordLabels"
import { FILTER_PARAM_KEYS, parseTimeIndexSearchParams, timeIndexHref, type SearchParamsInput, type TimeIndexFilter } from "./timeIndexFilters"

export const HORSE_NAME_MAX_LENGTH = 100
export const HORSE_SEARCH_LIMIT = 20

export function horseTimeIndexHref(horse: string): string {
  return timeIndexHref({ horse, page: 1 })
}

/** 従来の条件だけを持つURLは全走画面へ。horseクエリは馬別画面として扱う。 */
export function parseHorseTimeIndexParams(params: SearchParamsInput) {
  const filter = parseTimeIndexSearchParams(params)
  const hasLegacyFilters = ["racecourse", "surface", "distance", "class", "going", "confidence", "version", "start", "end", "page"].some((key) => params[key] !== undefined)
  const view = filter.view ?? (filter.horse || filter.q ? "horses" : hasLegacyFilters ? "all" : "horses")
  const repeated = Object.values(FILTER_PARAM_KEYS).some((key) => Array.isArray(params[key]))
  const tooLong = Object.values(params).some((value) => typeof value === "string" && value.length > 100)
  let error: string | null = repeated ? "同じ条件を複数指定できません。検索し直してください。" : tooLong ? "検索語や条件は100文字以内で指定してください。" : null
  if (params.view && params.view !== "all" && params.view !== "horses") error = "表示方法が不正です。検索し直してください。"
  if ((params.start && !filter.startDate) || (params.end && !filter.endDate)) error = "期間は正しい日付で、開始日を終了日以前に指定してください。"
  if (params.distance && !filter.distance) error = "距離は正の整数で指定してください。"
  if (filter.distance && (!Number.isSafeInteger(filter.distance) || filter.distance > 100_000)) error = "距離が不正です。"
  if (params.confidence && !filter.confidence) error = "信頼度が不正です。"
  return { filter: { ...filter, view, horse: view === "all" ? undefined : filter.horse }, error }
}

export function timeIndexUnavailableReason(reason: string | null): string {
  if (reason === "time_missing") return "走破タイムなし"
  if (reason === "baseline_unavailable") return "基準タイムなし"
  return reason && /[ぁ-んァ-ヶ一-龠]/.test(reason) ? reason : "指数を算出できません"
}

export type ConditionSummary = {
  label: string
  total: number
  indexed: number
  average: number | null
  max: number | null
}

/** 距離ごとの集計から距離帯へ。有効件数で重み付けし、nullは0にしない。 */
export function summarizeDistanceBands(rows: (Omit<ConditionSummary, "label"> & { distance: number })[]): ConditionSummary[] {
  return DISTANCE_BANDS.flatMap((label) => {
    const own = rows.filter((row) => toDistanceBand(row.distance) === label)
    if (own.length === 0) return []
    const indexed = own.reduce((sum, row) => sum + row.indexed, 0)
    const values = own.flatMap((row) => row.max === null ? [] : [row.max])
    return [{
      label,
      total: own.reduce((sum, row) => sum + row.total, 0),
      indexed,
      average: indexed ? own.reduce((sum, row) => sum + (row.average ?? 0) * row.indexed, 0) / indexed : null,
      max: values.length ? Math.max(...values) : null,
    }]
  })
}

export function recentTimeIndexAverage(runs: { timeIndex: number | null }[]) {
  const values = runs.slice(0, 5).flatMap((run) => run.timeIndex === null ? [] : [run.timeIndex])
  return { count: values.length, average: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null }
}

export function horseDashboardPeriod(filter: TimeIndexFilter) {
  return { startDate: filter.startDate, endDate: filter.endDate }
}
