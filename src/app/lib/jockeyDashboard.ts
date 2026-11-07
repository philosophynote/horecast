import type { JockeyRacecourseRecord } from "@prisma/client"
import { ALL, DISTANCE_BANDS } from "./jockeyRecordLabels"

export const JOCKEY_SEARCH_LIMIT = 20
export const JOCKEY_NAME_MAX_LENGTH = 100

export type JockeySearchParams = Record<string, string | string[] | undefined>
export type JockeyDashboardFilter = {
  q: string
  jockeyId?: number
  period: string
  racecourse: string
  surface: string
  distanceBand: string
}

export type JockeyDashboardRecord = Pick<
  JockeyRacecourseRecord,
  "period" | "racecourse" | "surface" | "distance_band" | "rides" | "wins" | "seconds" | "thirds" |
  "first_race_date" | "last_race_date" | "generated_at"
>

export function parseJockeyDashboardParams(params: JockeySearchParams): {
  filter: JockeyDashboardFilter
  error: string | null
} {
  let error: string | null = null
  const text = (key: string, fallback = ALL) => {
    const value = params[key]
    if (value === undefined) return fallback
    if (typeof value !== "string" || value.trim().length > JOCKEY_NAME_MAX_LENGTH) {
      error = "検索条件が不正です。騎手名は100文字以内で入力してください。"
      return fallback
    }
    return value.trim() || fallback
  }
  const q = text("q", "")
  const id = text("jockey", "")
  const jockeyId = /^[1-9]\d*$/.test(id) && Number(id) <= 2_147_483_647 ? Number(id) : undefined
  if (id && jockeyId === undefined) error = "騎手の指定が不正です。騎手名から検索し直してください。"
  const filter = {
    q,
    jockeyId,
    period: text("period"),
    racecourse: text("racecourse"),
    surface: text("surface"),
    distanceBand: text("distanceBand"),
  }
  return { filter, error }
}

export function jockeyDashboardHref(jockeyId: number, q = ""): string {
  const params = new URLSearchParams({ jockey: String(jockeyId) })
  if (q) params.set("q", q)
  return `/jockeys?${params}`
}

export function jockeyRates(row: Pick<JockeyDashboardRecord, "rides" | "wins" | "seconds" | "thirds">) {
  if (row.rides === 0) return { win: null, quinella: null, place: null }
  return {
    win: row.wins / row.rides,
    quinella: (row.wins + row.seconds) / row.rides,
    place: (row.wins + row.seconds + row.thirds) / row.rides,
  }
}

/** all 行と内訳は重複する。合算せず、保存された条件に完全一致する行を選ぶ。 */
export function buildJockeyDashboard(records: JockeyDashboardRecord[], filter: JockeyDashboardFilter) {
  const rows = records.filter((row) => row.period === filter.period)
  const matches = (row: JockeyDashboardRecord, except?: "racecourse" | "surface" | "distance_band") =>
    (except === "racecourse" || row.racecourse === filter.racecourse) &&
    (except === "surface" || row.surface === filter.surface) &&
    (except === "distance_band" || row.distance_band === filter.distanceBand)

  // 同じマスターに複数の表記が紐づく場合も、同条件の最新行だけを使う。
  const latestRows = [...rows].sort((a, b) => b.generated_at.getTime() - a.generated_at.getTime())
  const breakdown = (dimension: "racecourse" | "surface" | "distance_band") => {
    const distinct = new Map<string, JockeyDashboardRecord>()
    for (const row of latestRows) {
      if (row[dimension] !== ALL && matches(row, dimension) && !distinct.has(row[dimension])) {
        distinct.set(row[dimension], row)
      }
    }
    return [...distinct.values()].sort((a, b) => {
      if (dimension === "distance_band") {
        const index = (value: string) => {
          const i = (DISTANCE_BANDS as readonly string[]).indexOf(value)
          return i === -1 ? DISTANCE_BANDS.length : i
        }
        return index(a.distance_band) - index(b.distance_band) || a.distance_band.localeCompare(b.distance_band, "ja")
      }
      return a[dimension].localeCompare(b[dimension], "ja")
    })
  }
  const choices = (key: "period" | "racecourse" | "surface" | "distance_band") =>
    [...new Set((key === "period" ? records : rows).map((row) => row[key]))]
      .filter((value) => value !== ALL)
      .sort((a, b) => a.localeCompare(b, "ja", { numeric: true }))

  return {
    summary: latestRows.find((row) => matches(row)) ?? null,
    racecourses: breakdown("racecourse"),
    surfaces: breakdown("surface"),
    distances: breakdown("distance_band"),
    options: {
      periods: choices("period"),
      racecourses: choices("racecourse"),
      surfaces: choices("surface"),
      distanceBands: choices("distance_band"),
    },
  }
}
