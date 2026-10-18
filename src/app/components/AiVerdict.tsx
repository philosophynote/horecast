import type { VerdictRow } from "@/app/lib/raceDetail"
import { FrameNumber } from "./FrameNumber"

export type VerdictCardData = {
  title: string
  /** モデルの添字 */
  engine: string
  rows: VerdictRow[]
}

type AiVerdictProps = {
  cards: VerdictCardData[]
  /** 両モデルの◎が一致した馬番 */
  agreedHorseNumber: number | null
}

/** AIの結論。2つのモデルの印を並べて比較する */
export function AiVerdict({ cards, agreedHorseNumber }: AiVerdictProps) {
  return (
    <section aria-labelledby="verdict-title" className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-baseline gap-3">
        <h2 id="verdict-title" className="text-xl font-bold">
          AIの結論
        </h2>
        <span className="text-[13px] text-muted-foreground">2つのモデルの印を並べて比較</span>
        {agreedHorseNumber !== null && (
          <span className="numeric rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-primary-foreground">
            本命一致 ◎{agreedHorseNumber}
          </span>
        )}
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] gap-4">
        {cards.map((card) => (
          <div key={card.title} className="flex flex-col gap-1 rounded-xl border border-border bg-card px-5 py-4">
            <div className="mb-2 flex items-baseline justify-between">
              <span className="text-base font-bold">{card.title}</span>
              <span className="numeric text-xs text-muted-foreground">{card.engine}</span>
            </div>
            {card.rows.length === 0 ? (
              <p className="py-2 text-sm text-muted-foreground">予想はまだありません</p>
            ) : (
              card.rows.map((row) => (
                <div
                  key={row.mark}
                  className="grid grid-cols-[32px_34px_minmax(0,1fr)_auto] items-center gap-3 border-t border-border py-2"
                >
                  <span className={`text-[22px] leading-none ${row.mark === "◎" ? "text-primary" : "text-foreground"}`}>
                    {row.mark}
                  </span>
                  <FrameNumber bracketNumber={row.bracketNumber}>{row.horseNumber}</FrameNumber>
                  <span className="truncate text-base font-bold">{row.horseName ?? `${row.horseNumber}番`}</span>
                  <span className="text-xs text-muted-foreground">
                    {row.abilityLabel ? `地力 ${row.abilityLabel}` : ""}
                  </span>
                </div>
              ))
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
