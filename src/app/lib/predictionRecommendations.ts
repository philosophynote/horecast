import type { RecommendedBetDisplay } from "@/app/components/RecommendedBets"
import type { HorsePredictionRank } from "@/app/lib/horseIndicators"
import type { Payout } from "@prisma/client"
import { matchBetsWithPayouts } from "@/app/lib/statistics"

const PLACE_BET_AMOUNTS = [400, 300, 200, 100]

/**
 * 既存の独自予想と同じ規則で、上位4頭から複勝とワイドBOXを組み立てる。
 */
export function buildRecommendedBetsFromRanks(
  predictionRanks: HorsePredictionRank[]
): RecommendedBetDisplay[] {
  const topFour = [...predictionRanks]
    .sort((a, b) => a.rank - b.rank || a.horseNumber - b.horseNumber)
    .slice(0, 4)

  const placeBets = topFour.map((prediction, index) => ({
    bet_type: "複勝",
    numbers: String(prediction.horseNumber),
    payout: 0,
    bet: PLACE_BET_AMOUNTS[index],
  }))

  const wideBets: RecommendedBetDisplay[] = []
  for (let first = 0; first < topFour.length; first += 1) {
    for (let second = first + 1; second < topFour.length; second += 1) {
      wideBets.push({
        bet_type: "ワイド",
        numbers: `${topFour[first].horseNumber}-${topFour[second].horseNumber}`,
        payout: 0,
        bet: 100,
      })
    }
  }

  return [...placeBets, ...wideBets]
}

/** 100円あたりの公式配当を、各レコメンド馬券の購入額に応じた払戻額へ変換する。 */
export function applyPayoutsToRecommendedBets(
  bets: RecommendedBetDisplay[],
  payouts: Payout[]
): RecommendedBetDisplay[] {
  return matchBetsWithPayouts(bets, payouts).map((result) => ({
    ...result.recommendedBet,
    payout: result.actualPayout,
  }))
}
