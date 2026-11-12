import { describe, expect, it } from "vitest"
import { isRenderStale } from "./staleRender"

describe("isRenderStale", () => {
  const renderedAt = "2026-11-12T04:00:00.000Z"
  const renderedMs = Date.parse(renderedAt)

  it("期限内なら古くない", () => {
    expect(isRenderStale(renderedAt, renderedMs + 299_000, 300)).toBe(false)
  })

  it("期限ちょうどは古くない", () => {
    expect(isRenderStale(renderedAt, renderedMs + 300_000, 300)).toBe(false)
  })

  it("期限を過ぎたら古い", () => {
    expect(isRenderStale(renderedAt, renderedMs + 300_001, 300)).toBe(true)
  })

  it("端末の時計が遅れていても古いとは判定しない", () => {
    expect(isRenderStale(renderedAt, renderedMs - 60_000, 300)).toBe(false)
  })

  it("時刻として読めない値は古いと判定しない", () => {
    expect(isRenderStale("", renderedMs, 300)).toBe(false)
  })
})
