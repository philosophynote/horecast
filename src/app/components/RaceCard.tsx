import { Card } from "@/app/components/ui/card"
import { Race } from "@prisma/client"
import Link from "next/link"
import { Badge } from "@/app/components/ui/badge"
import { formatInTimeZone } from "date-fns-tz"

function getAccentClass(courseType: string): string {
  switch (courseType) {
    case "芝":
      return "border-l-4 border-l-green-300 bg-green-50/30"
    case "ダート":
      return "border-l-4 border-l-amber-300 bg-amber-50/30"
    case "障害":
      return "border-l-4 border-l-blue-300 bg-blue-50/30"
    default:
      return "border-l-4 border-l-gray-300 bg-gray-50/30"
  }
}


export function RaceCard({ race }: { race: Race }) {
  const raceTime = race.race_time ? new Date(race.race_time) : null
  const formattedTime = raceTime
    ? formatInTimeZone(raceTime, 'UTC', 'HH:mm')
    : "N/A"

  return (
    <Link href={`/races/${race.id}`} className="block mb-4">
      <Card className={`hover:shadow-lg transition-shadow duration-200 relative min-h-[120px] bg-white border border-gray-200 shadow-sm ${getAccentClass(race.course_type)}`}>
        <div className="flex flex-col h-full justify-between">
          <div className="p-4">
            <div className="flex items-center gap-2">
              <Badge className="w-fit">
                {race.number}R
              </Badge>
              <h3 className="text-2xl font-bold">
                {race.name}
              </h3>
            </div>
          </div>
          <div className="p-4 self-end">
            <p className="text-s">
              {formattedTime} {race.course_type}{race.distance}m
            </p>
          </div>
        </div>
      </Card>
    </Link>
  )
}