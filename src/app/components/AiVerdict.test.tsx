import { expect, test } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { AiVerdict } from "./AiVerdict"

const rows = [
  { mark: "◎" as const, horseNumber: 5, bracketNumber: 3, horseName: "ハヤテノシンゲン", abilityLabel: "最上位" },
  { mark: "○" as const, horseNumber: 12, bracketNumber: null, horseName: null, abilityLabel: null },
]

test("2つのモデルの印を枠番色の馬番と馬名で並べ、本命一致を出す", () => {
  const html = renderToStaticMarkup(
    <AiVerdict
      agreedHorseNumber={5}
      cards={[
        { title: "独自予想", engine: "独自予想モデル", rows },
        { title: "OpenAI", engine: "OpenAI", rows: [rows[0]] },
      ]}
    />,
  )
  expect(html).toContain("本命一致 ◎5")
  expect(html).toContain("bg-frame-3")
  expect(html).toContain("ハヤテノシンゲン")
  expect(html).toContain("地力 最上位")
  expect(html).toContain("12番")
  expect(html).toContain("独自予想モデル")
})

test("印が無いカードは案内文、本命が違えばバッジなし", () => {
  const html = renderToStaticMarkup(
    <AiVerdict
      agreedHorseNumber={null}
      cards={[
        { title: "独自予想", engine: "独自予想モデル", rows },
        { title: "OpenAI", engine: "OpenAI", rows: [] },
      ]}
    />,
  )
  expect(html).not.toContain("本命一致")
  expect(html).toContain("予想はまだありません")
})
