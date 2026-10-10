import Link from "next/link"
import { type RaceListItem, formatRaceClock } from "@/app/lib/raceList"
import { FrameNumber } from "./FrameNumber"

type AiPickupListProps = {
  races: RaceListItem[]
}

/** 独自予想と OpenAI の本命が一致した発走前のレース */
export function AiPickupList({ races }: AiPickupListProps) {
  return (
    <section aria-labelledby="pickup-title" className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-baseline gap-3">
        <h2 id="pickup-title" className="text-lg font-bold">
          AIピックアップ
        </h2>
        <span className="text-[13px] text-muted-foreground">独自予想とOpenAIの本命が一致した発走前のレース</span>
      </div>
      {races.length === 0 ? (
        <p className="text-sm text-muted-foreground">本命が一致した発走前のレースはありません</p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-4">
          {races.map((race) => {
            const pick = race.originalPick
            const pickup = race.pickup
            if (!pick || !pickup) return null
            return (
              <Link
                key={race.id}
                href={`/races/${race.id}`}
                className="flex flex-col gap-3.5 rounded-xl border border-border bg-card p-5 text-foreground transition-colors hover:bg-accent"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="numeric text-[13px] text-muted-foreground">
                    {race.track} {race.number}R · {formatRaceClock(race.raceTime)}発走
                  </span>
                  <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                    本命一致
                  </span>
                </div>
                <div className="text-lg font-bold">{race.name}</div>
                <div className="flex items-center gap-3">
                  <span className="text-[26px] leading-none text-primary">◎</span>
                  <FrameNumber bracketNumber={pick.bracketNumber}>{pick.horseNumber}</FrameNumber>
                  <span className="text-base font-bold">{pick.horseName ?? `${pick.horseNumber}番`}</span>
                </div>
                <div className="flex flex-wrap gap-4 border-t border-border pt-3 text-xs text-muted-foreground">
                  <span>
                    地力 <strong className="text-foreground">{pickup.ability.label}</strong>
                  </span>
                  <span>
                    条件適性 <strong className="text-foreground">{pickup.conditionFit.label}</strong>
                  </span>
                  <span>
                    前走指数{" "}
                    <strong className="numeric text-foreground">
                      {pickup.recentTimeIndex === null ? "—" : Math.round(pickup.recentTimeIndex)}
                    </strong>
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </section>
  )
}
