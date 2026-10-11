import type { BetStatistics } from "@/app/lib/statistics"
import { hitBetsOf } from "@/app/lib/investmentStats"
import { returnRateTone } from "@/app/lib/signedFormat"
import { ReturnRateBar } from "./ReturnRateBar"
import { SignedYen } from "./SignedValue"

type InvestmentKpisProps = {
  /** 対象レースが無ければ null */
  statistics: BetStatistics | null
  totalRaces: number
}

const yen = (amount: number) => `¥${amount.toLocaleString("ja-JP")}`

function Panel({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={`rounded-xl border border-border bg-card px-6 py-5 ${className}`}>{children}</div>
}

const Dash = () => <span className="text-muted-foreground">—</span>

/** 主要指標: 回収率（100% の基準線つき）、収支、的中率 */
export function InvestmentKpis({ statistics, totalRaces }: InvestmentKpisProps) {
  const stats = totalRaces > 0 ? statistics : null
  const rateTone = stats ? (returnRateTone(stats.returnRate) === "positive" ? "text-positive" : "text-negative") : ""

  return (
    <section aria-label="主要指標" className="flex flex-wrap gap-4">
      <Panel className="flex min-w-0 flex-[2_1_420px] flex-col justify-between gap-2.5">
        <div className="text-[13px] text-muted-foreground">回収率</div>
        <div className={`numeric text-[64px] font-semibold leading-none ${rateTone}`}>
          {stats ? (
            <>
              {stats.returnRate.toFixed(1)}
              <span className="text-[28px]">%</span>
            </>
          ) : (
            <Dash />
          )}
        </div>
        <ReturnRateBar rate={stats?.returnRate ?? 0} size="thick" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span className="numeric">0%</span>
          <span>100% = 収支トントン</span>
          <span className="numeric">150%</span>
        </div>
      </Panel>
      <Panel className="flex-[1_1_220px]">
        <div className="text-[13px] text-muted-foreground">収支</div>
        <div className="numeric text-[30px] font-semibold">{stats ? <SignedYen amount={stats.profit} /> : <Dash />}</div>
        <div className="mt-1.5 text-xs text-muted-foreground">
          投資 <span className="numeric">{stats ? yen(stats.totalAmount) : "—"}</span>
          <br />
          払戻 <span className="numeric">{stats ? yen(stats.totalReturn) : "—"}</span>
        </div>
      </Panel>
      <Panel className="flex-[1_1_220px]">
        <div className="text-[13px] text-muted-foreground">的中率</div>
        <div className="numeric text-[30px] font-semibold">
          {stats ? (
            <>
              {stats.hitRate.toFixed(1)}
              <span className="text-lg">%</span>
            </>
          ) : (
            <Dash />
          )}
        </div>
        <div className="mt-1.5 text-xs text-muted-foreground">
          {stats ? (
            <>
              <span className="numeric">{stats.totalBets}</span>点中 <span className="numeric">{hitBetsOf(stats)}</span>点的中
            </>
          ) : (
            "—"
          )}
          <br />
          対象 <span className="numeric">{totalRaces}</span>レース
        </div>
      </Panel>
    </section>
  )
}
