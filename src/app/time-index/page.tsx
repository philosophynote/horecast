import type { Metadata } from "next"
import { Suspense } from "react"
import { TimeIndexDistribution } from "@/app/components/TimeIndexDistribution"
import { TimeIndexFilterForm } from "@/app/components/TimeIndexFilterForm"
import { TimeIndexHorseTrend } from "@/app/components/TimeIndexHorseTrend"
import { TimeIndexPagination } from "@/app/components/TimeIndexPagination"
import { TimeIndexScale } from "@/app/components/TimeIndexScale"
import { TimeIndexTable } from "@/app/components/TimeIndexTable"
import {
  getHorseTrend,
  getTimeIndexDistribution,
  getTimeIndexFilterOptions,
  getTimeIndexPage,
  resolveVersion,
} from "@/app/lib/timeIndex"
import { pageRangeLabel } from "@/app/lib/timeIndexChart"
import {
  buildTimeIndexWhere,
  buildTimeIndexWhereSql,
  parseTimeIndexSearchParams,
  resolvePeriod,
  type Period,
  type SearchParamsInput,
  type TimeIndexFilter,
} from "@/app/lib/timeIndexFilters"

export const metadata: Metadata = {
  title: "タイム指数 | Horecast",
  description: "JRA平地競走のHorecastタイム指数を一覧・推移・分布で確認する",
}

function SectionSkeleton({ title }: { title: string }) {
  return (
    <section aria-busy="true" className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-lg font-bold">{title}</h2>
      <div className="mt-3 animate-pulse space-y-3">
        <div className="h-4 w-1/3 rounded bg-muted" />
        <div className="h-40 w-full rounded bg-muted" />
      </div>
    </section>
  )
}

type SectionProps = {
  filter: TimeIndexFilter
  period: Period
  version: string | null
}

async function ListSection({ filter, period, version }: SectionProps) {
  const where = buildTimeIndexWhere(filter, period, version)
  const page = await getTimeIndexPage(where, filter.page)

  return (
    <section id="list" aria-labelledby="list-title" className="rounded-xl border border-border bg-card p-5">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="list-title" className="text-lg font-bold">
          一覧{" "}
          <span className="numeric text-[13px] font-normal text-muted-foreground">
            {pageRangeLabel(page)} · 開催日の新しい順
          </span>
        </h2>
        <span className="text-xs text-muted-foreground">レース名のリンクは出馬表のあるレースだけ。馬名を押すとその馬の推移を表示</span>
      </div>
      <TimeIndexTable rows={page.rows} filter={filter} />
      <div className="mt-3.5">
        <TimeIndexPagination filter={filter} page={page} />
      </div>
    </section>
  )
}

async function DistributionSection({ filter, period, version }: SectionProps) {
  const where = buildTimeIndexWhere(filter, period, version)
  const whereSql = buildTimeIndexWhereSql(filter, period, version)
  const distribution = await getTimeIndexDistribution(where, whereSql)
  return <TimeIndexDistribution distribution={distribution} />
}

async function HorseTrendSection({ filter, version }: Pick<SectionProps, "filter" | "version">) {
  const trend = filter.horse ? await getHorseTrend(filter.horse, version) : null
  return <TimeIndexHorseTrend filter={filter} trend={trend} />
}

export default async function TimeIndexPage({ searchParams }: { searchParams: Promise<SearchParamsInput> }) {
  const filter = parseTimeIndexSearchParams(await searchParams)
  const options = await getTimeIndexFilterOptions()
  const version = resolveVersion(filter, options)
  const period = resolvePeriod(filter, options.latestRaceDate)

  return (
    <main className="container mx-auto flex min-h-screen flex-col gap-7 bg-background px-4 py-8">
      <section className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex-[1_1_360px]">
          <div className="numeric text-xs tracking-[0.14em] text-muted-foreground">HORECAST TIME INDEX</div>
          <h1 className="mt-1 text-[32px] font-bold leading-tight">タイム指数</h1>
          <p className="mt-1 max-w-[560px] text-muted-foreground">
            走破タイムを、同じ競馬場・芝ダート・距離・クラス・馬場の基準タイムと比べた絶対値です。別のレースの走同士でもそのまま比べられます。
            {options.latestRaceDate && (
              <span className="numeric mt-1 block text-xs">最新データ {options.latestRaceDate}</span>
            )}
          </p>
        </div>
        <TimeIndexScale />
      </section>

      <TimeIndexFilterForm filter={filter} options={options} period={period} version={version} />

      {/* 絞り込みが変わるたびに各セクションを取り直す。フォームは先に描画し、集計は後から流す */}
      <Suspense key={`list-${filter.page}`} fallback={<SectionSkeleton title="一覧" />}>
        <ListSection filter={filter} period={period} version={version} />
      </Suspense>

      <Suspense fallback={<SectionSkeleton title="分布" />}>
        <DistributionSection filter={filter} period={period} version={version} />
      </Suspense>

      <Suspense fallback={<SectionSkeleton title="馬ごとの推移" />}>
        <HorseTrendSection filter={filter} version={version} />
      </Suspense>
    </main>
  )
}
