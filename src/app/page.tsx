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
  const groupedRaces = groupBy(races, "track")
  // const groupedRaces = groupBy(races, (race) => {
  //   const date = race.race_time ? new Date(race.race_time) : Date.now()
  //   const dateObj = typeof date === 'number' ? new Date(date) : date
  //   return `${dateObj.getFullYear()}-${dateObj.getMonth() + 1}-${dateObj.getDate()}`
  // })


  return (
    <main className="container mx-auto py-6 px-4">
      <h1 className="text-3xl font-bold mb-6">本日のレース</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(groupedRaces).map(([track, races]) => (
          <div key={track} className="flex flex-col">
            <Card className="mb-4 bg-white">
              <CardHeader>
                <CardTitle className="text-xl font-semibold text-gray-800">{track}</CardTitle>
              </CardHeader>
            </Card>
            {races.map((race: Race) => (
              <RaceCard key={race.id} race={race} />
            ))}
          </div>
        ))}
      </div>
    </main>
  )
}

