import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table"
import { Entry, Predict } from "@prisma/client"

type EntryWithMasters = Entry & {
  HorseMaster: { name: string }
  JockeyMaster: { name: string }
}

type Props = {
  entries: EntryWithMasters[]
  predicts: Predict[]
}

const sortEntries = (a: EntryWithMasters, b: EntryWithMasters) => {
  if (a.bracket_number !== b.bracket_number) {
    return a.bracket_number - b.bracket_number
  }
  return a.horse_number - b.horse_number
}

export function EntryTable({ entries, predicts }: Props) {
  const getPredictMark = (horseNumber: number) => {
    const sortedPredicts = predicts.sort((a, b) => b.score - a.score)
    const index = sortedPredicts.findIndex(p => p.horse_number === horseNumber)
    const marks = ["◎", "○", "▲", "△", "×"]
    return index < marks.length ? marks[index] : "×"
  }
  const sortedEntries = [...entries].sort(sortEntries)

  return (
    
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>枠番</TableHead>
          <TableHead>馬番</TableHead>
          <TableHead>馬名</TableHead>
          <TableHead>性別</TableHead>
          <TableHead>馬齢</TableHead>
          <TableHead>騎手</TableHead>
          <TableHead>負担重量</TableHead>
          <TableHead>予想印</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedEntries.map((entry) => (
          <TableRow key={entry.id}>
            <TableCell>{entry.bracket_number}</TableCell>
            <TableCell>{entry.horse_number}</TableCell>
            <TableCell>{entry.HorseMaster?.name ?? "不明"}</TableCell>
            <TableCell>{entry.sex}</TableCell>
            <TableCell>{entry.age}</TableCell>
            <TableCell>{entry.JockeyMaster?.name ?? "不明"}</TableCell>
            <TableCell>{entry.jockey_weight}</TableCell>
            <TableCell>{getPredictMark(entry.horse_number)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

