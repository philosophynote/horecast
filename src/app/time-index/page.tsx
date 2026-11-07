import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"
import { HorseTimeIndexCandidates, HorseTimeIndexDashboard, HorseTimeIndexHeading, HorseTimeIndexSearch } from "@/app/components/HorseTimeIndexDashboard"
import { TimeIndexDistribution } from "@/app/components/TimeIndexDistribution"
import { TimeIndexFilterForm } from "@/app/components/TimeIndexFilterForm"
import { TimeIndexPagination } from "@/app/components/TimeIndexPagination"
import { TimeIndexScale } from "@/app/components/TimeIndexScale"
import { TimeIndexTable } from "@/app/components/TimeIndexTable"
import { getTimeIndexDistribution, getTimeIndexFilterOptions, getTimeIndexPage, resolveVersion } from "@/app/lib/timeIndex"
import { getHorseTimeIndexDashboard, getTimeIndexHorseProfile, searchTimeIndexHorses } from "@/app/lib/horseTimeIndexData"
import { horseDashboardPeriod, parseHorseTimeIndexParams } from "@/app/lib/horseTimeIndexDashboard"
import { pageRangeLabel } from "@/app/lib/timeIndexChart"
import { buildTimeIndexWhere, buildTimeIndexWhereSql, resolvePeriod, type Period, type SearchParamsInput, type TimeIndexFilter } from "@/app/lib/timeIndexFilters"

export const metadata: Metadata = {
  title: "タイム指数 | Horecast",
  description: "競走馬名で検索し、タイム指数の推移や競馬場・芝ダート・距離帯別の傾向を確認する",
}

function SectionSkeleton({ title }: { title: string }) {
  return <section aria-busy="true" className="rounded-xl border border-border bg-card p-5">
    <h2 className="text-lg font-bold">{title}</h2>
    <div className="mt-3 animate-pulse space-y-3"><div className="h-4 w-1/3 rounded bg-muted" /><div className="h-40 w-full rounded bg-muted" /></div>
  </section>
}

type SectionProps = { filter: TimeIndexFilter; period: Period; version: string | null }

async function ListSection({ filter, period, version }: SectionProps) {
  const page = await getTimeIndexPage(buildTimeIndexWhere(filter, period, version), filter.page)
  return <section id="list" aria-labelledby="list-title" className="rounded-xl border border-border bg-card p-5">
    <div className="mb-2 flex flex-wrap items-baseline justify-between gap-3">
      <h2 id="list-title" className="text-lg font-bold">全走一覧 <span className="numeric text-[13px] font-normal text-muted-foreground">{pageRangeLabel(page)} · 開催日の新しい順</span></h2>
      <span className="text-xs text-muted-foreground">馬名を押すとその馬のダッシュボードを表示</span>
    </div>
    <TimeIndexTable rows={page.rows} filter={filter} />
    <div className="mt-3.5"><TimeIndexPagination filter={filter} page={page} /></div>
  </section>
}

async function DistributionSection({ filter, period, version }: SectionProps) {
  return <TimeIndexDistribution distribution={await getTimeIndexDistribution(buildTimeIndexWhere(filter, period, version), buildTimeIndexWhereSql(filter, period, version))} />
}

async function AllTimeIndexData({ filter }: { filter: TimeIndexFilter }) {
  const options = await getTimeIndexFilterOptions()
  const version = resolveVersion(filter, options)
  const period = resolvePeriod(filter, options.latestRaceDate)
  return <>
    <TimeIndexFilterForm key={JSON.stringify(filter)} filter={filter} options={options} period={period} version={version} />
    <Suspense key={`list-${JSON.stringify(filter)}`} fallback={<SectionSkeleton title="全走一覧" />}><ListSection filter={filter} period={period} version={version} /></Suspense>
    <Suspense key={`distribution-${JSON.stringify(filter)}`} fallback={<SectionSkeleton title="分布" />}><DistributionSection filter={filter} period={period} version={version} /></Suspense>
  </>
}

async function HorseDashboardContent({ filter, version }: { filter: TimeIndexFilter & { horse: string }; version: string }) {
  const data = await getHorseTimeIndexDashboard(filter, version)
  return <HorseTimeIndexDashboard data={data} filter={filter} version={version} />
}

async function HorseResults({ filter }: { filter: TimeIndexFilter }) {
  let horse = filter.horse ? await getTimeIndexHorseProfile(filter.horse) : null
  if (!horse) {
    const search = await searchTimeIndexHorses(filter.q ?? filter.horse ?? "")
    if (search.horses.length === 1 && !search.hasMore) horse = search.horses[0]
    else if (search.horses.length) return <HorseTimeIndexCandidates {...search} filter={filter} />
    else return <p role="status" className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">該当する競走馬のタイム指数は保存されていません。名前の一部でも検索できます。</p>
  }
  const options = await getTimeIndexFilterOptions()
  const version = resolveVersion(filter, options)
  if (!version) return <p role="status">タイム指数のデータはまだありません。</p>
  if (!options.versions.includes(version)) return <p role="status">指定した基準バージョンのデータはありません。検索し直してください。</p>
  const selectedFilter = { ...filter, horse: horse.name, view: "horses" as const, version }
  return <>
    <HorseTimeIndexHeading horse={horse} />
    <TimeIndexFilterForm key={JSON.stringify(selectedFilter)} filter={selectedFilter} options={options} period={horseDashboardPeriod(filter)} version={version} />
    <Suspense key={JSON.stringify(selectedFilter)} fallback={<SectionSkeleton title="馬別タイム指数" />}><HorseDashboardContent filter={selectedFilter} version={version} /></Suspense>
  </>
}

export default async function TimeIndexPage({ searchParams }: { searchParams: Promise<SearchParamsInput> }) {
  const { filter, error } = parseHorseTimeIndexParams(await searchParams)
  const all = filter.view === "all"
  return <main className="container mx-auto flex min-h-screen flex-col gap-7 bg-background px-4 py-8">
    <section className="flex flex-wrap items-end justify-between gap-6">
      <div className="flex-[1_1_360px]">
        <div className="numeric text-xs tracking-[0.14em] text-muted-foreground">HORECAST TIME INDEX</div>
        <h1 className="mt-1 text-[32px] font-bold leading-tight">タイム指数</h1>
        <p className="mt-1 max-w-[560px] text-muted-foreground">競走馬を検索して、タイム指数の推移と条件別の傾向を確認できます。指数は、走破タイムを同条件の基準タイムと比べた絶対値です。</p>
      </div>
      <TimeIndexScale />
    </section>
    <nav aria-label="タイム指数の表示方法" className="flex gap-2">
      <Link href="/time-index" aria-current={all ? undefined : "page"} className={`min-h-11 rounded-lg border px-4 py-3 text-sm font-bold ${all ? "border-border hover:bg-accent" : "border-primary bg-primary text-primary-foreground"}`}>競走馬から探す</Link>
      <Link href="/time-index?view=all" aria-current={all ? "page" : undefined} className={`min-h-11 rounded-lg border px-4 py-3 text-sm font-bold ${all ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-accent"}`}>全走データ</Link>
    </nav>
    {!all && <HorseTimeIndexSearch q={filter.q ?? filter.horse ?? ""} />}
    {error ? <p role="alert" className="rounded-xl border border-border bg-card p-5 text-negative">{error}</p> : all ? (
      <Suspense key={JSON.stringify(filter)} fallback={<SectionSkeleton title="全走データ" />}><AllTimeIndexData filter={filter} /></Suspense>
    ) : filter.horse || filter.q ? (
      <Suspense key={JSON.stringify(filter)} fallback={<SectionSkeleton title="競走馬のタイム指数" />}><HorseResults filter={filter} /></Suspense>
    ) : <p role="status" className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">競走馬名を入力するとタイム指数を表示します。出馬表の馬名からも開けます。</p>}
  </main>
}
