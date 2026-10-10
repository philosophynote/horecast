import type { Payout } from "@prisma/client"
import { type BetModel, type RecommendedBetDisplay, payoutHitModels, sortPayouts } from "@/app/lib/raceDetail"

type PayoutTableProps = {
  payouts: Pick<Payout, "id" | "bet_type" | "numbers" | "payout">[]
  originalBets: RecommendedBetDisplay[]
  openAiBets: RecommendedBetDisplay[]
}

const MODEL_LABEL: Record<BetModel, string> = { original: "独自", openai: "OpenAI" }

/** 払戻。AI が買って的中した行に印を付ける */
export function PayoutTable({ payouts, originalBets, openAiBets }: PayoutTableProps) {
  const rows = sortPayouts(payouts)
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="mb-2 text-lg font-bold">払戻</h2>
      <div role="table" aria-label="払戻">
        {rows.map((payout) => {
          const hits = payoutHitModels(payout, originalBets, openAiBets)
          return (
            <div
              key={payout.id}
              role="row"
              className="grid grid-cols-[64px_minmax(0,1fr)_96px_auto] items-center gap-2.5 border-b border-border py-[7px]"
            >
              <span role="cell" className="text-muted-foreground">
                {payout.bet_type}
              </span>
              <span role="cell" className="numeric">
                {payout.numbers}
              </span>
              <span role="cell" className="numeric text-right font-semibold">
                ¥{payout.payout.toLocaleString("ja-JP")}
              </span>
              <span role="cell" className="flex justify-end gap-1">
                {hits.map((model) => (
                  <span
                    key={model}
                    className="rounded bg-primary px-1.5 text-[11px] font-bold text-primary-foreground"
                  >
                    {MODEL_LABEL[model]}的中
                  </span>
                ))}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
