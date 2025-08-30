'use client'

import { Card, CardHeader, CardTitle } from "@/app/components/ui/card"
import { RaceCard } from "./components/RaceCard"
import { DateSelector } from "./components/DateSelector"
import { StatisticsView } from "./components/StatisticsView"
import { groupBy } from "lodash"
import { Race } from "@prisma/client"
import Image from "next/image"
import { useState, useEffect } from "react"
import { format } from "date-fns"
import { formatInTimeZone } from "date-fns-tz"
import { useSession, signIn } from "next-auth/react"

export default function Home() {
  const { data: session, status } = useSession()
  const [races, setRaces] = useState<Race[]>([])
  const [selectedDate, setSelectedDate] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'races' | 'statistics'>('races')

  useEffect(() => {
    const init = async () => {
      try {
        const res = await fetch('/api/races/dates')
        if (res.ok) {
          const dates: string[] = await res.json()
          if (dates.length > 0) {
            const today = new Date()
            let closest = dates[0]
            let minDiff = Math.abs(new Date(dates[0]).getTime() - today.getTime())
            for (const dateStr of dates) {
              const diff = Math.abs(new Date(dateStr).getTime() - today.getTime())
              if (diff < minDiff) {
                minDiff = diff
                closest = dateStr
              }
            }
            setSelectedDate(closest)
          } else {
            setSelectedDate(format(new Date(), 'yyyy-MM-dd'))
          }
        }
      } catch (error) {
        console.error('Error initializing date:', error)
        setSelectedDate(format(new Date(), 'yyyy-MM-dd'))
      }
    }
    init()
  }, [])

  const fetchRaces = async (date: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/races?date=${date}`, { cache: 'no-store' })
      if (!res.ok) {
        throw new Error('Failed to fetch races')
      }
      const racesData = await res.json()
      setRaces(racesData)
    } catch (error) {
      console.error('Error fetching races:', error)
      setRaces([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedDate) {
      fetchRaces(selectedDate)
    }
  }, [selectedDate])

  const backgroundImages = [
    '/running_horse.png',
    '/race.png',
    '/horse-track-bg.png'
  ]

  function getTrackAccentClass(trackName: string): string {
    const trackColors: Record<string, string> = {
      '東京': 'border-t-4 border-t-red-300',
      '中山': 'border-t-4 border-t-blue-300',
      '阪神': 'border-t-4 border-t-purple-300',
      '京都': 'border-t-4 border-t-pink-300',
      '中京': 'border-t-4 border-t-yellow-300',
      '新潟': 'border-t-4 border-t-green-300',
      '小倉': 'border-t-4 border-t-orange-300',
      '函館': 'border-t-4 border-t-cyan-300',
      '札幌': 'border-t-4 border-t-indigo-300',
      '福島': 'border-t-4 border-t-teal-300'
    }
    return trackColors[trackName] || 'border-t-4 border-t-gray-300'
  }

  const handleDateChange = (date: string) => {
    setSelectedDate(date)
  }

  const groupedRaces = groupBy(races, (race) => {
    if (race.race_time) {
      return formatInTimeZone(new Date(race.race_time), 'UTC', 'yyyy-MM-dd')
    }
    return formatInTimeZone(new Date(), 'UTC', 'yyyy-MM-dd')
  })

  if (status === "loading") {
    return (
      <main className="container mx-auto py-6 px-4 min-h-screen bg-gray-50">
        <div className="text-center py-8">
          <p className="text-lg">読み込み中...</p>
        </div>
      </main>
    )
  }

  if (!session) {
    return (
      <main className="container mx-auto py-6 px-4 min-h-screen bg-gray-50">
        <div className="text-center py-20">
          <div className="max-w-md mx-auto">
            <h1 className="text-4xl font-bold text-gray-900 mb-6">Horecast</h1>
            <p className="text-xl text-gray-600 mb-8">
              AI競馬予想をご利用いただくには、ログインが必要です
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

  return (
    <main className="container mx-auto py-6 px-4 min-h-screen bg-gray-50">
      {/* タブナビゲーション */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('races')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'races'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              レース一覧
            </button>
            <button
              onClick={() => setActiveTab('statistics')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'statistics'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              統計情報
            </button>
          </nav>
        </div>
      </div>

      {activeTab === 'statistics' ? (
        <StatisticsView />
      ) : (
        <>
          {/* モバイル用日付セレクター（上部に配置） */}
          <div className="lg:hidden mb-6">
            <DateSelector 
              selectedDate={selectedDate} 
              onDateChange={handleDateChange} 
            />
          </div>

          <div className="flex gap-6">
        {/* メインコンテンツ */}
        <div className="flex-1">
          {loading ? (
            <div className="text-center py-8">
              <p className="text-lg">レース情報を読み込み中...</p>
            </div>
          ) : races.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-lg">選択された日付にレースはありません</p>
            </div>
          ) : (
            Object.entries(groupedRaces)
              .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
              .map(([date, raceList]) => (
                <div key={date} className="mb-8">
                  <h2 className="text-2xl font-bold mb-4">
                    {new Date(date).toLocaleDateString('ja-JP', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Object.entries(groupBy(raceList, "track")).map(([track, trackRaces], index) => (
                      <div key={track} className="flex flex-col">
                        <Card className={`relative mb-4 rounded-xl overflow-hidden min-h-[120px] ${getTrackAccentClass(track)}`}>
                          <Image
                            src={backgroundImages[index % backgroundImages.length]}
                            alt="Race Track Background"
                            fill
                            className="absolute inset-0 opacity-50 filter grayscale object-cover"
                          />
                          <CardHeader className="relative bg-white/70 backdrop-blur-sm p-2 rounded-lg h-full flex items-center justify-center">
                            <CardTitle className="text-4xl font-bold text-gray-800">{track}</CardTitle>
                          </CardHeader>
                        </Card>
                        {trackRaces.map((race: Race) => (
                          <RaceCard key={race.id} race={race} />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              ))
          )}
          </div>

          {/* デスクトップ用右側の日付セレクター */}
          <div className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-6">
              <DateSelector 
                selectedDate={selectedDate} 
                onDateChange={handleDateChange} 
              />
            </div>
          </div>
        </div>
        </>
      )}
    </main>
  )
}

