import Link from "next/link"
import { Button } from "@/app/components/ui/button"

type Props = {
  prevRaceId?: number
  nextRaceId?: number
}

export function NavigationButtons({ prevRaceId, nextRaceId }: Props) {
  return (
    <div className="flex justify-between items-center my-4">
      <Button variant="outline" disabled={!prevRaceId} asChild className="bg-gray-200 hover:bg-gray-300 text-gray-800">
        <Link href={prevRaceId ? `/races/${prevRaceId}` : "#"}>前のレース</Link>
      </Button>
      <Button variant="outline" asChild className="bg-black hover:bg-gray-800 text-white">
        <Link href="/">一覧に戻る</Link>
      </Button>
      <Button variant="outline" disabled={!nextRaceId} asChild className="bg-gray-200 hover:bg-gray-300 text-gray-800">
        <Link href={nextRaceId ? `/races/${nextRaceId}` : "#"}>次のレース</Link>
      </Button>
    </div>
  )
}

