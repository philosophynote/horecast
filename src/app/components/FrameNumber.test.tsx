import { expect, test } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { FrameNumber } from "./FrameNumber"

test("枠番の色で番号を表示する", () => {
  const html = renderToStaticMarkup(<FrameNumber bracketNumber={3}>5</FrameNumber>)
  expect(html).toContain("bg-frame-3")
  expect(html).toContain("text-frame-3-foreground")
  expect(html).toContain(">5<")
  expect(html).toContain("numeric")
})

test("番号を省略すると枠番を表示する", () => {
  const html = renderToStaticMarkup(<FrameNumber bracketNumber={7} />)
  expect(html).toContain(">7<")
})

test("枠番が無ければ中立色で表示する", () => {
  const html = renderToStaticMarkup(<FrameNumber bracketNumber={null}>12</FrameNumber>)
  expect(html).toContain("bg-muted")
  expect(html).toContain(">12<")
})
