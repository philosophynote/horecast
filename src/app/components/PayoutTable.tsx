import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table"
import type { Payout } from "@prisma/client"
import { groupBy } from "lodash"

type Props = {
  payouts: Payout[]
}

export function PayoutTable({ payouts }: Props) {
  if (payouts.length === 0) {
    return <div className="text-center py-4">配当情報はまだ登録されていません</div>
  }

  const groupedPayouts = groupBy(payouts, "bet_type")

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>式別</TableHead>
            <TableHead>馬番</TableHead>
            <TableHead>配当金</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.entries(groupedPayouts).map(([betType, payoutGroup]) => (
            <TableRow key={betType}>
              <TableCell>{betType}</TableCell>
              <TableCell>
                {payoutGroup.map((p) => (
                  <div key={p.id}>{p.numbers}</div>
                ))}
              </TableCell>
              <TableCell>
                {payoutGroup.map((p) => (
                  <div key={p.id}>{p.payout.toLocaleString()}円</div>
                ))}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

