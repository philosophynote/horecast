import type { Metadata } from "next"
import { Suspense } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card"
import { TimeIndexDistribution } from "@/app/components/TimeIndexDistribution"
import { TimeIndexFilterForm } from "@/app/components/TimeIndexFilterForm"
import { TimeIndexHorseTrend } from "@/app/components/TimeIndexHorseTrend"
import { TimeIndexPagination } from "@/app/components/TimeIndexPagination"
import { TimeIndexTable } from "@/app/components/TimeIndexTable"
import {
  getHorseTrend,
  getTimeIndexDistribution,
  getTimeIndexFilterOptions,
  getTimeIndexPage,
  resolveVersion,
} from "@/app/lib/timeIndex"
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

function TimeIndexGuide() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Horecastタイム指数とは</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-gray-700 space-y-2">
        <p>
          走破タイムを、同じ競馬場・芝ダート・距離・クラス・馬場状態の基準タイム（標準的な勝ち時計）と比べた値です。
          <strong>100</strong> が同条件の標準的な勝ち時計、<strong>110</strong> は基準より約1%速い走破タイムを表します。
        </p>
        <p>
          指数はレース内の相対値ではなく絶対値です。別のレース・別の条件の走同士でもそのまま比較できます。
        </p>
        <p>
          基準タイムは過去レースの標本から求めるため、標本数が少ない条件では信頼度が下がります。
          信頼度は「高 / 中 / 低 / 算出不可」の4段階で、標本が足りない走は指数を算出しません。
        </p>
      </CardContent>
    </Card>
  )
}

function SectionSkeleton({ title }: { title: string }) {
  return (
    <Card aria-busy="true">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 animate-pulse">
          <div className="h-4 w-1/3 rounded bg-gray-200" />
          <div className="h-40 w-full rounded bg-gray-100" />
        </div>
      </CardContent>
    </Card>
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
    <Card id="list">
      <CardHeader>
        <CardTitle>一覧</CardTitle>
        <p className="text-sm text-gray-500">
          レース名のリンクは、Horecastに出馬表があるレースだけに出ます。馬名を押すとその馬の推移を表示します。
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <TimeIndexPagination filter={filter} page={page} />
        <TimeIndexTable rows={page.rows} filter={filter} />
        <TimeIndexPagination filter={filter} page={page} />
      </CardContent>
    </Card>
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
    <main className="container mx-auto py-6 px-4 min-h-screen bg-gray-50 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">タイム指数</h1>
        <p className="text-sm text-gray-500 mt-1">
          JRA平地競走のHorecastタイム指数を一覧・推移・分布で確認できます。
          {options.latestRaceDate && <span className="ml-2">最新データ: {options.latestRaceDate}</span>}
        </p>
      </div>

      <TimeIndexGuide />

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
