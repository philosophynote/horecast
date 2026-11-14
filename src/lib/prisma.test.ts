import { beforeEach, describe, expect, it, vi } from "vitest"

// CI では prisma generate を実行しないので、生成済みのクライアントを読まずに差し替える
const { PrismaClient, PrismaPg } = vi.hoisted(() => ({
  PrismaClient: vi.fn(function (this: { options: unknown }, options: unknown) {
    this.options = options
  }),
  PrismaPg: vi.fn(function (this: { config: unknown }, config: unknown) {
    this.config = config
  }),
}))
vi.mock("@prisma/client", () => ({ PrismaClient }))
vi.mock("@prisma/adapter-pg", () => ({ PrismaPg }))

import { getPrisma } from "./prisma"

beforeEach(() => vi.clearAllMocks())

describe("getPrisma", () => {
  it("描画の外では呼ぶたびに別のクライアントを返す（リクエストをまたいで使い回さない）", () => {
    expect(getPrisma()).not.toBe(getPrisma())
    expect(PrismaClient).toHaveBeenCalledTimes(2)
  })

  it("使い終えた接続を閉じ、1リクエストの同時接続を絞る", () => {
    getPrisma()
    expect(PrismaPg).toHaveBeenCalledWith(expect.objectContaining({ maxUses: 1, max: 3 }))
  })
})
