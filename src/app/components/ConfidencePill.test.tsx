import { expect, test } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { ConfidencePill } from "./ConfidencePill"

test("信頼度を文字で出し、低と算出不可は破線", () => {
  expect(renderToStaticMarkup(<ConfidencePill confidence="high" />)).toContain(">高<")
  expect(renderToStaticMarkup(<ConfidencePill confidence="low" />)).toContain("border-dashed")
  expect(renderToStaticMarkup(<ConfidencePill confidence="unavailable" />)).toContain("算出不可")
  expect(renderToStaticMarkup(<ConfidencePill confidence="weird" />)).toContain(">weird<")
})
