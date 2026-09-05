import type { HorseIndicator, Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { HorseIndicatorLabels, toHorseIndicatorLabels } from "@/app/lib/indicatorLabels"

export type HorseIndicatorLabelsResult = {
  /** 馬番順の表示用ラベル。未生成・取得失敗時は空配列 */
  indicators: HorseIndicatorLabels[]
  /** AI予想の順位。順位を算出できた馬だけを含む */
  predictionRanks: HorsePredictionRank[]
  /** 表示対象とした生成バージョン */
  logicVersion: string | null
}

export type HorsePredictionRank = {
  horseNumber: number
  rank: number
}

const EMPTY_RESULT: HorseIndicatorLabelsResult = {
  indicators: [],
  predictionRanks: [],
  logicVersion: null,
}

type VersionedIndicator = Pick<
  HorseIndicator,
  "logic_version" | "generated_at" | "created_at"
>

function generatedTime(indicator: VersionedIndicator): number {
  return (indicator.generated_at ?? indicator.created_at).getTime()
}

/**
 * 生成バージョンが混在しないよう、最新の logic_version の行だけを表示対象にする。
 */
function pickLatestLogicVersion<T extends VersionedIndicator>(indicators: T[]): T[] {
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
  | "horse_number"
  | "rank"
  | "logic_version"
  | "generated_at"
  | "created_at"
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

/**
 * 出馬表に表示する馬ごとのAI指標ラベルを取得する。
 * 指標が未生成、あるいは取得に失敗してもレース詳細画面を落とさず、ラベル無しとして扱う。
 */
async function getHorseIndicatorLabelsByWhere(
  where: Prisma.HorseIndicatorWhereInput
): Promise<HorseIndicatorLabelsResult> {
  try {
    const indicators = await prisma.horseIndicator.findMany({
      where,
      select: {
        horse_number: true,
        base_ability: true,
        condition_fit: true,
        pace_fit: true,
        freshness: true,
        history_count: true,
        rank: true,
        logic_version: true,
        generated_at: true,
        created_at: true,
      },
    })
    const targets = pickLatestLogicVersion(indicators)

    return {
      indicators: targets
        .map(toHorseIndicatorLabels)
        .sort((a, b) => a.horseNumber - b.horseNumber),
      predictionRanks: toHorsePredictionRanks(targets),
      logicVersion: targets[0]?.logic_version ?? null,
    }
  } catch (error) {
    console.error("Failed to fetch horse indicators", error)
    return EMPTY_RESULT
  }
}

export async function getHorseIndicatorLabels(
  netkeibaRaceId: string
): Promise<HorseIndicatorLabelsResult> {
  return getHorseIndicatorLabelsByWhere({ netkeiba_race_id: netkeibaRaceId })
}

/** レース本体の取得と並列実行できるよう、内部IDから指標を取得する。 */
export async function getHorseIndicatorLabelsByRaceId(
  raceId: number
): Promise<HorseIndicatorLabelsResult> {
  return getHorseIndicatorLabelsByWhere({ Race: { id: raceId } })
}
