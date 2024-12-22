import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card"
import { EntryTable } from "@/app/components/EntryTable"
import { Race, Entry, Predict } from "@prisma/client"

type RaceWithEntriesAndPredicts = Race & {
  entries: (Entry & {
    horse_master: { name: string }
    jockey_master: { name: string }
  })[]
  predicts: Predict[]
}

async function getRaceWithEntries(id: number): Promise<RaceWithEntriesAndPredicts> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/races/${id}`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error('Failed to fetch race');
  }
  return res.json();
}

export default async function RacePage({ params }: { params: Promise<{ id: number }> }) {
  const { id } = await params;
  const race = await getRaceWithEntries(id)

  if (!race) {
    return <div>レースが見つかりません</div>
  }
  const raceTime = race.race_time ? new Date(race.race_time) : null
  const formattedDate = raceTime ? raceTime.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }) : "N/A"
  const formattedTime = raceTime ? raceTime.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : "N/A"

  return (
    <main className="container mx-auto py-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{race.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>開催日: {formattedDate}</p>
          <p>発走時刻: {formattedTime}</p>
          <p>レース番号: {race.number}</p>
          <p>距離: {race.distance}m</p>
          <p>トラック: {race.course_type}</p>
        </CardContent>
      </Card>
      <EntryTable entries={race.entries} predicts={race.predicts} />
    </main>
  )
}

