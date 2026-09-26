import Link from "next/link"
import { Badge } from "@/app/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table"
import type { TimeIndexRow } from "@/app/lib/timeIndex"
import {
  CONFIDENCE_LABELS,
  formatRaceTime,
  formatTimeIndex,
  isConfidenceLevel,
  timeIndexHref,
  type TimeIndexFilter,
} from "@/app/lib/timeIndexFilters"

/** 信頼度が高いほど濃い同系色。文字ラベルを必ず添え、色だけで区別しない */
const CONFIDENCE_CLASSES: Record<string, string> = {
  high: "bg-blue-100 text-blue-900 border-blue-300",
  medium: "bg-blue-50 text-blue-800 border-blue-200",
  low: "bg-slate-50 text-slate-700 border-slate-300",
  unavailable: "bg-gray-100 text-gray-500 border-dashed border-gray-300",
}

export function ConfidenceBadge({ confidence }: { confidence: string }) {
  const label = isConfidenceLevel(confidence) ? CONFIDENCE_LABELS[confidence] : confidence
  const toneClass = CONFIDENCE_CLASSES[confidence] ?? "bg-gray-50 text-gray-700 border-gray-200"
  return (
    <Badge variant="outline" className={`whitespace-nowrap font-medium ${toneClass}`}>
      {label}
    </Badge>
  )
}

/** 100を基準に、速い（大きい）ほど暖色、遅いほど寒色で強調する */
function timeIndexClass(value: number | null): string {
  if (value === null) return "text-gray-400"
  if (value >= 110) return "text-red-700 font-semibold"
  if (value >= 105) return "text-orange-700 font-semibold"
  if (value < 90) return "text-sky-700"
  return ""
}

export function RaceLinkCell({ row }: { row: TimeIndexRow }) {
  const label = `${row.racecourse}${row.raceNumber ? `${row.raceNumber}R` : ""}`
  if (row.raceId === null) {
    return <span>{label}</span>
  }
  return (
    <Link href={`/races/${row.raceId}`} className="text-blue-600 hover:underline">
      {label}
    </Link>
  )
}

export function ConditionCell({ row }: { row: TimeIndexRow }) {
  return (
    <span className="whitespace-nowrap">
      {row.surface}{row.distance}m {row.going}
      <span className="block text-xs text-gray-500">{row.className}</span>
    </span>
  )
}

export function BaselineCell({ row }: { row: TimeIndexRow }) {
  if (row.baselineSeconds === null) {
    return <span className="text-gray-400">-</span>
  }
  return (
    <span className="whitespace-nowrap">
      {formatRaceTime(row.baselineSeconds)}
      <span className="block text-xs text-gray-500">標本 {row.baselineSampleSize}</span>
    </span>
  )
}

export function TimeIndexCell({ row }: { row: TimeIndexRow }) {
  return (
    <span className={`tabular-nums ${timeIndexClass(row.timeIndex)}`} title={row.unavailableReason ?? undefined}>
      {formatTimeIndex(row.timeIndex)}
    </span>
  )
}

type Props = {
  rows: TimeIndexRow[]
  /** 馬名リンクで推移表示に切り替えるとき、現在の絞り込みを引き継ぐ */
  filter: TimeIndexFilter
}

export function TimeIndexTable({ rows, filter }: Props) {
  if (rows.length === 0) {
    return <p className="text-center py-8 text-gray-500">条件に一致するタイム指数がありません</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>開催日</TableHead>
          <TableHead>レース</TableHead>
          <TableHead>条件</TableHead>
          <TableHead className="text-right">馬番</TableHead>
          <TableHead>馬名</TableHead>
          <TableHead className="text-right">走破タイム</TableHead>
          <TableHead className="text-right">基準タイム</TableHead>
          <TableHead>信頼度</TableHead>
          <TableHead className="text-right">指数</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="whitespace-nowrap tabular-nums">{row.raceDate}</TableCell>
            <TableCell className="whitespace-nowrap"><RaceLinkCell row={row} /></TableCell>
            <TableCell><ConditionCell row={row} /></TableCell>
            <TableCell className="text-right tabular-nums">{row.horseNumber}</TableCell>
            <TableCell className="whitespace-nowrap">
              <Link
                href={`${timeIndexHref(filter, { horse: row.horseName, page: 1 })}#horse-trend`}
                className="text-blue-600 hover:underline"
              >
                {row.horseName}
              </Link>
            </TableCell>
            <TableCell className="text-right tabular-nums">{formatRaceTime(row.timeSeconds)}</TableCell>
            <TableCell className="text-right tabular-nums"><BaselineCell row={row} /></TableCell>
            <TableCell><ConfidenceBadge confidence={row.baselineConfidence} /></TableCell>
            <TableCell className="text-right"><TimeIndexCell row={row} /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
