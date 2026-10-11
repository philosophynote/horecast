import type { TrackStatistics } from "@/app/lib/investmentStats"
import { ReturnRateBar } from "./ReturnRateBar"
import { ReturnRate } from "./SignedValue"

/** 競馬場別の回収率 */
export function TrackBreakdown({ trackStatistics }: { trackStatistics: TrackStatistics[] }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-lg font-bold">競馬場別</h2>
      <div className="mb-2.5 text-xs text-muted-foreground">縦線が回収率100%</div>
      {trackStatistics.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">対象のレースがありません</p>
      ) : (
        trackStatistics.map((track) => (
          <div
            key={track.track}
            className="grid grid-cols-[56px_minmax(0,1fr)_88px] items-center gap-3 border-t border-border py-2.5"
          >
            <span className="font-bold">{track.track}</span>
            <ReturnRateBar rate={track.returnRate} />
            <ReturnRate rate={track.returnRate} className="text-right font-semibold" />
          </div>
        ))
      )}
    </div>
  )
}
