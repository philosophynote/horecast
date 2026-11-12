import { describe, expect, it } from "vitest"
import robots from "./robots"

describe("robots", () => {
  const { rules } = robots()
  const ruleList = Array.isArray(rules) ? rules : [rules]

  it("AI クローラーにはサイト全体を辿らせない", () => {
    const aiRule = ruleList.find((rule) => Array.isArray(rule.userAgent) && rule.userAgent.includes("GPTBot"))
    expect(aiRule?.disallow).toBe("/")
    expect(aiRule?.userAgent).toEqual(expect.arrayContaining(["ClaudeBot", "CCBot", "Bytespider"]))
  })

  it("一般のクローラーには検索条件が無数にある画面と API を辿らせない", () => {
    const defaultRule = ruleList.find((rule) => rule.userAgent === "*")
    expect(defaultRule?.allow).toBe("/")
    expect(defaultRule?.disallow).toEqual(["/api/", "/time-index", "/jockeys"])
  })
})
