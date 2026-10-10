import type { Entry, HorseIndicator, Predict, Race, RecommendedBet } from "@prisma/client"
import { formatInTimeZone } from "date-fns-tz"
import { type IndicatorLabel, toHorseIndicatorLabels } from "@/app/lib/indicatorLabels"
import { toHorsePredictionRanks } from "@/app/lib/horsePredictionRanks"
import {
  type BetStatistics,
  type PayoutForStatistics,
  aggregateStatistics,
  calculateStatistics,
  matchBetsWithPayouts,
} from "@/app/lib/statistics"

/**
 * トップページのレース一覧。/api/races とページの両方が使う型と純粋な変換。
 * DB アクセスは API ルートに置き、ここでは prisma を import しない
 *
 * 日時の規約: race_time は JST の壁時計を UTC として保存している（09:50 JST → 09:50Z）。
 * 表示は 'UTC' で整形し、現在時刻と比べるときは nowAsStoredClock で同じ規約へ寄せる
 */

export type RacePick = {
  horseNumber: number
  bracketNumber: number | null
  horseName: string | null
}

export type RaceBetSummary = {
  investment: number
  payout: number
  /** 推奨馬券のうち1点でも的中したか。払戻が投資を下回っても的中 */
  isHit: boolean
}

export type RacePickup = {
  ability: IndicatorLabel
  conditionFit: IndicatorLabel
  /** 直近走のタイム指数。無ければ null */
  recentTimeIndex: number | null
}

export type RaceListItem = {
  id: number
  track: string
  number: number
  name: string
  courseType: string
  distance: number
  /** ISO 文字列。保存値そのまま（JST 壁時計を UTC として） */
  raceTime: string | null
  /** 独自予想か OpenAI のどちらかの予想がある */
  hasPrediction: boolean
  /** 独自予想の◎。Predict の score 最大（同点は馬番が小さい方） */
  originalPick: RacePick | null
  /** OpenAI の◎。最新 logic_version の rank 1 */
  openAiPick: RacePick | null
  /** Payout がある */
  isSettled: boolean
  /** 独自予想の推奨馬券。無ければ null */
  bet: RaceBetSummary | null
  /** 両モデルの◎が一致したときだけ、その馬の指標 */
  pickup: RacePickup | null
}

export type RaceDaySummary = {
  totalRaces: number
  predictedRaces: number
  settledRaces: number
  /** 独自予想の成績。確定済みかつ推奨馬券のあるレースが無ければ null */
  original: {
    investment: number
    payout: number
    returnRate: number
    profit: number
  } | null
}

export type RaceListResponse = {
  date: string
  summary: RaceDaySummary
  races: RaceListItem[]
}

/** /api/races が select する形。Pick で表して DB 無しでも組み立てられるようにする */
export type RaceListSource = Pick<
  Race,
  "id" | "track" | "number" | "name" | "course_type" | "distance" | "race_time"
> & {
  entries: (Pick<Entry, "horse_number" | "bracket_number"> & {
    HorseMaster: { name: string } | null
  })[]
  predicts: Pick<Predict, "horse_number" | "score">[]
  horse_indicators: Pick<
    HorseIndicator,
    | "horse_number"
    | "rank"
    | "logic_version"
    | "generated_at"
    | "created_at"
    | "base_ability"
    | "condition_fit"
    | "history_count"
    | "time_index_recent"
  >[]
  recommended_bets: Pick<RecommendedBet, "bet_type" | "numbers" | "bet">[]
  payouts: PayoutForStatistics[]
}

const JST_OFFSET_MS = 9 * 60 * 60 * 1000
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** 実時刻を、JST 壁時計を UTC として保存した race_time と比べられる値にする */
export function nowAsStoredClock(now: Date): Date {
  return new Date(now.getTime() + JST_OFFSET_MS)
}

/** 保存規約の Date を yyyy-MM-dd にする */
export function toStoredDateString(date: Date): string {
  return formatInTimeZone(date, "UTC", "yyyy-MM-dd")
}

/** yyyy-MM-dd だけを受け付け、UTC の 00:00 を返す。繰り上がる日付（2月30日など）も弾く */
export function parseRaceDateParam(value: string | null): Date | null {
  if (!value || !DATE_PATTERN.test(value)) return null
  const [year, month, day] = value.split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return toStoredDateString(date) === value ? date : null
}

/** その日の 00:00:00.000〜23:59:59.999（UTC）。サーバーのタイムゾーンに依存しない */
export function raceDayRange(date: Date): { start: Date; end: Date } {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1)
  return { start, end }
}

function toPick(race: RaceListSource, horseNumber: number): RacePick {
  const entry = race.entries.find((item) => item.horse_number === horseNumber)
  return {
    horseNumber,
    bracketNumber: entry?.bracket_number ?? null,
    horseName: entry?.HorseMaster?.name ?? null,
  }
}

function originalPickOf(race: RaceListSource): RacePick | null {
  if (race.predicts.length === 0) return null
  const best = race.predicts.reduce((top, predict) =>
    predict.score > top.score || (predict.score === top.score && predict.horse_number < top.horse_number)
      ? predict
      : top
  )
  return toPick(race, best.horse_number)
}

function openAiPickOf(race: RaceListSource): RacePick | null {
  const first = toHorsePredictionRanks(race.horse_indicators).find((rank) => rank.rank === 1)
  return first ? toPick(race, first.horseNumber) : null
}

function pickupOf(race: RaceListSource, horseNumber: number): RacePickup | null {
  const indicator = race.horse_indicators.find((item) => item.horse_number === horseNumber)
  if (!indicator) return null
  const labels = toHorseIndicatorLabels({
    horse_number: indicator.horse_number,
    base_ability: indicator.base_ability,
    condition_fit: indicator.condition_fit,
    pace_fit: null,
    freshness: null,
    history_count: indicator.history_count,
    time_index_recent: indicator.time_index_recent,
  })
  return {
    ability: labels.ability,
    conditionFit: labels.conditionFit,
    recentTimeIndex: labels.recentTimeIndexes[0]?.timeIndex ?? null,
  }
}

export type RaceListBuild = {
  item: RaceListItem
  /** 確定済みかつ推奨馬券があるときだけ。サマリーの集計に使う */
  statistics: BetStatistics | null
}

export function toRaceListItem(race: RaceListSource): RaceListBuild {
  const isSettled = race.payouts.length > 0
  const originalPick = originalPickOf(race)
  const openAiPick = openAiPickOf(race)

  let bet: RaceBetSummary | null = null
  let statistics: BetStatistics | null = null
  if (race.recommended_bets.length > 0) {
    const results = matchBetsWithPayouts(race.recommended_bets, race.payouts)
    const stats = calculateStatistics(results)
    bet = {
      investment: stats.totalAmount,
      payout: isSettled ? stats.totalReturn : 0,
      isHit: isSettled && results.some((result) => result.isHit),
    }
    statistics = isSettled ? stats : null
  }

  const agreed =
    originalPick !== null && openAiPick !== null && originalPick.horseNumber === openAiPick.horseNumber

  return {
    item: {
      id: race.id,
      track: race.track,
      number: race.number,
      name: race.name,
      courseType: race.course_type,
      distance: race.distance,
      raceTime: race.race_time ? race.race_time.toISOString() : null,
      hasPrediction: originalPick !== null || openAiPick !== null,
      originalPick,
      openAiPick,
      isSettled,
      bet,
      pickup: agreed ? pickupOf(race, originalPick.horseNumber) : null,
    },
    statistics,
  }
}

export function buildRaceDaySummary(builds: RaceListBuild[]): RaceDaySummary {
  const items = builds.map((build) => build.item)
  const settledStats = builds
    .map((build) => build.statistics)
    .filter((stats): stats is BetStatistics => stats !== null)
  const aggregated = settledStats.length > 0 ? aggregateStatistics(settledStats) : null

  return {
    totalRaces: items.length,
    predictedRaces: items.filter((item) => item.hasPrediction).length,
    settledRaces: items.filter((item) => item.isSettled).length,
    original: aggregated
      ? {
          investment: aggregated.totalAmount,
          payout: aggregated.totalReturn,
          returnRate: aggregated.returnRate,
          profit: aggregated.profit,
        }
      : null,
  }
}

export function buildRaceListResponse(date: Date, races: RaceListSource[]): RaceListResponse {
  const builds = races.map(toRaceListItem)
  return {
    date: toStoredDateString(date),
    summary: buildRaceDaySummary(builds),
    races: builds.map((build) => build.item),
  }
}

export type RaceStatus = "hit" | "miss" | "settled" | "started" | "next" | "upcoming"

export function resolveRaceStatus(
  item: Pick<RaceListItem, "isSettled" | "bet" | "raceTime">,
  context: { nowStored: Date; isNext: boolean },
): RaceStatus {
  if (item.isSettled) {
    if (!item.bet) return "settled"
    return item.bet.isHit ? "hit" : "miss"
  }
  if (item.raceTime && new Date(item.raceTime).getTime() <= context.nowStored.getTime()) {
    return "started"
  }
  return context.isNext ? "next" : "upcoming"
}

/**
 * 競馬場ごとに「次に発走」するレース id。未確定で発走時刻が現在より後の最も早いもの。
 * 表示している開催日が今日（保存規約）でなければ空
 */
export function findNextRaceIds(
  items: Pick<RaceListItem, "id" | "track" | "isSettled" | "raceTime">[],
  nowStored: Date,
): Set<number> {
  const today = toStoredDateString(nowStored)
  const nextByTrack = new Map<string, { id: number; time: number }>()
  for (const item of items) {
    if (item.isSettled || !item.raceTime) continue
    if (toStoredDateString(new Date(item.raceTime)) !== today) continue
    const time = new Date(item.raceTime).getTime()
    if (time <= nowStored.getTime()) continue
    const current = nextByTrack.get(item.track)
    if (!current || time < current.time) {
      nextByTrack.set(item.track, { id: item.id, time })
    }
  }
  return new Set([...nextByTrack.values()].map((entry) => entry.id))
}

/** AIピックアップ: 両モデルの◎が一致し、まだ発走していないレース */
export function isPickupRace(
  item: Pick<RaceListItem, "pickup" | "isSettled" | "raceTime">,
  nowStored: Date,
): boolean {
  if (!item.pickup || item.isSettled || !item.raceTime) return false
  return new Date(item.raceTime).getTime() > nowStored.getTime()
}

/** 今日があれば今日、無ければ最も近い日（同点は未来側） */
export function pickDefaultDate(dates: string[], today: string): string | null {
  if (dates.length === 0) return null
  if (dates.includes(today)) return today
  const todayMs = Date.parse(`${today}T00:00:00Z`)
  let best: string | null = null
  let bestDiff = Number.POSITIVE_INFINITY
  for (const date of dates) {
    const diff = Math.abs(Date.parse(`${date}T00:00:00Z`) - todayMs)
    const isCloser = diff < bestDiff || (diff === bestDiff && best !== null && date > best)
    if (isCloser) {
      best = date
      bestDiff = diff
    }
  }
  return best
}

export type CourseTypeCounts = { turf: number; dirt: number; jump: number; other: number }

export function countCourseTypes(items: Pick<RaceListItem, "courseType">[]): CourseTypeCounts {
  const counts: CourseTypeCounts = { turf: 0, dirt: 0, jump: 0, other: 0 }
  for (const item of items) {
    if (item.courseType === "芝") counts.turf += 1
    else if (item.courseType === "ダート") counts.dirt += 1
    else if (item.courseType === "障害") counts.jump += 1
    else counts.other += 1
  }
  return counts
}

export function formatCourseTypeCounts(counts: CourseTypeCounts): string {
  const parts = [
    counts.turf > 0 ? `芝 ${counts.turf}` : null,
    counts.dirt > 0 ? `ダ ${counts.dirt}` : null,
    counts.jump > 0 ? `障 ${counts.jump}` : null,
    counts.other > 0 ? `他 ${counts.other}` : null,
  ].filter((part): part is string => part !== null)
  return parts.join(" · ")
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"]

/** yyyy-MM-dd を UTC で読み、曜日を返す（ブラウザのタイムゾーンでずれない） */
export function weekdayOf(date: string): string {
  const parsed = parseRaceDateParam(date)
  return parsed ? WEEKDAYS[parsed.getUTCDay()] : ""
}

/** 見出し用: 2026年10月10日（土） */
export function formatRaceDateHeading(date: string): string {
  const parsed = parseRaceDateParam(date)
  if (!parsed) return date
  return `${formatInTimeZone(parsed, "UTC", "yyyy年M月d日")}（${weekdayOf(date)}）`
}

/** 日付ボタン用: 10/10 */
export function formatRaceDateShort(date: string): string {
  const parsed = parseRaceDateParam(date)
  return parsed ? formatInTimeZone(parsed, "UTC", "M/d") : date
}

/** 行用: 09:50 */
export function formatRaceClock(raceTime: string | null): string {
  return raceTime ? formatInTimeZone(new Date(raceTime), "UTC", "HH:mm") : "--:--"
}
