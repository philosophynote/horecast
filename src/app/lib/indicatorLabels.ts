/**
 * horecast-predictor が保存した raw 指標（HorseIndicator）を、
 * 画面表示用のラベルへ変換する。
 *
 * - スコアはレース内相対値（同値は 50）であり、レース間比較には使わない
 * - 指標を算出できない場合は「標準」ではなく「判断材料不足」とする
 * - UI 側ではスコアを再計算せず、ここで生成したラベルだけを表示する
 * - 例外として直近走のタイム指数（time_index_recent）は数値のまま表示する。
 *   基準タイムに対する絶対値でありレース内相対値ではないため、レース間で比較しても誤解を生まない
 */

export const INSUFFICIENT_LABEL = "判断材料不足"

/** 地力：base_ability / ability_score */
const ABILITY_LABELS = ["最上位", "上位", "標準", "やや下位", "下位"] as const
/** 条件適性：condition_fit / fitness_score */
const CONDITION_LABELS = ["高い", "やや高い", "標準", "やや不安", "不安"] as const
/** 展開適性：pace_fit / pace_score */
const PACE_LABELS = ["展開有利", "やや有利", "中立", "やや不利", "展開不利"] as const
/** 近走状態：freshness.days_since_last_race（算出不可は判断材料不足） */
const FRESHNESS_LABELS = ["好調", "安定", "平行線", "やや不安"] as const

/** 上位から順に区切るしきい値。50（同値）は中央のラベルへ入る */
const FIVE_LEVEL_THRESHOLDS = [80, 60, 40, 20]

export type IndicatorLabel = {
  label: string
  /** バッジの配色用。0 が最上位、値が大きいほど下位。判断材料不足は null */
  level: number | null
}

/** タイム指数の基準タイムの信頼度。predictor の baseline_confidence に対応する */
export type TimeIndexConfidence = "high" | "medium" | "low"

const CONFIDENCE_LABELS: Record<TimeIndexConfidence, string> = {
  high: "高",
  medium: "中",
  low: "低",
}

/** 直近走のHorecastタイム指数。新しい走が先頭 */
export type RecentTimeIndex = {
  /** 開催日（YYYY-MM-DD） */
  raceDate: string
  racecourse: string
  netkeibaRaceId: string
  timeIndex: number
  confidence: TimeIndexConfidence
  /** 信頼度の表示用ラベル（高・中・低） */
  confidenceLabel: string
}

export type HorseIndicatorLabels = {
  horseNumber: number
  /** 地力 */
  ability: IndicatorLabel
  /** 条件適性 */
  conditionFit: IndicatorLabel
  /** 展開適性 */
  paceFit: IndicatorLabel
  /** 近走状態 */
  freshness: IndicatorLabel
  /** 直近最大5走のタイム指数。結合できた走が無ければ空配列 */
  recentTimeIndexes: RecentTimeIndex[]
  /** 4指標すべてが算出不可 */
  isInsufficient: boolean
}

/** 変換元となる raw 指標。predictor 側の保存契約に対応する */
export type HorseIndicatorSource = {
  horse_number: number
  base_ability: number | null
  condition_fit: number | null
  pace_fit: number | null
  freshness: unknown
  history_count?: number | null
  time_index_recent?: unknown
}

/** 出馬表で確認できる直近走の上限。predictor も最大5走しか保存しない */
export const MAX_RECENT_TIME_INDEXES = 5

const insufficient = (): IndicatorLabel => ({ label: INSUFFICIENT_LABEL, level: null })

function toLabel(
  score: number | null | undefined,
  labels: readonly string[],
  thresholds: number[]
): IndicatorLabel {
  if (score === null || score === undefined || Number.isNaN(score)) {
    return insufficient()
  }
  const index = thresholds.findIndex((threshold) => score >= threshold)
  const level = index === -1 ? labels.length - 1 : index
  return { label: labels[level], level }
}

function toFreshnessLabel(freshness: unknown): IndicatorLabel {
  if (freshness === null || typeof freshness !== "object" || Array.isArray(freshness)) {
    return insufficient()
  }

  const daysSinceLastRace = (freshness as Record<string, unknown>).days_since_last_race
  if (typeof daysSinceLastRace !== "number" || Number.isNaN(daysSinceLastRace)) {
    return insufficient()
  }

  if (daysSinceLastRace <= 14) return { label: FRESHNESS_LABELS[0], level: 0 }
  if (daysSinceLastRace <= 42) return { label: FRESHNESS_LABELS[1], level: 1 }
  if (daysSinceLastRace <= 84) return { label: FRESHNESS_LABELS[2], level: 2 }
  return { label: FRESHNESS_LABELS[3], level: 3 }
}

function isTimeIndexConfidence(value: unknown): value is TimeIndexConfidence {
  // in 演算子は prototype の "constructor" なども通すため hasOwn で判定する
  return typeof value === "string" && Object.hasOwn(CONFIDENCE_LABELS, value)
}

function toRecentTimeIndex(element: unknown): RecentTimeIndex | null {
  if (element === null || typeof element !== "object" || Array.isArray(element)) {
    return null
  }
  const record = element as Record<string, unknown>
  const { race_date, racecourse, netkeiba_race_id, time_index, confidence } = record

  if (typeof time_index !== "number" || !Number.isFinite(time_index)) return null
  if (!isTimeIndexConfidence(confidence)) return null
  if (typeof race_date !== "string" || race_date === "") return null

  return {
    raceDate: race_date,
    racecourse: typeof racecourse === "string" ? racecourse : "",
    netkeibaRaceId: typeof netkeiba_race_id === "string" ? netkeiba_race_id : "",
    timeIndex: time_index,
    confidence,
    confidenceLabel: CONFIDENCE_LABELS[confidence],
  }
}

/**
 * HorseIndicator.time_index_recent（jsonb）を表示用の配列へ変換する。
 * 指数を持たない要素や形の崩れた要素は捨て、新しい走が先頭になるよう並べ直す。
 * 配列でない値（null・旧データなど）は空配列として扱い、画面を落とさない。
 */
export function toRecentTimeIndexes(value: unknown): RecentTimeIndex[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map(toRecentTimeIndex)
    .filter((item): item is RecentTimeIndex => item !== null)
    // race_date は YYYY-MM-DD なので文字列比較で日付順になる
    .sort((a, b) => b.raceDate.localeCompare(a.raceDate))
    .slice(0, MAX_RECENT_TIME_INDEXES)
}

export function toHorseIndicatorLabels(
  indicator: HorseIndicatorSource
): HorseIndicatorLabels {
  // 履歴が一件も無い馬は、スコアが入っていても評価材料が無いものとして扱う
  const hasHistory = indicator.history_count === null || indicator.history_count === undefined
    ? true
    : indicator.history_count > 0

  const ability = hasHistory
    ? toLabel(indicator.base_ability, ABILITY_LABELS, FIVE_LEVEL_THRESHOLDS)
    : insufficient()
  const conditionFit = hasHistory
    ? toLabel(indicator.condition_fit, CONDITION_LABELS, FIVE_LEVEL_THRESHOLDS)
    : insufficient()
  const paceFit = hasHistory
    ? toLabel(indicator.pace_fit, PACE_LABELS, FIVE_LEVEL_THRESHOLDS)
    : insufficient()
  const freshness = hasHistory
    ? toFreshnessLabel(indicator.freshness)
    : insufficient()

  return {
    horseNumber: indicator.horse_number,
    ability,
    conditionFit,
    paceFit,
    freshness,
    recentTimeIndexes: toRecentTimeIndexes(indicator.time_index_recent),
    isInsufficient:
      ability.level === null &&
      conditionFit.level === null &&
      paceFit.level === null &&
      freshness.level === null,
  }
}
