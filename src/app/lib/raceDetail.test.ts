import { describe, expect, test } from "vitest"
import type { RecentTimeIndex } from "@/app/lib/indicatorLabels"
import {
  agreedTopPick,
  aiMarksForHorse,
  buildBetSummary,
  buildOpenAiMarks,
  buildOriginalMarks,
  buildTimeIndexSparkline,
  buildVerdictRows,
  formatExpectedPace,
  groupBetsForDisplay,
  payoutHitModels,
  resolveSettlement,
  sortPayouts,
  sortResults,
  timeIndexTone,
  topResults,
} from "./raceDetail"

describe("印の決定", () => {
  test("独自予想は score 降順で上位4頭。同点は馬番が小さい方が上", () => {
    const marks = buildOriginalMarks([
      { horse_number: 9, score: 70 },
      { horse_number: 3, score: 70 },
      { horse_number: 5, score: 90 },
      { horse_number: 12, score: 60 },
      { horse_number: 1, score: 10 },
    ])
    expect([...marks.entries()]).toEqual([
      [5, "◎"],
      [3, "○"],
      [9, "▲"],
      [12, "△"],
    ])
    expect(marks.has(1)).toBe(false)
  })

  test("3頭しか無ければ3つだけ", () => {
    const marks = buildOriginalMarks([
      { horse_number: 1, score: 3 },
      { horse_number: 2, score: 2 },
      { horse_number: 3, score: 1 },
    ])
    expect(marks.size).toBe(3)
    expect(marks.get(3)).toBe("▲")
  })

  test("OpenAI は rank 1〜4 だけ。5位以降は印なし", () => {
    const marks = buildOpenAiMarks([
      { horseNumber: 5, rank: 1 },
      { horseNumber: 3, rank: 2 },
      { horseNumber: 14, rank: 3 },
      { horseNumber: 12, rank: 4 },
      { horseNumber: 8, rank: 5 },
    ])
    expect(marks.get(5)).toBe("◎")
    expect(marks.get(12)).toBe("△")
    expect(marks.has(8)).toBe(false)
  })

  test("本命一致は両方の◎が同じ馬番のとき", () => {
    const original = buildOriginalMarks([{ horse_number: 5, score: 90 }, { horse_number: 3, score: 80 }])
    expect(agreedTopPick(original, buildOpenAiMarks([{ horseNumber: 5, rank: 1 }]))).toBe(5)
    expect(agreedTopPick(original, buildOpenAiMarks([{ horseNumber: 3, rank: 1 }]))).toBeNull()
    expect(agreedTopPick(original, buildOpenAiMarks([]))).toBeNull()
  })

  test("結果表の AI印 の文言", () => {
    const original = buildOriginalMarks([{ horse_number: 5, score: 90 }, { horse_number: 3, score: 80 }])
    const openAi = buildOpenAiMarks([{ horseNumber: 3, rank: 1 }])
    expect(aiMarksForHorse(5, original, openAi)).toBe("独自◎")
    expect(aiMarksForHorse(3, original, openAi)).toBe("独自○ OpenAI◎")
    expect(aiMarksForHorse(9, original, openAi)).toBe("")
  })
})

describe("buildVerdictRows", () => {
  const entries = [
    { horse_number: 5, bracket_number: 3, HorseMaster: { name: "ハヤテノシンゲン" } },
    { horse_number: 3, bracket_number: 2, HorseMaster: null },
  ]
  const indicators = [{ horseNumber: 5, ability: { label: "最上位", level: 0 } }]

  test("◎○▲△ の順に馬名・枠番・地力を付ける", () => {
    const marks = buildOriginalMarks([
      { horse_number: 3, score: 80 },
      { horse_number: 5, score: 90 },
      { horse_number: 7, score: 70 },
    ])
    const rows = buildVerdictRows(marks, entries, indicators)
    expect(rows.map((row) => row.mark)).toEqual(["◎", "○", "▲"])
    expect(rows[0]).toEqual({ mark: "◎", horseNumber: 5, bracketNumber: 3, horseName: "ハヤテノシンゲン", abilityLabel: "最上位" })
    expect(rows[1]).toEqual({ mark: "○", horseNumber: 3, bracketNumber: 2, horseName: null, abilityLabel: null })
    expect(rows[2].bracketNumber).toBeNull()
  })

  test("印が無ければ空", () => {
    expect(buildVerdictRows(new Map(), entries, indicators)).toEqual([])
  })
})

describe("buildTimeIndexSparkline", () => {
  const run = (raceDate: string, timeIndex: number, confidenceLabel = "高"): RecentTimeIndex => ({
    raceDate,
    racecourse: "東京",
    netkeibaRaceId: raceDate,
    timeIndex,
    confidence: "high",
    confidenceLabel,
  })

  test("走が無ければ null", () => {
    expect(buildTimeIndexSparkline([])).toBeNull()
  })

  test("新しい順の配列を古い順に並べ、右端が最新になる", () => {
    const spark = buildTimeIndexSparkline([run("2026-09-20", 105, "中"), run("2026-08-01", 98), run("2026-07-01", 96)])
    expect(spark).not.toBeNull()
    expect(spark?.ariaLabel).toBe("直近3走のタイム指数（古い順） 96、98、105")
    expect(spark?.last.value).toBe(105)
    expect(spark?.last.confidenceLabel).toBe("中")
    expect(spark?.last.x).toBe(80)
    expect(spark?.points.split(" ")).toHaveLength(3)
    expect(spark?.points.startsWith("4,")).toBe(true)
  })

  test("1走なら右端の点だけ", () => {
    const spark = buildTimeIndexSparkline([run("2026-09-20", 100)])
    expect(spark?.points).toBe("80,15")
    expect(spark?.last).toMatchObject({ x: 80, y: 15, value: 100 })
    expect(spark?.baselineY).toBe(15)
  })

  test("値と100を含む範囲に収まり、最新が最も高ければ上端に近い", () => {
    const spark = buildTimeIndexSparkline([run("2026-09-20", 110), run("2026-08-01", 90)])
    expect(spark?.last.y).toBe(5)
    expect(spark?.baselineY).toBe(15)
  })

  test("指数の色分け", () => {
    expect(timeIndexTone(105)).toBe("primary")
    expect(timeIndexTone(104.9)).toBe("foreground")
    expect(timeIndexTone(95)).toBe("foreground")
    expect(timeIndexTone(94.9)).toBe("slow")
  })
})

describe("結果と払戻の並び", () => {
  test("着順は数値昇順、同着は馬番昇順、数値でないものは末尾", () => {
    const sorted = sortResults([
      { rank: "3", horse_number: 7 },
      { rank: "中止", horse_number: 2 },
      { rank: "1", horse_number: 9 },
      { rank: "2", horse_number: 4 },
      { rank: "2", horse_number: 1 },
    ])
    expect(sorted.map((r) => `${r.rank}:${r.horse_number}`)).toEqual(["1:9", "2:1", "2:4", "3:7", "中止:2"])
    expect(topResults(sorted, 2).map((r) => r.horse_number)).toEqual([9, 1])
  })

  test("券種は定番順、未知は末尾、同種は元の順", () => {
    const sorted = sortPayouts([
      { bet_type: "ワイド", numbers: "3-5" },
      { bet_type: "単勝", numbers: "5" },
      { bet_type: "謎", numbers: "1" },
      { bet_type: "複勝", numbers: "5" },
      { bet_type: "ワイド", numbers: "5-7" },
    ])
    expect(sorted.map((p) => `${p.bet_type}:${p.numbers}`)).toEqual(["単勝:5", "複勝:5", "ワイド:3-5", "ワイド:5-7", "謎:1"])
  })

  test("払戻行を AI が買って的中したモデル。ワイドは順不同", () => {
    const original = [{ bet_type: "ワイド", numbers: "5-3", bet: 100 }]
    const openAi = [{ bet_type: "複勝", numbers: "5", bet: 400 }, { bet_type: "ワイド", numbers: "3-5", bet: 100 }]
    expect(payoutHitModels({ bet_type: "ワイド", numbers: "3-5", payout: 690 }, original, openAi)).toEqual(["original", "openai"])
    expect(payoutHitModels({ bet_type: "複勝", numbers: "5", payout: 150 }, original, openAi)).toEqual(["openai"])
    expect(payoutHitModels({ bet_type: "単勝", numbers: "5", payout: 380 }, original, openAi)).toEqual([])
  })
})

describe("推奨馬券のまとめ", () => {
  const bets = [
    { bet_type: "複勝", numbers: "5", bet: 400, payout: 600 },
    { bet_type: "複勝", numbers: "3", bet: 300, payout: 0 },
    { bet_type: "ワイド", numbers: "3-5", bet: 100, payout: 690 },
  ]

  test("確定後は払戻・収支・回収率・的中を出す", () => {
    expect(buildBetSummary(bets, true)).toEqual({ investment: 800, payout: 1290, profit: 490, returnRate: 161.25, isHit: true })
  })

  test("確定前は投資だけ", () => {
    expect(buildBetSummary(bets, false)).toEqual({ investment: 800, payout: null, profit: null, returnRate: null, isHit: false })
  })

  test("的中なし", () => {
    const summary = buildBetSummary([{ bet_type: "複勝", numbers: "5", bet: 400, payout: 0 }], true)
    expect(summary).toMatchObject({ payout: 0, profit: -400, returnRate: 0, isHit: false })
  })

  test("複勝 → ワイドBOX の順にまとめ、複勝は購入額の大きい順", () => {
    const groups = groupBetsForDisplay([
      { bet_type: "ワイド", numbers: "3-5", bet: 100, payout: 0 },
      { bet_type: "複勝", numbers: "3", bet: 300, payout: 0 },
      { bet_type: "複勝", numbers: "5", bet: 400, payout: 600 },
    ])
    expect(groups.map((g) => g.type)).toEqual(["複勝", "ワイドBOX"])
    expect(groups[0].items.map((i) => i.numbers)).toEqual([[5], [3]])
    expect(groups[1].items[0]).toEqual({ numbers: [3, 5], bet: 100, payout: 0 })
  })
})

describe("想定ペースと状態", () => {
  test("想定ペース", () => {
    expect(formatExpectedPace("ミドル")).toEqual({ label: "ミドル", muted: false })
    expect(formatExpectedPace("データ不足")).toEqual({ label: "データ不足", muted: true })
    expect(formatExpectedPace(null)).toEqual({ label: "—", muted: true })
  })

  test("確定 / 発走済 / 発走前", () => {
    const nowStored = new Date("2026-10-10T13:10:00Z")
    expect(resolveSettlement({ race_time: new Date("2026-10-10T09:50:00Z"), payoutCount: 3 }, nowStored)).toBe("settled")
    expect(resolveSettlement({ race_time: new Date("2026-10-10T13:10:00Z"), payoutCount: 0 }, nowStored)).toBe("started")
    expect(resolveSettlement({ race_time: new Date("2026-10-10T15:45:00Z"), payoutCount: 0 }, nowStored)).toBe("upcoming")
    expect(resolveSettlement({ race_time: null, payoutCount: 0 }, nowStored)).toBe("upcoming")
  })
})
