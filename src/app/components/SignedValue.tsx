import {
  type SignTone,
  amountTone,
  formatReturnRate,
  formatSignedYen,
  returnRateTone,
} from "@/app/lib/signedFormat"

const TONE_CLASS: Record<SignTone, string> = {
  positive: "text-positive",
  negative: "text-negative",
}

type SignedValueProps = {
  className?: string
}

/** 収支（円）。符号と色を必ずセットで出す */
export function SignedYen({ amount, className = "" }: SignedValueProps & { amount: number }) {
  return (
    <span className={`numeric ${TONE_CLASS[amountTone(amount)]} ${className}`}>
      {formatSignedYen(amount)}
    </span>
  )
}

/** 回収率。100% を境に ▲／▼ と色を切り替える */
export function ReturnRate({ rate, className = "" }: SignedValueProps & { rate: number }) {
  return (
    <span className={`numeric ${TONE_CLASS[returnRateTone(rate)]} ${className}`}>
      {formatReturnRate(rate)}
    </span>
  )
}
