import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card"
import type { RecommendedBet } from "@prisma/client"
import { groupBy } from "lodash"

function uniqueNumbers(bets: RecommendedBet[]): string {
  const nums = new Set<number>()
  bets.forEach((b) => {
    b.numbers
      .split(/[-,]/)
      .map((n) => parseInt(n, 10))
      .forEach((n) => {
        if (!isNaN(n)) nums.add(n)
      })
  })
  return Array.from(nums)
    .sort((a, b) => a - b)
    .join(',')
}

interface Props {
  bets: RecommendedBet[]
}

export function RecommendedBets({ bets }: Props) {
  if (bets.length === 0) {
    return (
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>レコメンド馬券</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-600">レコメンド馬券はまだ登録されていません</p>
        </CardContent>
      </Card>
    )
  }

  const grouped = groupBy(bets, "bet_type")
  const totalAmount = bets.reduce((sum, b) => sum + b.bet, 0)
  const hitDetails = bets
    .filter((b) => b.payout > 0)
    .map((b) => ({
      type: b.bet_type,
      numbers: b.numbers,
      investment: b.bet,
      return: b.payout,
    }))
  const hitAmount = hitDetails.reduce((sum, h) => sum + h.return, 0)
  const balance = hitAmount - totalAmount

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle>レコメンド馬券</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(grouped).map(([betType, betGroup]) => {
            const total = betGroup.reduce((sum, b) => sum + b.bet, 0)
            if (betType === "ワイド" || betType === "三連複" || betType === "3連複") {
              const nums = uniqueNumbers(betGroup)
              return (
                <div key={betType} className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold mb-3 text-center">{betType}</h3>
                  <div className="flex flex-col items-center justify-center h-full">
                    <p className="text-center mb-3">ボックス: {nums}</p>
                    <p className="text-sm text-gray-600">各{betGroup[0].bet}円 × {betGroup.length}通り</p>
                    <p className="mt-2 text-sm text-gray-600 font-semibold">合計: {total}円</p>
                  </div>
                </div>
              )
            }
            return (
              <div key={betType} className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-3 text-center">{betType}</h3>
                <ul className="space-y-2">
                  {betGroup.map((bet) => (
                    <li key={bet.id} className="pb-1 last:border-b-0">
                      {bet.numbers} - {bet.bet}円
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-sm text-gray-600 font-semibold text-right">
                  合計: {total}円
                </p>
              </div>
            )
          })}
        </div>

        <div className="mt-6 pt-4 border-t text-center">
          <p className="font-bold text-lg">合計金額: {totalAmount}円</p>
        </div>

        {hitDetails.length > 0 && (
          <div className="mt-6 pt-4 border-t">
            <h3 className="text-lg font-semibold mb-3 text-center">的中結果</h3>
            <div className="space-y-4">
              <ul className="space-y-2">
                {hitDetails.map((hit, index) => (
                  <li key={index} className="flex justify-between items-center pb-1">
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
          </div>
        )}
      </CardContent>
    </Card>
  )
}
