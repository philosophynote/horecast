import { describe, expect, it } from 'vitest'
import {
  LIVE_RACE_DATA_CACHE,
  PAST_RACE_DATA_CACHE,
  cdnCacheHeaders,
  raceListCachePolicy,
} from './cdnCache'

describe('cdnCacheHeaders', () => {
  it('CDN だけに秒数を伝え、ブラウザには毎回取り直させる', () => {
    expect(cdnCacheHeaders({ maxAge: 60, staleWhileRevalidate: 300 })).toEqual({
      'Cache-Control': 'public, max-age=0, must-revalidate',
      'CDN-Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
    })
  })
})

describe('raceListCachePolicy', () => {
  const today = new Date('2026-11-12T00:00:00.000Z')

  it('前日以前の開催日は長く持つ', () => {
    expect(raceListCachePolicy(new Date('2026-11-11T00:00:00.000Z'), today)).toBe(PAST_RACE_DATA_CACHE)
  })

  it('当日は結果が入るので短く持つ', () => {
    expect(raceListCachePolicy(new Date('2026-11-12T00:00:00.000Z'), today)).toBe(LIVE_RACE_DATA_CACHE)
  })

  it('当日中の発走時刻でも当日として扱う', () => {
    expect(raceListCachePolicy(new Date('2026-11-12T15:30:00.000Z'), today)).toBe(LIVE_RACE_DATA_CACHE)
  })

  it('日付の指定がなければ短く持つ（直近の開催日が過去でも、次の開催が登録されると変わる）', () => {
    expect(raceListCachePolicy(null, today)).toBe(LIVE_RACE_DATA_CACHE)
  })

  it('未来の開催日も短く持つ', () => {
    expect(raceListCachePolicy(new Date('2026-11-15T00:00:00.000Z'), today)).toBe(LIVE_RACE_DATA_CACHE)
  })
})
