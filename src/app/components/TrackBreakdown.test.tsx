import { expect, test } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { TrackBreakdown } from "./TrackBreakdown"

test("競馬場ごとに回収率の横棒と値を出す", () => {
  const html = renderToStaticMarkup(
    <TrackBreakdown
      trackStatistics={[
        { track: "京都", totalRaces: 24, totalAmount: 38400, totalReturn: 41640, returnRate: 108.4, profit: 3240 },
        { track: "東京", totalRaces: 24, totalAmount: 38400, totalReturn: 24710, returnRate: 64.3, profit: -13690 },
      ]}
    />,
  )
  expect(html).toContain("京都")
  expect(html).toContain("▲ 108.4%")
  expect(html).toContain("▼ 64.3%")
  expect(html.match(/data-testid="return-rate-fill"/g)).toHaveLength(2)
})

test("空なら案内文", () => {
  expect(renderToStaticMarkup(<TrackBreakdown trackStatistics={[]} />)).toContain("対象のレースがありません")
})
