import { groupBy } from "lodash"
import {
  type RaceListItem,
  type RaceStatus,
  countCourseTypes,
  formatCourseTypeCounts,
} from "@/app/lib/raceList"
import { RaceRow } from "./RaceRow"

type TrackRaceListProps = {
  races: RaceListItem[]
  statusOf: (item: RaceListItem) => RaceStatus
}

/** 競馬場ごとの列。各列は発走順の行 */
export function TrackRaceList({ races, statusOf }: TrackRaceListProps) {
  const groups = Object.entries(groupBy(races, (race) => race.track))
  return (
    <section
      aria-label="競馬場ごとのレース"
      className="grid grid-cols-[repeat(auto-fit,minmax(min(420px,100%),1fr))] items-start gap-5"
    >
      {groups.map(([track, trackRaces]) => (
        <div key={track} className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex items-end justify-between px-5 pb-3.5 pt-4">
            <h2 className="text-[26px] font-bold tracking-[0.06em]">{track}</h2>
            <div className="text-right text-xs text-muted-foreground">
              {formatCourseTypeCounts(countCourseTypes(trackRaces))}
            </div>
          </div>
          <div className="flex flex-col">
            {trackRaces.map((race) => (
              <RaceRow key={race.id} item={race} status={statusOf(race)} />
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}
