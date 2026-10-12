import type { Payout, Predict, RecommendedBet, Result } from "@prisma/client"
import type { HorseIndicatorLabels, RecentTimeIndex } from "@/app/lib/indicatorLabels"
import type { HorsePredictionRank } from "@/app/lib/horsePredictionRanks"
import { type PayoutForStatistics, matchBetsWithPayouts } from "@/app/lib/statistics"

/**
 * レース詳細の純粋なロジック。印・AIの結論・タイム指数のスパークライン・
 * 結果と払戻の並び・推奨馬券のまとめをここに集め、DB アクセスは page.tsx に置く
 */

/** 推奨馬券の表示用。保存行でも OpenAI の順位から組み立てた行でも同じ形 */
export type RecommendedBetDisplay = Pick<RecommendedBet, "bet_type" | "numbers" | "payout" | "bet">

export const PREDICTION_MARKS = ["◎", "○", "▲", "△"] as const
export type PredictionMark = (typeof PREDICTION_MARKS)[number]
export type MarkMap = Map<number, PredictionMark>

/** 独自予想: score 降順、同点は馬番昇順。上位4頭だけに印を付ける */
export function buildOriginalMarks(predicts: Pick<Predict, "horse_number" | "score">[]): MarkMap {
  const ordered = [...predicts].sort((a, b) => b.score - a.score || a.horse_number - b.horse_number)
  return new Map(
    ordered.slice(0, PREDICTION_MARKS.length).map((predict, index) => [predict.horse_number, PREDICTION_MARKS[index]]),
  )
}

/** OpenAI: rank 1〜4 だけに印を付ける */
export function buildOpenAiMarks(ranks: HorsePredictionRank[]): MarkMap {
  const marks: MarkMap = new Map()
  for (const item of ranks) {
    const mark = PREDICTION_MARKS[item.rank - 1]
    if (mark && !marks.has(item.horseNumber)) marks.set(item.horseNumber, mark)
  }
  return marks
}

export function topPickOf(marks: MarkMap): number | null {
  for (const [horseNumber, mark] of marks) {
    if (mark === "◎") return horseNumber
  }
  return null
}

/** 両モデルの◎が同じ馬番ならその馬番 */
export function agreedTopPick(original: MarkMap, openAi: MarkMap): number | null {
  const a = topPickOf(original)
  const b = topPickOf(openAi)
  return a !== null && a === b ? a : null
}

export type VerdictRow = {
  mark: PredictionMark
  horseNumber: number
  bracketNumber: number | null
  horseName: string | null
  abilityLabel: string | null
}

export type EntryForDetail = {
  horse_number: number
  bracket_number: number
  HorseMaster: { name: string } | null
}

/** AIの結論の行。◎○▲△ の順。印が無ければその行は出さない */
export function buildVerdictRows(
  marks: MarkMap,
  entries: EntryForDetail[],
  indicators: Pick<HorseIndicatorLabels, "horseNumber" | "ability">[],
): VerdictRow[] {
  const byHorse = new Map(entries.map((entry) => [entry.horse_number, entry]))
  const abilityByHorse = new Map(indicators.map((item) => [item.horseNumber, item.ability.label]))
  const rows: VerdictRow[] = []
  for (const mark of PREDICTION_MARKS) {
    for (const [horseNumber, horseMark] of marks) {
      if (horseMark !== mark) continue
      const entry = byHorse.get(horseNumber)
      rows.push({
        mark,
        horseNumber,
        bracketNumber: entry?.bracket_number ?? null,
        horseName: entry?.HorseMaster?.name ?? null,
        abilityLabel: abilityByHorse.get(horseNumber) ?? null,
      })
    }
  }
  return rows
}

/** 結果表の AI印 列: 「独自◎ OpenAI○」。どちらも無ければ空文字 */
export function aiMarksForHorse(horseNumber: number, original: MarkMap, openAi: MarkMap): string {
  const parts: string[] = []
  const o = original.get(horseNumber)
  const a = openAi.get(horseNumber)
  if (o) parts.push(`独自${o}`)
  if (a) parts.push(`OpenAI${a}`)
  return parts.join(" ")
}

export const SPARKLINE_WIDTH = 84
export const SPARKLINE_HEIGHT = 30
const SPARKLINE_PAD_X = 4
const SPARKLINE_PAD_Y = 3

export type TimeIndexSparkline = {
  /** polyline の points（古い→新しい、右端が最新） */
  points: string
  baselineY: number
  last: { x: number; y: number; value: number; confidenceLabel: string }
  ariaLabel: string
}

/** 直近走（新しい順）を古い→新しいに並べ、84×30 に収める。走が無ければ null */
export function buildTimeIndexSparkline(recent: RecentTimeIndex[]): TimeIndexSparkline | null {
  if (recent.length === 0) return null
  const runs = [...recent].reverse()
  const values = runs.map((run) => run.timeIndex)
  const yMin = Math.min(100, ...values) - 2
  const yMax = Math.max(100, ...values) + 2
  const plotWidth = SPARKLINE_WIDTH - SPARKLINE_PAD_X * 2
  const plotHeight = SPARKLINE_HEIGHT - SPARKLINE_PAD_Y * 2
  const slots = Math.max(runs.length - 1, 1)
  // 右端が常に最新になるよう、右から詰める
  const xOf = (index: number) => SPARKLINE_WIDTH - SPARKLINE_PAD_X - ((runs.length - 1 - index) / slots) * plotWidth
  const yOf = (value: number) => SPARKLINE_PAD_Y + plotHeight - ((value - yMin) / (yMax - yMin)) * plotHeight
  const round = (n: number) => Math.round(n * 10) / 10
  const points = runs.map((run, index) => `${round(xOf(index))},${round(yOf(run.timeIndex))}`).join(" ")
  const lastRun = runs[runs.length - 1]
  return {
    points,
    baselineY: round(yOf(100)),
    last: {
      x: round(xOf(runs.length - 1)),
      y: round(yOf(lastRun.timeIndex)),
      value: lastRun.timeIndex,
      confidenceLabel: lastRun.confidenceLabel,
    },
    ariaLabel: `直近${runs.length}走のタイム指数（古い順） ${values.map((v) => Math.round(v)).join("、")}`,
  }
}

type ResultForSort = Pick<Result, "rank" | "horse_number">

function rankValue(rank: string): number {
  const parsed = Number.parseInt(rank.trim(), 10)
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed
}

/** 着順を数値として昇順。同着は馬番昇順。数値でない（中止・除外など）は末尾 */
export function sortResults<T extends ResultForSort>(results: T[]): T[] {
  return [...results].sort(
    (a, b) => rankValue(a.rank) - rankValue(b.rank) || a.horse_number - b.horse_number,
  )
}

export function topResults<T extends ResultForSort>(results: T[], count = 5): T[] {
  return sortResults(results).slice(0, count)
}

export type BetSummary = {
  investment: number
  /** 未確定なら null */
  payout: number | null
  profit: number | null
  returnRate: number | null
  isHit: boolean
}

export function buildBetSummary(bets: RecommendedBetDisplay[], isSettled: boolean): BetSummary {
  const investment = bets.reduce((sum, bet) => sum + bet.bet, 0)
  if (!isSettled) {
    return { investment, payout: null, profit: null, returnRate: null, isHit: false }
  }
  const payout = bets.reduce((sum, bet) => sum + bet.payout, 0)
  return {
    investment,
    payout,
    profit: payout - investment,
    returnRate: investment > 0 ? (payout / investment) * 100 : 0,
    isHit: bets.some((bet) => bet.payout > 0),
  }
}

export type BetGroupItem = { numbers: number[]; bet: number; payout: number }
export type BetGroup = { type: string; items: BetGroupItem[] }

const BET_GROUP_LABELS: Record<string, string> = { ワイド: "ワイドBOX" }
const BET_GROUP_ORDER = ["複勝", "ワイド"]

function parseNumbers(numbers: string): number[] {
  return numbers
    .split(/[-,→]/)
    .map((value) => Number.parseInt(value.trim(), 10))
    .filter((value) => Number.isFinite(value))
}

/** 複勝 → ワイドBOX → その他の順にまとめる。複勝は購入額の大きい順 */
export function groupBetsForDisplay(bets: RecommendedBetDisplay[]): BetGroup[] {
  const groups = new Map<string, BetGroupItem[]>()
  for (const bet of bets) {
    const items = groups.get(bet.bet_type) ?? []
    items.push({ numbers: parseNumbers(bet.numbers), bet: bet.bet, payout: bet.payout })
    groups.set(bet.bet_type, items)
  }
  const orderOf = (type: string) => {
    const index = BET_GROUP_ORDER.indexOf(type)
    return index === -1 ? BET_GROUP_ORDER.length : index
  }
  return [...groups.entries()]
    .sort(([a], [b]) => orderOf(a) - orderOf(b))
    .map(([type, items]) => ({
      type: BET_GROUP_LABELS[type] ?? type,
      items: type === "複勝" ? [...items].sort((a, b) => b.bet - a.bet) : items,
    }))
}

export type BetModel = "original" | "openai"

/** その払戻行を AI が買って的中したモデル */
export function payoutHitModels(
  payout: PayoutForStatistics,
  originalBets: Pick<RecommendedBet, "bet_type" | "numbers" | "bet">[],
  openAiBets: Pick<RecommendedBet, "bet_type" | "numbers" | "bet">[],
): BetModel[] {
  const models: BetModel[] = []
  if (matchBetsWithPayouts(originalBets, [payout]).some((result) => result.isHit)) models.push("original")
  if (matchBetsWithPayouts(openAiBets, [payout]).some((result) => result.isHit)) models.push("openai")
  return models
}

export const PAYOUT_TYPE_ORDER = ["単勝", "複勝", "枠連", "馬連", "ワイド", "馬単", "3連複", "3連単"]

/** 券種を定番の順に。未知の券種は末尾、同じ券種は元の順 */
export function sortPayouts<T extends Pick<Payout, "bet_type">>(payouts: T[]): T[] {
  const orderOf = (type: string) => {
    const index = PAYOUT_TYPE_ORDER.indexOf(type)
    return index === -1 ? PAYOUT_TYPE_ORDER.length : index
  }
  return payouts
    .map((payout, index) => ({ payout, index }))
    .sort((a, b) => orderOf(a.payout.bet_type) - orderOf(b.payout.bet_type) || a.index - b.index)
    .map((item) => item.payout)
}

export function formatExpectedPace(value: string | null | undefined): { label: string; muted: boolean } {
  if (!value) return { label: "—", muted: true }
  if (value === "データ不足") return { label: value, muted: true }
  return { label: value, muted: false }
}

export type RaceSettlement = "settled" | "started" | "upcoming"

/** 確定 / 発走済 / 発走前。nowStored は nowAsStoredClock で保存規約に寄せた現在時刻 */
export function resolveSettlement(
  race: { race_time: Date | null; payoutCount: number },
  nowStored: Date,
): RaceSettlement {
  if (race.payoutCount > 0) return "settled"
  if (race.race_time && race.race_time.getTime() <= nowStored.getTime()) return "started"
  return "upcoming"
}
