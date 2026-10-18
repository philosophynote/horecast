import { describe, expect, test } from "vitest"
import {
  type RaceListSource,
  buildRaceDaySummary,
  buildRaceListResponse,
  countCourseTypes,
  findNextRaceIds,
  formatCourseTypeCounts,
  formatRaceClock,
  formatRaceDateHeading,
  formatRaceDateMonthDay,
  isPickupRace,
  nowAsStoredClock,
  parseRaceDateParam,
  pickDefaultDate,
  raceDayRange,
  resolveRaceStatus,
  toRaceListItem,
  weekdayOf,
} from "./raceList"

const indicator = (
  horseNumber: number,
  rank: number | null,
  overrides: Partial<RaceListSource["horse_indicators"][number]> = {},
): RaceListSource["horse_indicators"][number] => ({
  horse_number: horseNumber,
  rank,
  logic_version: "v1",
  generated_at: new Date("2026-10-09T00:00:00Z"),
  created_at: new Date("2026-10-09T00:00:00Z"),
  base_ability: 90,
  condition_fit: 70,
  history_count: 5,
  time_index_recent: [
    { race_date: "2026-09-20", racecourse: "東京", netkeiba_race_id: "1", time_index: 105.4, confidence: "high" },
    { race_date: "2026-08-01", racecourse: "東京", netkeiba_race_id: "2", time_index: 98.1, confidence: "medium" },
  ],
  ...overrides,
})

const race = (overrides: Partial<RaceListSource> = {}): RaceListSource => ({
  id: 1,
  track: "東京",
  number: 11,
  name: "秋陽ステークス",
  course_type: "芝",
  distance: 1800,
  race_time: new Date("2026-10-10T15:45:00Z"),
  entries: [
    { horse_number: 3, bracket_number: 2, HorseMaster: { name: "アキツシマ" } },
    { horse_number: 5, bracket_number: 3, HorseMaster: { name: "ハヤテノシンゲン" } },
    { horse_number: 9, bracket_number: 5, HorseMaster: { name: "オボロヅキ" } },
  ],
  predicts: [
    { horse_number: 3, score: 60 },
    { horse_number: 5, score: 85 },
    { horse_number: 9, score: 40 },
  ],
  horse_indicators: [indicator(5, 1), indicator(3, 2), indicator(9, 3)],
  recommended_bets: [
    { bet_type: "複勝", numbers: "5", bet: 400 },
    { bet_type: "複勝", numbers: "3", bet: 300 },
    { bet_type: "ワイド", numbers: "3-5", bet: 100 },
  ],
  payouts: [],
  ...overrides,
})

describe("toRaceListItem の◎", () => {
  test("独自予想は score 最大、OpenAI は rank 1。馬名と枠番は出走表から引く", () => {
    const { item } = toRaceListItem(race())
    expect(item.originalPick).toEqual({ horseNumber: 5, bracketNumber: 3, horseName: "ハヤテノシンゲン" })
    expect(item.openAiPick).toEqual({ horseNumber: 5, bracketNumber: 3, horseName: "ハヤテノシンゲン" })
    expect(item.hasPrediction).toBe(true)
  })

  test("score が同点なら馬番が小さい方", () => {
    const { item } = toRaceListItem(race({ predicts: [{ horse_number: 9, score: 80 }, { horse_number: 3, score: 80 }] }))
    expect(item.originalPick?.horseNumber).toBe(3)
  })

  test("Predict が無ければ独自予想は null。OpenAI だけでも生成済み扱い", () => {
    const { item } = toRaceListItem(race({ predicts: [] }))
    expect(item.originalPick).toBeNull()
    expect(item.openAiPick?.horseNumber).toBe(5)
    expect(item.hasPrediction).toBe(true)
  })

  test("HorseIndicator が無い、または rank が全部 null なら OpenAI は null", () => {
    expect(toRaceListItem(race({ horse_indicators: [] })).item.openAiPick).toBeNull()
    expect(
      toRaceListItem(race({ horse_indicators: [indicator(5, null), indicator(3, null)] })).item.openAiPick,
    ).toBeNull()
  })

  test("どちらも無ければ予想未生成", () => {
    const { item } = toRaceListItem(race({ predicts: [], horse_indicators: [] }))
    expect(item.hasPrediction).toBe(false)
    expect(item.pickup).toBeNull()
  })

  test("古い logic_version の rank 1 は使わない", () => {
    const { item } = toRaceListItem(
      race({
        horse_indicators: [
          indicator(9, 1, { logic_version: "v0", generated_at: new Date("2026-10-01T00:00:00Z") }),
          indicator(3, 1, { logic_version: "v1", generated_at: new Date("2026-10-09T00:00:00Z") }),
        ],
      }),
    )
    expect(item.openAiPick?.horseNumber).toBe(3)
  })

  test("出走表に無い馬番でも馬番だけは返す", () => {
    const { item } = toRaceListItem(race({ entries: [] }))
    expect(item.originalPick).toEqual({ horseNumber: 5, bracketNumber: null, horseName: null })
  })
})

describe("toRaceListItem の推奨馬券と確定", () => {
  test("未確定なら payout 0・不的中・統計なし", () => {
    const { item, statistics } = toRaceListItem(race())
    expect(item.isSettled).toBe(false)
    expect(item.bet).toEqual({ investment: 800, payout: 0, isHit: false })
    expect(statistics).toBeNull()
  })

  test("確定して的中すると払戻を合計する", () => {
    const { item, statistics } = toRaceListItem(
      race({
        payouts: [
          { bet_type: "複勝", numbers: "5", payout: 150 },
          { bet_type: "ワイド", numbers: "5-3", payout: 420 },
        ],
      }),
    )
    expect(item.isSettled).toBe(true)
    // 複勝5: 150/100*400 = 600, ワイド3-5: 420/100*100 = 420
    expect(item.bet).toEqual({ investment: 800, payout: 1020, isHit: true })
    expect(statistics?.totalReturn).toBe(1020)
  })

  test("払戻が投資を下回っても1点当たれば的中", () => {
    const { item } = toRaceListItem(race({ payouts: [{ bet_type: "複勝", numbers: "3", payout: 110 }] }))
    expect(item.bet).toEqual({ investment: 800, payout: 330, isHit: true })
  })

  test("確定して全部外れると不的中", () => {
    const { item } = toRaceListItem(race({ payouts: [{ bet_type: "複勝", numbers: "9", payout: 300 }] }))
    expect(item.bet).toEqual({ investment: 800, payout: 0, isHit: false })
  })

  test("推奨馬券が無ければ bet は null", () => {
    const { item, statistics } = toRaceListItem(
      race({ recommended_bets: [], payouts: [{ bet_type: "複勝", numbers: "9", payout: 300 }] }),
    )
    expect(item.bet).toBeNull()
    expect(item.isSettled).toBe(true)
    expect(statistics).toBeNull()
  })
})

describe("toRaceListItem の pickup", () => {
  test("両モデルの◎が一致したときだけ指標を付ける", () => {
    const { item } = toRaceListItem(race())
    expect(item.pickup?.ability.label).toBe("最上位")
    expect(item.pickup?.conditionFit.label).toBe("やや高い")
    expect(item.pickup?.recentTimeIndex).toBe(105.4)
  })

  test("◎が違えば null", () => {
    const { item } = toRaceListItem(race({ horse_indicators: [indicator(3, 1), indicator(5, 2)] }))
    expect(item.pickup).toBeNull()
  })

  test("直近走が無ければ recentTimeIndex は null", () => {
    const { item } = toRaceListItem(race({ horse_indicators: [indicator(5, 1, { time_index_recent: null })] }))
    expect(item.pickup?.recentTimeIndex).toBeNull()
  })
})

describe("buildRaceDaySummary", () => {
  test("生成済み・確定済みの件数と独自予想の成績をまとめる", () => {
    const builds = [
      toRaceListItem(race({ id: 1, payouts: [{ bet_type: "複勝", numbers: "5", payout: 150 }] })),
      toRaceListItem(race({ id: 2, payouts: [{ bet_type: "複勝", numbers: "9", payout: 300 }] })),
      toRaceListItem(race({ id: 3 })),
      toRaceListItem(race({ id: 4, predicts: [], horse_indicators: [] })),
    ]
    const summary = buildRaceDaySummary(builds)
    expect(summary.totalRaces).toBe(4)
    expect(summary.predictedRaces).toBe(3)
    expect(summary.settledRaces).toBe(2)
    expect(summary.original).toEqual({ investment: 1600, payout: 600, returnRate: 37.5, profit: -1000 })
  })

  test("確定済みのレースが無ければ original は null", () => {
    expect(buildRaceDaySummary([toRaceListItem(race())]).original).toBeNull()
  })

  test("buildRaceListResponse は date を yyyy-MM-dd にする", () => {
    const response = buildRaceListResponse(new Date("2026-10-10T00:00:00Z"), [race()])
    expect(response.date).toBe("2026-10-10")
    expect(response.races).toHaveLength(1)
    expect(response.summary.totalRaces).toBe(1)
  })
})

describe("日付のパラメータと範囲", () => {
  test("yyyy-MM-dd だけを受け付ける", () => {
    expect(parseRaceDateParam("2026-10-10")?.toISOString()).toBe("2026-10-10T00:00:00.000Z")
    expect(parseRaceDateParam("2026-13-45")).toBeNull()
    expect(parseRaceDateParam("2026-02-30")).toBeNull()
    expect(parseRaceDateParam("2026-10-10T00:00:00Z")).toBeNull()
    expect(parseRaceDateParam("")).toBeNull()
    expect(parseRaceDateParam(null)).toBeNull()
  })

  test("raceDayRange は UTC の1日", () => {
    const { start, end } = raceDayRange(new Date("2026-10-10T13:00:00Z"))
    expect(start.toISOString()).toBe("2026-10-10T00:00:00.000Z")
    expect(end.toISOString()).toBe("2026-10-10T23:59:59.999Z")
  })

  test("nowAsStoredClock は 9 時間進める", () => {
    expect(nowAsStoredClock(new Date("2026-10-10T01:10:00Z")).toISOString()).toBe("2026-10-10T10:10:00.000Z")
  })

  test("整形", () => {
    expect(weekdayOf("2026-10-10")).toBe("土")
    expect(formatRaceDateHeading("2026-10-10")).toBe("2026年10月10日（土）")
    expect(formatRaceDateMonthDay("2026-10-10")).toBe("10月10日（土）")
    expect(formatRaceClock("2026-10-10T09:50:00.000Z")).toBe("09:50")
    expect(formatRaceClock(null)).toBe("--:--")
  })
})

describe("resolveRaceStatus", () => {
  const nowStored = new Date("2026-10-10T13:10:00Z")
  const base = { raceTime: "2026-10-10T15:45:00.000Z" }

  test("確定済みは的中・不的中・推奨馬券なし", () => {
    expect(resolveRaceStatus({ ...base, isSettled: true, bet: { investment: 800, payout: 1020, isHit: true } }, { nowStored, isNext: false })).toBe("hit")
    expect(resolveRaceStatus({ ...base, isSettled: true, bet: { investment: 800, payout: 0, isHit: false } }, { nowStored, isNext: false })).toBe("miss")
    expect(resolveRaceStatus({ ...base, isSettled: true, bet: null }, { nowStored, isNext: false })).toBe("settled")
  })

  test("未確定で発走済みなら started", () => {
    expect(resolveRaceStatus({ raceTime: "2026-10-10T13:10:00.000Z", isSettled: false, bet: null }, { nowStored, isNext: true })).toBe("started")
  })

  test("未確定で発走前は next か upcoming", () => {
    expect(resolveRaceStatus({ ...base, isSettled: false, bet: null }, { nowStored, isNext: true })).toBe("next")
    expect(resolveRaceStatus({ ...base, isSettled: false, bet: null }, { nowStored, isNext: false })).toBe("upcoming")
  })
})

describe("findNextRaceIds", () => {
  const nowStored = new Date("2026-10-10T13:10:00Z")
  const item = (id: number, track: string, time: string, isSettled = false) => ({
    id,
    track,
    isSettled,
    raceTime: `2026-10-10T${time}:00.000Z`,
  })

  test("競馬場ごとに未確定で現在より後の最も早いレース", () => {
    const items = [
      item(1, "東京", "12:40", true),
      item(2, "京都", "12:55"),
      item(3, "東京", "13:15"),
      item(4, "京都", "13:30"),
      item(5, "東京", "13:50"),
    ]
    expect(findNextRaceIds(items, nowStored)).toEqual(new Set([3, 4]))
  })

  test("表示している日が今日でなければ空", () => {
    const items = [{ id: 1, track: "東京", isSettled: false, raceTime: "2026-10-11T10:00:00.000Z" }]
    expect(findNextRaceIds(items, nowStored)).toEqual(new Set())
  })
})

describe("isPickupRace", () => {
  const nowStored = new Date("2026-10-10T13:10:00Z")
  const pickup = { ability: { label: "最上位", level: 0 }, conditionFit: { label: "高い", level: 0 }, recentTimeIndex: 105 }

  test("本命一致かつ発走前だけ", () => {
    expect(isPickupRace({ pickup, isSettled: false, raceTime: "2026-10-10T15:45:00.000Z" }, nowStored)).toBe(true)
    expect(isPickupRace({ pickup, isSettled: false, raceTime: "2026-10-10T12:00:00.000Z" }, nowStored)).toBe(false)
    expect(isPickupRace({ pickup, isSettled: true, raceTime: "2026-10-10T15:45:00.000Z" }, nowStored)).toBe(false)
    expect(isPickupRace({ pickup: null, isSettled: false, raceTime: "2026-10-10T15:45:00.000Z" }, nowStored)).toBe(false)
  })
})

describe("pickDefaultDate", () => {
  const dates = ["2026-10-12", "2026-10-11", "2026-10-05", "2026-10-04"]

  test("今日があれば今日", () => {
    expect(pickDefaultDate(dates, "2026-10-11")).toBe("2026-10-11")
  })

  test("無ければ最も近い日。同点は未来側", () => {
    expect(pickDefaultDate(dates, "2026-10-09")).toBe("2026-10-11")
    expect(pickDefaultDate(dates, "2026-10-08")).toBe("2026-10-11")
    expect(pickDefaultDate(dates, "2026-10-06")).toBe("2026-10-05")
  })

  test("空なら null", () => {
    expect(pickDefaultDate([], "2026-10-10")).toBeNull()
  })
})

describe("countCourseTypes", () => {
  test("芝・ダート・障害を数えて文言にする", () => {
    const counts = countCourseTypes([
      { courseType: "芝" },
      { courseType: "ダート" },
      { courseType: "芝" },
      { courseType: "障害" },
    ])
    expect(counts).toEqual({ turf: 2, dirt: 1, jump: 1, other: 0 })
    expect(formatCourseTypeCounts(counts)).toBe("芝 2 · ダ 1 · 障 1")
    expect(formatCourseTypeCounts({ turf: 3, dirt: 0, jump: 0, other: 0 })).toBe("芝 3")
  })
})
