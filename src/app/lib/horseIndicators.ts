import { HorseIndicator } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { HorseIndicatorLabels, toHorseIndicatorLabels } from "@/app/lib/indicatorLabels"

export type HorseIndicatorLabelsResult = {
  /** 馬番順の表示用ラベル。未生成・取得失敗時は空配列 */
  indicators: HorseIndicatorLabels[]
  /** 表示対象とした生成バージョン */
  logicVersion: string | null
}

const EMPTY_RESULT: HorseIndicatorLabelsResult = { indicators: [], logicVersion: null }

function generatedTime(indicator: HorseIndicator): number {
  return (indicator.generated_at ?? indicator.created_at).getTime()
}

/**
 * 生成バージョンが混在しないよう、最新の logic_version の行だけを表示対象にする。
 */
function pickLatestLogicVersion(indicators: HorseIndicator[]): HorseIndicator[] {
  if (indicators.length === 0) {
    return indicators
  }

  const latest = indicators.reduce((newest, indicator) =>
    generatedTime(indicator) > generatedTime(newest) ? indicator : newest
  )

  return indicators.filter((indicator) => indicator.logic_version === latest.logic_version)
}

/**
 * 出馬表に表示する馬ごとのAI指標ラベルを取得する。
 * 指標が未生成、あるいは取得に失敗してもレース詳細画面を落とさず、ラベル無しとして扱う。
 */
export async function getHorseIndicatorLabels(
  netkeibaRaceId: string
): Promise<HorseIndicatorLabelsResult> {
  try {
    const indicators = await prisma.horseIndicator.findMany({
      where: { netkeiba_race_id: netkeibaRaceId },
    })
    const targets = pickLatestLogicVersion(indicators)

    return {
      indicators: targets
        .map(toHorseIndicatorLabels)
        .sort((a, b) => a.horseNumber - b.horseNumber),
      logicVersion: targets[0]?.logic_version ?? null,
    }
  } catch (error) {
    console.error("Failed to fetch horse indicators", error)
    return EMPTY_RESULT
  }
}
