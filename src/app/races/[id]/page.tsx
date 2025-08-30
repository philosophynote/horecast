'use client'

import { Card, CardContent } from "@/app/components/ui/card"
import { EntryTable } from "@/app/components/EntryTable"
import { RaceResultTable } from "@/app/components/RaceResultTable"
import { PayoutTable } from "@/app/components/PayoutTable"
import { Race, Entry, Predict, Result, Payout, RecommendedBet } from "@prisma/client"
import { NavigationButtons } from "@/app/components/NavigationButtons"
import { RecommendedBets } from "@/app/components/RecommendedBets"
import { formatInTimeZone } from "date-fns-tz"
import { useSession, signIn } from "next-auth/react"
import { useState, useEffect } from "react"

function getCombinedAccentClass(courseType: string, track: string): string {
  const courseAccent = getCourseAccentClass(courseType)
  const trackAccent = getTrackAccentClass(track)
  return `${courseAccent} ${trackAccent}`
}

function getCourseAccentClass(courseType: string): string {
  switch (courseType) {
    case "芝":
      return "border-l-4 border-l-green-400"
    case "ダート":
      return "border-l-4 border-l-amber-400"
    case "障害":
      return "border-l-4 border-l-blue-400"
    default:
      return "border-l-4 border-l-gray-400"
  }
}

function getTrackAccentClass(track: string): string {
  const trackColors: Record<string, string> = {
    '東京': 'border-t-4 border-t-red-400',
    '中山': 'border-t-4 border-t-blue-400',
    '阪神': 'border-t-4 border-t-purple-400',
    '京都': 'border-t-4 border-t-pink-400',
    '中京': 'border-t-4 border-t-yellow-400',
    '新潟': 'border-t-4 border-t-green-400',
    '小倉': 'border-t-4 border-t-orange-400',
    '函館': 'border-t-4 border-t-cyan-400',
    '札幌': 'border-t-4 border-t-indigo-400',
    '福島': 'border-t-4 border-t-teal-400'
  }
  return trackColors[track] || 'border-t-4 border-t-gray-400'
}

type EntryWithMasters = Entry & {
  HorseMaster: { name: string }
  JockeyMaster: { name: string }
}

type RaceWithEntriesAndPredicts = Race & {
  entries: EntryWithMasters[]
  predicts: Predict[]
  results: Result[]
  payouts: Payout[]
  recommended_bets: RecommendedBet[]
}


export default function RacePage({ params }: { params: Promise<{ id: number }> }) {
  const { data: session, status } = useSession()
  const [race, setRace] = useState<RaceWithEntriesAndPredicts | null>(null)
  const [navigation, setNavigation] = useState<{ prevRaceId?: number; nextRaceId?: number }>({})
  const [loading, setLoading] = useState(true)
  const [raceId, setRaceId] = useState<number | null>(null)

  useEffect(() => {
    params.then(({ id }) => setRaceId(id))
  }, [params])

  useEffect(() => {
    if (!raceId || !session) return

    const fetchData = async () => {
      try {
        const [raceRes, navRes] = await Promise.all([
          fetch(`/api/races/${raceId}`, { cache: 'no-store' }),
          fetch(`/api/races/${raceId}/navigation`, { cache: 'no-store' })
        ])

        if (!raceRes.ok) throw new Error('Failed to fetch race')
        if (!navRes.ok) throw new Error('Failed to fetch navigation')

        const [raceData, navData] = await Promise.all([
          raceRes.json(),
          navRes.json()
        ])

        setRace(raceData)
        setNavigation(navData)
      } catch (error) {
        console.error('Error fetching race data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [raceId, session])

  if (status === "loading" || loading) {
    return (
      <main className="container mx-auto py-6 min-h-screen bg-gray-50">
        <div className="text-center py-8">
          <p className="text-lg">読み込み中...</p>
        </div>
      </main>
    )
  }

  if (!session) {
    return (
      <main className="container mx-auto py-6 min-h-screen bg-gray-50">
        <div className="text-center py-20">
          <div className="max-w-md mx-auto">
            <h1 className="text-4xl font-bold text-gray-900 mb-6">アクセス制限</h1>
            <p className="text-xl text-gray-600 mb-8">
              レース詳細をご覧いただくには、ログインが必要です
            </p>
            <button
              onClick={() => signIn('google')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg shadow-md transition-colors duration-200"
            >
              Googleでログイン
            </button>
          </div>
        </div>
      </main>
    )
  }

  if (!race) {
    return <div>レースが見つかりません</div>
  }
  const raceTime = race.race_time ? new Date(race.race_time) : null
  const formattedDate = raceTime
    ? formatInTimeZone(raceTime, 'UTC', 'yyyy年M月d日')
    : "N/A"
  const formattedTime = raceTime
    ? formatInTimeZone(raceTime, 'UTC', 'HH:mm')
    : "N/A"
  // const now = new Date()
  // const raceHasFinished = new Date(race.race_time) < now

  return (
    <main className="container mx-auto py-6 min-h-screen bg-gray-50" >
      <Card className={`mb-6 hover:shadow-lg transition-shadow duration-200 bg-white border border-gray-200 shadow-sm ${getCombinedAccentClass(race.course_type, race.track)}`}>
        <CardContent className="flex flex-col p-8 space-y-4 items-center">
          <div className="w-fit">
            <h1 className="text-5xl font-extrabold leading-tight tracking-wide">{race.track}{race.number}R {race.name}</h1>
          </div>
          <div className="w-fit pt-4 border-t">
            <p className="text-lg font-bold">{formattedDate} {formattedTime} {race.course_type}{race.distance}m</p>
          </div>
        </CardContent>
      </Card>
      <EntryTable entries={race.entries} predicts={race.predicts} />
      <RecommendedBets bets={race.recommended_bets} entries={race.entries} />
      <div className="mt-6 flex flex-col lg:flex-row gap-6">
        {race.results && race.results.length > 0 && (
          <div className="flex-1">
            <RaceResultTable results={race.results} />
          </div>
        )}
        {race.payouts && race.payouts.length > 0 && (
          <div className="flex-1">
            <PayoutTable payouts={race.payouts} />
          </div>
        )}
      </div>
      <NavigationButtons prevRaceId={navigation.prevRaceId} nextRaceId={navigation.nextRaceId} />
    </main>
  )
}

