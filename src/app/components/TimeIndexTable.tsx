import Link from "next/link"
import type { TimeIndexRow } from "@/app/lib/timeIndex"
import { TONE_TEXT_CLASS, timeIndexDeviation, timeIndexTone } from "@/app/lib/timeIndexChart"
import { formatRaceTime, formatTimeIndex, timeIndexHref, type TimeIndexFilter } from "@/app/lib/timeIndexFilters"
import { formatRaceDateShort } from "@/app/lib/raceList"
import { ConfidencePill } from "./ConfidencePill"
import { CourseTypeMark } from "./CourseTypeMark"

const Dash = () => <span className="text-muted-foreground">—</span>

export function RaceLinkCell({ row }: { row: TimeIndexRow }) {
  const label = `${row.racecourse}${row.raceNumber ? `${row.raceNumber}R` : ""}`
  if (row.raceId === null) {
    return <span>{label}</span>
  }
  return (
    <Link href={`/races/${row.raceId}`} className="text-primary hover:underline">
      {label}
    </Link>
  )
}

export function ConditionCell({ row }: { row: TimeIndexRow }) {
  return (
    <span className="whitespace-nowrap text-[13px]">
      <CourseTypeMark courseType={row.surface}>
        {row.surface}
        <span className="numeric">{row.distance}</span>m {row.going}
      </CourseTypeMark>
      <span className="block text-xs text-muted-foreground">{row.className}</span>
    </span>
  )
}

export function BaselineCell({ row }: { row: TimeIndexRow }) {
  if (row.baselineSeconds === null) {
    return <Dash />
  }
  return (
    <span className="numeric whitespace-nowrap text-muted-foreground">
      {formatRaceTime(row.baselineSeconds)}
      <span className="block text-[11px]">標本 {row.baselineSampleSize}</span>
    </span>
  )
}

/** 指数の値と、100 からの差を示す棒。算出不可は — で棒を出さない */
export function TimeIndexCell({ row }: { row: TimeIndexRow }) {
  const deviation = timeIndexDeviation(row.timeIndex)
  if (row.timeIndex === null || deviation === null) {
    return (
      <span className="numeric text-lg text-muted-foreground" title={row.unavailableReason ?? undefined}>
        —
      </span>
    )
  }
  return (
    <span className="flex items-center gap-3">
      <span className={`numeric w-12 text-lg font-semibold ${TONE_TEXT_CLASS[timeIndexTone(row.timeIndex)]}`}>
        {formatTimeIndex(row.timeIndex)}
      </span>
      <span aria-hidden="true" className="relative h-1.5 flex-1 rounded-full bg-border">
        <span
          data-testid="deviation-fill"
          className={`absolute inset-y-0 rounded-full ${
            timeIndexTone(row.timeIndex) === "slow" ? "bg-slow" : timeIndexTone(row.timeIndex) === "primary" ? "bg-primary" : "bg-foreground"
          }`}
          style={{ left: `${deviation.left}%`, width: `${deviation.width}%` }}
        />
        <span className="absolute -inset-y-0.5 left-1/2 w-px bg-foreground" />
      </span>
    </span>
  )
}

const ROW_CLASS =
  "grid grid-cols-[96px_96px_44px_minmax(160px,1.3fr)_150px_72px_72px_minmax(200px,1.4fr)_64px] items-center gap-3"

type Props = {
  rows: TimeIndexRow[]
  /** 馬名リンクで推移表示に切り替えるとき、現在の絞り込みを引き継ぐ */
  filter: TimeIndexFilter
}

export function TimeIndexTable({ rows, filter }: Props) {
  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">条件に一致するタイム指数がありません</p>
  }

  return (
    <div className="overflow-x-auto">
      <div role="table" aria-label="タイム指数一覧" className="min-w-[1040px]">
        <div role="row" className={`${ROW_CLASS} border-b border-border py-2 text-xs text-muted-foreground`}>
          <span role="columnheader">開催日</span>
          <span role="columnheader">レース</span>
          <span role="columnheader">馬番</span>
          <span role="columnheader">馬名</span>
          <span role="columnheader">条件</span>
          <span role="columnheader" className="text-right">
            走破
          </span>
          <span role="columnheader" className="text-right">
            基準
          </span>
          <span role="columnheader">指数</span>
          <span role="columnheader">信頼度</span>
        </div>
        {rows.map((row) => (
          <div key={row.id} role="row" className={`${ROW_CLASS} border-b border-border py-2.5`}>
            <span role="cell" className="numeric text-muted-foreground">
              <time dateTime={row.raceDate}>{formatRaceDateShort(row.raceDate)}</time>
            </span>
            <span role="cell" className="whitespace-nowrap">
              <RaceLinkCell row={row} />
            </span>
            <span role="cell" className="numeric">
              {row.horseNumber}
            </span>
            <span role="cell" className="truncate">
              <Link
                href={`${timeIndexHref(filter, { horse: row.horseName, page: 1 })}#horse-trend`}
                className="font-bold text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground"
              >
                {row.horseName}
              </Link>
            </span>
            <span role="cell">
              <ConditionCell row={row} />
            </span>
            <span role="cell" className="numeric text-right">
              {row.timeSeconds === null ? <Dash /> : formatRaceTime(row.timeSeconds)}
            </span>
            <span role="cell" className="text-right">
              <BaselineCell row={row} />
            </span>
            <span role="cell">
              <TimeIndexCell row={row} />
            </span>
            <span role="cell">
              <ConfidencePill confidence={row.baselineConfidence} />
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
