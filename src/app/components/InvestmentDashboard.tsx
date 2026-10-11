"use client"

import { useEffect, useState } from "react"
import {
  type DateRange,
  PERIOD_PRESETS,
  type StatisticsModel,
  type StatisticsResponse,
  isValidRange,
  matchesPreset,
  periodPreset,
} from "@/app/lib/investmentStats"
import { nowAsStoredClock, toStoredDateString } from "@/app/lib/raceList"
import { BetTypeBreakdown } from "./BetTypeBreakdown"
import { CumulativeProfitChart } from "./CumulativeProfitChart"
import { InvestmentKpis } from "./InvestmentKpis"
import { RaceStatisticsTable } from "./RaceStatisticsTable"
import { TrackBreakdown } from "./TrackBreakdown"

const MODEL_TABS: { value: StatisticsModel; label: string; lineClass: string }[] = [
  { value: "original", label: "独自予想モデル", lineClass: "bg-primary" },
  { value: "openai", label: "OpenAIモデル", lineClass: "bg-slow" },
]

const FETCH_DEBOUNCE_MS = 300

// 取得済みデータと、そのデータを取得したときの期間をセットで保持する
type FetchResult = { range: DateRange; data: StatisticsResponse | null }

const isSameRange = (a: DateRange, b: DateRange) => a.startDate === b.startDate && a.endDate === b.endDate

const INPUT_CLASS =
  "numeric min-h-11 rounded-[10px] border border-input bg-input-background px-3 text-sm text-foreground"

export function InvestmentDashboard() {
  const [today] = useState(() => toStoredDateString(nowAsStoredClock(new Date())))
  const [range, setRange] = useState<DateRange>(() => periodPreset(30, today))
  const [model, setModel] = useState<StatisticsModel>("original")
  const [result, setResult] = useState<FetchResult | null>(null)

  useEffect(() => {
    if (!isValidRange(range)) return

    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ startDate: range.startDate, endDate: range.endDate })
        const response = await fetch(`/api/statistics?${params}`, { signal: controller.signal })
        if (!response.ok) {
          throw new Error(`Failed to fetch statistics: ${response.status}`)
        }
        const data: StatisticsResponse = await response.json()
        setResult({ range, data })
      } catch (error) {
        // 期間変更で古いリクエストを中断した場合は失敗扱いにしない
        if (controller.signal.aborted) return
        console.error("Error fetching statistics:", error)
        setResult({ range, data: null })
      }
    }, FETCH_DEBOUNCE_MS)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [range])

  const rangeValid = isValidRange(range)
  const isUpdating = rangeValid && (result === null || !isSameRange(result.range, range))
  const data = result?.data ?? null
  const current = data?.models[model] ?? null

  return (
    <div className="flex flex-col gap-7">
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => event.preventDefault()}
        aria-label="期間"
      >
        <div role="group" aria-label="期間のショートカット" className="flex rounded-[10px] border border-border bg-card p-[3px]">
          {PERIOD_PRESETS.map((days) => {
            const pressed = matchesPreset(range, days, today)
            return (
              <button
                key={days}
                type="button"
                aria-pressed={pressed}
                onClick={() => setRange(periodPreset(days, today))}
                className={`min-h-10 rounded-lg px-3.5 text-sm font-bold transition-colors ${
                  pressed ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {days}日
              </button>
            )
          })}
        </div>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          開始日
          <input
            type="date"
            value={range.startDate}
            max={range.endDate || undefined}
            onChange={(event) => setRange({ ...range, startDate: event.target.value })}
            className={INPUT_CLASS}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          終了日
          <input
            type="date"
            value={range.endDate}
            min={range.startDate || undefined}
            onChange={(event) => setRange({ ...range, endDate: event.target.value })}
            className={INPUT_CLASS}
          />
        </label>
        <p role="status" aria-live="polite" className="min-h-11 self-end py-3 text-xs text-muted-foreground">
          {!rangeValid ? "開始日と終了日を正しく指定してください" : isUpdating ? "更新中…" : ""}
        </p>
      </form>

      <div role="group" aria-label="予想モデル" className="flex flex-wrap gap-2">
        {MODEL_TABS.map((tab) => {
          const pressed = tab.value === model
          return (
            <button
              key={tab.value}
              type="button"
              aria-pressed={pressed}
              onClick={() => setModel(tab.value)}
              className={`flex min-h-12 items-center gap-2.5 rounded-[10px] border px-5 text-[15px] font-bold transition-colors ${
                pressed ? "border-primary bg-card text-foreground" : "border-border bg-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <span aria-hidden="true" className={`h-[3px] w-3.5 rounded-sm ${tab.lineClass}`} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {data === null && result !== null ? (
        <p role="alert" className="text-sm text-negative">
          統計情報の取得に失敗しました。時間をおいて再読み込みしてください。
        </p>
      ) : current === null ? (
        <p className="py-8 text-center text-sm text-muted-foreground">統計情報を読み込み中…</p>
      ) : (
        <div aria-busy={isUpdating} className={`flex flex-col gap-7 transition-opacity ${isUpdating ? "opacity-50" : ""}`}>
          <InvestmentKpis statistics={current.overallStatistics} totalRaces={current.totalRaces} />
          <CumulativeProfitChart
            original={data?.models.original.cumulative ?? []}
            openai={data?.models.openai.cumulative ?? []}
            activeModel={model}
          />
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(420px,100%),1fr))] gap-4">
            <BetTypeBreakdown betTypeStats={current.overallStatistics.betTypeStats} />
            <TrackBreakdown trackStatistics={current.trackStatistics} />
          </div>
          <RaceStatisticsTable rows={current.raceStatistics} />
        </div>
      )}
    </div>
  )
}
