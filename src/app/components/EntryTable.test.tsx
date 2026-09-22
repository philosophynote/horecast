import { expect, test } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import type { Entry } from "@prisma/client"
import { EntryTable } from "./EntryTable"
import { toHorseIndicatorLabels } from "@/app/lib/indicatorLabels"

type EntryWithMasters = Entry & {
  HorseMaster: { name: string }
  JockeyMaster: { name: string }
}

const entry = (horseNumber: number): EntryWithMasters =>
  ({
    id: horseNumber,
    race_id: 1,
    bracket_number: horseNumber,
    horse_number: horseNumber,
    sex: "牡",
    age: 4,
    jockey_weight: 57,
    HorseMaster: { name: `馬${horseNumber}` },
    JockeyMaster: { name: `騎手${horseNumber}` },
  }) as unknown as EntryWithMasters

const indicator = (horseNumber: number, timeIndexRecent: unknown) =>
  toHorseIndicatorLabels({
    horse_number: horseNumber,
    base_ability: 85,
    condition_fit: 55,
    pace_fit: 45,
    freshness: { days_since_last_race: 21 },
    history_count: 3,
    time_index_recent: timeIndexRecent,
  })

const run = (raceDate: string, timeIndex: number, confidence: string) => ({
  race_date: raceDate,
  racecourse: "東京",
  netkeiba_race_id: "202505050811",
  time_index: timeIndex,
  confidence,
})

const render = (indicators: ReturnType<typeof indicator>[]) =>
  renderToStaticMarkup(
    <EntryTable
      entries={indicators.map((item) => entry(item.horseNumber))}
      predicts={[]}
      indicators={indicators}
    />
  )

test("直近1走の指数と信頼度を地力の隣に表示する", () => {
  const html = render([indicator(1, [run("2025-12-28", 107.4, "low")])])

  expect(html).toContain("地力：最上位")
  expect(html).toContain("前走 107（信頼度 低）")
  // 1走だけなら展開要素は出さない
  expect(html).not.toContain("<details")
})

test("複数走あれば展開して最大5走まで確認できる", () => {
  const html = render([
    indicator(1, [
      run("2025-12-28", 107.4, "low"),
      run("2025-11-30", 101.2, "medium"),
      run("2025-10-12", 98.6, "high"),
      run("2025-09-14", 95.0, "high"),
      run("2025-08-03", 90.1, "high"),
      run("2025-07-06", 88.0, "high"),
    ]),
  ])

  expect(html).toContain("<details")
  expect(html).toContain("前走 107（信頼度 低）")
  expect(html).toContain("2025-08-03 東京 90（信頼度 高）")
  expect(html).not.toContain("2025-07-06")
  expect(html.match(/<li/g)).toHaveLength(5)
})

test("time_index_recent が空・null・不正でも表示が落ちず、既存ラベルは変わらない", () => {
  for (const value of [[], null, "broken", [null, { time_index: "x" }]]) {
    const html = render([indicator(2, value)])

    expect(html).not.toContain("前走")
    expect(html).toContain("地力：最上位")
    expect(html).toContain("条件適性：標準")
    expect(html).toContain("展開適性：中立")
    expect(html).toContain("近走状態：安定")
  }
})
