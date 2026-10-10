"use client"

import { formatRaceDateShort, weekdayOf } from "@/app/lib/raceList"

type RaceDateTabsProps = {
  dates: string[]
  selectedDate: string
  onSelect: (date: string) => void
}

/** 開催日の横並びボタン。日付は新しい順に受け取り、古い順に並べる */
export function RaceDateTabs({ dates, selectedDate, onSelect }: RaceDateTabsProps) {
  const ordered = [...dates].sort()
  return (
    <div role="group" aria-label="開催日を選ぶ" className="flex flex-wrap gap-2">
      {ordered.map((date) => {
        const selected = date === selectedDate
        return (
          <button
            key={date}
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(date)}
            className={`flex min-h-[52px] min-w-16 flex-col items-center rounded-[10px] border px-3 py-1.5 leading-tight transition-colors ${
              selected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-foreground hover:bg-accent"
            }`}
          >
            <span className="numeric text-[15px] font-semibold">{formatRaceDateShort(date)}</span>
            <span className="text-[11px]">{weekdayOf(date)}</span>
          </button>
        )
      })}
    </div>
  )
}
