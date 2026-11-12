/**
 * ヘッダーのナビ項目。順序はそのまま表示順。
 * `prefetch: false` はリクエストごとに関数で描画するページ。全ページのヘッダーから
 * 先読みすると表示のたびに関数を呼ぶので、クリックまで取らない
 */
export const NAV_ITEMS = [
  { href: "/", label: "レース一覧", prefetch: null },
  { href: "/statistics", label: "投資成績", prefetch: null },
  { href: "/time-index", label: "タイム指数", prefetch: false },
  { href: "/jockeys", label: "騎手成績", prefetch: false },
] as const

/**
 * ナビ項目が現在地かどうか。
 * レース一覧（/）はレース詳細（/races/...）でも現在地とみなす。
 * それ以外は完全一致か、その配下（href + "/"）のときだけ現在地にする
 */
export function isActiveNavPath(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/" || pathname.startsWith("/races/")
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}
