/**
 * AI指標の5段目盛り。IndicatorLabel.level（0 が最上位）を塗る pip の数に変換する。
 * スコアはレース内相対値なので数値は出さず、段と文言だけで示す
 */

export const METER_PIP_COUNT = 5

export type MeterLevelCount = 5 | 4

/** 段数ごとの対応表。近走状態は4段しかないので最悪でも2つ塗る */
const FILLED_BY_LEVEL: Record<MeterLevelCount, readonly number[]> = {
  5: [5, 4, 3, 2, 1],
  4: [5, 4, 3, 2],
}

export function meterFilledCount(level: number | null, levelCount: MeterLevelCount = 5): number {
  if (level === null) return 0
  const table = FILLED_BY_LEVEL[levelCount]
  const index = Math.min(Math.max(Math.trunc(level), 0), table.length - 1)
  return table[index]
}

export type MeterTone = "primary" | "foreground" | "muted"

/** 上位2段は強調色、中央は文字色、下位は補助文字色 */
export function meterTone(level: number | null): MeterTone {
  if (level === null) return "muted"
  if (level <= 1) return "primary"
  if (level === 2) return "foreground"
  return "muted"
}
