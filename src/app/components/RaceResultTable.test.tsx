import { expect, test } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { buildOpenAiMarks, buildOriginalMarks } from "@/app/lib/raceDetail"
import { RaceResultTable } from "./RaceResultTable"

const result = (id: number, rank: string, horseNumber: number, frame: number, favorite: number | null, odds: number | null) => ({
  id,
  rank,
  frame_number: frame,
  horse_number: horseNumber,
  horse_name: `馬${horseNumber}`,
  favorite,
  odds,
})

test("上位5頭を着順に並べ、AIの印を添える", () => {
  const results = [
    result(1, "6", 9, 5, 6, 20.1),
    result(2, "1", 5, 3, 1, 3.8),
    result(3, "3", 7, 4, 7, 18.5),
    result(4, "2", 3, 2, 4, 7.2),
    result(5, "5", 14, 7, 5, 9.8),
    result(6, "4", 12, 6, null, null),
  ]
  const html = renderToStaticMarkup(
    <RaceResultTable
      results={results}
      originalMarks={buildOriginalMarks([{ horse_number: 5, score: 90 }, { horse_number: 12, score: 80 }])}
      openAiMarks={buildOpenAiMarks([{ horseNumber: 5, rank: 1 }, { horseNumber: 3, rank: 2 }])}
    />,
  )
  const order = [...html.matchAll(/馬(\d+)/g)].map((m) => m[1])
  expect(order).toEqual(["5", "3", "7", "12", "14"])
  expect(html).toContain("独自◎ OpenAI◎")
  expect(html).toContain("OpenAI○")
  expect(html).toContain("1人気")
  expect(html).toContain("3.8")
  expect(html).toContain("bg-frame-3")
  expect(html).not.toContain("馬9")
})
