import type { Result } from "@prisma/client"
import { type MarkMap, aiMarksForHorse, topResults } from "@/app/lib/raceDetail"
import { FrameNumber } from "./FrameNumber"

type RaceResultTableProps = {
  results: Pick<Result, "id" | "rank" | "frame_number" | "horse_number" | "horse_name" | "favorite" | "odds">[]
  originalMarks: MarkMap
  openAiMarks: MarkMap
  /** 表示する頭数。既定は上位5頭 */
  limit?: number
}

const ROW_CLASS = "grid grid-cols-[32px_36px_minmax(0,1fr)_56px_56px_minmax(0,1fr)] items-center gap-2.5"

/** レース結果。上位5頭と AI の印 */
export function RaceResultTable({ results, originalMarks, openAiMarks, limit = 5 }: RaceResultTableProps) {
  const rows = topResults(results, limit)
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="mb-2 text-lg font-bold">レース結果</h2>
      <div role="table" aria-label="レース結果">
        <div role="row" className={`${ROW_CLASS} border-b border-border py-2 text-xs text-muted-foreground`}>
          <span role="columnheader">着</span>
          <span role="columnheader">馬番</span>
          <span role="columnheader">馬名</span>
          <span role="columnheader" className="text-right">
            人気
          </span>
          <span role="columnheader" className="text-right">
            単勝
          </span>
          <span role="columnheader">AI印</span>
        </div>
        {rows.map((result) => (
          <div key={result.id} role="row" className={`${ROW_CLASS} border-b border-border py-2`}>
            <span role="cell" className="numeric text-base font-semibold">
              {result.rank}
            </span>
            <span role="cell">
              <FrameNumber bracketNumber={result.frame_number} className="size-[26px] text-[13px]">
                {result.horse_number}
              </FrameNumber>
            </span>
            <span role="cell" className="truncate font-bold">
              {result.horse_name}
            </span>
            <span role="cell" className="numeric text-right text-[13px]">
              {result.favorite ? `${result.favorite}人気` : "—"}
            </span>
            <span role="cell" className="numeric text-right">
              {result.odds != null ? result.odds.toFixed(1) : "—"}
            </span>
            <span role="cell" className="text-xs text-primary">
              {aiMarksForHorse(result.horse_number, originalMarks, openAiMarks)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
