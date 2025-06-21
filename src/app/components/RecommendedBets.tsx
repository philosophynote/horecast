import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table"
import type { RecommendedBet } from "@prisma/client"
import { groupBy } from "lodash"

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
  const totalBet = bets.reduce((sum, b) => sum + b.bet, 0)
  const totalReturn = bets.reduce((sum, b) => sum + b.payout, 0)
  const balance = totalReturn - totalBet

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle>レコメンド馬券</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>式別</TableHead>
              <TableHead>馬番</TableHead>
              <TableHead>購入金額</TableHead>
              <TableHead>払戻</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.entries(grouped).map(([betType, betGroup]) => (
              <TableRow key={betType}>
                <TableCell>{betType}</TableCell>
                <TableCell>
                  {betGroup.map((b) => (
                    <div key={b.id}>{b.numbers}</div>
                  ))}
                </TableCell>
                <TableCell>
                  {betGroup.map((b) => (
                    <div key={b.id}>{b.bet.toLocaleString()}円</div>
                  ))}
                </TableCell>
                <TableCell>
                  {betGroup.map((b) => (
                    <div key={b.id}>{b.payout.toLocaleString()}円</div>
                  ))}
                </TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell colSpan={2} className="font-bold text-right">
                合計
              </TableCell>
              <TableCell className="font-bold">
                {totalBet.toLocaleString()}円
              </TableCell>
              <TableCell className="font-bold">
                {totalReturn.toLocaleString()}円
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <div className="mt-4 text-center font-bold">
          収支:{" "}
          <span className={balance >= 0 ? "text-green-600" : "text-red-600"}>
            {balance >= 0 ? "+" : ""}
            {balance.toLocaleString()}円
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
