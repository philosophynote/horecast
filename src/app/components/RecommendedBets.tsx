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

  // ワイドの組み合わせ数
  const wideCount = (topHorses.length * (topHorses.length - 1)) / 2

  // 三連複の組み合わせ数
  const sanrenpukuCount = (topHorses.length * (topHorses.length - 1) * (topHorses.length - 2)) / 6

  // 合計金額を計算
  const totalAmount = tanaBets.reduce((sum, bet) => sum + bet.amount, 0) + wideCount * 100 + sanrenpukuCount * 100

  // 馬番のリスト（ソート済み）
  const horseNumbers = topHorses
    .map((horse) => horse.horse_number)
    .sort((a, b) => a - b)
    .join(",")

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
              <p className="text-center mb-3">ボックス: {horseNumbers}</p>
              <p className="text-sm text-gray-600">各100円 × {wideCount}通り</p>
              <p className="mt-2 text-sm text-gray-600 font-semibold">合計: {wideCount * 100}円</p>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-3 text-center">三連複</h3>
            <div className="flex flex-col items-center justify-center h-full">
              <p className="text-center mb-3">ボックス: {horseNumbers}</p>
              <p className="text-sm text-gray-600">各100円 × {sanrenpukuCount}通り</p>
              <p className="mt-2 text-sm text-gray-600 font-semibold">合計: {sanrenpukuCount * 100}円</p>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t text-center">
          <p className="font-bold text-lg">合計金額: {totalAmount}円</p>
        </div>
      </CardContent>
    </Card>
  )
}
