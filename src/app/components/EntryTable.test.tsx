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

const render = (indicators: ReturnType<typeof indicator>[], extra?: Partial<Parameters<typeof EntryTable>[0]>) =>
  renderToStaticMarkup(
    <EntryTable
      entries={indicators.map((item) => entry(item.horseNumber))}
      predicts={[]}
      indicators={indicators}
      {...extra}
    />,
  )

test("指標は5段目盛りとラベルで出し、前走の指数と信頼度を添える", () => {
  const html = render([indicator(1, [run("2025-12-28", 107.4, "low")])])
  expect(html).toContain('aria-label="地力：最上位（5段中5）"')
  expect(html).toContain('aria-label="条件適性：標準（5段中3）"')
  expect(html).toContain('aria-label="展開適性：中立（5段中3）"')
  expect(html).toContain('aria-label="近走状態：安定（5段中4）"')
  expect(html).toContain(">107<")
  expect(html).toContain("前走 · 信頼度低")
  expect(html).not.toContain("<details")
})

test("直近5走までを折れ線にし、6走目は含めない", () => {
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
  expect(html).toContain('aria-label="直近5走のタイム指数（古い順） 90、95、99、101、107"')
  expect(html).not.toContain("88")
})

test("time_index_recent が空・null・不正でも落ちず、指数なしと出る", () => {
  for (const value of [[], null, "broken", [null, { time_index: "x" }]]) {
    const html = render([indicator(2, value)])
    expect(html).toContain("指数なし")
    expect(html).toContain('aria-label="地力：最上位（5段中5）"')
  }
})

test("判断材料不足の馬と指標行が無い馬は4列をまとめて破線で出す", () => {
  const insufficient = toHorseIndicatorLabels({
    horse_number: 3,
    base_ability: null,
    condition_fit: null,
    pace_fit: null,
    freshness: null,
    history_count: 0,
    time_index_recent: [],
  })
  const html = renderToStaticMarkup(
    <EntryTable entries={[entry(3), entry(4)]} predicts={[]} indicators={[insufficient]} />,
  )
  expect(html.match(/colspan="4"/gi)).toHaveLength(2)
  expect(html).toContain("判断材料不足 · 国内の出走履歴がありません")
})

test("◎の行は強調し、印の無い馬は · を出す", () => {
  const html = renderToStaticMarkup(
    <EntryTable
      entries={[entry(1), entry(2), entry(3)]}
      predicts={[
        { horse_number: 2, score: 90 },
        { horse_number: 1, score: 50 },
      ]}
      openAiPredictionRanks={[{ horseNumber: 3, rank: 1 }]}
    />,
  )
  expect(html.match(/<tr class="[^"]*bg-accent/g)).toHaveLength(2)
  expect(html).toContain("◎")
  expect(html).toContain("○")
  expect(html).toContain(">·<")
  expect(html).not.toContain("×")
})

test("results を渡したときだけ着順が入り、3着以内は強調色", () => {
  const withResults = renderToStaticMarkup(
    <EntryTable
      entries={[entry(1), entry(2)]}
      predicts={[]}
      results={[
        { rank: "2", horse_number: 1 },
        { rank: "5", horse_number: 2 },
      ]}
    />,
  )
  expect(withResults).toContain('text-primary">2<')
  expect(withResults).toContain('text-muted-foreground">5<')
  const without = renderToStaticMarkup(<EntryTable entries={[entry(1)]} predicts={[]} />)
  expect(without).not.toContain('text-primary">')
})

test("指標が無いときは指標の列を出さない", () => {
  const html = renderToStaticMarkup(<EntryTable entries={[entry(1)]} predicts={[]} />)
  expect(html).not.toContain("地力")
  expect(html).not.toContain("タイム指数")
  expect(html).toContain("馬1")
  expect(html).toContain("騎手1")
})
