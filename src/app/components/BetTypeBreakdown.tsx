import type { BetTypeStatistics } from "@/app/lib/statistics"
import { ReturnRateBar } from "./ReturnRateBar"
import { ReturnRate } from "./SignedValue"

const yen = (amount: number) => `¥${amount.toLocaleString("ja-JP")}`

/** 券種別の回収率・的中・投資・払戻 */
export function BetTypeBreakdown({ betTypeStats }: { betTypeStats: BetTypeStatistics[] }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-lg font-bold">券種別</h2>
      <div className="mb-2.5 text-xs text-muted-foreground">縦線が回収率100%</div>
      {betTypeStats.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">対象の馬券がありません</p>
      ) : (
        betTypeStats.map((type) => (
          <div key={type.betType} className="flex flex-col gap-2 border-t border-border py-3.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-base font-bold">{type.betType}</span>
              <ReturnRate rate={type.returnRate} className="text-[22px] font-semibold" />
            </div>
            <ReturnRateBar rate={type.returnRate} />
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>
                的中{" "}
                <span className="numeric text-foreground">
                  {type.hitBets}/{type.totalBets}
                </span>
                （<span className="numeric">{type.hitRate.toFixed(1)}%</span>）
              </span>
              <span>
                投資 <span className="numeric text-foreground">{yen(type.totalAmount)}</span>
              </span>
              <span>
                払戻 <span className="numeric text-foreground">{yen(type.totalReturn)}</span>
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
