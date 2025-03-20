import { Card, CardHeader, CardTitle } from "@/app/components/ui/card"
import { RaceCard } from "./components/RaceCard"
import { groupBy } from "lodash"
import { Race } from "@prisma/client"

async function getTodayRaces(): Promise<Race[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/races`, { cache: 'no-store' })
  if (!res.ok) {
    throw new Error('Failed to fetch races')
  }
  return res.json()
}

export default async function Home() {
  const races = await getTodayRaces()
  const now = new Date() // 固定の日時を使用
  const groupedRaces = groupBy(races, (race) => {
    const date = race.race_time ? new Date(race.race_time) : now
    // ISO形式の日付文字列を使用してソート可能にする
    return date.toISOString().split('T')[0]
  })

  return (
    <main className="container mx-auto py-6 px-4">
      {Object.entries(groupedRaces)
        .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
        .map(([date, races]) => (
        <div key={date} className="mb-8">
          <h2 className="text-2xl font-bold mb-4">
            {new Date(date).toLocaleDateString('ja-JP', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(groupBy(races, "track")).map(([track, trackRaces]) => (
              <div key={track} className="flex flex-col">
                <Card className="mb-4 bg-white">
                  <CardHeader>
                    <CardTitle className="text-xl font-semibold text-gray-800">{track}</CardTitle>
                  </CardHeader>
                </Card>
                {trackRaces.map((race: Race) => (
                  <RaceCard key={race.id} race={race} />
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}
    </main>
  )
}

