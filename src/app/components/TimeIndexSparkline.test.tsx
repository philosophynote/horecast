import { expect, test } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import type { RecentTimeIndex } from "@/app/lib/indicatorLabels"
import { TimeIndexSparkline } from "./TimeIndexSparkline"

const run = (raceDate: string, timeIndex: number, confidenceLabel: string): RecentTimeIndex => ({
  raceDate,
  racecourse: "東京",
  netkeibaRaceId: raceDate,
  timeIndex,
  confidence: "high",
  confidenceLabel,
})

test("折れ線と前走の値・信頼度を出し、高い指数は強調色", () => {
  const html = renderToStaticMarkup(
    <TimeIndexSparkline recentTimeIndexes={[run("2026-09-20", 106.4, "高"), run("2026-08-01", 98, "中")]} />,
  )
  expect(html).toContain("<svg")
  expect(html).toContain('aria-label="直近2走のタイム指数（古い順） 98、106"')
  expect(html).toContain(">106<")
  expect(html).toContain("text-primary")
  expect(html).toContain("前走 · 信頼度高")
})

test("遅い指数は遅い色、走が無ければ指数なし", () => {
  expect(renderToStaticMarkup(<TimeIndexSparkline recentTimeIndexes={[run("2026-09-20", 90, "低")]} />)).toContain("text-slow")
  expect(renderToStaticMarkup(<TimeIndexSparkline recentTimeIndexes={[]} />)).toContain("指数なし")
})
