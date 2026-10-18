import { describe, expect, test } from "vitest"
import {
  buildFallbackConditions,
  formatConditionLabel,
  formatRate,
  isJockeyRecordTarget,
  selectJockeyRecordLabel,
  toDistanceBand,
  toJockeyRecordLabels,
  type JockeyRecordRow,
} from "./jockeyRecordLabels"

const race = { racecourse: "東京", surface: "ダート", distanceBand: "短距離" }

const row = (
  condition: Partial<JockeyRecordRow>,
  counts: { rides: number; wins?: number; seconds?: number; thirds?: number }
): JockeyRecordRow => ({
  jockeyMasterId: 1,
  racecourse: "東京",
  surface: "ダート",
  distanceBand: "短距離",
  wins: 0,
  seconds: 0,
  thirds: 0,
  ...counts,
  ...condition,
})

describe("toDistanceBand", () => {
  test("predictor と同じ境界で距離帯を判定する", () => {
    expect(toDistanceBand(1000)).toBe("短距離")
    expect(toDistanceBand(1400)).toBe("短距離")
    expect(toDistanceBand(1401)).toBe("マイル")
    expect(toDistanceBand(1800)).toBe("マイル")
    expect(toDistanceBand(1801)).toBe("中距離")
    expect(toDistanceBand(2200)).toBe("中距離")
    expect(toDistanceBand(2201)).toBe("長距離")
    expect(toDistanceBand(3600)).toBe("長距離")
  })
})

test("障害レースだけ表示対象から外す", () => {
  expect(isJockeyRecordTarget("芝")).toBe(true)
  expect(isJockeyRecordTarget("ダート")).toBe(true)
  expect(isJockeyRecordTarget("障害")).toBe(false)
})

test("落とし先は 距離帯 → 芝ダ → 競馬場 の順に all へ広げる", () => {
  expect(buildFallbackConditions(race)).toEqual([
    { racecourse: "東京", surface: "ダート", distanceBand: "短距離" },
    { racecourse: "東京", surface: "ダート", distanceBand: "all" },
    { racecourse: "東京", surface: "all", distanceBand: "all" },
    { racecourse: "all", surface: "all", distanceBand: "all" },
  ])
})

describe("selectJockeyRecordLabel", () => {
  test("レースの条件で騎乗数が足りれば、その行から勝率と複勝率を計算する", () => {
    const label = selectJockeyRecordLabel(
      1,
      [
        row({}, { rides: 351, wins: 54, seconds: 45, thirds: 35 }),
        row({ distanceBand: "all" }, { rides: 818, wins: 115, seconds: 99, thirds: 77 }),
      ],
      race
    )

    expect(label).toMatchObject({
      status: "ready",
      rides: 351,
      isFallback: false,
      conditionLabel: "東京・ダート・短距離",
    })
    if (label.status !== "ready") throw new Error("unreachable")
    expect(label.winRate).toBeCloseTo(54 / 351)
    expect(label.placeRate).toBeCloseTo(134 / 351)
  })

  test("騎乗数が20未満なら距離帯を all にした行へ落とし、落とした印を付ける", () => {
    const label = selectJockeyRecordLabel(
      1,
      [
        row({}, { rides: 19, wins: 5 }),
        row({ distanceBand: "all" }, { rides: 40, wins: 4, seconds: 2, thirds: 2 }),
      ],
      race
    )

    expect(label).toMatchObject({
      status: "ready",
      rides: 40,
      isFallback: true,
      condition: { racecourse: "東京", surface: "ダート", distanceBand: "all" },
      conditionLabel: "東京・ダート・全距離",
    })
  })

  test("ちょうど20騎乗なら落とさない", () => {
    const label = selectJockeyRecordLabel(
      1,
      [row({}, { rides: 20, wins: 1 }), row({ distanceBand: "all" }, { rides: 100 })],
      race
    )

    expect(label).toMatchObject({ status: "ready", rides: 20, isFallback: false })
  })

  test("行が無い段階は飛ばして、次に足りた段階を使う", () => {
    // 距離帯 all の行が欠けていても、芝ダ all の行で足りればそれを使う
    const label = selectJockeyRecordLabel(
      1,
      [
        row({}, { rides: 3 }),
        row({ surface: "all", distanceBand: "all" }, { rides: 25, wins: 5 }),
        row({ racecourse: "all", surface: "all", distanceBand: "all" }, { rides: 900, wins: 90 }),
      ],
      race
    )

    expect(label).toMatchObject({
      status: "ready",
      rides: 25,
      isFallback: true,
      conditionLabel: "東京・芝ダ・全距離",
    })
  })

  test("全競馬場まで落とすと全競馬場・芝ダ・全距離と表示する", () => {
    const label = selectJockeyRecordLabel(
      1,
      [row({ racecourse: "all", surface: "all", distanceBand: "all" }, { rides: 30, wins: 3 })],
      race
    )

    expect(label).toMatchObject({
      status: "ready",
      isFallback: true,
      conditionLabel: "全競馬場・芝ダ・全距離",
    })
  })

  test("all/all/all でも20未満ならデータ不足として率を出さない", () => {
    const label = selectJockeyRecordLabel(
      1,
      [
        row({}, { rides: 2 }),
        row({ racecourse: "all", surface: "all", distanceBand: "all" }, { rides: 19, wins: 19 }),
      ],
      race
    )

    expect(label).toEqual({ jockeyMasterId: 1, status: "insufficient" })
  })

  test("集計行が1つも無い騎手はデータなし", () => {
    // 他の騎手の行しか無い場合も同じ
    const label = selectJockeyRecordLabel(1, [row({ jockeyMasterId: 2 }, { rides: 500 })], race)

    expect(label).toEqual({ jockeyMasterId: 1, status: "none" })
  })
})

test("toJockeyRecordLabels は出走馬の騎手ごとに1件ずつ、重複IDはまとめる", () => {
  const labels = toJockeyRecordLabels(
    [1, 2, 1],
    [row({}, { rides: 100, wins: 10 }), row({ jockeyMasterId: 2 }, { rides: 5 })],
    race
  )

  expect(labels.map((label) => [label.jockeyMasterId, label.status])).toEqual([
    [1, "ready"],
    [2, "insufficient"],
  ])
})

test("formatConditionLabel / formatRate の表示文言", () => {
  expect(formatConditionLabel({ racecourse: "中山", surface: "芝", distanceBand: "マイル" })).toBe(
    "中山・芝・マイル"
  )
  expect(formatRate(0)).toBe("0.0%")
  expect(formatRate(54 / 351)).toBe("15.4%")
  expect(formatRate(1)).toBe("100.0%")
})
