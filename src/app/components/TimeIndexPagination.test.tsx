import { expect, test } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { TimeIndexPagination } from "./TimeIndexPagination"

test("中間のページは前後ともリンク", () => {
  const html = renderToStaticMarkup(<TimeIndexPagination filter={{ page: 2, racecourse: "東京" }} page={{ page: 2, pageCount: 5 }} />)
  expect(html).toContain('href="/time-index?racecourse=%E6%9D%B1%E4%BA%AC#list"')
  expect(html).toContain('href="/time-index?racecourse=%E6%9D%B1%E4%BA%AC&amp;page=3#list"')
})

test("端のページは無い側をリンクにしない", () => {
  const html = renderToStaticMarkup(<TimeIndexPagination filter={{ page: 1 }} page={{ page: 1, pageCount: 1 }} />)
  expect(html).not.toContain("href=")
  expect(html.match(/aria-disabled="true"/g)).toHaveLength(2)
})
