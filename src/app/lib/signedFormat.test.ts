import { describe, expect, test } from "vitest"
import {
  MINUS_SIGN,
  amountTone,
  formatReturnRate,
  formatSignedPercent,
  formatSignedYen,
  returnRateTone,
} from "./signedFormat"

describe("formatSignedYen", () => {
  test("プラスは + を付けて桁区切りする", () => {
    expect(formatSignedYen(2040)).toBe("+¥2,040")
    expect(formatSignedYen(1234567)).toBe("+¥1,234,567")
  })

  test("マイナスはハイフンではなく U+2212 を付ける", () => {
    expect(formatSignedYen(-400)).toBe(`${MINUS_SIGN}¥400`)
    expect(formatSignedYen(-400)).not.toContain("-")
  })

  test("0 と -0 は ± にする", () => {
    expect(formatSignedYen(0)).toBe("±¥0")
    expect(formatSignedYen(-0)).toBe("±¥0")
  })

  test("小数は四捨五入する", () => {
    expect(formatSignedYen(99.6)).toBe("+¥100")
    expect(formatSignedYen(-0.4)).toBe("±¥0")
  })
})

describe("formatSignedPercent", () => {
  test("符号と小数1桁", () => {
    expect(formatSignedPercent(12.34)).toBe("+12.3%")
    expect(formatSignedPercent(-4)).toBe(`${MINUS_SIGN}4.0%`)
    expect(formatSignedPercent(0)).toBe("±0.0%")
  })
})

describe("formatReturnRate", () => {
  test("100% 以上は ▲、未満は ▼", () => {
    expect(formatReturnRate(110.6)).toBe("▲ 110.6%")
    expect(formatReturnRate(93.9)).toBe("▼ 93.9%")
  })

  test("100% ちょうどは ▲", () => {
    expect(formatReturnRate(100)).toBe("▲ 100.0%")
    expect(formatReturnRate(99.99)).toBe("▼ 100.0%")
  })
})

describe("tone", () => {
  test("収支は 0 以上がプラス側", () => {
    expect(amountTone(1)).toBe("positive")
    expect(amountTone(0)).toBe("positive")
    expect(amountTone(-1)).toBe("negative")
  })

  test("回収率は 100 以上がプラス側", () => {
    expect(returnRateTone(100)).toBe("positive")
    expect(returnRateTone(99.9)).toBe("negative")
  })
})
