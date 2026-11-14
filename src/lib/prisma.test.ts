import { describe, expect, it } from "vitest"
import { getPrisma } from "./prisma"

describe("getPrisma", () => {
  it("描画の外では呼ぶたびに別のクライアントを返す（リクエストをまたいで使い回さない）", () => {
    expect(getPrisma()).not.toBe(getPrisma())
  })
})
