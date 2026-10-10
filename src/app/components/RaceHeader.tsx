import Link from "next/link"
import { type RaceSettlement, formatExpectedPace } from "@/app/lib/raceDetail"
import { formatRaceClock, formatRaceDateHeading, formatRaceDateMonthDay, toStoredDateString } from "@/app/lib/raceList"
import { CourseTypeMark } from "./CourseTypeMark"
import { type AdjacentRace, RaceNavigation } from "./RaceNavigation"

type RaceHeaderProps = {
  race: {
    track: string
    number: number
    name: string
    netkeiba_race_id: string
    course_type: string
    distance: number
    turn: string | null
    race_time: Date | null
  }
  entryCount: number
  expectedPace: string | null
  settlement: RaceSettlement
  prev: AdjacentRace | null
  next: AdjacentRace | null
}

const SETTLEMENT_LABEL: Record<RaceSettlement, { label: string; className: string }> = {
  settled: { label: "確定", className: "text-primary" },
  started: { label: "発走済", className: "text-foreground" },
  upcoming: { label: "発走前", className: "text-foreground" },
}

function Tile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-card px-4.5 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-bold">{children}</div>
    </div>
  )
}

/** パンくず・前後レース・レース名・条件・想定ペースと状態 */
export function RaceHeader({ race, entryCount, expectedPace, settlement, prev, next }: RaceHeaderProps) {
  const dateString = race.race_time ? toStoredDateString(race.race_time) : null
  const raceTime = race.race_time ? race.race_time.toISOString() : null
  const pace = formatExpectedPace(expectedPace)
  const status = SETTLEMENT_LABEL[settlement]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 text-[13px]">
        <nav aria-label="パンくず" className="text-muted-foreground">
          <Link href="/" className="text-primary hover:underline">
            レース一覧
          </Link>
          {dateString && <> / {formatRaceDateMonthDay(dateString)}</>}
          {" / "}
          {race.track} / {race.number}R
        </nav>
        <RaceNavigation prev={prev} next={next} compact />
      </div>

      <section
        aria-label="レース情報"
        className="flex flex-wrap items-end justify-between gap-6 border-b border-border pb-6"
      >
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="numeric rounded-md bg-primary px-2.5 py-0.5 text-sm font-semibold text-primary-foreground">
              {race.track} {race.number}R
            </span>
            <span className="numeric text-xs text-muted-foreground">netkeiba {race.netkeiba_race_id}</span>
          </div>
          <h1 className="text-[44px] font-bold leading-[1.2] tracking-[0.02em]">{race.name}</h1>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-[15px] text-foreground">
            <span>
              {dateString ? formatRaceDateHeading(dateString) : "開催日未定"}{" "}
              <span className="numeric">{formatRaceClock(raceTime)}</span>発走
            </span>
            <CourseTypeMark courseType={race.course_type}>
              {race.course_type} <span className="numeric">{race.distance}</span>m{race.turn ? ` ${race.turn}` : ""}
            </CourseTypeMark>
            <span>
              <span className="numeric">{entryCount}</span>頭
            </span>
          </div>
        </div>
        <div className="flex overflow-hidden rounded-xl border border-border bg-border gap-px">
          <Tile label="想定ペース">
            <span className={pace.muted ? "text-muted-foreground" : ""}>{pace.label}</span>
          </Tile>
          <Tile label="状態">
            <span className={status.className}>{status.label}</span>
          </Tile>
        </div>
      </section>
    </div>
  )
}
