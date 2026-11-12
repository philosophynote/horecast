/**
 * ISR のページは期限が切れても、まず古い描画を返してから裏で作り直す。
 * 久しぶりに開かれたページが古いままにならないよう、描画時刻から古さを判定する。
 */

/** レース詳細を CDN に持たせる秒数。ページの `revalidate` はリテラルで書く決まりなので同じ値を別に書いている */
export const RACE_PAGE_REVALIDATE_SECONDS = 300

/** 作り直しを待ってから取り直すまでの時間 */
export const STALE_REFRESH_DELAY_MS = 4000

/**
 * 描画が期限より古いか。
 * @param renderedAt サーバーが描画した時刻（ISO 8601）
 * @param now 現在時刻（ミリ秒）
 * @param maxAgeSeconds 新鮮とみなす秒数
 */
export function isRenderStale(renderedAt: string, now: number, maxAgeSeconds: number): boolean {
  const renderedMs = Date.parse(renderedAt)
  if (Number.isNaN(renderedMs)) return false
  return now - renderedMs > maxAgeSeconds * 1000
}
