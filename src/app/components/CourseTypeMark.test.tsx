import { expect, test } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { CourseTypeMark } from "./CourseTypeMark"

test("種別の色を丸にだけ付け、文字には付けない", () => {
  const html = renderToStaticMarkup(<CourseTypeMark courseType="芝" />)
  expect(html).toContain("bg-course-turf")
  expect(html).not.toContain("text-course-")
  expect(html).toContain(">芝<")
})

test("子要素を渡すとそれを文字にする", () => {
  const html = renderToStaticMarkup(<CourseTypeMark courseType="ダート">ダ1400</CourseTypeMark>)
  expect(html).toContain("bg-course-dirt")
  expect(html).toContain("ダ1400")
})

test("不明な種別は中立色になる", () => {
  const html = renderToStaticMarkup(<CourseTypeMark courseType={null} />)
  expect(html).toContain("bg-muted-foreground")
})
