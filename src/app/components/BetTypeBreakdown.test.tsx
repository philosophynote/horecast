import { expect, test } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { BetTypeBreakdown } from "./BetTypeBreakdown"

test("券種ごとに回収率・的中・投資・払戻を出す", () => {
  const html = renderToStaticMarkup(
    <BetTypeBreakdown
      betTypeStats={[
        { betType: "複勝", totalBets: 904, hitBets: 244, totalAmount: 226000, totalReturn: 254030, hitRate: 27, returnRate: 112.4 },
        { betType: "ワイド", totalBets: 1356, hitBets: 82, totalAmount: 135600, totalReturn: 123350, hitRate: 6.05, returnRate: 91 },
      ]}
    />,
  )
  expect(html).toContain("複勝")
  expect(html).toContain("▲ 112.4%")
  expect(html).toContain("▼ 91.0%")
  expect(html).toContain("244/904")
  expect(html).toContain("27.0%")
  expect(html).toContain("¥226,000")
  expect(html).toContain("¥254,030")
})

test("空なら案内文", () => {
  expect(renderToStaticMarkup(<BetTypeBreakdown betTypeStats={[]} />)).toContain("対象の馬券がありません")
})
