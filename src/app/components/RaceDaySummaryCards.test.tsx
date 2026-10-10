import { expect, test } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { RaceDaySummaryCards } from "./RaceDaySummaryCards"

test("件数と独自予想の回収率・収支を符号付きで表示する", () => {
  const html = renderToStaticMarkup(
    <RaceDaySummaryCards
      summary={{
        totalRaces: 24,
        predictedRaces: 24,
        settledRaces: 12,
        original: { investment: 19200, payout: 21240, returnRate: 110.625, profit: 2040 },
      }}
    />,
  )
  expect(html).toContain("24<span")
  expect(html).toContain("/ 24R")
  expect(html).toContain("▲ 110.6%")
  expect(html).toContain("+¥2,040")
  expect(html).toContain("text-positive")
})

test("確定済みのレースが無ければ回収率と収支は —", () => {
  const html = renderToStaticMarkup(
    <RaceDaySummaryCards summary={{ totalRaces: 12, predictedRaces: 10, settledRaces: 0, original: null }} />,
  )
  expect(html).toContain("—")
  expect(html).not.toContain("%")
})
