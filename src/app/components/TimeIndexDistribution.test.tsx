import { expect, test } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import type { TimeIndexDistribution as Distribution } from "@/app/lib/timeIndex"
import { toHistogramBins } from "@/app/lib/timeIndexFilters"
import { TimeIndexDistribution } from "./TimeIndexDistribution"

const distribution = (overrides: Partial<Distribution> = {}): Distribution => ({
  bins: toHistogramBins([
    { bucket: 0, count: 20 },
    { bucket: 16, count: 45 },
    { bucket: 31, count: 1 },
  ]),
  indexedCount: 66,
  totalCount: 70,
  average: 95.2,
  min: -23.1,
  max: 133.8,
  confidences: [
    { confidence: "high", count: 40 },
    { confidence: "medium", count: 15 },
    { confidence: "low", count: 11 },
    { confidence: "unavailable", count: 4 },
  ],
  underflowCount: 20,
  overflowCount: 1,
  ...overrides,
})

test("端の棒と概要を出し、70未満が多ければ注意書きを出す", () => {
  const html = renderToStaticMarkup(<TimeIndexDistribution distribution={distribution()} />)
  expect(html).toContain('data-testid="bar-under"')
  expect(html).toContain('data-testid="bar-over"')
  expect(html).toContain('title="70未満: 20件"')
  expect(html).toContain('title="130以上: 1件"')
  expect(html).toContain("最多は 100〜102 の 45件")
  expect(html).toContain("70未満の走が20件（30%）と多い")
  expect(html).toContain(">66<")
  expect(html).toContain("95.2")
  expect(html).toContain("text-slow")
  expect(html).toContain("text-primary")
  expect(html).toContain("高 <span class=\"numeric\">57.1%")
  expect(html).toContain("算出不可")
})

test("70未満が少なければ注意書きは出ない", () => {
  const html = renderToStaticMarkup(
    <TimeIndexDistribution distribution={distribution({ underflowCount: 2, bins: toHistogramBins([{ bucket: 0, count: 2 }, { bucket: 16, count: 45 }]) })} />,
  )
  expect(html).not.toContain("と多い")
})

test("指数が 0 件なら棒の代わりに案内文", () => {
  const html = renderToStaticMarkup(
    <TimeIndexDistribution
      distribution={distribution({ bins: toHistogramBins([]), indexedCount: 0, totalCount: 0, average: null, min: null, max: null, underflowCount: 0, overflowCount: 0 })}
    />,
  )
  expect(html).toContain("指数が算出された走がありません")
  expect(html).not.toContain("bar-under")
  expect(html).toContain("—")
})
