import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Race } from "@prisma/client"
import Link from "next/link"

export function RaceCard({ race }: { race: Race }) {
  const raceTime = race.race_time ? new Date(race.race_time) : null
  const formattedTime = raceTime ? raceTime.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : "N/A"

  return (
    <Link href={`/races/${race.id}`}>
      <Card className="hover:shadow-lg transition-shadow duration-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{race.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            {formattedTime} | R{race.number} | {race.course_type} | {race.distance}m
          </p>
        </CardContent>
      </Card>
    </Link>
  )
}