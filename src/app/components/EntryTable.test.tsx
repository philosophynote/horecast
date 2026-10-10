import { expect, test } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import type { Entry } from "@prisma/client"
import { EntryTable } from "./EntryTable"
import { toHorseIndicatorLabels } from "@/app/lib/indicatorLabels"
import {
  toJockeyRecordLabels,
  type JockeyRecordRow,
  type JockeyRecordSummary,
} from "@/app/lib/jockeyRecordLabels"

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
    jockey_master_id: 100 + horseNumber,
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

const raceCondition = { racecourse: "東京", surface: "ダート", distanceBand: "短距離" }

const record = (
  jockeyMasterId: number,
  condition: Partial<JockeyRecordRow>,
  counts: { rides: number; wins?: number; seconds?: number; thirds?: number }
): JockeyRecordRow => ({
  jockeyMasterId,
  ...raceCondition,
  wins: 0,
  seconds: 0,
  thirds: 0,
  ...counts,
  ...condition,
})

const renderWithJockeyRecords = (
  horseNumbers: number[],
  rows: JockeyRecordRow[],
  generatedAt: Date | null = new Date("2026-10-10T09:04:49Z")
) => {
  const entries = horseNumbers.map(entry)
  const summary: JockeyRecordSummary = {
    labels: toJockeyRecordLabels(
      entries.map((item) => item.jockey_master_id),
      rows,
      raceCondition
    ),
    generatedAt,
  }
  return renderToStaticMarkup(<EntryTable entries={entries} predicts={[]} jockeyRecords={summary} />)
}

test("騎手名の下に開催条件での勝率・複勝率・騎乗数を表示する", () => {
  const html = renderWithJockeyRecords(
    [1],
    [record(101, {}, { rides: 351, wins: 54, seconds: 45, thirds: 35 })]
  )

  expect(html).toContain("騎手1")
  expect(html).toContain("15.4%")
  expect(html).toContain("38.2%")
  expect(html).toContain("351騎乗")
  expect(html).toContain("東京・ダート・短距離")
  expect(html).not.toContain("※")
  // 脚注に集計時点の日付（JST）を出す
  expect(html).toContain("2026-10-10 時点")
})

test("条件を広げた騎手には※と広げた条件を付け、脚注に注記を出す", () => {
  const html = renderWithJockeyRecords(
    [1],
    [
      record(101, {}, { rides: 5, wins: 1 }),
      record(101, { distanceBand: "all" }, { rides: 40, wins: 4, seconds: 2, thirds: 2 }),
    ]
  )

  expect(html).toContain("10.0%")
  expect(html).toContain("20.0%")
  expect(html).toContain("※東京・ダート・全距離")
  expect(html).toContain("データが少なく、正確性に難があります")
})

test("all でも20未満ならデータ不足、集計行が無ければデータなし", () => {
  const html = renderWithJockeyRecords(
    [1, 2],
    [record(101, { racecourse: "all", surface: "all", distanceBand: "all" }, { rides: 19 })]
  )

  expect(html).toContain("データ不足")
  expect(html).toContain("データなし")
  expect(html).not.toContain("勝率 <")
  // 広げた値が無いので注記は出さない
  expect(html).not.toContain("データが少なく")
})

test("騎手成績を渡さなければ（障害レース・取得失敗）成績も脚注も出さない", () => {
  const html = renderToStaticMarkup(<EntryTable entries={[entry(1)]} predicts={[]} />)

  expect(html).toContain("騎手1")
  expect(html).not.toContain("勝率")
  expect(html).not.toContain("データなし")
})
