import { Card } from "@/app/components/ui/card"
import { Race } from "@prisma/client"
import Link from "next/link"
import { Badge } from "@/app/components/ui/badge"

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
      <Card className={`hover:shadow-lg transition-shadow duration-200 ${getGradientClass(race.course_type)} relative min-h-[120px]`}>
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