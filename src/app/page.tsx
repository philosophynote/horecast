'use client'

import { Card, CardHeader, CardTitle } from "@/app/components/ui/card"
import { RaceCard } from "./components/RaceCard"
import { DateSelector } from "./components/DateSelector"
import { groupBy } from "lodash"
import { Race } from "@prisma/client"
import Image from "next/image"
import { useState, useEffect } from "react"
import { format } from "date-fns"

export default function Home() {
  const [races, setRaces] = useState<Race[]>([])
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [loading, setLoading] = useState(true)

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
    fetchRaces(selectedDate)
  }, [selectedDate])

  const backgroundImages = [
    '/running_horse.png',
    '/race.png',
    '/horse-track-bg.png'
  ]

  const handleDateChange = (date: string) => {
    setSelectedDate(date)
  }

  const groupedRaces = groupBy(races, (race) => {
    const date = race.race_time ? new Date(race.race_time) : new Date()
    return date.toISOString().split('T')[0]
  })

  return (
    <main className="container mx-auto py-6 px-4">
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
                        <Card className="relative mb-4 rounded-xl overflow-hidden min-h-[120px]">
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

        {/* 右側の日付セレクター */}
        <div className="w-64 flex-shrink-0">
          <div className="sticky top-6">
            <DateSelector 
              selectedDate={selectedDate} 
              onDateChange={handleDateChange} 
            />
          </div>
        </div>
      </div>
    </main>
  )
}

