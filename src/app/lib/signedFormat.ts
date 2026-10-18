/**
 * 収支・回収率の表示。色だけでは色覚によって見分けにくいので必ず符号を付ける。
 * プラスは ASCII の "+"、マイナスは U+2212 "−"（ハイフンより幅が広く見分けやすい）
 */

export const MINUS_SIGN = "−"

const normalizeZero = (value: number) => (Object.is(value, -0) ? 0 : value)

function signPrefix(value: number): string {
  if (value > 0) return "+"
  if (value < 0) return MINUS_SIGN
  return "±"
}

/** 収支（円）。"+¥2,040" / "−¥400" / "±¥0" */
export function formatSignedYen(amount: number): string {
  const rounded = normalizeZero(Math.round(amount))
  return `${signPrefix(rounded)}¥${Math.abs(rounded).toLocaleString("ja-JP")}`
}

/** 差分の割合（ポイント）。"+12.3%" / "−4.0%" / "±0.0%" */
export function formatSignedPercent(value: number, digits = 1): string {
  const normalized = normalizeZero(value)
  return `${signPrefix(normalized)}${Math.abs(normalized).toFixed(digits)}%`
}

export type SignTone = "positive" | "negative"

/** 収支や回収率が「良い側」かどうか。0 と 100% ちょうどは良い側に倒す */
export function amountTone(amount: number): SignTone {
  return amount >= 0 ? "positive" : "negative"
}

export function returnRateTone(rate: number): SignTone {
  return rate >= 100 ? "positive" : "negative"
}

/** 回収率。100% 以上は "▲ 110.6%"、未満は "▼ 93.9%" */
export function formatReturnRate(rate: number, digits = 1): string {
  const marker = returnRateTone(rate) === "positive" ? "▲" : "▼"
  return `${marker} ${rate.toFixed(digits)}%`
}
