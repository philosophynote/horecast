import assert from "node:assert/strict"
import test from "node:test"
import { parseRacePredictionWarnings } from "./racePredictionCommentWarnings"

test("構造化されたwarningsを画面表示用の型へ変換できる", () => {
  assert.deepEqual(
    parseRacePredictionWarnings([
      {
        code: "missing_recent_races",
        message: "近走データが不足しています",
        horse_number: "7",
      },
    ]),
    [
      {
        code: "missing_recent_races",
        message: "近走データが不足しています",
        horseNumber: "7",
      },
    ]
  )
})

test("空配列は空のwarningsとして扱う", () => {
  assert.deepEqual(parseRacePredictionWarnings([]), [])
})

test("不正なJSON要素は画面へ表示しない", () => {
  assert.deepEqual(
    parseRacePredictionWarnings([null, "legacy", { code: "no_message" }]),
    []
  )
})
