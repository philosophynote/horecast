import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card"
import type { RecommendedBet } from "@prisma/client"
import { groupBy } from "lodash"

type EntryWithHorse = {
  horse_number: number
  HorseMaster: {
    name: string
  } | null
}

export type RecommendedBetDisplay = Pick<
  RecommendedBet,
  "bet_type" | "numbers" | "payout" | "bet"
>

function uniqueNumbers(bets: RecommendedBetDisplay[]): string {
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
  entries: EntryWithHorse[]
  sections: Array<{
    title: string
    bets: RecommendedBetDisplay[]
    emptyMessage?: string
  }>
}

type SectionProps = {
  title: string
  bets: RecommendedBetDisplay[]
  horseNameMap: Map<number, string>
  emptyMessage?: string
}

function RecommendedBetSection({
  title,
  bets,
  horseNameMap,
  emptyMessage = "レコメンド馬券はまだ登録されていません",
}: SectionProps) {
  if (bets.length === 0) {
    return (
      <section className="rounded-lg border border-gray-200 bg-gray-50 p-5">
        <h3 className="mb-4 text-center text-xl font-semibold">{title}</h3>
        <p className="py-8 text-center text-gray-600">{emptyMessage}</p>
      </section>
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
    <section className="rounded-lg border border-gray-200 bg-gray-50 p-5">
      <h3 className="mb-4 text-center text-xl font-semibold">{title}</h3>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {Object.entries(grouped).map(([betType, betGroup]) => {
            const total = betGroup.reduce((sum, b) => sum + b.bet, 0)
            const sorted =
              betType === "複勝"
                ? [...betGroup].sort((a, b) => b.bet - a.bet)
                : betGroup
            if (betType === "ワイド") {
              const nums = uniqueNumbers(betGroup)
              return (
                <div key={betType} className="bg-white p-4 rounded-lg min-h-[180px] flex flex-col border border-gray-200">
                  <h3 className="text-lg font-semibold mb-3 text-center">{betType}</h3>
                  <div className="flex flex-col items-center justify-center flex-1">
                    <p className="text-center mb-3">ボックス: {nums}</p>
                    <p className="text-sm text-gray-600">各{betGroup[0].bet}円 × {betGroup.length}通り</p>
                    <p className="mt-2 text-sm text-gray-600 font-semibold">合計: {total}円</p>
                  </div>
                </div>
              )
            }
            return (
              <div key={betType} className="bg-white p-4 rounded-lg min-h-[180px] flex flex-col border border-gray-200">
                <h3 className="text-lg font-semibold mb-3 text-center">{betType}</h3>
                <ul className="space-y-2 flex-1">
                  {sorted.map((bet, index) => {
                    if (betType === "複勝") {
                      const horseNumber = parseInt(bet.numbers, 10)
                      const horseName = horseNameMap.get(horseNumber) || "不明"
                      return (
                        <li key={`${bet.bet_type}-${bet.numbers}-${index}`} className="pb-1 last:border-b-0">
                          {bet.numbers} {horseName} - {bet.bet}円
                        </li>
                      )
                    }
                    return (
                      <li key={`${bet.bet_type}-${bet.numbers}-${index}`} className="pb-1 last:border-b-0">
                        {bet.numbers} - {bet.bet}円
                      </li>
                    )
                  })}
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
                {hitDetails.map((hit) => (
                  <li key={`${hit.type}-${hit.numbers}`} className="flex justify-between items-center pb-1">
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
    </section>
  )
}

export function RecommendedBets({ entries, sections }: Props) {
  const horseNameMap = new Map(
    entries.map(entry => [
      entry.horse_number,
      entry.HorseMaster?.name ?? "不明"
    ])
  )

  return (
    <Card className="mt-8 bg-white border border-gray-200 shadow-xs">
      <CardHeader>
        <CardTitle>レコメンド馬券</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {sections.map((section) => (
            <RecommendedBetSection
              key={section.title}
              title={section.title}
              bets={section.bets}
              horseNameMap={horseNameMap}
              emptyMessage={section.emptyMessage}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
