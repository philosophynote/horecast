import { expect, test } from "vitest"
import {
  applyPayoutsToRecommendedBets,
  buildRecommendedBetsFromRanks,
} from "./predictionRecommendations"

test("順位上位4頭から複勝とワイドBOXを作る", () => {
  const bets = buildRecommendedBetsFromRanks([
    { horseNumber: 8, rank: 3 },
    { horseNumber: 2, rank: 1 },
    { horseNumber: 12, rank: 4 },
    { horseNumber: 5, rank: 2 },
    { horseNumber: 1, rank: 5 },
  ])

  expect(bets.slice(0, 4)).toEqual([
    { bet_type: "複勝", numbers: "2", payout: 0, bet: 400 },
    { bet_type: "複勝", numbers: "5", payout: 0, bet: 300 },
    { bet_type: "複勝", numbers: "8", payout: 0, bet: 200 },
    { bet_type: "複勝", numbers: "12", payout: 0, bet: 100 },
  ])
  expect(bets.slice(4).map((bet) => bet.numbers)).toEqual([
    "2-5",
    "2-8",
    "2-12",
    "5-8",
    "5-12",
    "8-12",
  ])
})

test("4頭未満でも存在する順位だけで馬券を作る", () => {
  const bets = buildRecommendedBetsFromRanks([
    { horseNumber: 7, rank: 2 },
    { horseNumber: 3, rank: 1 },
  ])

  expect(bets).toEqual([
    { bet_type: "複勝", numbers: "3", payout: 0, bet: 400 },
    { bet_type: "複勝", numbers: "7", payout: 0, bet: 300 },
    { bet_type: "ワイド", numbers: "3-7", payout: 0, bet: 100 },
  ])
})

test("公式配当から購入額に応じたOpenAI馬券の払戻額を計算する", () => {
  const bets = buildRecommendedBetsFromRanks([
    { horseNumber: 7, rank: 1 },
    { horseNumber: 3, rank: 2 },
  ])
  const paidBets = applyPayoutsToRecommendedBets(bets, [
    {
      id: 1,
      race_id: 10,
      bet_type: "複勝",
      numbers: "7",
      payout: 180,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: 2,
      race_id: 10,
      bet_type: "ワイド",
      numbers: "3-7",
      payout: 520,
      created_at: new Date(),
      updated_at: new Date(),
    },
  ])

  expect(paidBets.map((bet) => bet.payout)).toEqual([720, 0, 520])
})
