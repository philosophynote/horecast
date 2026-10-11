import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma';
import { type BetStatistics, matchBetsWithPayouts, calculateStatistics, aggregateStatistics } from '@/app/lib/statistics'
import { toHorsePredictionRanks } from '@/app/lib/horsePredictionRanks'
import { buildRecommendedBetsFromRanks } from '@/app/lib/predictionRecommendations'
import {
  type ModelStatistics,
  type RaceStatisticsInput,
  type StatisticsResponse,
  buildCumulativeProfit,
  buildTrackStatistics,
  resolveStatisticsRange,
  toRaceStatisticsSummary,
} from '@/app/lib/investmentStats'
import { nowAsStoredClock, toStoredDateString } from '@/app/lib/raceList'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const range = resolveStatisticsRange(
      { startDate: searchParams.get('startDate'), endDate: searchParams.get('endDate') },
      nowAsStoredClock(new Date()),
    )
    if (!range) {
      return NextResponse.json({ error: 'invalid date range' }, { status: 400 })
    }

    // 指定期間のレースを取得（両モデルの予想とペイアウト情報を含む）
    const races = await prisma.race.findMany({
      where: {
        race_time: { gte: range.start, lt: range.endExclusive },
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
            created_at: true,
          },
        },
      },
      orderBy: { race_time: 'desc' }
    })

    type RaceRow = (typeof races)[number] & { race_time: Date }
    // where で race_time の範囲を指定しているので null は来ないが、型の上で絞る
    const datedRaces = races.filter((race): race is RaceRow => race.race_time !== null)

    const raceSummary = (race: RaceRow, statistics: BetStatistics): RaceStatisticsInput => ({
      raceId: race.id,
      date: toStoredDateString(race.race_time),
      raceTime: race.race_time.toISOString(),
      track: race.track,
      raceNumber: race.number,
      raceName: race.name,
      statistics,
    })

    const originalRaceStatistics = datedRaces
      .filter(race => race.recommended_bets.length > 0)
      .map(race => raceSummary(race, calculateStatistics(matchBetsWithPayouts(race.recommended_bets, race.payouts))))

    const openAiRaceStatistics = datedRaces.flatMap(race => {
      const ranks = toHorsePredictionRanks(race.horse_indicators)
      const bets = buildRecommendedBetsFromRanks(ranks)
      if (bets.length === 0) return []
      return [raceSummary(race, calculateStatistics(matchBetsWithPayouts(bets, race.payouts)))]
    })

    const modelStatistics = (rows: RaceStatisticsInput[]): ModelStatistics => ({
      totalRaces: rows.length,
      overallStatistics: aggregateStatistics(rows.map(row => row.statistics)),
      raceStatistics: rows.map(row => ({ ...row, statistics: toRaceStatisticsSummary(row.statistics) })),
      trackStatistics: buildTrackStatistics(rows),
      cumulative: buildCumulativeProfit(rows),
    })

    const response: StatisticsResponse = {
      period: { startDate: range.startDate, endDate: range.endDate },
      models: {
        original: modelStatistics(originalRaceStatistics),
        openai: modelStatistics(openAiRaceStatistics),
      },
    }
    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching statistics:', error)
    return NextResponse.json({ error: 'Failed to fetch statistics' }, { status: 500 })
  }
}
