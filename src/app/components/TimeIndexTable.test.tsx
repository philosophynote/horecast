import { expect, test } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import type { TimeIndexRow } from "@/app/lib/timeIndex"
import { TimeIndexTable } from "./TimeIndexTable"

const row = (overrides: Partial<TimeIndexRow> = {}): TimeIndexRow => ({
  id: 1,
  netkeibaRaceId: "202608040311",
  raceId: 42,
  raceNumber: 11,
  horseNumber: 7,
  horseName: "ミナモトノカゼ",
  raceDate: "2026-10-04",
  racecourse: "京都",
  surface: "芝",
  distance: 1600,
  className: "オープン",
  going: "良",
  timeSeconds: 92.4,
  baselineSeconds: 93.52,
  baselineSampleSize: 31,
  baselineConfidence: "high",
  baselineVersion: "v1",
  timeIndex: 112,
  unavailableReason: null,
  ...overrides,
})

const filter = { page: 1 }
const fillStyle = (html: string) => html.match(/data-testid="deviation-fill"[^>]*style="([^"]+)"/)?.[1]

test("開催日・レースのリンク・条件・走破・基準・指数の棒・信頼度を出す", () => {
  const html = renderToStaticMarkup(<TimeIndexTable rows={[row()]} filter={filter} />)
  expect(html).toContain('dateTime="2026-10-04"')
  expect(html).toContain("10/4")
  expect(html).toContain('href="/races/42"')
  expect(html).toContain("京都11R")
  expect(html).toContain("bg-course-turf")
  expect(html).toContain("1:32.4")
  expect(html).toContain("1:33.5")
  expect(html).toContain("標本 31")
  expect(html).toContain("112.0")
  expect(html).toContain("text-primary")
  expect(fillStyle(html)).toBe("left:50%;width:20%")
  expect(html).toContain(">高<")
  expect(html).toContain("horse=%E3%83%9F%E3%83%8A%E3%83%A2%E3%83%88%E3%83%8E%E3%82%AB%E3%82%BC")
})

test("Race に無い行はリンクにしない", () => {
  const html = renderToStaticMarkup(<TimeIndexTable rows={[row({ raceId: null, raceNumber: 10 })]} filter={filter} />)
  expect(html).not.toContain('href="/races/')
  expect(html).toContain("京都10R")
})

test("算出不可は — で棒を出さず、理由を title に持つ", () => {
  const html = renderToStaticMarkup(
    <TimeIndexTable
      rows={[row({ timeIndex: null, baselineSeconds: null, baselineConfidence: "unavailable", unavailableReason: "標本不足" })]}
      filter={filter}
    />,
  )
  expect(html).toContain('title="標本不足"')
  expect(html).not.toContain("deviation-fill")
  expect(html).toContain("算出不可")
  expect(html.match(/—/g)?.length ?? 0).toBeGreaterThanOrEqual(2)
})

test("負の値と 130 超は棒を端でクリップし、色は遅い／強調", () => {
  const negative = renderToStaticMarkup(<TimeIndexTable rows={[row({ timeIndex: -23.1 })]} filter={filter} />)
  expect(fillStyle(negative)).toBe("left:0%;width:50%")
  expect(negative).toContain("bg-slow")
  const huge = renderToStaticMarkup(<TimeIndexTable rows={[row({ timeIndex: 133.8 })]} filter={filter} />)
  expect(fillStyle(huge)).toBe("left:50%;width:50%")
  expect(huge).toContain("bg-primary")
})

test("0 件は案内文", () => {
  expect(renderToStaticMarkup(<TimeIndexTable rows={[]} filter={filter} />)).toContain("条件に一致するタイム指数がありません")
})
