import { expect, test } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { ReturnRate, SignedYen } from "./SignedValue"

test("プラスの収支は符号付きでプラス色", () => {
  const html = renderToStaticMarkup(<SignedYen amount={2040} />)
  expect(html).toContain("+¥2,040")
  expect(html).toContain("text-positive")
  expect(html).toContain("numeric")
})

test("マイナスの収支はマイナス色", () => {
  const html = renderToStaticMarkup(<SignedYen amount={-400} />)
  expect(html).toContain("−¥400")
  expect(html).toContain("text-negative")
})

test("回収率は 100% 境界で印と色が変わる", () => {
  expect(renderToStaticMarkup(<ReturnRate rate={110.6} />)).toContain("▲ 110.6%")
  expect(renderToStaticMarkup(<ReturnRate rate={110.6} />)).toContain("text-positive")
  expect(renderToStaticMarkup(<ReturnRate rate={93.9} />)).toContain("▼ 93.9%")
  expect(renderToStaticMarkup(<ReturnRate rate={93.9} />)).toContain("text-negative")
})
