import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Result } from "@prisma/client";

type Props = {
  results: Result[];
};

export function RaceResultTable({ results }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>レース結果</CardTitle>
      </CardHeader>
      <CardContent>
        <Table className="w-[1000px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">着順</TableHead>
              <TableHead className="w-[150px]">馬名</TableHead>
              <TableHead className="w-[50px]">人気</TableHead>
              <TableHead className="w-[50px]">オッズ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((result) => (
              <TableRow key={result.id}>
                <TableCell>{result.rank}</TableCell>
                <TableCell>{result.horse_name}</TableCell>
                <TableCell>{result.favorite || "-"}</TableCell>
                <TableCell>{result.odds?.toFixed(1) || "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
