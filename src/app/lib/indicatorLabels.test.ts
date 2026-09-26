import { expect, test } from "vitest"
import {
  MAX_RECENT_TIME_INDEXES,
  toHorseIndicatorLabels,
  toRecentTimeIndexes,
} from "./indicatorLabels"

const recentRun = (raceDate: string, timeIndex: number, confidence: string) => ({
  race_date: raceDate,
  racecourse: "中山",
  netkeiba_race_id: `race-${raceDate}`,
  time_index: timeIndex,
  confidence,
})

test("time_index_recent を表示用の配列へ変換し、信頼度を高・中・低にする", () => {
  expect(
    toRecentTimeIndexes([
      recentRun("2025-12-28", 107.4, "low"),
      recentRun("2025-11-30", 101.0, "medium"),
      recentRun("2025-10-12", 98.6, "high"),
    ])
  ).toEqual([
    {
      raceDate: "2025-12-28",
      racecourse: "中山",
      netkeibaRaceId: "race-2025-12-28",
      timeIndex: 107.4,
      confidence: "low",
      confidenceLabel: "低",
    },
    {
      raceDate: "2025-11-30",
      racecourse: "中山",
      netkeibaRaceId: "race-2025-11-30",
      timeIndex: 101.0,
      confidence: "medium",
      confidenceLabel: "中",
    },
    {
      raceDate: "2025-10-12",
      racecourse: "中山",
      netkeibaRaceId: "race-2025-10-12",
      timeIndex: 98.6,
      confidence: "high",
      confidenceLabel: "高",
    },
  ])
})

test("配列でない値は空配列として扱う", () => {
  expect(toRecentTimeIndexes(null)).toEqual([])
  expect(toRecentTimeIndexes(undefined)).toEqual([])
  expect(toRecentTimeIndexes("legacy")).toEqual([])
  expect(toRecentTimeIndexes({ race_date: "2025-12-28", time_index: 100 })).toEqual([])
  expect(toRecentTimeIndexes([])).toEqual([])
})

test("指数や信頼度を持たない不正な要素は捨てる", () => {
  expect(
    toRecentTimeIndexes([
      null,
      "legacy",
      42,
      [recentRun("2025-12-28", 100, "high")],
      { ...recentRun("2025-12-28", 100, "high"), time_index: null },
      { ...recentRun("2025-12-28", 100, "high"), time_index: "107" },
      { ...recentRun("2025-12-28", 100, "high"), time_index: Number.NaN },
      { ...recentRun("2025-12-28", 100, "high"), confidence: "unavailable" },
      { ...recentRun("2025-12-28", 100, "high"), confidence: "constructor" },
      { ...recentRun("2025-12-28", 100, "high"), race_date: null },
      recentRun("2025-11-30", 99.5, "medium"),
    ])
  ).toEqual([
    {
      raceDate: "2025-11-30",
      racecourse: "中山",
      netkeibaRaceId: "race-2025-11-30",
      timeIndex: 99.5,
      confidence: "medium",
      confidenceLabel: "中",
    },
  ])
})

test("競馬場やレースIDが欠けていても指数は表示できる", () => {
  expect(
    toRecentTimeIndexes([{ race_date: "2025-12-28", time_index: 105, confidence: "high" }])
  ).toEqual([
    {
      raceDate: "2025-12-28",
      racecourse: "",
      netkeibaRaceId: "",
      timeIndex: 105,
      confidence: "high",
      confidenceLabel: "高",
    },
  ])
})

test("保存順に関わらず新しい走を先頭に並べ、最大5走に絞る", () => {
  const runs = [
    recentRun("2025-08-03", 90, "high"),
    recentRun("2025-12-28", 107, "low"),
    recentRun("2025-07-06", 89, "high"),
    recentRun("2025-10-12", 98, "high"),
    recentRun("2025-11-30", 101, "medium"),
    recentRun("2025-09-14", 95, "high"),
    recentRun("2025-06-01", 88, "high"),
  ]

  const result = toRecentTimeIndexes(runs)

  expect(result).toHaveLength(MAX_RECENT_TIME_INDEXES)
  expect(result.map((item) => item.raceDate)).toEqual([
    "2025-12-28",
    "2025-11-30",
    "2025-10-12",
    "2025-09-14",
    "2025-08-03",
  ])
})

test("toHorseIndicatorLabels は直近指数を持ち、既存の4指標ラベルは変わらない", () => {
  const base = {
    horse_number: 3,
    base_ability: 85,
    condition_fit: 55,
    pace_fit: 30,
    freshness: { days_since_last_race: 21 },
    history_count: 4,
  }

  const withoutColumn = toHorseIndicatorLabels(base)
  const withRuns = toHorseIndicatorLabels({
    ...base,
    time_index_recent: [recentRun("2025-12-28", 107.4, "low")],
  })

  expect(withoutColumn.recentTimeIndexes).toEqual([])
  expect(withRuns.recentTimeIndexes).toEqual([
    {
      raceDate: "2025-12-28",
      racecourse: "中山",
      netkeibaRaceId: "race-2025-12-28",
      timeIndex: 107.4,
      confidence: "low",
      confidenceLabel: "低",
    },
  ])

  for (const labels of [withoutColumn, withRuns]) {
    expect(labels.ability).toEqual({ label: "最上位", level: 0 })
    expect(labels.conditionFit).toEqual({ label: "標準", level: 2 })
    expect(labels.paceFit).toEqual({ label: "やや不利", level: 3 })
    expect(labels.freshness).toEqual({ label: "安定", level: 1 })
    expect(labels.isInsufficient).toBe(false)
  }
})

test("履歴が無い馬は直近指数があっても判断材料不足の判定は変わらない", () => {
  const labels = toHorseIndicatorLabels({
    horse_number: 1,
    base_ability: null,
    condition_fit: null,
    pace_fit: null,
    freshness: null,
    history_count: 0,
    time_index_recent: null,
  })

  expect(labels.isInsufficient).toBe(true)
  expect(labels.recentTimeIndexes).toEqual([])
})
