import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card"
import type { Entry, Predict } from "@prisma/client"

type EntryWithMasters = Entry & {
  HorseMaster: { name: string }
  JockeyMaster: { name: string }
}

type Props = {
  entries: EntryWithMasters[]
  predicts: Predict[]
}

export function RecommendedBets({ entries, predicts }: Props) {
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

  // ワイドの組み合わせ
  const wideCombinations = []
  for (let i = 0; i < topHorses.length; i++) {
    for (let j = i + 1; j < topHorses.length; j++) {
      if (topHorses[i] && topHorses[j]) {
        wideCombinations.push({
          horses: [topHorses[i], topHorses[j]],
        })
      }
    }
  }

  // 三連複の組み合わせ
  const sanrenpukuCombinations = []
  for (let i = 0; i < topHorses.length; i++) {
    for (let j = i + 1; j < topHorses.length; j++) {
      for (let k = j + 1; k < topHorses.length; k++) {
        if (topHorses[i] && topHorses[j] && topHorses[k]) {
          sanrenpukuCombinations.push({
            horses: [topHorses[i], topHorses[j], topHorses[k]],
          })
        }
      }
    }
  }

  // 合計金額を計算
  const totalAmount =
    tanaBets.reduce((sum, bet) => sum + bet.amount, 0) +
    wideCombinations.length * 100 +
    sanrenpukuCombinations.length * 100

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle>レコメンド馬券</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-2">複勝</h3>
            <ul className="space-y-1">
              {tanaBets.map((bet, index) => (
                <li key={index}>
                  {bet.horse.horse_number}番 {bet.horse.horse_name} - {bet.amount}円
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">ワイド</h3>
            <ul className="space-y-1">
              {wideCombinations.map((bet, index) => (
                <li key={index}>{bet.horses.map((h) => `${h.horse_number}番 ${h.horse_name}`).join(" と ")}</li>
              ))}
            </ul>
            <p className="mt-2 text-sm text-gray-600">
              各100円 × {wideCombinations.length}通り = {wideCombinations.length * 100}円
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">三連複</h3>
            <ul className="space-y-1">
              {sanrenpukuCombinations.map((bet, index) => (
                <li key={index}>{bet.horses.map((h) => `${h.horse_number}番 ${h.horse_name}`).join(" と ")}</li>
              ))}
            </ul>
            <p className="mt-2 text-sm text-gray-600">
              各100円 × {sanrenpukuCombinations.length}通り = {sanrenpukuCombinations.length * 100}円
            </p>
          </div>

          <div className="pt-4 border-t">
            <p className="font-bold">合計金額: {totalAmount}円</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

