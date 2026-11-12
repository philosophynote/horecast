import Link from "next/link"
import { formatInTimeZone } from "date-fns-tz"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
import {
  buildJockeyDashboard,
  JOCKEY_NAME_MAX_LENGTH,
  jockeyDashboardHref,
  jockeyRates,
  type JockeyDashboardFilter,
  type JockeyDashboardRecord,
} from "@/app/lib/jockeyDashboard"
import { ALL, formatConditionLabel, formatRate, MIN_RIDES } from "@/app/lib/jockeyRecordLabels"

const FIELD_CLASS = "min-h-11 w-full rounded-lg border border-input bg-input-background px-3 text-sm text-foreground"
const SECTION_CLASS = "rounded-xl border border-border bg-card p-5"
const rateText = (rate: number | null) => rate === null ? "—" : formatRate(rate)

export function JockeySearchForm({ q }: { q: string }) {
  return (
    <form method="get" action="/jockeys" aria-label="騎手検索" className={SECTION_CLASS}>
      <label htmlFor="jockey-search" className="mb-2 block text-sm font-bold">騎手名</label>
      <div className="flex flex-wrap gap-3">
        <input
          key={q}
          id="jockey-search"
          name="q"
          type="search"
          defaultValue={q}
          maxLength={JOCKEY_NAME_MAX_LENGTH}
          required
          placeholder="例：武豊、ルメール"
          className={`${FIELD_CLASS} flex-[1_1_240px]`}
        />
        <button type="submit" className="min-h-11 rounded-lg bg-primary px-6 text-sm font-bold text-primary-foreground hover:opacity-90">
          検索する
        </button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">名前の一部でも検索できます。複数見つかった場合は騎手を選んでください。</p>
    </form>
  )
}

function FilterField({ name, label, value, choices, allLabel }: {
  name: string; label: string; value: string; choices: string[]; allLabel: string
}) {
  return (
    <label htmlFor={`jockey-${name}`} className="flex flex-col gap-1 text-xs text-muted-foreground">
      {label}
      <select id={`jockey-${name}`} name={name} defaultValue={value} className={FIELD_CLASS}>
        <option value={ALL}>{allLabel}</option>
        {value !== ALL && !choices.includes(value) && <option value={value}>{value}（データなし）</option>}
        {choices.map((choice) => <option key={choice} value={choice}>{choice}</option>)}
      </select>
    </label>
  )
}

function RecordTable({ title, dimension, rows, selected }: {
  title: string
  dimension: "racecourse" | "surface" | "distance_band"
  rows: JockeyDashboardRecord[]
  selected: string
}) {
  return (
    <section className={SECTION_CLASS}>
      <h3 className="text-lg font-bold">{title}</h3>
      <p className="mt-1 mb-3 text-xs text-muted-foreground">ほかの絞り込み条件を固定して比較。選択中の条件は行を強調しています。</p>
      {rows.length === 0 ? <p className="py-5 text-sm text-muted-foreground">この条件の内訳データはありません。</p> : (
        <Table className="min-w-[650px]">
          <caption className="sr-only">{title}の騎乗数、着数、勝率、連対率、複勝率</caption>
          <TableHeader>
            <TableRow>
              <TableHead>{title.replace("別", "")}</TableHead>
              {["騎乗数", "1着", "2着", "3着", "勝率", "連対率", "複勝率"].map((label) => (
                <TableHead key={label} className="text-right">{label}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const rates = jockeyRates(row)
              return (
                <TableRow key={row[dimension]} className={row[dimension] === selected ? "bg-accent" : undefined}>
                  <TableCell className="whitespace-nowrap font-medium">
                    {row[dimension]}
                    {row.rides < MIN_RIDES && <span className="ml-2 text-xs text-warning">少数</span>}
                  </TableCell>
                  {[row.rides, row.wins, row.seconds, row.thirds].map((value, i) => (
                    <TableCell key={i} className="numeric text-right">{value.toLocaleString("ja-JP")}</TableCell>
                  ))}
                  <TableCell className="numeric text-right">{rateText(rates.win)}</TableCell>
                  <TableCell className="numeric text-right">{rateText(rates.quinella)}</TableCell>
                  <TableCell className="numeric text-right font-bold text-primary">{rateText(rates.place)}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </section>
  )
}

export function JockeyDashboard({ jockey, records, filter }: {
  jockey: { id: number; name: string }
  records: JockeyDashboardRecord[]
  filter: JockeyDashboardFilter
}) {
  const dashboard = buildJockeyDashboard(records, filter)
  const { summary, options } = dashboard
  const rates = summary ? jockeyRates(summary) : null
  const conditionLabel = formatConditionLabel({
    racecourse: filter.racecourse, surface: filter.surface, distanceBand: filter.distanceBand,
  })

  return (
    <div className="space-y-6">
      <section aria-labelledby="jockey-name" className="space-y-2">
        <h2 id="jockey-name" className="text-2xl font-bold">{jockey.name}<span className="ml-2 text-sm font-normal text-muted-foreground">騎手</span></h2>
        <p className="text-sm text-muted-foreground">JRA平地の集計成績です。障害レースは含みません。</p>
      </section>

      {records.length === 0 ? <p className={SECTION_CLASS}>この騎手の集計データはまだありません。</p> : (
        <>
          <form key={JSON.stringify(filter)} method="get" action="/jockeys" aria-label="騎手成績の絞り込み" className={`${SECTION_CLASS} grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-5`}>
            <input type="hidden" name="jockey" value={jockey.id} />
            {filter.q && <input type="hidden" name="q" value={filter.q} />}
            <FilterField name="period" label="集計期間" value={filter.period} choices={options.periods} allLabel="全期間" />
            <FilterField name="racecourse" label="競馬場" value={filter.racecourse} choices={options.racecourses} allLabel="全競馬場" />
            <FilterField name="surface" label="芝・ダート" value={filter.surface} choices={options.surfaces} allLabel="芝・ダートすべて" />
            <FilterField name="distanceBand" label="距離帯" value={filter.distanceBand} choices={options.distanceBands} allLabel="全距離" />
            <button type="submit" className="min-h-11 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground hover:opacity-90">この条件で表示</button>
            <Link href={jockeyDashboardHref(jockey.id, filter.q)} prefetch={false} className="col-span-full text-sm text-primary underline underline-offset-4">絞り込みをリセット</Link>
          </form>

          <section aria-labelledby="jockey-summary" className={SECTION_CLASS}>
            <h3 id="jockey-summary" className="text-lg font-bold">選択条件の成績</h3>
            <p className="mt-1 text-sm text-muted-foreground">{filter.period === ALL ? "全期間" : filter.period} · {conditionLabel}</p>
            {summary && rates ? (
              <>
                <dl className="mt-5 grid grid-cols-2 gap-5 lg:grid-cols-4">
                  {[
                    ["騎乗数", summary.rides.toLocaleString("ja-JP")],
                    ["勝率", rateText(rates.win)],
                    ["連対率", rateText(rates.quinella)],
                    ["複勝率", rateText(rates.place)],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-xs text-muted-foreground">{label}</dt>
                      <dd className={`numeric mt-1 text-3xl font-bold ${label === "複勝率" ? "text-primary" : "text-foreground"}`}>{value}</dd>
                    </div>
                  ))}
                </dl>
                <p className="numeric mt-5 text-sm">1着 {summary.wins.toLocaleString("ja-JP")} / 2着 {summary.seconds.toLocaleString("ja-JP")} / 3着 {summary.thirds.toLocaleString("ja-JP")}</p>
                {summary.rides < MIN_RIDES && <p className="mt-3 text-sm text-warning">騎乗数が{MIN_RIDES}未満のため、率は参考値です。</p>}
                <p className="mt-3 text-xs text-muted-foreground">
                  対象レース <span className="numeric">{formatInTimeZone(summary.first_race_date, "UTC", "yyyy-MM-dd")} 〜 {formatInTimeZone(summary.last_race_date, "UTC", "yyyy-MM-dd")}</span>
                  <span className="numeric mt-1 block">集計更新 {formatInTimeZone(summary.generated_at, "Asia/Tokyo", "yyyy-MM-dd HH:mm")} JST</span>
                </p>
              </>
            ) : <p className="mt-4 text-sm text-muted-foreground">選択した条件の集計データはありません。条件を変更してください。</p>}
          </section>

          <p className="text-xs leading-relaxed text-muted-foreground">
            勝率は1着、連対率は2着以内、複勝率は3着以内の割合です。騎乗数{MIN_RIDES}未満は「少数」と表示します。
            出馬表では騎乗数が少ないと集計条件を広げますが、この画面は選択した条件の成績を表示します。
            距離帯は短距離（〜1400m）、マイル（1401〜1800m）、中距離（1801〜2200m）、長距離（2201m〜）です。
          </p>
          <RecordTable title="競馬場別" dimension="racecourse" rows={dashboard.racecourses} selected={filter.racecourse} />
          <div className="grid gap-6 xl:grid-cols-2">
            <RecordTable title="芝・ダート別" dimension="surface" rows={dashboard.surfaces} selected={filter.surface} />
            <RecordTable title="距離帯別" dimension="distance_band" rows={dashboard.distances} selected={filter.distanceBand} />
          </div>
        </>
      )}
    </div>
  )
}
