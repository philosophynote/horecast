import { expect, test } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { PayoutTable } from "./PayoutTable"

test("券種を定番順に並べ、AI が買って的中した行に印を付ける", () => {
  const html = renderToStaticMarkup(
    <PayoutTable
      payouts={[
        { id: 1, bet_type: "ワイド", numbers: "3-5", payout: 690 },
        { id: 2, bet_type: "単勝", numbers: "5", payout: 380 },
        { id: 3, bet_type: "複勝", numbers: "5", payout: 150 },
      ]}
      originalBets={[{ bet_type: "ワイド", numbers: "5-3", bet: 100, payout: 690 }]}
      openAiBets={[{ bet_type: "複勝", numbers: "5", bet: 400, payout: 600 }]}
    />,
  )
  const types = [...html.matchAll(/text-muted-foreground">(単勝|複勝|ワイド)</g)].map((m) => m[1])
  expect(types).toEqual(["単勝", "複勝", "ワイド"])
  expect(html).toContain("¥690")
  expect(html).toContain("独自的中")
  expect(html).toContain("OpenAI的中")
  expect(html.match(/的中/g)).toHaveLength(2)
})
