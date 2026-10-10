import { describe, expect, test } from "vitest"
import {
  type HorsePredictionRankSource,
  pickLatestLogicVersion,
  toHorsePredictionRanks,
} from "./horsePredictionRanks"

const row = (
  horseNumber: number,
  rank: number | null,
  logicVersion: string,
  generatedAt: string,
): HorsePredictionRankSource => ({
  horse_number: horseNumber,
  rank,
  logic_version: logicVersion,
  generated_at: new Date(generatedAt),
  created_at: new Date("2026-01-01T00:00:00Z"),
})

describe("pickLatestLogicVersion", () => {
  test("最も新しく生成された行と同じ logic_version だけ残す", () => {
    const rows = [
      row(1, 1, "v1", "2026-10-01T00:00:00Z"),
      row(2, 2, "v1", "2026-10-01T00:00:00Z"),
      row(1, 2, "v2", "2026-10-02T00:00:00Z"),
      row(2, 1, "v2", "2026-10-02T00:00:00Z"),
    ]
    expect(pickLatestLogicVersion(rows).map((r) => r.logic_version)).toEqual(["v2", "v2"])
  })

  test("generated_at が無ければ created_at で比べる", () => {
    const older = { ...row(1, 1, "v1", "2026-10-01T00:00:00Z"), generated_at: null, created_at: new Date("2026-10-01T00:00:00Z") }
    const newer = { ...row(1, 1, "v2", "2026-10-01T00:00:00Z"), generated_at: null, created_at: new Date("2026-10-03T00:00:00Z") }
    expect(pickLatestLogicVersion([older, newer]).map((r) => r.logic_version)).toEqual(["v2"])
  })

  test("空配列はそのまま", () => {
    expect(pickLatestLogicVersion([])).toEqual([])
  })
})

describe("toHorsePredictionRanks", () => {
  test("rank が null か 0 以下の馬を除き、rank → 馬番の順に並べる", () => {
    const rows = [
      row(5, 2, "v1", "2026-10-01T00:00:00Z"),
      row(3, null, "v1", "2026-10-01T00:00:00Z"),
      row(8, 0, "v1", "2026-10-01T00:00:00Z"),
      row(2, 1, "v1", "2026-10-01T00:00:00Z"),
      row(1, 2, "v1", "2026-10-01T00:00:00Z"),
    ]
    expect(toHorsePredictionRanks(rows)).toEqual([
      { horseNumber: 2, rank: 1 },
      { horseNumber: 1, rank: 2 },
      { horseNumber: 5, rank: 2 },
    ])
  })

  test("古い logic_version の順位は使わない", () => {
    const rows = [
      row(1, 1, "v1", "2026-10-01T00:00:00Z"),
      row(2, 1, "v2", "2026-10-02T00:00:00Z"),
    ]
    expect(toHorsePredictionRanks(rows)).toEqual([{ horseNumber: 2, rank: 1 }])
  })
})
