/**
 * 手前の CDN に API レスポンスを持たせるためのヘッダー。関数の実行を減らすのが目的。
 * Cloudflare Workers では Worker がキャッシュより手前で動くので、これだけでは CDN に残らない。
 *
 * - `CDN-Cache-Control` は CDN だけが読む。ブラウザには `Cache-Control` の max-age=0 を返し、
 *   画面を開き直せば CDN の最新を取りに行くようにする
 * - クエリ文字列はキャッシュキーに含まれるので、日付や期間ごとに別々に持たれる
 */

export type CdnCachePolicy = {
  /** CDN が新鮮とみなす秒数 */
  maxAge: number
  /** 期限切れ後も古い内容を返しつつ裏で取り直す秒数 */
  staleWhileRevalidate: number
}

/** 当日・未来の開催日や既定の一覧。予想・結果が更新されるので短く持つ（古くても最大2分） */
export const LIVE_RACE_DATA_CACHE: CdnCachePolicy = { maxAge: 60, staleWhileRevalidate: 60 }

/** 確定済みのデータを集計した結果（古くても最大10分） */
export const SETTLED_SUMMARY_CACHE: CdnCachePolicy = { maxAge: 300, staleWhileRevalidate: 300 }

/** 前日以前の開催日。払戻まで出そろってほぼ変わらない（古くても最大2時間） */
export const PAST_RACE_DATA_CACHE: CdnCachePolicy = { maxAge: 3600, staleWhileRevalidate: 3600 }

export function cdnCacheHeaders(policy: CdnCachePolicy): Record<string, string> {
  return {
    'Cache-Control': 'public, max-age=0, must-revalidate',
    'CDN-Cache-Control': `public, max-age=${policy.maxAge}, stale-while-revalidate=${policy.staleWhileRevalidate}`,
  }
}

/**
 * レース一覧の持たせ方。日付を指定されて、それが今日（保存規約）より前なら長く、それ以外は短く持つ。
 * 日付の指定がないときは「直近の開催日」を返すので、次の開催が登録されると答えが変わる。
 * 解決した日付が過去でも短く持つ。
 * @param requestedDate 指定された日付（保存規約の Date）。指定がなければ null
 * @param todayStored 保存規約の今日の 00:00
 */
export function raceListCachePolicy(requestedDate: Date | null, todayStored: Date): CdnCachePolicy {
  if (requestedDate === null) return LIVE_RACE_DATA_CACHE
  return requestedDate.getTime() < todayStored.getTime() ? PAST_RACE_DATA_CACHE : LIVE_RACE_DATA_CACHE
}
