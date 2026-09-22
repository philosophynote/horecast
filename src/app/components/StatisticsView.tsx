'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from './ui/card'
import { format } from 'date-fns'
import type { BetStatistics } from '@/app/lib/statistics'

interface StatisticsData {
  period: {
    startDate: string
    endDate: string
  }
  models: Record<StatisticsModel, ModelStatistics>
}

type StatisticsModel = 'original' | 'openai'

interface ModelStatistics {
  totalRaces: number
  overallStatistics: BetStatistics
  raceStatistics: Array<{
    raceId: number
    raceTime: string | null
    track: string
    raceName: string
    statistics: BetStatistics
  }>
}

interface DateRange {
  startDate: string
  endDate: string
}

// 取得済みデータと、そのデータを取得したときの期間をセットで保持する
// 現在の期間と一致しなければ「更新中」と判定できるので、同期的な setState が不要になる
interface StatisticsResult {
  range: DateRange
  data: StatisticsData | null
}

const MODEL_TABS: Array<{ value: StatisticsModel; label: string }> = [
  { value: 'original', label: '独自予想モデル' },
  { value: 'openai', label: 'OpenAIモデル' }
]

// 日付入力中の途中の値（空文字や不完全な日付）で API を叩かないための待ち時間
const FETCH_DEBOUNCE_MS = 300

const isSameRange = (a: DateRange, b: DateRange) =>
  a.startDate === b.startDate && a.endDate === b.endDate

const isValidRange = (range: DateRange) =>
  range.startDate !== '' && range.endDate !== '' && range.startDate <= range.endDate

const formatCurrency = (amount: number) => `¥${amount.toLocaleString()}`

const formatPercentage = (rate: number) => `${rate.toFixed(1)}%`

export function StatisticsView() {
  const [result, setResult] = useState<StatisticsResult | null>(null)
  const [activeModel, setActiveModel] = useState<StatisticsModel>('original')
  const [dateRange, setDateRange] = useState<DateRange>(() => ({
    startDate: format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  }))

  useEffect(() => {
    if (!isValidRange(dateRange)) return

    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          startDate: dateRange.startDate,
          endDate: dateRange.endDate
        })
        const response = await fetch(`/api/statistics?${params}`, { signal: controller.signal })
        if (!response.ok) {
          throw new Error(`Failed to fetch statistics: ${response.status}`)
        }
        const statsData: StatisticsData = await response.json()
        setResult({ range: dateRange, data: statsData })
      } catch (error) {
        // 期間変更で古いリクエストを中断した場合は失敗扱いにしない
        if (controller.signal.aborted) return
        console.error('Error fetching statistics:', error)
        setResult({ range: dateRange, data: null })
      }
    }, FETCH_DEBOUNCE_MS)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [dateRange])

  const rangeValid = isValidRange(dateRange)
  const isUpdating = rangeValid && (result === null || !isSameRange(result.range, dateRange))
  const data = result?.data ?? null

  return (
    <div className="space-y-6">
      {/* 期間選択 */}
      <Card>
        <CardHeader>
          <CardTitle>期間設定</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="statistics-start-date">開始日</label>
              <input
                id="statistics-start-date"
                type="date"
                value={dateRange.startDate}
                max={dateRange.endDate || undefined}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="statistics-end-date">終了日</label>
              <input
                id="statistics-end-date"
                type="date"
                value={dateRange.endDate}
                min={dateRange.startDate || undefined}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="border rounded px-3 py-2"
              />
            </div>
            <div className="flex items-end">
              <p className="text-sm text-gray-500 min-h-[1.25rem]" role="status" aria-live="polite">
                {!rangeValid
                  ? '開始日と終了日を正しく指定してください'
                  : isUpdating
                    ? '統計情報を更新中...'
                    : ''}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="border-b border-gray-200" role="tablist" aria-label="予想モデル">
        <nav className="flex gap-8">
          {MODEL_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={activeModel === tab.value}
              onClick={() => setActiveModel(tab.value)}
              className={`border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                activeModel === tab.value
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* 統計本体: 期間変更時はここだけ差し替わる。取得中は直前の結果を薄く表示したままにする */}
      <div
        aria-busy={isUpdating}
        className={`space-y-6 transition-opacity ${isUpdating ? 'opacity-50 pointer-events-none' : ''}`}
      >
        {data ? (
          <ModelStatisticsPanel modelData={data.models[activeModel]} />
        ) : result === null ? (
          <div className="text-center py-8">
            <p className="text-lg">統計情報を読み込み中...</p>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-lg">統計情報の取得に失敗しました</p>
          </div>
        )}
      </div>
    </div>
  )
}

function ModelStatisticsPanel({ modelData }: { modelData: ModelStatistics }) {
  const { overallStatistics } = modelData

  return (
    <>
      {/* 全体統計 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">総ベット数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStatistics.totalBets}</div>
            <p className="text-xs text-muted-foreground">対象レース: {modelData.totalRaces}レース</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">的中率</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercentage(overallStatistics.hitRate)}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round(overallStatistics.totalBets * overallStatistics.hitRate / 100)} / {overallStatistics.totalBets}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">回収率</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${overallStatistics.returnRate >= 100 ? 'text-green-600' : 'text-red-600'}`}>
              {formatPercentage(overallStatistics.returnRate)}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(overallStatistics.totalReturn)} / {formatCurrency(overallStatistics.totalAmount)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">損益</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${overallStatistics.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(overallStatistics.profit)}
            </div>
            <p className="text-xs text-muted-foreground">
              {overallStatistics.profit >= 0 ? '利益' : '損失'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ベット種別統計 */}
      <Card>
        <CardHeader>
          <CardTitle>ベット種別別統計</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">ベット種別</th>
                  <th className="text-right p-2">ベット数</th>
                  <th className="text-right p-2">的中率</th>
                  <th className="text-right p-2">回収率</th>
                  <th className="text-right p-2">ベット額</th>
                  <th className="text-right p-2">回収額</th>
                  <th className="text-right p-2">損益</th>
                </tr>
              </thead>
              <tbody>
                {overallStatistics.betTypeStats.map((stat) => (
                  <tr key={stat.betType} className="border-b">
                    <td className="p-2 font-medium">{stat.betType}</td>
                    <td className="text-right p-2">{stat.totalBets}</td>
                    <td className="text-right p-2">{formatPercentage(stat.hitRate)}</td>
                    <td className={`text-right p-2 ${stat.returnRate >= 100 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatPercentage(stat.returnRate)}
                    </td>
                    <td className="text-right p-2">{formatCurrency(stat.totalAmount)}</td>
                    <td className="text-right p-2">{formatCurrency(stat.totalReturn)}</td>
                    <td className={`text-right p-2 ${(stat.totalReturn - stat.totalAmount) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(stat.totalReturn - stat.totalAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 最近のレース統計 */}
      <Card>
        <CardHeader>
          <CardTitle>レース別成績（最新10レース）</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">競馬場</th>
                  <th className="text-left p-2">レース名</th>
                  <th className="text-right p-2">ベット数</th>
                  <th className="text-right p-2">的中率</th>
                  <th className="text-right p-2">回収率</th>
                  <th className="text-right p-2">損益</th>
                </tr>
              </thead>
              <tbody>
                {modelData.raceStatistics.slice(0, 10).map((race) => (
                  <tr key={race.raceId} className="border-b">
                    <td className="p-2">{race.track}</td>
                    <td className="p-2">{race.raceName}</td>
                    <td className="text-right p-2">{race.statistics.totalBets}</td>
                    <td className="text-right p-2">{formatPercentage(race.statistics.hitRate)}</td>
                    <td className={`text-right p-2 ${race.statistics.returnRate >= 100 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatPercentage(race.statistics.returnRate)}
                    </td>
                    <td className={`text-right p-2 ${race.statistics.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(race.statistics.profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
