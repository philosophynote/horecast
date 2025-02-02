import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Race } from "@prisma/client"
import Link from "next/link"

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

export function RaceCard({ race }: { race: Race }) {
  const raceTime = race.race_time ? new Date(race.race_time) : null
  const formattedTime = raceTime ? raceTime.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : "N/A"

  return (
    <Link href={`/races/${race.id}`} className="block mb-4">
      <Card className={`hover:shadow-lg transition-shadow duration-200 ${getGradientClass(race.course_type)}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{race.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-700">
            {formattedTime} | R{race.number} | {race.course_type} | {race.distance}m
          </p>
        </CardContent>
      </Card>
    </Link>
  )
}