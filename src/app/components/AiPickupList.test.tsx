import { expect, test } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import type { RaceListItem } from "@/app/lib/raceList"
import { AiPickupList } from "./AiPickupList"

const race: RaceListItem = {
  id: 7,
  track: "京都",
  number: 11,
  name: "嵯峨野ステークス",
  courseType: "芝",
  distance: 2000,
  raceTime: "2026-10-10T15:35:00.000Z",
  hasPrediction: true,
  originalPick: { horseNumber: 9, bracketNumber: 5, horseName: "オボロヅキ" },
  openAiPick: { horseNumber: 9, bracketNumber: 5, horseName: "オボロヅキ" },
  isSettled: false,
  bet: null,
  pickup: {
    ability: { label: "上位", level: 1 },
    conditionFit: { label: "高い", level: 0 },
    recentTimeIndex: 101.4,
  },
}

test("本命一致のレースをカードで出す", () => {
  const html = renderToStaticMarkup(<AiPickupList races={[race]} />)
  expect(html).toContain('href="/races/7"')
  expect(html).toContain("京都 11R · 15:35発走")
  expect(html).toContain("本命一致")
  expect(html).toContain("オボロヅキ")
  expect(html).toContain("bg-frame-5")
  expect(html).toContain("上位")
  expect(html).toContain("高い")
  expect(html).toContain(">101<")
})

test("該当が無ければ案内文", () => {
  const html = renderToStaticMarkup(<AiPickupList races={[]} />)
  expect(html).toContain("本命が一致した発走前のレースはありません")
})
