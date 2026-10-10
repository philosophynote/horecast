import Link from "next/link"

export type AdjacentRace = {
  id: number
  track: string
  number: number
  name: string
}

type RaceNavigationProps = {
  prev: AdjacentRace | null
  next: AdjacentRace | null
  /** 上段はレース名を省く */
  compact?: boolean
}

function label(race: AdjacentRace, compact: boolean) {
  const head = `${race.track}${race.number}R`
  return compact ? head : `${head} ${race.name}`
}

const LINK_CLASS =
  "inline-flex min-h-11 items-center rounded-[10px] border border-border px-4 text-sm text-foreground transition-colors hover:bg-accent"

/** 前後レースへの移動。無い側は空のまま場所だけ保つ */
export function RaceNavigation({ prev, next, compact = false }: RaceNavigationProps) {
  return (
    <nav aria-label="前後のレース" className="flex justify-between gap-3">
      {prev ? (
        <Link href={`/races/${prev.id}`} className={LINK_CLASS}>
          ← {label(prev, compact)}
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link href={`/races/${next.id}`} className={LINK_CLASS}>
          {label(next, compact)} →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  )
}
