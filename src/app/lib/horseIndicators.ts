import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { HorseIndicatorLabels, toHorseIndicatorLabels } from "@/app/lib/indicatorLabels"
import {
  type HorsePredictionRank,
  pickLatestLogicVersion,
  toHorsePredictionRanks,
} from "@/app/lib/horsePredictionRanks"

export type HorseIndicatorLabelsResult = {
  /** 馬番順の表示用ラベル。未生成・取得失敗時は空配列 */
  indicators: HorseIndicatorLabels[]
  /** AI予想の順位。順位を算出できた馬だけを含む */
  predictionRanks: HorsePredictionRank[]
  /** 表示対象とした生成バージョン */
  logicVersion: string | null
}

export type {
  HorsePredictionRank,
  HorsePredictionRankSource,
} from "@/app/lib/horsePredictionRanks"
export { pickLatestLogicVersion, toHorsePredictionRanks } from "@/app/lib/horsePredictionRanks"

const EMPTY_RESULT: HorseIndicatorLabelsResult = {
  indicators: [],
  predictionRanks: [],
  logicVersion: null,
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
        time_index_recent: true,
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
