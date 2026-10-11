import { expect, test } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { ReturnRateBar } from "./ReturnRateBar"

const width = (html: string) => html.match(/data-testid="return-rate-fill"[^>]*width:([^;"]+)/)?.[1]

test("100% 以上はプラス色で、幅は 150% を上限にする", () => {
  const html = renderToStaticMarkup(<ReturnRateBar rate={110.6} />)
  expect(html).toContain("bg-positive")
  expect(width(html)).toBe("73.73333333333333%")
  expect(renderToStaticMarkup(<ReturnRateBar rate={300} />)).toContain("width:100%")
})

test("100% 未満はマイナス色。読み上げ対象にしない", () => {
  const html = renderToStaticMarkup(<ReturnRateBar rate={64.3} />)
  expect(html).toContain("bg-negative")
  expect(html).toContain('aria-hidden="true"')
  expect(html).toMatch(/left:66\.6+\d*%/)
})
