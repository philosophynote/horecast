import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { matchBetsWithPayouts, calculateStatistics, aggregateStatistics } from '@/app/lib/statistics'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    
    // 日付範囲が指定されていない場合は過去30日間をデフォルトとする
    const defaultEndDate = new Date()
    const defaultStartDate = new Date()
    defaultStartDate.setDate(defaultStartDate.getDate() - 30)
    
    const start = startDate ? new Date(startDate) : defaultStartDate
    const end = endDate ? new Date(endDate) : defaultEndDate
    
    // 指定期間のレースを取得（推奨ベットとペイアウト情報を含む）
    const races = await prisma.race.findMany({
      where: {
        race_time: {
          gte: start,
          lte: end
        },
        // 推奨ベットがあるレースのみ
        recommended_bets: {
          some: {}
        }
      },
      include: {
        recommended_bets: true,
        payouts: true
      },
      orderBy: {
        race_time: 'desc'
      }
    })
    
    // 各レースの統計を計算
    const raceStatistics = races.map(race => {
      const betResults = matchBetsWithPayouts(race.recommended_bets, race.payouts)
      return calculateStatistics(betResults)
    })
    
    // 全体の統計を集計
    const overallStatistics = aggregateStatistics(raceStatistics)
    
    return NextResponse.json({
      period: {
        startDate: start.toISOString(),
        endDate: end.toISOString()
      },
      totalRaces: races.length,
      overallStatistics,
      raceStatistics: races.map((race, index) => ({
        raceId: race.id,
        raceTime: race.race_time,
        track: race.track,
        raceName: race.name,
        statistics: raceStatistics[index]
      }))
    })
  } catch (error) {
    console.error('Error fetching statistics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    )
  }
}