import { expect, test } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { RaceStatisticsTable } from "./RaceStatisticsTable"

const row = (raceId: number, profit: number) => ({
  raceId,
  date: "2026-10-10",
  raceTime: "2026-10-10T15:45:00.000Z",
  track: "東京",
  raceNumber: 11,
  raceName: "秋陽ステークス",
  statistics: {
    totalBets: 10,
    totalAmount: 1600,
    totalReturn: 1600 + profit,
    hitRate: 20,
    returnRate: ((1600 + profit) / 1600) * 100,
    profit,
  },
})

test("各行がレース詳細へリンクし、日時・レース・金額・符号付き収支・回収率を出す", () => {
  const html = renderToStaticMarkup(<RaceStatisticsTable rows={[row(5295, 440), row(5283, -1600)]} />)
  expect(html).toContain('href="/races/5295"')
  expect(html).toContain('href="/races/5283"')
  expect(html).toContain("10/10 15:45")
  expect(html).toContain("東京11R 秋陽ステークス")
  expect(html).toContain("¥1,600")
  expect(html).toContain("+¥440")
  expect(html).toContain("−¥1,600")
  expect(html).toContain("▲ 127.5%")
  expect(html).toContain("▼ 0.0%")
})

test("空なら案内文", () => {
  expect(renderToStaticMarkup(<RaceStatisticsTable rows={[]} />)).toContain("期間内に対象のレースがありません")
})
