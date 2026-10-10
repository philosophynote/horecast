/**
 * 枠番（1〜8）の配色。色は globals.css の --color-frame-N / --color-frame-N-foreground。
 * 1枠（白）はライトの白い面で、2枠（黒）はダークの暗い面でそれぞれ消えるので縁を付ける
 */
const FRAME_CLASSES: Record<number, string> = {
  1: "bg-frame-1 text-frame-1-foreground border border-border dark:border-transparent",
  2: "bg-frame-2 text-frame-2-foreground border border-transparent dark:border-border",
  3: "bg-frame-3 text-frame-3-foreground",
  4: "bg-frame-4 text-frame-4-foreground",
  5: "bg-frame-5 text-frame-5-foreground",
  6: "bg-frame-6 text-frame-6-foreground",
  7: "bg-frame-7 text-frame-7-foreground",
  8: "bg-frame-8 text-frame-8-foreground",
}

/** 枠番が無い・範囲外のときの中立色 */
export const FRAME_FALLBACK_CLASS = "bg-muted text-muted-foreground border border-border"

export function frameColorClass(bracketNumber: number | null | undefined): string {
  if (bracketNumber == null) return FRAME_FALLBACK_CLASS
  return FRAME_CLASSES[bracketNumber] ?? FRAME_FALLBACK_CLASS
}
