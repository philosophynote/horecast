import { expect, test } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { TimeIndexScale } from "./TimeIndexScale"

test("70〜130 の帯に 100 と 110 の目印と説明を出す", () => {
  const html = renderToStaticMarkup(<TimeIndexScale />)
  expect(html).toContain('aria-label="指数の目盛り"')
  expect(html).toContain("bg-slow")
  expect(html).toContain("bg-primary")
  expect(html).toContain("left:50%")
  expect(html).toContain("同条件の標準的な勝ち時計")
  expect(html).toContain("基準より約1%速い")
})
