import Link from "next/link"
import type { RaceStatisticsRow } from "@/app/lib/investmentStats"
import { formatRaceClock, formatRaceDateShort } from "@/app/lib/raceList"
import { ReturnRate, SignedYen } from "./SignedValue"

const yen = (amount: number) => `¥${amount.toLocaleString("ja-JP")}`
const ROW_CLASS = "grid grid-cols-[120px_minmax(0,1.6fr)_repeat(3,minmax(90px,1fr))_90px] items-center gap-3"

/** レースごとの成績。各行はレース詳細へのリンク */
export function RaceStatisticsTable({ rows }: { rows: RaceStatisticsRow[] }) {
  return (
    <section aria-labelledby="recent-title" className="rounded-xl border border-border bg-card p-5">
      <h2 id="recent-title" className="mb-2 text-lg font-bold">
        レースごとの成績
      </h2>
      {rows.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">期間内に対象のレースがありません</p>
      ) : (
        <div className="overflow-x-auto">
          <div role="table" aria-label="レースごとの成績" className="min-w-[760px]">
            <div role="row" className={`${ROW_CLASS} border-b border-border py-2 text-xs text-muted-foreground`}>
              <span role="columnheader">日時</span>
              <span role="columnheader">レース</span>
              <span role="columnheader" className="text-right">
                投資
              </span>
              <span role="columnheader" className="text-right">
                払戻
              </span>
              <span role="columnheader" className="text-right">
                収支
              </span>
              <span role="columnheader" className="text-right">
                回収率
              </span>
            </div>
            {rows.map((row) => (
              <Link
                key={row.raceId}
                href={`/races/${row.raceId}`}
                role="row"
                className={`${ROW_CLASS} min-h-11 border-b border-border py-2.5 text-foreground transition-colors hover:bg-accent`}
              >
                <span role="cell" className="numeric text-muted-foreground">
                  {formatRaceDateShort(row.date)} {formatRaceClock(row.raceTime)}
                </span>
                <span role="cell" className="truncate font-bold">
                  {row.track}
                  {row.raceNumber}R {row.raceName}
                </span>
                <span role="cell" className="numeric text-right">
                  {yen(row.statistics.totalAmount)}
                </span>
                <span role="cell" className="numeric text-right">
                  {yen(row.statistics.totalReturn)}
                </span>
                <span role="cell" className="text-right font-semibold">
                  <SignedYen amount={row.statistics.profit} />
                </span>
                <span role="cell" className="text-right">
                  <ReturnRate rate={row.statistics.returnRate} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
