import { Card, CardContent } from "@/app/components/ui/card"
import { EntryTable } from "@/app/components/EntryTable"
import { RaceResultTable } from "@/app/components/RaceResultTable"
import { PayoutTable } from "@/app/components/PayoutTable"
import { Race, Entry, Predict, Result, Payout } from "@prisma/client"
import { NavigationButtons } from "@/app/components/NavigationButtons"
import { RecommendedBets } from "@/app/components/RecommendedBets"

type EntryWithMasters = Entry & {
  HorseMaster: { name: string }
  JockeyMaster: { name: string }
}

type RaceWithEntriesAndPredicts = Race & {
  entries: EntryWithMasters[]
  predicts: Predict[]
  results: Result[]
  payouts: Payout[]
}

function getGradientClass(courseType: string): string {
  switch (courseType) {
    case "芝":
      return "bg-gradient-to-r from-[#8DB998] via-white to-[#8DB998]"
    case "ダート":
      return "bg-gradient-to-r from-[#D6A67A] via-white to-[#D6A67A]"
    case "障害":
      return "bg-gradient-to-r from-[#7DBCCF] via-white to-[#7DBCCF]"
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
        <CardContent className="flex flex-col p-8 space-y-4 items-center">
          <div className="w-fit">
            <h1 className="text-5xl font-extrabold leading-tight tracking-wide">{race.track}{race.number}R {race.name}</h1>
          </div>
          <div className="w-fit pt-4 border-t">
            <p className="text-lg font-bold">{formattedDate} {formattedTime} {race.course_type}{race.distance}m</p>
          </div>
        </CardContent>
      </Card>
      <h2 className="text-2xl font-bold mb-4">出馬表</h2>
      <EntryTable entries={race.entries} predicts={race.predicts} />
      <RecommendedBets entries={race.entries} predicts={race.predicts} />
      <div className="mt-6 flex gap-6">
        {race.results && race.results.length > 0 && (
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-4">レース結果</h2>
            <RaceResultTable results={race.results} />
          </div>
        )}
        {race.payouts && race.payouts.length > 0 && (
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-4">配当</h2>
            <PayoutTable payouts={race.payouts} />
          </div>
        )}
      </div>
      <NavigationButtons prevRaceId={navigation.prevRaceId} nextRaceId={navigation.nextRaceId} />
    </main>
  )
}

