import { describe, expect, test } from "vitest"
import { isActiveNavPath } from "./navigation"

describe("isActiveNavPath", () => {
  test("レース一覧はトップとレース詳細で現在地になる", () => {
    expect(isActiveNavPath("/", "/")).toBe(true)
    expect(isActiveNavPath("/races/123", "/")).toBe(true)
  })

  test("レース一覧は他のページでは現在地にならない", () => {
    expect(isActiveNavPath("/time-index", "/")).toBe(false)
    expect(isActiveNavPath("/statistics", "/")).toBe(false)
  })

  test("トップ以外は完全一致か配下で現在地になる", () => {
    expect(isActiveNavPath("/time-index", "/time-index")).toBe(true)
    expect(isActiveNavPath("/time-index/", "/time-index")).toBe(true)
    expect(isActiveNavPath("/statistics", "/statistics")).toBe(true)
    expect(isActiveNavPath("/statistics", "/time-index")).toBe(false)
  })

  test("前方一致だけでは現在地にならない", () => {
    expect(isActiveNavPath("/time-indexes", "/time-index")).toBe(false)
  })
})
