"use client"

import { useState } from "react"
import type { BetGroup, BetModel, BetSummary } from "@/app/lib/raceDetail"
import { FrameNumber } from "./FrameNumber"
import { ReturnRate, SignedYen } from "./SignedValue"

export type RecommendedBetSection = {
  key: BetModel
  title: string
  /** 推奨馬券が無ければ null */
  summary: BetSummary | null
  groups: BetGroup[]
  emptyMessage?: string
}

type RecommendedBetsProps = {
  isSettled: boolean
  sections: RecommendedBetSection[]
  /** 馬番 → 枠番 */
  brackets: { horseNumber: number; bracketNumber: number }[]
}

const yen = (amount: number) => `¥${amount.toLocaleString("ja-JP")}`

function Tile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-muted px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="numeric text-[22px] font-semibold leading-tight">{children}</div>
    </div>
  )
}

const Dash = () => <span className="text-muted-foreground">—</span>

/** 推奨馬券。独自予想と OpenAI を切り替えて表示する */
export function RecommendedBets({ isSettled, sections, brackets }: RecommendedBetsProps) {
  const [activeKey, setActiveKey] = useState<BetModel>(sections[0]?.key ?? "original")
  const active = sections.find((section) => section.key === activeKey) ?? sections[0]
  const bracketOf = new Map(brackets.map((item) => [item.horseNumber, item.bracketNumber]))

  return (
    <section
      aria-labelledby="bets-title"
      className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="bets-title" className="text-xl font-bold">
            推奨馬券
          </h2>
          <div className="text-[13px] text-muted-foreground">上位4頭の複勝と、ワイドBOX</div>
        </div>
        {sections.length > 1 && (
          <div role="group" aria-label="予想モデル" className="flex rounded-[10px] border border-border bg-background p-[3px]">
            {sections.map((section) => {
              const pressed = section.key === active?.key
              return (
                <button
                  key={section.key}
                  type="button"
                  aria-pressed={pressed}
                  onClick={() => setActiveKey(section.key)}
                  className={`min-h-10 rounded-lg px-4 text-sm font-bold transition-colors ${
                    pressed ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {section.title}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {!active || !active.summary ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          {active?.emptyMessage ?? "推奨馬券はまだ登録されていません"}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-px overflow-hidden rounded-[10px] border border-border bg-border">
            <Tile label="投資">{yen(active.summary.investment)}</Tile>
            <Tile label="払戻">{active.summary.payout === null ? <Dash /> : yen(active.summary.payout)}</Tile>
            <Tile label="収支">{active.summary.profit === null ? <Dash /> : <SignedYen amount={active.summary.profit} />}</Tile>
            <Tile label="回収率">
              {active.summary.returnRate === null ? <Dash /> : <ReturnRate rate={active.summary.returnRate} />}
            </Tile>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-4">
            {active.groups.map((group) => (
              <div key={group.type}>
                <div className="mb-1.5 text-[13px] font-bold text-muted-foreground">{group.type}</div>
                {group.items.map((item, index) => (
                  <div
                    key={`${group.type}-${item.numbers.join("-")}-${index}`}
                    className="grid grid-cols-[minmax(0,1fr)_70px_90px] items-center gap-2 border-t border-border py-2"
                  >
                    <div className="flex items-center gap-1">
                      {item.numbers.map((number) => (
                        <FrameNumber key={number} bracketNumber={bracketOf.get(number)} className="size-[26px] text-[13px]">
                          {number}
                        </FrameNumber>
                      ))}
                    </div>
                    <span className="numeric text-right text-muted-foreground">{yen(item.bet)}</span>
                    <span
                      className={`numeric text-right font-semibold ${item.payout > 0 ? "text-positive" : "text-muted-foreground"}`}
                    >
                      {!isSettled ? "発走前" : item.payout > 0 ? yen(item.payout) : "—"}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
