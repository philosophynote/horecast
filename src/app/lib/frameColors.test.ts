import { describe, expect, test } from "vitest"
import { FRAME_FALLBACK_CLASS, frameColorClass } from "./frameColors"

describe("frameColorClass", () => {
  test("1〜8枠はそれぞれの枠色と文字色に対応する", () => {
    for (let bracket = 1; bracket <= 8; bracket++) {
      const className = frameColorClass(bracket)
      expect(className).toContain(`bg-frame-${bracket} `)
      expect(className).toContain(`text-frame-${bracket}-foreground`)
    }
  })

  test("1枠はライトでだけ縁取りする", () => {
    const className = frameColorClass(1)
    expect(className).toContain("border-border")
    expect(className).toContain("dark:border-transparent")
  })

  test("2枠はダークでだけ縁取りする", () => {
    const className = frameColorClass(2)
    expect(className).toContain("dark:border-border")
    expect(className).not.toMatch(/(^|\s)border-border/)
  })

  test("3〜8枠は縁取りしない", () => {
    for (let bracket = 3; bracket <= 8; bracket++) {
      expect(frameColorClass(bracket)).not.toContain("border")
    }
  })

  test("範囲外や未設定は中立色になる", () => {
    expect(frameColorClass(0)).toBe(FRAME_FALLBACK_CLASS)
    expect(frameColorClass(9)).toBe(FRAME_FALLBACK_CLASS)
    expect(frameColorClass(null)).toBe(FRAME_FALLBACK_CLASS)
    expect(frameColorClass(undefined)).toBe(FRAME_FALLBACK_CLASS)
  })
})
