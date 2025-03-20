import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card"
import type { Entry, Predict, Payout } from "@prisma/client"

type EntryWithMasters = Entry & {
  HorseMaster: { name: string }
  JockeyMaster: { name: string }
  result?: {
    order: number
    popularity: number
    odds: number
  }
}

type Props = {
  entries: EntryWithMasters[]
  predicts: Predict[]
  payouts?: Payout[]
}

export function RecommendedBets({ entries, predicts, payouts = [] }: Props) {
  // スコアの高い順に上位4頭を選出
  const topHorses = [...predicts]
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((predict) => {
      const entry = entries.find((e) => e.horse_number === predict.horse_number)
      return {
        horse_number: predict.horse_number,
        horse_name: entry?.HorseMaster?.name || "不明",
        score: predict.score,
      }
    })

  // 複勝の金額
  const tanaBets = [
    { horse: topHorses[0], amount: 400 },
    { horse: topHorses[1], amount: 300 },
    { horse: topHorses[2], amount: 200 },
    { horse: topHorses[3], amount: 100 },
  ].filter((bet) => bet.horse) // undefined のホースを除外

  // ワイドの組み合わせ数
  const wideCount = (topHorses.length * (topHorses.length - 1)) / 2

  // 三連複の組み合わせ数
  const sanrenpukuCount = (topHorses.length * (topHorses.length - 1) * (topHorses.length - 2)) / 6

  // 合計金額を計算
  const totalAmount = tanaBets.reduce((sum, bet) => sum + bet.amount, 0) + wideCount * 100 + sanrenpukuCount * 100

  // 馬番のリスト（ソート済み）
  const horseNumbers = topHorses.map((horse) => horse.horse_number).sort((a, b) => a - b)
  const horseNumbersStr = horseNumbers.join(",")

  // 的中判定と配当計算
  let hitAmount = 0
  const hitDetails = []

  if (payouts.length > 0) {
    // 複勝の的中判定
    const fukushoPayouts = payouts.filter((p) => p.bet_type === "複勝")
    const hitFukusho = tanaBets.filter((bet) =>
      fukushoPayouts.some((p) => p.numbers === String(bet.horse.horse_number)),
    )

    hitFukusho.forEach((bet) => {
      const payout = fukushoPayouts.find((p) => p.numbers === String(bet.horse.horse_number))
      if (payout) {
        let fukusyoHitAmount = Math.floor((bet.amount / 100) * payout.payout)
        hitDetails.push({
          type: "複勝",
          numbers: bet.horse.horse_number,
          investment: bet.amount,
          return: fukusyoHitAmount,
        })
        hitAmount += fukusyoHitAmount
      }
    })

    // ワイドの的中判定
    const widePayouts = payouts.filter((p) => p.bet_type === "ワイド")
    for (let i = 0; i < horseNumbers.length; i++) {
      for (let j = i + 1; j < horseNumbers.length; j++) {
        const combo = [horseNumbers[i], horseNumbers[j]].sort((a, b) => a - b).join("-")
        const payout = widePayouts.find((p) => p.numbers === combo)
        if (payout) {
          const wideHitAmount = payout.payout
          hitDetails.push({
            type: "ワイド",
            numbers: combo,
            investment: 100,
            return: wideHitAmount,
          })
          hitAmount += wideHitAmount
        }
      }
    }

    // 三連複の的中判定
    const sanrenpukuPayouts = payouts.filter((p) => p.bet_type === "3連複")
    for (let i = 0; i < horseNumbers.length; i++) {
      for (let j = i + 1; j < horseNumbers.length; j++) {
        for (let k = j + 1; k < horseNumbers.length; k++) {
          const combo = [horseNumbers[i], horseNumbers[j], horseNumbers[k]].sort((a, b) => a - b).join("-")
          const payout = sanrenpukuPayouts.find((p) => p.numbers === combo)
          if (payout) {
            const sanrenpukuHitAmount = payout.payout
            hitDetails.push({
              type: "三連複",
              numbers: combo,
              investment: 100,
              return: sanrenpukuHitAmount,
            })
            hitAmount += sanrenpukuHitAmount
          }
        }
      }
    }
  }

  // 収支計算
  const balance = hitAmount - totalAmount

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle>レコメンド馬券</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-3 text-center">複勝</h3>
            <ul className="space-y-2">
              {tanaBets.map((bet, index) => (
                <li key={index} className="border-b pb-1 last:border-b-0">
                  {bet.horse.horse_number}番 {bet.horse.horse_name} - {bet.amount}円
                </li>
              ))}
            </ul>
            <p className="mt-2 text-sm text-gray-600 text-right">
              合計: {tanaBets.reduce((sum, bet) => sum + bet.amount, 0)}円
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-3 text-center">ワイド</h3>
            <div className="flex flex-col items-center justify-center h-full">
              <p className="text-center mb-3">ボックス: {horseNumbersStr}</p>
              <p className="text-sm text-gray-600">各100円 × {wideCount}通り</p>
              <p className="mt-2 text-sm text-gray-600 font-semibold">合計: {wideCount * 100}円</p>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-3 text-center">三連複</h3>
            <div className="flex flex-col items-center justify-center h-full">
              <p className="text-center mb-3">ボックス: {horseNumbersStr}</p>
              <p className="text-sm text-gray-600">各100円 × {sanrenpukuCount}通り</p>
              <p className="mt-2 text-sm text-gray-600 font-semibold">合計: {sanrenpukuCount * 100}円</p>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t text-center">
          <p className="font-bold text-lg">合計金額: {totalAmount}円</p>
        </div>

        {payouts.length > 0 && (
          <div className="mt-6 pt-4 border-t">
            <h3 className="text-lg font-semibold mb-3 text-center">的中結果</h3>
            {hitDetails.length > 0 ? (
              <div className="space-y-4">
                <ul className="space-y-2">
                  {hitDetails.map((hit, index) => (
                    <li key={index} className="flex justify-between items-center border-b pb-1">
                      <span>
                        {hit.type} {hit.numbers}
                      </span>
                      <span className="font-semibold text-green-600">+{hit.return.toLocaleString()}円</span>
                    </li>
                  ))}
                </ul>
                <div className="flex justify-between items-center pt-2">
                  <span className="font-bold">投資金額</span>
                  <span>{totalAmount.toLocaleString()}円</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="font-bold">回収金額</span>
                  <span>{hitAmount.toLocaleString()}円</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="font-bold">収支</span>
                  <span className={balance >= 0 ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                    {balance >= 0 ? "+" : ""}
                    {balance.toLocaleString()}円
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="font-bold">回収率</span>
                  <span className={balance >= 0 ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                    {totalAmount > 0 ? Math.round((hitAmount / totalAmount) * 100) : 0}%
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-center text-gray-600">的中馬券はありませんでした</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}