import { expect, test } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import type { TimeIndexRow } from "@/app/lib/timeIndex"
import { TimeIndexHorseTrend } from "./TimeIndexHorseTrend"

const run = (id: number, raceDate: string, timeIndex: number | null, confidence = "high"): TimeIndexRow => ({
  id,
  netkeibaRaceId: String(id),
  raceId: id === 2 ? 99 : null,
  raceNumber: 10,
  horseNumber: 5,
  horseName: "ハヤテノシンゲン",
  raceDate,
  racecourse: "中山",
  surface: "芝",
  distance: 1800,
  className: "3勝クラス",
  going: "良",
  timeSeconds: 106.3,
  baselineSeconds: 106.8,
  baselineSampleSize: 19,
  baselineConfidence: confidence,
  baselineVersion: "v1",
  timeIndex,
  unavailableReason: timeIndex === null ? "標本不足" : null,
})

const filter = { page: 1, horse: "ハヤテノシンゲン" }

test("折れ線と直近の走を出し、信頼度 低は白抜きの丸", () => {
  const html = renderToStaticMarkup(
    <TimeIndexHorseTrend
      filter={filter}
      trend={{ horseName: "ハヤテノシンゲン", runs: [run(1, "2025-11-02", 96, "low"), run(2, "2026-09-28", 104.7)], candidates: [] }}
    />,
  )
  expect(html).toContain("馬ごとの推移 · ハヤテノシンゲン · 2走")
  expect(html).toContain('data-testid="marker-low"')
  expect(html).toContain("fill-card stroke-primary")
  expect(html).toContain("25/11/2")
  expect(html).toContain('href="/races/99"')
  expect(html).toContain("走破 1:46.3 · 基準 1:46.8")
  expect(html).toContain("104.7")
  expect(html).toContain(">低<")
  expect(html).toContain('value="ハヤテノシンゲン"')
})

test("一致する馬がいなければ候補を出す", () => {
  const html = renderToStaticMarkup(
    <TimeIndexHorseTrend filter={filter} trend={{ horseName: "ハヤテ", runs: [], candidates: ["ハヤテノシンゲン", "ハヤテブレイブ"] }} />,
  )
  expect(html).toContain("「ハヤテ」に一致する馬はいません。名前に含む馬:")
  expect(html).toContain("ハヤテブレイブ")
  expect(html).not.toContain("<svg")
})

test("候補も無ければ案内文、馬名未指定ならフォームだけ", () => {
  expect(renderToStaticMarkup(<TimeIndexHorseTrend filter={filter} trend={{ horseName: "X", runs: [], candidates: [] }} />)).toContain(
    "「X」に一致する馬はいません。",
  )
  const html = renderToStaticMarkup(<TimeIndexHorseTrend filter={{ page: 1 }} trend={null} />)
  expect(html).toContain('role="search"')
  expect(html).not.toContain("<svg")
})
