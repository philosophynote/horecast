import React from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Entry, Predict } from "@prisma/client"
import { useMemo } from "react"
import { groupBy } from "lodash"

type EntryWithMasters = Entry & {
  HorseMaster: { name: string }
  JockeyMaster: { name: string }
}

type Props = {
  entries: EntryWithMasters[]
  predicts: Predict[]
}

const sortByHorseNumber = (a: EntryWithMasters, b: EntryWithMasters) => {
  return a.horse_number - b.horse_number
}

export function EntryTable({ entries, predicts }: Props) {
  const predictMarks = useMemo(() => {
    const sortedPredicts = [...predicts].sort((a, b) => b.score - a.score)
    const marks = ["◎", "○", "▲", "△", "×"]
    return new Map(
      sortedPredicts.map((predict, index) => [
        predict.horse_number,
        index < marks.length ? marks[index] : "×"
      ])
    )
  }, [predicts])

  // 枠番でグループ化し、各グループ内で馬番順にソート
  const groupedEntries = Object.entries(groupBy(entries, "bracket_number"))
    .map(([bracketNumber, entriesInBracket]) => ({
      bracketNumber: Number.parseInt(bracketNumber),
      entries: [...entriesInBracket].sort(sortByHorseNumber),
    }))
    .sort((a, b) => a.bracketNumber - b.bracketNumber)

  return (
    <Card>
      <CardHeader>
        <CardTitle>出馬表</CardTitle>
      </CardHeader>
      <CardContent>
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
            {groupedEntries.map(({ bracketNumber, entries }) => (
              <React.Fragment key={bracketNumber}>
                {entries.map((entry, index) => (
                  <TableRow key={entry.id}>
                    {index === 0 && (
                      <TableCell rowSpan={entries.length} className="align-middle text-center">
                        {bracketNumber}
                      </TableCell>
                    )}
                    <TableCell>{entry.horse_number}</TableCell>
                    <TableCell>{entry.HorseMaster?.name ?? "不明"}</TableCell>
                    <TableCell>{entry.sex}</TableCell>
                    <TableCell>{entry.age}</TableCell>
                    <TableCell>{entry.JockeyMaster?.name ?? "不明"}</TableCell>
                    <TableCell>{entry.jockey_weight}</TableCell>
                    <TableCell>{predictMarks.get(entry.horse_number) ?? "×"}</TableCell>
                  </TableRow>
                ))}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

