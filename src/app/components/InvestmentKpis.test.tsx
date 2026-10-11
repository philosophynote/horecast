import { expect, test } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { InvestmentKpis } from "./InvestmentKpis"

const statistics = {
  totalBets: 2260,
  totalAmount: 361600,
  totalReturn: 330380,
  hitRate: 14.4,
  returnRate: 91.4,
  profit: -31220,
  betTypeStats: [
    { betType: "複勝", totalBets: 904, hitBets: 244, totalAmount: 226000, totalReturn: 207030, hitRate: 27, returnRate: 91.6 },
    { betType: "ワイド", totalBets: 1356, hitBets: 82, totalAmount: 135600, totalReturn: 123350, hitRate: 6, returnRate: 91 },
  ],
}

test("回収率・収支・的中率を出し、点数と対象レース数を添える", () => {
  const html = renderToStaticMarkup(<InvestmentKpis statistics={statistics} totalRaces={226} />)
  expect(html).toContain("91.4")
  expect(html).toContain("text-negative")
  expect(html).toContain("−¥31,220")
  expect(html).toContain("¥361,600")
  expect(html).toContain("¥330,380")
  expect(html).toContain("14.4")
  expect(html).toContain(">2260<")
  expect(html).toContain(">326<")
  expect(html).toContain(">226<")
  expect(html).toContain("100% = 収支トントン")
})

test("対象レースが無ければ — にする", () => {
  const html = renderToStaticMarkup(
    <InvestmentKpis statistics={{ ...statistics, totalBets: 0, returnRate: 0, profit: 0 }} totalRaces={0} />,
  )
  expect(html.match(/—/g)?.length ?? 0).toBeGreaterThanOrEqual(4)
  expect(html).not.toContain("▼")
  expect(html).toContain(">0</span>レース")
})
