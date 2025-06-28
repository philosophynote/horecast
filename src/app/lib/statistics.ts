import { RecommendedBet, Payout } from '@prisma/client'

export interface BetStatistics {
  totalBets: number
  totalAmount: number
  totalReturn: number
  hitRate: number // 的中率
  returnRate: number // 回収率
  profit: number
  betTypeStats: BetTypeStatistics[]
}

export interface BetTypeStatistics {
  betType: string
  totalBets: number
  hitBets: number
  totalAmount: number
  totalReturn: number
  hitRate: number
  returnRate: number
}

export interface BetResult {
  recommendedBet: RecommendedBet
  isHit: boolean
  actualPayout: number
}

/**
 * 推奨ベットと公式ペイアウトをマッチングして的中判定を行う
 */
export function matchBetsWithPayouts(
  recommendedBets: RecommendedBet[],
  payouts: Payout[]
): BetResult[] {
  return recommendedBets.map(bet => {
    // 同じbet_typeで同じnumbersの組み合わせを探す
    const matchingPayout = payouts.find(payout => 
      payout.bet_type === bet.bet_type && 
      payout.numbers === bet.numbers
    )
    
    const isHit = !!matchingPayout
    const actualPayout = isHit ? (matchingPayout!.payout / 100) * bet.bet : 0
    
    return {
      recommendedBet: bet,
      isHit,
      actualPayout
    }
  })
}

/**
 * ベット結果から統計情報を計算する
 */
export function calculateStatistics(betResults: BetResult[]): BetStatistics {
  const totalBets = betResults.length
  const totalAmount = betResults.reduce((sum, result) => sum + result.recommendedBet.bet, 0)
  const totalReturn = betResults.reduce((sum, result) => sum + result.actualPayout, 0)
  const hitBets = betResults.filter(result => result.isHit).length
  
  const hitRate = totalBets > 0 ? (hitBets / totalBets) * 100 : 0
  const returnRate = totalAmount > 0 ? (totalReturn / totalAmount) * 100 : 0
  const profit = totalReturn - totalAmount
  
  // ベット種別ごとの統計
  const betTypeGroups = betResults.reduce((groups, result) => {
    const betType = result.recommendedBet.bet_type
    if (!groups[betType]) {
      groups[betType] = []
    }
    groups[betType].push(result)
    return groups
  }, {} as Record<string, BetResult[]>)
  
  const betTypeStats: BetTypeStatistics[] = Object.entries(betTypeGroups).map(([betType, results]) => {
    const typeTotalBets = results.length
    const typeHitBets = results.filter(r => r.isHit).length
    const typeTotalAmount = results.reduce((sum, r) => sum + r.recommendedBet.bet, 0)
    const typeTotalReturn = results.reduce((sum, r) => sum + r.actualPayout, 0)
    const typeHitRate = typeTotalBets > 0 ? (typeHitBets / typeTotalBets) * 100 : 0
    const typeReturnRate = typeTotalAmount > 0 ? (typeTotalReturn / typeTotalAmount) * 100 : 0
    
    return {
      betType,
      totalBets: typeTotalBets,
      hitBets: typeHitBets,
      totalAmount: typeTotalAmount,
      totalReturn: typeTotalReturn,
      hitRate: typeHitRate,
      returnRate: typeReturnRate
    }
  })
  
  return {
    totalBets,
    totalAmount,
    totalReturn,
    hitRate,
    returnRate,
    profit,
    betTypeStats
  }
}

/**
 * 複数のレースの統計情報を集計する
 */
export function aggregateStatistics(statisticsArray: BetStatistics[]): BetStatistics {
  if (statisticsArray.length === 0) {
    return {
      totalBets: 0,
      totalAmount: 0,
      totalReturn: 0,
      hitRate: 0,
      returnRate: 0,
      profit: 0,
      betTypeStats: []
    }
  }
  
  const totalBets = statisticsArray.reduce((sum, stats) => sum + stats.totalBets, 0)
  const totalAmount = statisticsArray.reduce((sum, stats) => sum + stats.totalAmount, 0)
  const totalReturn = statisticsArray.reduce((sum, stats) => sum + stats.totalReturn, 0)
  const profit = totalReturn - totalAmount
  
  const hitRate = totalBets > 0 ? 
    (statisticsArray.reduce((sum, stats) => sum + (stats.hitRate * stats.totalBets), 0) / totalBets) : 0
  const returnRate = totalAmount > 0 ? (totalReturn / totalAmount) * 100 : 0
  
  // ベット種別ごとの統計を集計
  const betTypeGroups: Record<string, BetTypeStatistics[]> = {}
  statisticsArray.forEach(stats => {
    stats.betTypeStats.forEach(betTypeStat => {
      if (!betTypeGroups[betTypeStat.betType]) {
        betTypeGroups[betTypeStat.betType] = []
      }
      betTypeGroups[betTypeStat.betType].push(betTypeStat)
    })
  })
  
  const betTypeStats: BetTypeStatistics[] = Object.entries(betTypeGroups).map(([betType, stats]) => {
    const typeTotalBets = stats.reduce((sum, s) => sum + s.totalBets, 0)
    const typeHitBets = stats.reduce((sum, s) => sum + s.hitBets, 0)
    const typeTotalAmount = stats.reduce((sum, s) => sum + s.totalAmount, 0)
    const typeTotalReturn = stats.reduce((sum, s) => sum + s.totalReturn, 0)
    const typeHitRate = typeTotalBets > 0 ? (typeHitBets / typeTotalBets) * 100 : 0
    const typeReturnRate = typeTotalAmount > 0 ? (typeTotalReturn / typeTotalAmount) * 100 : 0
    
    return {
      betType,
      totalBets: typeTotalBets,
      hitBets: typeHitBets,
      totalAmount: typeTotalAmount,
      totalReturn: typeTotalReturn,
      hitRate: typeHitRate,
      returnRate: typeReturnRate
    }
  })
  
  return {
    totalBets,
    totalAmount,
    totalReturn,
    hitRate,
    returnRate,
    profit,
    betTypeStats
  }
}