import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card"
import { EntryTable } from "@/app/components/EntryTable"
import { RaceResultTable } from "@/app/components/RaceResultTable"
import { Race, Entry, Predict, Result } from "@prisma/client"
import { NavigationButtons } from "@/app/components/NavigationButtons"

type EntryWithMasters = Entry & {
  HorseMaster: { name: string }
  JockeyMaster: { name: string }
}

type RaceWithEntriesAndPredicts = Race & {
  entries: EntryWithMasters[]
  predicts: Predict[]
  results: Result[]
}

function getGradientClass(courseType: string): string {
  switch (courseType) {
    case "芝":
      return "bg-gradient-to-l from-[#8DB998] to-white"
    case "ダート":
      return "bg-gradient-to-l from-[#D6A67A] to-white"
    case "障害":
      return "bg-gradient-to-l from-[#7DBCCF] to-white"
    default:
      return ""
  }
}

async function getRaceWithEntries(id: number): Promise<RaceWithEntriesAndPredicts> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/races/${id}`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error('Failed to fetch race');
  }
  return res.json();
}

async function getNavigation(id: number): Promise<{ prevRaceId?: number; nextRaceId?: number }> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/races/${id}/navigation`, { cache: "no-store" })
  if (!res.ok) {
    throw new Error("Failed to fetch navigation")
  }
  return res.json()
}

export default async function RacePage({ params }: { params: Promise<{ id: number }> }) {
  const { id } = await params;
  const [race, navigation] = await Promise.all([getRaceWithEntries(id), getNavigation(id)])


  if (!race) {
    return <div>レースが見つかりません</div>
  }
  const raceTime = race.race_time ? new Date(race.race_time) : null
  const formattedDate = raceTime ? raceTime.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' }) : "N/A"
  const formattedTime = raceTime ? raceTime.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : "N/A"

  return (
    <main className="container mx-auto py-6" >
      <Card className={`mb-6 hover:shadow-lg transition-shadow duration-200 ${getGradientClass(race.course_type)}`}>
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
      {race.results && race.results.length > 0 && (
        <div className="mt-6">
          <h2 className="text-2xl font-bold mb-4">レース結果</h2>
          <RaceResultTable results={race.results} />
        </div>
      )}
      <NavigationButtons prevRaceId={navigation.prevRaceId} nextRaceId={navigation.nextRaceId} />
    </main>
  )
}

