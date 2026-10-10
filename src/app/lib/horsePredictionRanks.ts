import type { HorseIndicator } from "@prisma/client"

/**
 * HorseIndicator の rank から AI（OpenAI）予想の順位を組み立てる純粋なヘルパー。
 * DB アクセスは horseIndicators.ts に置く。テストから読めるよう prisma を import しない
 */

export type HorsePredictionRank = {
  horseNumber: number
  rank: number
}

type VersionedIndicator = Pick<HorseIndicator, "logic_version" | "generated_at" | "created_at">

function generatedTime(indicator: VersionedIndicator): number {
  return (indicator.generated_at ?? indicator.created_at).getTime()
}

/**
 * 生成バージョンが混在しないよう、最新の logic_version の行だけを表示対象にする。
 */
export function pickLatestLogicVersion<T extends VersionedIndicator>(indicators: T[]): T[] {
  if (indicators.length === 0) {
    return indicators
  }

  const latest = indicators.reduce((newest, indicator) =>
    generatedTime(indicator) > generatedTime(newest) ? indicator : newest
  )

  return indicators.filter((indicator) => indicator.logic_version === latest.logic_version)
}

export type HorsePredictionRankSource = Pick<
  HorseIndicator,
  "horse_number" | "rank" | "logic_version" | "generated_at" | "created_at"
>

export function toHorsePredictionRanks(
  indicators: HorsePredictionRankSource[]
): HorsePredictionRank[] {
  return pickLatestLogicVersion(indicators)
    .filter((indicator): indicator is typeof indicator & { rank: number } =>
      indicator.rank !== null && indicator.rank > 0
    )
    .map((indicator) => ({
      horseNumber: indicator.horse_number,
      rank: indicator.rank,
    }))
    .sort((a, b) => a.rank - b.rank || a.horseNumber - b.horseNumber)
}
