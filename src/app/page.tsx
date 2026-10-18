'use client'

import { useEffect, useMemo, useState } from "react"
import { AiPickupList } from "./components/AiPickupList"
import { RaceDateTabs } from "./components/RaceDateTabs"
import { RaceDaySummaryCards } from "./components/RaceDaySummaryCards"
import { TrackRaceList } from "./components/TrackRaceList"
import {
  type RaceListItem,
  type RaceListResponse,
  findNextRaceIds,
  formatRaceDateHeading,
  isPickupRace,
  nowAsStoredClock,
  pickDefaultDate,
  resolveRaceStatus,
  toStoredDateString,
} from "@/app/lib/raceList"

type LoadedRaces = {
  response: RaceListResponse
  /** 取得時点の現在時刻（保存規約）。次に発走・ピックアップの判定に使う */
  nowStored: Date
}

export default function Home() {
  const [dates, setDates] = useState<string[]>([])
  const [selectedDate, setSelectedDate] = useState<string>("")
  const [loaded, setLoaded] = useState<LoadedRaces | null>(null)
  const [failed, setFailed] = useState(false)

  // 開催日の一覧を取り、今日（無ければ最も近い日）を既定にする。失敗しても今日へ倒す
  useEffect(() => {
    let cancelled = false
    const today = toStoredDateString(nowAsStoredClock(new Date()))
    const init = async () => {
      let list: string[] = []
      try {
        const res = await fetch('/api/races/dates')
        if (res.ok) {
          list = await res.json()
        }
      } catch (error) {
        console.error('Error fetching race dates:', error)
      }
      if (cancelled) return
      setDates(list)
      setSelectedDate(pickDefaultDate(list, today) ?? today)
    }
    init()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!selectedDate) return
    let cancelled = false
    const fetchRaces = async (date: string) => {
      try {
        const res = await fetch(`/api/races?date=${date}`, { cache: 'no-store' })
        if (!res.ok) {
          throw new Error('Failed to fetch races')
        }
        const response: RaceListResponse = await res.json()
        if (!cancelled) {
          setFailed(false)
          setLoaded({ response, nowStored: nowAsStoredClock(new Date()) })
        }
      } catch (error) {
        console.error('Error fetching races:', error)
        if (!cancelled) {
          setFailed(true)
          setLoaded({
            response: {
              date,
              summary: { totalRaces: 0, predictedRaces: 0, settledRaces: 0, original: null },
              races: [],
            },
            nowStored: nowAsStoredClock(new Date()),
          })
        }
      }
    }
    fetchRaces(selectedDate)
    return () => {
      cancelled = true
    }
  }, [selectedDate])

  // 取得済みの結果が選択中の日付のものでない間はローディング表示にする
  const current = loaded?.response.date === selectedDate ? loaded : null

  const { nextRaceIds, pickupRaces } = useMemo(() => {
    if (!current) {
      return { nextRaceIds: new Set<number>(), pickupRaces: [] as RaceListItem[] }
    }
    return {
      nextRaceIds: findNextRaceIds(current.response.races, current.nowStored),
      pickupRaces: current.response.races.filter((race) => isPickupRace(race, current.nowStored)),
    }
  }, [current])

  const statusOf = (item: RaceListItem) =>
    resolveRaceStatus(item, {
      nowStored: current?.nowStored ?? nowAsStoredClock(new Date()),
      isNext: nextRaceIds.has(item.id),
    })

  const races = current?.response.races ?? []
  const trackCount = new Set(races.map((race) => race.track)).size
  const trackNames = [...new Set(races.map((race) => race.track))].join("・")

  return (
    <main className="container mx-auto flex min-h-screen flex-col gap-8 bg-background px-4 py-8">
      <section className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <div className="numeric text-xs tracking-[0.14em] text-muted-foreground">RACE CARD · 開催日</div>
          <h1 className="mt-1 text-[32px] font-bold leading-tight tracking-[0.02em]">
            {selectedDate ? formatRaceDateHeading(selectedDate) : "読み込み中…"}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {current
              ? races.length === 0
                ? "この日のレースはありません"
                : `${trackNames} ${trackCount}場 ${races.length}レース`
              : "レース情報を読み込み中…"}
          </p>
        </div>
        {dates.length > 0 && (
          <RaceDateTabs dates={dates} selectedDate={selectedDate} onSelect={setSelectedDate} />
        )}
      </section>

      {current && (
        <>
          <RaceDaySummaryCards summary={current.response.summary} />
          {failed && (
            <p role="alert" className="text-sm text-negative">
              レース情報の取得に失敗しました。時間をおいて再読み込みしてください。
            </p>
          )}
          {races.length > 0 && (
            <>
              <AiPickupList races={pickupRaces} />
              <TrackRaceList races={races} statusOf={statusOf} />
              <p className="text-xs text-muted-foreground">
                払戻額は推奨馬券（複勝・ワイドBOX）を購入した場合の金額です。
              </p>
            </>
          )}
        </>
      )}
    </main>
  )
}
