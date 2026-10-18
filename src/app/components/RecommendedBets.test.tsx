import { expect, test } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { RecommendedBets, type RecommendedBetSection } from "./RecommendedBets"

const brackets = [
  { horseNumber: 5, bracketNumber: 3 },
  { horseNumber: 3, bracketNumber: 2 },
]

const original: RecommendedBetSection = {
  key: "original",
  title: "独自予想",
  summary: { investment: 800, payout: 1290, profit: 490, returnRate: 161.25, isHit: true },
  groups: [
    { type: "複勝", items: [{ numbers: [5], bet: 400, payout: 600 }, { numbers: [3], bet: 300, payout: 0 }] },
    { type: "ワイドBOX", items: [{ numbers: [3, 5], bet: 100, payout: 690 }] },
  ],
}

const openAi: RecommendedBetSection = {
  key: "openai",
  title: "OpenAI",
  summary: null,
  groups: [],
  emptyMessage: "OpenAIの予想データはまだ登録されていません",
}

test("先頭のモデルを選んだ状態で、投資・払戻・収支・回収率と買い目を出す", () => {
  const html = renderToStaticMarkup(<RecommendedBets isSettled sections={[original, openAi]} brackets={brackets} />)
  expect(html).toContain('aria-pressed="true"')
  expect(html).toContain("¥800")
  expect(html).toContain("¥1,290")
  expect(html).toContain("+¥490")
  expect(html).toContain("▲ 161.3%")
  expect(html).toContain("ワイドBOX")
  expect(html).toContain("bg-frame-3")
  expect(html).toContain("¥690")
  expect(html).toContain("—")
})

test("確定前は払戻・収支・回収率が — で、買い目は発走前", () => {
  const section: RecommendedBetSection = {
    ...original,
    summary: { investment: 800, payout: null, profit: null, returnRate: null, isHit: false },
    groups: [{ type: "複勝", items: [{ numbers: [5], bet: 400, payout: 0 }] }],
  }
  const html = renderToStaticMarkup(<RecommendedBets isSettled={false} sections={[section]} brackets={brackets} />)
  expect(html).toContain("発走前")
  expect(html).not.toContain("▲")
  expect(html).not.toContain("▼")
  expect(html).not.toContain('role="group"')
})

test("推奨馬券が無いモデルは案内文", () => {
  const html = renderToStaticMarkup(<RecommendedBets isSettled sections={[openAi]} brackets={brackets} />)
  expect(html).toContain("OpenAIの予想データはまだ登録されていません")
})
