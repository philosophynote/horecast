import type { RaceDaySummary } from "@/app/lib/raceList"
import { ReturnRate, SignedYen } from "./SignedValue"

function Tile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-card px-5 py-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="numeric mt-0.5 text-[28px] font-semibold leading-tight">{children}</div>
    </div>
  )
}

function Count({ value, total }: { value: number; total: number }) {
  return (
    <>
      {value}
      <span className="text-base text-muted-foreground"> / {total}R</span>
    </>
  )
}

/** 本日のサマリー。確定済みのレースが無ければ回収率・収支は「—」 */
export function RaceDaySummaryCards({ summary }: { summary: RaceDaySummary }) {
  const original = summary.original
  return (
    <section
      aria-label="本日のサマリー"
      className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-px overflow-hidden rounded-xl border border-border bg-border"
    >
      <Tile label="AI予想 生成済み">
        <Count value={summary.predictedRaces} total={summary.totalRaces} />
      </Tile>
      <Tile label="確定済み">
        <Count value={summary.settledRaces} total={summary.totalRaces} />
      </Tile>
      <Tile label="本日の回収率（独自予想）">
        {original ? <ReturnRate rate={original.returnRate} /> : <span className="text-muted-foreground">—</span>}
      </Tile>
      <Tile label="本日の収支（独自予想）">
        {original ? <SignedYen amount={original.profit} /> : <span className="text-muted-foreground">—</span>}
      </Tile>
    </section>
  )
}
