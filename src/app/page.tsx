import { Card, CardContent } from "@/app/components/ui/card"
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
  const groupedRaces = groupBy(races, (race) => {
    const date = race.race_time ? new Date(race.race_time) : Date.now()
    const dateObj = typeof date === 'number' ? new Date(date) : date
    return `${dateObj.getFullYear()}-${dateObj.getMonth() + 1}-${dateObj.getDate()}`
  })

  return (
    <main className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">本日のレース</h1>
      {Object.entries(groupedRaces).map(([date, races]) => (
        <Card key={date} className="mb-6">
          <CardContent className="p-4">
            <h2 className="text-xl font-semibold mb-4">{date}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {races.map((race: Race) => (
                <RaceCard key={race.id} race={race} />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </main>
  )
}

