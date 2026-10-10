import Link from "next/link"
import { type RaceListItem, type RaceStatus, formatRaceClock } from "@/app/lib/raceList"
import { CourseTypeMark } from "./CourseTypeMark"
import { FrameNumber } from "./FrameNumber"

const COURSE_SHORT: Record<string, string> = { 芝: "芝", ダート: "ダ", 障害: "障" }

function RaceStatusCell({ item, status }: { item: RaceListItem; status: RaceStatus }) {
  switch (status) {
    case "hit":
      return (
        <>
          <div className="font-bold text-positive">的中</div>
          <div className="numeric text-positive">¥{(item.bet?.payout ?? 0).toLocaleString("ja-JP")}</div>
        </>
      )
    case "miss":
      return (
        <>
          <div className="text-muted-foreground">不的中</div>
          <div className="numeric text-muted-foreground">¥0</div>
        </>
      )
    case "settled":
      return <div className="text-muted-foreground">結果確定</div>
    case "started":
      return <div className="text-muted-foreground">発走済</div>
    case "next":
      return (
        <span className="inline-block rounded-full border border-primary px-2.5 py-0.5 font-bold text-primary">
          次に発走
        </span>
      )
    default:
      return <div className="text-muted-foreground">発走前</div>
  }
}

type RaceRowProps = {
  item: RaceListItem
  status: RaceStatus
}

/** 競馬場列の1行。R番号・時刻・レース名・コース・独自予想の◎・状態 */
export function RaceRow({ item, status }: RaceRowProps) {
  const pick = item.originalPick
  return (
    <Link
      href={`/races/${item.id}`}
      className="grid min-h-11 grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-3 border-t border-border px-5 py-3 text-foreground transition-colors hover:bg-accent"
    >
      <div className="flex flex-col leading-tight">
        <span className="numeric text-xl font-semibold">
          {item.number}
          <span className="text-xs text-muted-foreground">R</span>
        </span>
        <span className="numeric text-xs text-muted-foreground">{formatRaceClock(item.raceTime)}</span>
      </div>
      <div className="min-w-0">
        <div className="truncate font-bold">{item.name}</div>
        <div className="mt-0.5 flex items-center gap-2.5 text-xs text-muted-foreground">
          <CourseTypeMark courseType={item.courseType}>
            <span className="numeric">
              {COURSE_SHORT[item.courseType] ?? item.courseType}
              {item.distance}
            </span>
          </CourseTypeMark>
          {pick ? (
            <span className="flex min-w-0 items-center gap-1.5 truncate">
              <span className="text-primary">◎</span>
              <FrameNumber bracketNumber={pick.bracketNumber} className="size-6 text-xs">
                {pick.horseNumber}
              </FrameNumber>
              <span className="truncate text-foreground">{pick.horseName ?? `${pick.horseNumber}番`}</span>
            </span>
          ) : (
            <span>予想未生成</span>
          )}
        </div>
      </div>
      <div className="min-w-[76px] text-right text-xs">
        <RaceStatusCell item={item} status={status} />
      </div>
    </Link>
  )
}
