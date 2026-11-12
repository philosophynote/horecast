import Link from "next/link"
import { formatInTimeZone } from "date-fns-tz"
import type { HorseTimeIndexDashboardData, HorseTimeIndexProfile } from "@/app/lib/horseTimeIndexData"
import { HORSE_NAME_MAX_LENGTH, timeIndexUnavailableReason, type ConditionSummary } from "@/app/lib/horseTimeIndexDashboard"
import { pageRangeLabel, timeIndexTone, TONE_TEXT_CLASS } from "@/app/lib/timeIndexChart"
import { timeIndexHref, type TimeIndexFilter } from "@/app/lib/timeIndexFilters"
import { toDistanceBand } from "@/app/lib/jockeyRecordLabels"
import { TimeIndexTrendChart } from "./TimeIndexHorseTrend"
import { TimeIndexTable, ConditionCell, RaceLinkCell } from "./TimeIndexTable"
import { TimeIndexPagination } from "./TimeIndexPagination"
import { ConfidencePill } from "./ConfidencePill"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"

const SECTION_CLASS = "rounded-xl border border-border bg-card p-5"

export function HorseTimeIndexSearch({ q }: { q: string }) {
  return (
    <form method="get" action="/time-index" role="search" aria-label="競走馬検索" className={SECTION_CLASS}>
      <input type="hidden" name="view" value="horses" />
      <label htmlFor="horse-search" className="mb-2 block text-sm font-bold">競走馬名</label>
      <div className="flex flex-wrap gap-3">
        <input key={q} id="horse-search" type="search" name="q" defaultValue={q} required maxLength={HORSE_NAME_MAX_LENGTH} placeholder="馬名の一部を入力" className="min-h-11 flex-[1_1_240px] rounded-lg border border-input bg-input-background px-3 text-sm" />
        <button type="submit" className="min-h-11 rounded-lg bg-primary px-6 text-sm font-bold text-primary-foreground hover:opacity-90">検索する</button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">名前の一部でも検索できます。候補が複数ある場合は馬名を選んでください。</p>
    </form>
  )
}

export function HorseTimeIndexCandidates({ horses, hasMore, filter }: { horses: HorseTimeIndexProfile[]; hasMore: boolean; filter: TimeIndexFilter }) {
  return (
    <section aria-labelledby="horse-candidates" className={SECTION_CLASS}>
      <h2 id="horse-candidates" className="text-lg font-bold">競走馬を選択</h2>
      {hasMore && <p className="mt-2 text-sm text-muted-foreground">候補が多いため先頭20件を表示しています。名前を追加して絞り込めます。</p>}
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {horses.map((horse) => <li key={horse.name}>
          <Link href={timeIndexHref(filter, { horse: horse.name, view: "horses", page: 1 })} prefetch={false} className="block min-h-12 rounded-lg border border-border px-4 py-3 hover:bg-accent">
            <span className="font-bold">{horse.name}</span>
            <span className="numeric mt-1 block text-xs text-muted-foreground">収録 {horse.firstDate} 〜 {horse.lastDate}</span>
          </Link>
        </li>)}
      </ul>
    </section>
  )
}

function IndexValue({ value }: { value: number | null }) {
  return <span className={`numeric ${value === null ? "text-muted-foreground" : TONE_TEXT_CLASS[timeIndexTone(value)]}`}>{value === null ? "—" : value.toFixed(1)}</span>
}

function ConditionTable({ title, rows, selected }: { title: string; rows: ConditionSummary[]; selected?: string }) {
  return <section className={SECTION_CLASS}>
    <h3 className="text-lg font-bold">{title}</h3>
    <p className="mb-3 mt-1 text-xs text-muted-foreground">比較する軸の絞り込みだけを外し、ほかの条件を固定しています。</p>
    {rows.length ? <Table className="min-w-[480px]">
      <caption className="sr-only">{title}の収録走数とタイム指数</caption>
      <TableHeader><TableRow><TableHead>条件</TableHead>{["収録走数", "指数あり", "平均指数", "最高指数"].map((label) => <TableHead key={label} className="text-right">{label}</TableHead>)}</TableRow></TableHeader>
      <TableBody>{rows.map((row) => <TableRow key={row.label} className={row.label === selected ? "bg-accent" : undefined}>
        <TableCell className="whitespace-nowrap font-medium">{row.label}</TableCell>
        <TableCell className="numeric text-right">{row.total}</TableCell><TableCell className="numeric text-right">{row.indexed}</TableCell>
        <TableCell className="text-right"><IndexValue value={row.average} /></TableCell><TableCell className="text-right"><IndexValue value={row.max} /></TableCell>
      </TableRow>)}</TableBody>
    </Table> : <p className="py-4 text-sm text-muted-foreground">この条件のデータはありません。</p>}
  </section>
}

export function HorseTimeIndexHeading({ horse }: { horse: HorseTimeIndexProfile }) {
  return <section id="horse-trend" aria-labelledby="horse-name">
    <h2 id="horse-name" className="text-2xl font-bold">{horse.name}</h2>
    <p className="numeric mt-2 text-sm text-muted-foreground">収録期間 {horse.firstDate} 〜 {horse.lastDate}</p>
    {horse.generatedAt && <p className="numeric mt-1 text-xs text-muted-foreground">データ更新 {formatInTimeZone(horse.generatedAt, "Asia/Tokyo", "yyyy-MM-dd HH:mm")} JST</p>}
    <p className="mt-2 text-xs text-muted-foreground">保存されているJRA平地のタイム指数です。収録走数は生涯出走数とは異なります。</p>
  </section>
}

export function HorseTimeIndexDashboard({ data, filter, version }: { data: HorseTimeIndexDashboardData; filter: TimeIndexFilter; version: string }) {
  const { summary } = data
  const period = `${filter.startDate ?? "収録開始"} 〜 ${filter.endDate ?? "収録最新"}`
  return <div className="space-y-6">
    <section aria-labelledby="horse-summary" className={SECTION_CLASS}>
      <h3 id="horse-summary" className="text-lg font-bold">選択条件のタイム指数</h3>
      <p className="numeric mt-1 text-xs text-muted-foreground">期間 {period} · 基準バージョン {version}</p>
      {summary.total ? <>
        <dl className="mt-5 grid grid-cols-2 gap-5 lg:grid-cols-5">
          <div><dt className="text-xs text-muted-foreground">指数あり / 収録走数</dt><dd className="numeric mt-1 text-2xl font-bold">{summary.indexed} / {summary.total}</dd></div>
          <div><dt className="text-xs text-muted-foreground">前走指数（選択条件内）</dt><dd className="mt-1 text-2xl font-bold"><IndexValue value={summary.latest?.timeIndex ?? null} /></dd>
            {summary.latest && <div className="mt-1 text-xs text-muted-foreground"><time className="numeric" dateTime={summary.latest.raceDate}>{summary.latest.raceDate}</time> · <ConfidencePill confidence={summary.latest.baselineConfidence} />{summary.latest.timeIndex === null && <p>{timeIndexUnavailableReason(summary.latest.unavailableReason)}</p>}</div>}
          </div>
          <div><dt className="text-xs text-muted-foreground">直近5走平均</dt><dd className="mt-1 text-2xl font-bold"><IndexValue value={summary.recent.average} /></dd><p className="numeric mt-1 text-xs text-muted-foreground">有効 {summary.recent.count}走 / 直近{Math.min(5, summary.total)}走</p></div>
          <div><dt className="text-xs text-muted-foreground">平均指数</dt><dd className="mt-1 text-2xl font-bold"><IndexValue value={summary.average} /></dd></div>
          <div><dt className="text-xs text-muted-foreground">最高指数</dt><dd className="mt-1 text-2xl font-bold"><IndexValue value={summary.best?.timeIndex ?? null} /></dd>
            {summary.best && <div className="mt-1 space-y-1 text-xs text-muted-foreground"><time className="numeric" dateTime={summary.best.raceDate}>{summary.best.raceDate}</time><div><RaceLinkCell row={summary.best} /></div><ConditionCell row={summary.best} /></div>}
          </div>
        </dl>
        <p className="numeric mt-4 text-xs text-muted-foreground">対象の走 {summary.firstDate} 〜 {summary.lastDate}</p>
        {summary.indexed === 0 ? <p className="mt-3 text-sm text-muted-foreground">この条件で指数を算出できた走はありません。履歴の算出不可理由を確認してください。</p> : summary.indexed === 1 ? <p className="mt-3 text-sm text-warning">有効な指数が1走のみのため、平均や条件別の傾向は参考値です。</p> : null}
      </> : <p role="status" className="mt-4 text-sm text-muted-foreground">選択した条件のデータはありません。絞り込みを変更してください。</p>}
    </section>
    <section aria-labelledby="horse-chart" className={SECTION_CLASS}>
      <h3 id="horse-chart" className="text-lg font-bold">指数の推移</h3>
      <p className="mt-1 text-xs text-muted-foreground">選択条件の直近<span className="numeric">{data.trend.runs.length}</span>走を古い順に表示。基準線は100、白抜きの丸は信頼度「低」。算出不可の走では線を切っています。</p>
      {summary.total > data.trend.runs.length && <p className="numeric mt-2 text-xs text-warning">全{summary.total}走のうち直近{data.trend.runs.length}走を表示しています。すべての走は下の履歴から確認できます。</p>}
      <TimeIndexTrendChart trend={data.trend} />
    </section>
    <ConditionTable title="競馬場別" rows={data.racecourses} selected={filter.racecourse} />
    <div className="grid gap-6 xl:grid-cols-2">
      <ConditionTable title="芝・ダート別" rows={data.surfaces} selected={filter.surface} />
      <ConditionTable title="距離帯別" rows={data.distances} selected={filter.distance ? toDistanceBand(filter.distance) : undefined} />
    </div>
    <p className="text-xs text-muted-foreground">距離帯は短距離（〜1400m）、マイル（1401〜1800m）、中距離（1801〜2200m）、長距離（2201m〜）。件数と信頼度を合わせて確認してください。</p>
    <section id="list" aria-labelledby="horse-history" className={SECTION_CLASS}>
      <h3 id="horse-history" className="text-lg font-bold">走別履歴 <span className="numeric text-sm font-normal text-muted-foreground">{pageRangeLabel(data.page)} · 新しい順</span></h3>
      <p className="mb-3 mt-1 text-xs text-muted-foreground">レース詳細のリンクは、出馬表が保存されている走だけに表示します。</p>
      <TimeIndexTable rows={data.page.rows} filter={filter} />
      <div className="mt-4"><TimeIndexPagination filter={filter} page={data.page} /></div>
    </section>
  </div>
}
