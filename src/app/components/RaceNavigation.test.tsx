import { expect, test } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { RaceNavigation } from "./RaceNavigation"

const prev = { id: 10, track: "東京", number: 10, name: "錦秋特別" }
const next = { id: 12, track: "東京", number: 12, name: "3歳以上2勝クラス" }

test("前後のレースへリンクし、下段はレース名も出す", () => {
  const html = renderToStaticMarkup(<RaceNavigation prev={prev} next={next} />)
  expect(html).toContain('href="/races/10"')
  expect(html).toContain("← 東京10R 錦秋特別")
  expect(html).toContain("東京12R 3歳以上2勝クラス →")
})

test("上段はレース名を省き、無い側はリンクを出さない", () => {
  const html = renderToStaticMarkup(<RaceNavigation prev={null} next={next} compact />)
  expect(html).not.toContain('href="/races/10"')
  expect(html).toContain("東京12R →")
  expect(html).not.toContain("3歳以上2勝クラス")
})
