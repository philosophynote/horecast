import { describe, expect, test } from "vitest"
import { meterFilledCount, meterTone } from "./indicatorMeter"

describe("meterFilledCount", () => {
  test("5段は最上位5つから下位1つまで1つずつ減る", () => {
    expect([0, 1, 2, 3, 4].map((level) => meterFilledCount(level, 5))).toEqual([5, 4, 3, 2, 1])
  })

  test("4段は最上位5つから最悪2つまで", () => {
    expect([0, 1, 2, 3].map((level) => meterFilledCount(level, 4))).toEqual([5, 4, 3, 2])
  })

  test("段数を省略すると5段として扱う", () => {
    expect(meterFilledCount(4)).toBe(1)
  })

  test("判断材料不足（null）は塗らない", () => {
    expect(meterFilledCount(null, 5)).toBe(0)
  })

  test("範囲外の段は端に丸める", () => {
    expect(meterFilledCount(-1, 5)).toBe(5)
    expect(meterFilledCount(9, 5)).toBe(1)
    expect(meterFilledCount(9, 4)).toBe(2)
  })
})

describe("meterTone", () => {
  test("上位2段は強調色、中央は文字色、下位と不足は補助色", () => {
    expect(meterTone(0)).toBe("primary")
    expect(meterTone(1)).toBe("primary")
    expect(meterTone(2)).toBe("foreground")
    expect(meterTone(3)).toBe("muted")
    expect(meterTone(4)).toBe("muted")
    expect(meterTone(null)).toBe("muted")
  })
})
