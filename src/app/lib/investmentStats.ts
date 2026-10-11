import { type BetStatistics, aggregateStatistics } from "@/app/lib/statistics"
import { parseRaceDateParam, raceDayRange, toStoredDateString } from "@/app/lib/raceList"

/**
 * 投資成績ダッシュボードの純粋なロジック。/api/statistics とページの両方が使う型と変換。
 * DB アクセスはルートに置き、ここでは prisma を import しない
 */

export type StatisticsModel = "original" | "openai"

/** 行ごとの betTypeStats は送らない（期間が長いと無駄が大きい） */
export type RaceStatisticsSummary = Pick<
  BetStatistics,
  "totalBets" | "totalAmount" | "totalReturn" | "hitRate" | "returnRate" | "profit"
>

export type RaceStatisticsRow = {
  raceId: number
  /** 開催日 yyyy-MM-dd（保存規約） */
  date: string
  raceTime: string | null
  track: string
  raceNumber: number
  raceName: string
  statistics: RaceStatisticsSummary
}

/** ルート内部で集計に使う行。応答に出す前に summary へ絞る */
export type RaceStatisticsInput = Omit<RaceStatisticsRow, "statistics"> & { statistics: BetStatistics }

export type TrackStatistics = {
  track: string
  totalRaces: number
  totalAmount: number
  totalReturn: number
  returnRate: number
  profit: number
}

export type CumulativePoint = {
  date: string
  races: number
  dailyProfit: number
  cumulativeProfit: number
}

export type ModelStatistics = {
  totalRaces: number
  overallStatistics: BetStatistics
  raceStatistics: RaceStatisticsRow[]
  trackStatistics: TrackStatistics[]
  cumulative: CumulativePoint[]
}

export type StatisticsResponse = {
  period: { startDate: string; endDate: string }
  models: Record<StatisticsModel, ModelStatistics>
}

export type DateRange = { startDate: string; endDate: string }

export const DEFAULT_PERIOD_DAYS = 30
export const PERIOD_PRESETS = [7, 30, 90] as const

const DAY_MS = 24 * 60 * 60 * 1000

function addDays(date: string, days: number): string {
  return toStoredDateString(new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS))
}

/** 今日を含めて days 日間 */
export function periodPreset(days: number, today: string): DateRange {
  return { startDate: addDays(today, -(days - 1)), endDate: today }
}

export function matchesPreset(range: DateRange, days: number, today: string): boolean {
  const preset = periodPreset(days, today)
  return range.startDate === preset.startDate && range.endDate === preset.endDate
}

export function isValidRange(range: DateRange): boolean {
  return (
    parseRaceDateParam(range.startDate) !== null &&
    parseRaceDateParam(range.endDate) !== null &&
    range.startDate <= range.endDate
  )
}

export type ResolvedRange = {
  start: Date
  /** 終了日の翌日 00:00（UTC）。終了日を含めるため常に +1 日 */
  endExclusive: Date
  startDate: string
  endDate: string
}

/**
 * クエリの期間を解決する。未指定は既定へ、不正な文字列や開始 > 終了は null（ルートは 400）。
 * 片方だけ指定: 終了日未指定なら今日、開始日未指定なら終了日を含めて30日
 */
export function resolveStatisticsRange(
  params: { startDate: string | null; endDate: string | null },
  nowStored: Date,
): ResolvedRange | null {
  const today = toStoredDateString(nowStored)
  let endDate: string
  if (params.endDate === null) {
    endDate = today
  } else {
    if (!parseRaceDateParam(params.endDate)) return null
    endDate = params.endDate
  }
  let startDate: string
  if (params.startDate === null) {
    startDate = periodPreset(DEFAULT_PERIOD_DAYS, endDate).startDate
  } else {
    if (!parseRaceDateParam(params.startDate)) return null
    startDate = params.startDate
  }
  if (startDate > endDate) return null
  const start = raceDayRange(parseRaceDateParam(startDate) as Date).start
  const endExclusive = new Date(raceDayRange(parseRaceDateParam(endDate) as Date).end.getTime() + 1)
  return { start, endExclusive, startDate, endDate }
}

/** 的中した点数。BetStatistics には無いので券種別から合計する */
export function hitBetsOf(stats: BetStatistics): number {
  return stats.betTypeStats.reduce((sum, type) => sum + type.hitBets, 0)
}

export function toRaceStatisticsSummary(stats: BetStatistics): RaceStatisticsSummary {
  return {
    totalBets: stats.totalBets,
    totalAmount: stats.totalAmount,
    totalReturn: stats.totalReturn,
    hitRate: stats.hitRate,
    returnRate: stats.returnRate,
    profit: stats.profit,
  }
}

/** 競馬場ごとにまとめ、回収率の高い順（同率は競馬場名の文字コード順。環境の照合順序に依存しない） */
export function buildTrackStatistics(rows: RaceStatisticsInput[]): TrackStatistics[] {
  const byTrack = new Map<string, BetStatistics[]>()
  for (const row of rows) {
    const list = byTrack.get(row.track) ?? []
    list.push(row.statistics)
    byTrack.set(row.track, list)
  }
  return [...byTrack.entries()]
    .map(([track, stats]) => {
      const aggregated = aggregateStatistics(stats)
      return {
        track,
        totalRaces: stats.length,
        totalAmount: aggregated.totalAmount,
        totalReturn: aggregated.totalReturn,
        returnRate: aggregated.returnRate,
        profit: aggregated.profit,
      }
    })
    .sort((a, b) => b.returnRate - a.returnRate || (a.track < b.track ? -1 : a.track > b.track ? 1 : 0))
}

/** 開催日ごとの収支を日付昇順に累積する。レースが無い日は点を作らない */
export function buildCumulativeProfit(rows: Pick<RaceStatisticsInput, "date" | "statistics">[]): CumulativePoint[] {
  const byDate = new Map<string, { races: number; profit: number }>()
  for (const row of rows) {
    const current = byDate.get(row.date) ?? { races: 0, profit: 0 }
    current.races += 1
    current.profit += row.statistics.profit
    byDate.set(row.date, current)
  }
  let cumulative = 0
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => {
      cumulative += value.profit
      return { date, races: value.races, dailyProfit: value.profit, cumulativeProfit: cumulative }
    })
}

export const RETURN_RATE_BAR_MAX = 150

/** 0〜150% を 0〜100% の幅に。100% の目印は 100/150 の位置 */
export function returnRateBarWidth(rate: number): number {
  const clamped = Math.min(Math.max(rate, 0), RETURN_RATE_BAR_MAX)
  return (clamped / RETURN_RATE_BAR_MAX) * 100
}

export const RETURN_RATE_BASELINE_PERCENT = (100 / RETURN_RATE_BAR_MAX) * 100

export type CumulativeSeriesPoint = {
  date: string
  original: number | null
  openai: number | null
}

/**
 * 2モデルの累積を日付の和集合に結合する。片方にその日が無ければ直前の累積値を引き継ぎ、
 * 系列が始まる前は null（線を描かない）
 */
export function mergeCumulativeSeries(original: CumulativePoint[], openai: CumulativePoint[]): CumulativeSeriesPoint[] {
  const dates = [...new Set([...original, ...openai].map((point) => point.date))].sort()
  const originalByDate = new Map(original.map((point) => [point.date, point.cumulativeProfit]))
  const openaiByDate = new Map(openai.map((point) => [point.date, point.cumulativeProfit]))
  let lastOriginal: number | null = null
  let lastOpenai: number | null = null
  return dates.map((date) => {
    lastOriginal = originalByDate.get(date) ?? lastOriginal
    lastOpenai = openaiByDate.get(date) ?? lastOpenai
    return { date, original: lastOriginal, openai: lastOpenai }
  })
}

/** X 軸の tick に使う日付を max 個以下に間引く。先頭と末尾は残す */
export function thinDateTicks(dates: string[], max = 10): string[] {
  if (dates.length <= max) return dates
  const step = Math.ceil((dates.length - 1) / (max - 1))
  const picked = dates.filter((_, index) => index % step === 0)
  const last = dates[dates.length - 1]
  return picked[picked.length - 1] === last ? picked : [...picked, last]
}
