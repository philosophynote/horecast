import { expect, test } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { INSUFFICIENT_LABEL } from "@/app/lib/indicatorLabels"
import { IndicatorMeter } from "./IndicatorMeter"

const countFilled = (html: string) => (html.match(/data-filled="true"/g) ?? []).length
const countEmpty = (html: string) => (html.match(/data-filled="false"/g) ?? []).length

test("最上位は5つ塗り、ラベルを併記する", () => {
  const html = renderToStaticMarkup(
    <IndicatorMeter name="地力" indicator={{ label: "最上位", level: 0 }} />,
  )
  expect(countFilled(html)).toBe(5)
  expect(countEmpty(html)).toBe(0)
  expect(html).toContain("地力")
  expect(html).toContain("最上位")
  expect(html).toContain("bg-primary")
})

test("下位は1つだけ塗り、残りは線の色にする", () => {
  const html = renderToStaticMarkup(
    <IndicatorMeter name="地力" indicator={{ label: "下位", level: 4 }} />,
  )
  expect(countFilled(html)).toBe(1)
  expect(countEmpty(html)).toBe(4)
  expect(html).toContain("bg-border")
})

test("4段の近走状態は最悪でも2つ塗る", () => {
  const html = renderToStaticMarkup(
    <IndicatorMeter name="近走状態" indicator={{ label: "やや不安", level: 3 }} levelCount={4} />,
  )
  expect(countFilled(html)).toBe(2)
})

test("判断材料不足は破線のチップにして目盛りを出さない", () => {
  const html = renderToStaticMarkup(
    <IndicatorMeter name="地力" indicator={{ label: INSUFFICIENT_LABEL, level: null }} />,
  )
  expect(html).toContain("border-dashed")
  expect(html).toContain(`地力：${INSUFFICIENT_LABEL}`)
  expect(html).not.toContain("data-filled")
})
