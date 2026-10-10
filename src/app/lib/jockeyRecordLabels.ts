/**
 * horecast-predictor が集計した騎手成績（JockeyRacecourseRecord）から、
 * 出馬表に表示する「このレースの開催条件での勝率・複勝率」を組み立てる。
 *
 * - 検索キーはレースの値をそのまま使う（racecourse = Race.track、surface = Race.course_type）
 * - 距離帯だけは Race.distance から求める
 * - 騎乗数が MIN_RIDES 未満なら 距離帯 → 芝ダ → 競馬場 の順に `all` へ広げ、
 *   広げた値であることを画面に注記する
 * - DB アクセスは jockeyRecords.ts に分け、ここはテスト可能な純粋関数だけを置く
 */

/** predictor が集計のまとめ行に使う番兵値。period / racecourse / surface / distance_band 共通 */
export const ALL = "all"

/** これ未満の騎乗数は率の信頼性が低いとみなし、条件を広げる */
export const MIN_RIDES = 20

export const FALLBACK_NOTE = "データが少なく、正確性に難があります"
export const INSUFFICIENT_RECORD_LABEL = "データ不足"
export const NO_RECORD_LABEL = "データなし"

export const DISTANCE_BANDS = ["短距離", "マイル", "中距離", "長距離"] as const
export type DistanceBand = (typeof DISTANCE_BANDS)[number]

/** predictor と同じ区切り: 〜1400 / 1401〜1800 / 1801〜2200 / 2201〜 */
export function toDistanceBand(distance: number): DistanceBand {
  if (distance <= 1400) return "短距離"
  if (distance <= 1800) return "マイル"
  if (distance <= 2200) return "中距離"
  return "長距離"
}

/** 障害レースは JRA平地のみの集計と噛み合わないので表示しない */
export function isJockeyRecordTarget(courseType: string): boolean {
  return courseType !== "障害"
}

export type JockeyRecordCondition = {
  racecourse: string
  surface: string
  distanceBand: string
}

/** 画面が必要とする列だけに絞った集計行 */
export type JockeyRecordRow = JockeyRecordCondition & {
  jockeyMasterId: number
  rides: number
  wins: number
  seconds: number
  thirds: number
}

export type JockeyRecordLabel =
  | {
      jockeyMasterId: number
      status: "ready"
      /** 勝率（0〜1） */
      winRate: number
      /** 複勝率（0〜1） */
      placeRate: number
      rides: number
      /** 集計に使った条件。落とした場合は広げた後の条件 */
      condition: JockeyRecordCondition
      conditionLabel: string
      /** レースの条件そのものではなく、広げた条件の値であるか */
      isFallback: boolean
    }
  | { jockeyMasterId: number; status: "insufficient" }
  | { jockeyMasterId: number; status: "none" }

/**
 * 条件を狭い順に並べる。先頭がレースそのものの条件で、
 * 以降は 距離帯 → 芝ダ → 競馬場 の順に `all` へ広げる。
 */
export function buildFallbackConditions(race: JockeyRecordCondition): JockeyRecordCondition[] {
  const { racecourse, surface, distanceBand } = race
  return [
    { racecourse, surface, distanceBand },
    { racecourse, surface, distanceBand: ALL },
    { racecourse, surface: ALL, distanceBand: ALL },
    { racecourse: ALL, surface: ALL, distanceBand: ALL },
  ]
}

const sameCondition = (a: JockeyRecordCondition, b: JockeyRecordCondition) =>
  a.racecourse === b.racecourse && a.surface === b.surface && a.distanceBand === b.distanceBand

export function formatConditionLabel(condition: JockeyRecordCondition): string {
  return [
    condition.racecourse === ALL ? "全競馬場" : condition.racecourse,
    condition.surface === ALL ? "芝ダ" : condition.surface,
    condition.distanceBand === ALL ? "全距離" : condition.distanceBand,
  ].join("・")
}

/**
 * 1人の騎手について、落とし先の順に行を探し、騎乗数が足りた最初の行から率を作る。
 * `all/all/all` でも足りなければ「データ不足」、行が1つも無ければ「データなし」。
 */
export function selectJockeyRecordLabel(
  jockeyMasterId: number,
  rows: JockeyRecordRow[],
  race: JockeyRecordCondition
): JockeyRecordLabel {
  const own = rows.filter((row) => row.jockeyMasterId === jockeyMasterId)
  if (own.length === 0) {
    return { jockeyMasterId, status: "none" }
  }

  const conditions = buildFallbackConditions(race)
  for (const [index, condition] of conditions.entries()) {
    const row = own.find((candidate) => sameCondition(candidate, condition))
    if (!row || row.rides < MIN_RIDES) {
      continue
    }
    return {
      jockeyMasterId,
      status: "ready",
      winRate: row.wins / row.rides,
      placeRate: (row.wins + row.seconds + row.thirds) / row.rides,
      rides: row.rides,
      condition,
      conditionLabel: formatConditionLabel(condition),
      isFallback: index > 0,
    }
  }

  return { jockeyMasterId, status: "insufficient" }
}

/** 出馬表へ渡す1レース分の騎手成績 */
export type JockeyRecordSummary = {
  /** 出走馬の騎手ごとのラベル。騎手が同じ馬は同じラベルを参照する */
  labels: JockeyRecordLabel[]
  /** 使った集計行の生成時刻のうち最新。行が無ければ null */
  generatedAt: Date | null
}

/** 出走馬の騎手ごとにラベルを作る。同じ騎手が複数頭に乗ることはないが、重複IDは1件にまとめる */
export function toJockeyRecordLabels(
  jockeyMasterIds: number[],
  rows: JockeyRecordRow[],
  race: JockeyRecordCondition
): JockeyRecordLabel[] {
  return [...new Set(jockeyMasterIds)].map((id) => selectJockeyRecordLabel(id, rows, race))
}

/** 率は小数1桁の百分率で表示する（例: 0.1234 → 12.3%） */
export function formatRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`
}
