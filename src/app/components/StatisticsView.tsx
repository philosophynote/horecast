'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from './ui/card'
import { format } from 'date-fns'
import { BetStatistics } from '@/app/lib/statistics'

interface StatisticsData {
  period: {
    startDate: string
    endDate: string
  }
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

export function StatisticsView() {
  const [data, setData] = useState<StatisticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    startDate: format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  })

  const fetchStatistics = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      })
      const response = await fetch(`/api/statistics?${params}`)
      if (response.ok) {
        const statsData = await response.json()
        setData(statsData)
      } else {
        console.error('Failed to fetch statistics')
      }
    } catch (error) {
      console.error('Error fetching statistics:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatistics()
  }, [dateRange])

  const formatCurrency = (amount: number) => {
    return `¥${amount.toLocaleString()}`
  }

  const formatPercentage = (rate: number) => {
    return `${rate.toFixed(1)}%`
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-lg">統計情報を読み込み中...</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-8">
        <p className="text-lg">統計情報の取得に失敗しました</p>
      </div>
    )
  }

  const { overallStatistics } = data

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
              <label className="block text-sm font-medium mb-1">開始日</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">終了日</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="border rounded px-3 py-2"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 全体統計 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">総ベット数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallStatistics.totalBets}</div>
            <p className="text-xs text-muted-foreground">対象レース: {data.totalRaces}レース</p>
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
                {data.raceStatistics.slice(0, 10).map((race) => (
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
    </div>
  )
}