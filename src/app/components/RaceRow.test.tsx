import { expect, test } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import type { RaceListItem } from "@/app/lib/raceList"
import { RaceRow } from "./RaceRow"

const item = (overrides: Partial<RaceListItem> = {}): RaceListItem => ({
  id: 42,
  track: "東京",
  number: 11,
  name: "秋陽ステークス",
  courseType: "芝",
  distance: 1800,
  raceTime: "2026-10-10T15:45:00.000Z",
  hasPrediction: true,
  originalPick: { horseNumber: 5, bracketNumber: 3, horseName: "ハヤテノシンゲン" },
  openAiPick: { horseNumber: 5, bracketNumber: 3, horseName: "ハヤテノシンゲン" },
  isSettled: false,
  bet: { investment: 1600, payout: 0, isHit: false },
  pickup: null,
  ...overrides,
})

test("レース番号・時刻・コース・独自予想の◎を表示し、詳細へリンクする", () => {
  const html = renderToStaticMarkup(<RaceRow item={item()} status="upcoming" />)
  expect(html).toContain('href="/races/42"')
  expect(html).toContain("15:45")
  expect(html).toContain("秋陽ステークス")
  expect(html).toContain("芝1800")
  expect(html).toContain("bg-frame-3")
  expect(html).toContain("ハヤテノシンゲン")
  expect(html).toContain("発走前")
})

test("的中は払戻額を出し、不的中は ¥0", () => {
  const hit = renderToStaticMarkup(
    <RaceRow item={item({ isSettled: true, bet: { investment: 1600, payout: 2040, isHit: true } })} status="hit" />,
  )
  expect(hit).toContain("的中")
  expect(hit).toContain("¥2,040")
  const miss = renderToStaticMarkup(<RaceRow item={item()} status="miss" />)
  expect(miss).toContain("不的中")
  expect(miss).toContain("¥0")
})

test("次に発走はバッジ、予想が無ければ予想未生成", () => {
  expect(renderToStaticMarkup(<RaceRow item={item()} status="next" />)).toContain("次に発走")
  const none = renderToStaticMarkup(
    <RaceRow item={item({ originalPick: null, openAiPick: null, hasPrediction: false, bet: null })} status="upcoming" />,
  )
  expect(none).toContain("予想未生成")
  expect(none).not.toContain("bg-frame-")
})

test("馬名が引けなければ馬番で代用する", () => {
  const html = renderToStaticMarkup(
    <RaceRow item={item({ originalPick: { horseNumber: 7, bracketNumber: null, horseName: null } })} status="upcoming" />,
  )
  expect(html).toContain("7番")
})
