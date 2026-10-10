import { describe, expect, test } from "vitest"
import { COURSE_TYPE_FALLBACK_CLASS, courseTypeColorClass } from "./courseType"

describe("courseTypeColorClass", () => {
  test("芝・ダート・障害はそれぞれの色になる", () => {
    expect(courseTypeColorClass("芝")).toBe("bg-course-turf")
    expect(courseTypeColorClass("ダート")).toBe("bg-course-dirt")
    expect(courseTypeColorClass("障害")).toBe("bg-course-jump")
  })

  test("不明な種別と未設定は中立色になる", () => {
    expect(courseTypeColorClass("ポリトラック")).toBe(COURSE_TYPE_FALLBACK_CLASS)
    expect(courseTypeColorClass("")).toBe(COURSE_TYPE_FALLBACK_CLASS)
    expect(courseTypeColorClass(null)).toBe(COURSE_TYPE_FALLBACK_CLASS)
    expect(courseTypeColorClass(undefined)).toBe(COURSE_TYPE_FALLBACK_CLASS)
  })
})
