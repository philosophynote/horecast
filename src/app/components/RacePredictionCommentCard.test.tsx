import { expect, test } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { RacePredictionCommentCard } from "./RacePredictionCommentCard"

const base = {
  provider: "openai",
  modelId: "gpt-5.6-luna",
  comment: "5番は地力・条件適性ともに最上位。",
  caveat: "当日の馬場の変化は反映していません。",
  warnings: [{ code: "no_history", message: "16番は国内の出走履歴がありません。", horseNumber: "16" }],
  isPartial: true,
  generatedAt: "2026-10-09T21:40:00.000Z",
}

test("プロバイダー名・モデル・本文・注意書き・警告・生成時刻（JST）を出す", () => {
  const html = renderToStaticMarkup(<RacePredictionCommentCard comment={base} />)
  expect(html).toContain("OpenAI")
  expect(html).toContain("gpt-5.6-luna")
  expect(html).toContain("材料少なめ")
  expect(html).toContain("5番は地力・条件適性ともに最上位。")
  expect(html).toContain("当日の馬場の変化は反映していません。")
  expect(html).toContain("16番は国内の出走履歴がありません。")
  expect(html).toContain("text-warning")
  expect(html).toContain("生成 2026/10/10 06:40")
})

test("注意書きも警告も無ければ区切りを出さず、未知のプロバイダーは識別子のまま", () => {
  const html = renderToStaticMarkup(
    <RacePredictionCommentCard
      comment={{ ...base, provider: "mistral", modelId: null, caveat: null, warnings: [], isPartial: false, generatedAt: "invalid" }}
    />,
  )
  expect(html).toContain("mistral")
  expect(html).not.toContain("材料少なめ")
  expect(html).not.toContain("border-t")
  expect(html).not.toContain("生成 ")
})
