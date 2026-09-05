import { expect, test } from "vitest"
import { parseRacePredictionWarnings } from "./racePredictionCommentWarnings"

test("構造化されたwarningsを画面表示用の型へ変換できる", () => {
  expect(
    parseRacePredictionWarnings([
      {
        code: "missing_recent_races",
        message: "近走データが不足しています",
        horse_number: "7",
      },
    ])
  ).toEqual([
    {
      code: "missing_recent_races",
      message: "近走データが不足しています",
      horseNumber: "7",
    },
  ])
})

test("空配列は空のwarningsとして扱う", () => {
  expect(parseRacePredictionWarnings([])).toEqual([])
})

test("不正なJSON要素は画面へ表示しない", () => {
  expect(
    parseRacePredictionWarnings([null, "legacy", { code: "no_message" }])
  ).toEqual([])
})
