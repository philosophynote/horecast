/** ヘッダーのナビ項目。順序はそのまま表示順 */
export const NAV_ITEMS = [
  { href: "/", label: "レース一覧" },
  { href: "/statistics", label: "投資成績" },
  { href: "/time-index", label: "タイム指数" },
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
