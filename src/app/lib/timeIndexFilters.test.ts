import { describe, expect, it } from "vitest"
import {
  DEFAULT_PERIOD_DAYS,
  HISTOGRAM_BIN_COUNT,
  HISTOGRAM_MAX,
  HISTOGRAM_MIN,
  buildTimeIndexWhere,
  buildTimeIndexWhereSql,
  formatRaceTime,
  parseTimeIndexSearchParams,
  raceNumberFromNetkeibaRaceId,
  resolvePeriod,
  sortByKnownOrder,
  timeIndexHref,
  toHistogramBins,
  toTimeIndexSearchParams,
  type TimeIndexFilter,
} from "./timeIndexFilters"

const emptyFilter: TimeIndexFilter = { page: 1 }

describe("parseTimeIndexSearchParams", () => {
  it("読み取れる値をそのまま条件にする", () => {
    const filter = parseTimeIndexSearchParams({
      racecourse: "東京",
      surface: "芝",
      distance: "1600",
      class: "3勝クラス",
      going: "良",
      confidence: "high",
      version: "v1",
      start: "2026-09-01",
      end: "2026-09-20",
      horse: " テスト馬 ",
      page: "3",
    })
    expect(filter).toEqual({
      racecourse: "東京",
      surface: "芝",
      distance: 1600,
      className: "3勝クラス",
      going: "良",
      confidence: "high",
      version: "v1",
      startDate: "2026-09-01",
      endDate: "2026-09-20",
      horse: "テスト馬",
      page: 3,
    })
  })

  it("不正な値は未指定として扱う", () => {
    const filter = parseTimeIndexSearchParams({
      distance: "abc",
      confidence: "very-high",
      start: "2026-13-40",
      end: "not-a-date",
      page: "0",
    })
    expect(filter.distance).toBeUndefined()
    expect(filter.confidence).toBeUndefined()
    expect(filter.startDate).toBeUndefined()
    expect(filter.endDate).toBeUndefined()
    expect(filter.page).toBe(1)
  })

  it("開始日が終了日より後なら期間を捨てる", () => {
    const filter = parseTimeIndexSearchParams({ start: "2026-09-20", end: "2026-09-01" })
    expect(filter.startDate).toBeUndefined()
    expect(filter.endDate).toBeUndefined()
  })

  it("同じキーが複数あれば先頭を使い、空文字は未指定にする", () => {
    const filter = parseTimeIndexSearchParams({ racecourse: ["中山", "東京"], surface: "" })
    expect(filter.racecourse).toBe("中山")
    expect(filter.surface).toBeUndefined()
  })
})

describe("toTimeIndexSearchParams / timeIndexHref", () => {
  it("parse と往復できる", () => {
    const filter: TimeIndexFilter = {
      racecourse: "阪神",
      distance: 2000,
      className: "G1",
      startDate: "2026-09-01",
      page: 2,
    }
    const params = toTimeIndexSearchParams(filter)
    const parsed = parseTimeIndexSearchParams(Object.fromEntries(params))
    expect(parsed).toEqual({ ...filter, page: 2 })
  })

  it("1ページ目は page を省き、条件が無ければ素のパスになる", () => {
    expect(timeIndexHref(emptyFilter)).toBe("/time-index")
    expect(timeIndexHref({ ...emptyFilter, page: 1, racecourse: "東京" })).toBe("/time-index?racecourse=%E6%9D%B1%E4%BA%AC")
  })

  it("上書きで馬名だけ差し替えられる", () => {
    const href = timeIndexHref({ ...emptyFilter, horse: "A", page: 4 }, { horse: "B", page: 1 })
    expect(href).toBe("/time-index?horse=B")
  })
})

describe("resolvePeriod", () => {
  it("未指定なら最新開催日を終端とする直近1週間にする", () => {
    expect(resolvePeriod(emptyFilter, "2026-09-20")).toEqual({
      startDate: "2026-09-14",
      endDate: "2026-09-20",
    })
    expect(DEFAULT_PERIOD_DAYS).toBe(7)
  })

  it("片方だけ指定されたらもう一方は開放する", () => {
    expect(resolvePeriod({ ...emptyFilter, startDate: "2026-01-01" }, "2026-09-20")).toEqual({
      startDate: "2026-01-01",
      endDate: undefined,
    })
  })

  it("データが無ければ期間を付けない", () => {
    expect(resolvePeriod(emptyFilter, null)).toEqual({})
  })
})

describe("buildTimeIndexWhere / buildTimeIndexWhereSql", () => {
  const filter: TimeIndexFilter = {
    racecourse: "東京",
    surface: "ダート",
    distance: 1400,
    className: "2勝クラス",
    going: "重",
    confidence: "low",
    page: 1,
  }
  const period = { startDate: "2026-09-14", endDate: "2026-09-20" }

  it("Prisma の where に全条件を反映する", () => {
    const where = buildTimeIndexWhere(filter, period, "v2")
    expect(where).toEqual({
      race_date: { gte: new Date("2026-09-14T00:00:00Z"), lte: new Date("2026-09-20T00:00:00Z") },
      racecourse: "東京",
      surface: "ダート",
      distance: 1400,
      class_name: "2勝クラス",
      going: "重",
      baseline_confidence: "low",
      baseline_version: "v2",
    })
  })

  it("条件が無ければ where は空で、SQL は指数の NULL 除外だけになる", () => {
    expect(buildTimeIndexWhere(emptyFilter, {}, null)).toEqual({})
    const sql = buildTimeIndexWhereSql(emptyFilter, {}, null)
    expect(sql.sql).toBe('"horecast_time_index_raw" IS NOT NULL')
    expect(sql.values).toEqual([])
  })

  it("生SQLは Prisma の where と同じ値をバインドする", () => {
    const sql = buildTimeIndexWhereSql(filter, period, "v2")
    expect(sql.sql).toContain('"race_date" >= ')
    expect(sql.sql).toContain('"baseline_version" = ')
    expect(sql.values).toEqual([
      new Date("2026-09-14T00:00:00Z"),
      new Date("2026-09-20T00:00:00Z"),
      "東京",
      "ダート",
      1400,
      "2勝クラス",
      "重",
      "low",
      "v2",
    ])
  })
})

describe("raceNumberFromNetkeibaRaceId", () => {
  it("末尾2桁をレース番号として読む", () => {
    expect(raceNumberFromNetkeibaRaceId("202605040211")).toBe(11)
    expect(raceNumberFromNetkeibaRaceId("202605040201")).toBe(1)
  })

  it("形式が違えば null", () => {
    expect(raceNumberFromNetkeibaRaceId("abc")).toBeNull()
    expect(raceNumberFromNetkeibaRaceId("202605040200")).toBeNull()
  })
})

describe("toHistogramBins", () => {
  it("階級数ぶんの空の階級を作り、範囲外は両端に寄せる", () => {
    const bins = toHistogramBins([
      { bucket: 0, count: 2 },
      { bucket: 1, count: 3 },
      { bucket: 16, count: 10 },
      { bucket: HISTOGRAM_BIN_COUNT + 1, count: 4 },
    ])
    expect(bins).toHaveLength(HISTOGRAM_BIN_COUNT)
    expect(bins[0]).toEqual({ from: HISTOGRAM_MIN, to: HISTOGRAM_MIN + 2, count: 5 })
    expect(bins[15]).toEqual({ from: 100, to: 102, count: 10 })
    expect(bins[HISTOGRAM_BIN_COUNT - 1]).toEqual({ from: HISTOGRAM_MAX - 2, to: HISTOGRAM_MAX, count: 4 })
  })
})

describe("sortByKnownOrder", () => {
  it("既知の順序を優先し、未知の値は末尾に並べる", () => {
    expect(sortByKnownOrder(["不良", "良", "その他", "重"], ["良", "稍重", "重", "不良"])).toEqual([
      "良",
      "重",
      "不良",
      "その他",
    ])
  })
})

describe("formatRaceTime", () => {
  it("分と秒に分けて表示する", () => {
    expect(formatRaceTime(95.3)).toBe("1:35.3")
    expect(formatRaceTime(59.9)).toBe("59.9")
    expect(formatRaceTime(120)).toBe("2:00.0")
    expect(formatRaceTime(null)).toBe("-")
  })
})
