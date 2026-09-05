import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma';
import { matchBetsWithPayouts, calculateStatistics, aggregateStatistics } from '@/app/lib/statistics'
import { toHorsePredictionRanks } from '@/app/lib/horseIndicators'
import { buildRecommendedBetsFromRanks } from '@/app/lib/predictionRecommendations'

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
    const endExclusive = new Date(end)
    if (endDate) {
      endExclusive.setUTCDate(endExclusive.getUTCDate() + 1)
    }
    
    // 指定期間のレースを取得（両モデルの予想とペイアウト情報を含む）
    const races = await prisma.race.findMany({
      where: {
        race_time: {
          gte: start,
          lt: endExclusive
        },
        // 結果未確定のレースを不的中として集計しない
        payouts: { some: {} },
        OR: [
          { recommended_bets: { some: {} } },
          { horse_indicators: { some: { rank: { not: null } } } }
        ]
      },
      include: {
        recommended_bets: true,
        payouts: true,
        horse_indicators: {
          select: {
            horse_number: true,
            rank: true,
            logic_version: true,
            generated_at: true,
            created_at: true
          }
        }
      },
      orderBy: {
        race_time: 'desc'
      }
    })
    
    const raceSummary = (race: typeof races[number], statistics: ReturnType<typeof calculateStatistics>) => ({
      raceId: race.id,
      raceTime: race.race_time,
      track: race.track,
      raceName: race.name,
      statistics
    })

    const originalRaceStatistics = races
      .filter(race => race.recommended_bets.length > 0)
      .map(race => raceSummary(
        race,
        calculateStatistics(matchBetsWithPayouts(race.recommended_bets, race.payouts))
      ))

    const openAiRaceStatistics = races.flatMap(race => {
      const ranks = toHorsePredictionRanks(race.horse_indicators)
      const bets = buildRecommendedBetsFromRanks(ranks)
      if (bets.length === 0) return []

      return [raceSummary(
        race,
        calculateStatistics(matchBetsWithPayouts(bets, race.payouts))
      )]
    })

    const modelStatistics = (raceStatistics: typeof originalRaceStatistics) => ({
      totalRaces: raceStatistics.length,
      overallStatistics: aggregateStatistics(
        raceStatistics.map(race => race.statistics)
      ),
      raceStatistics
    })
    
    return NextResponse.json({
      period: {
        startDate: start.toISOString(),
        endDate: end.toISOString()
      },
      models: {
        original: modelStatistics(originalRaceStatistics),
        openai: modelStatistics(openAiRaceStatistics)
      }
    })
  } catch (error) {
    console.error('Error fetching statistics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    )
  }
}
