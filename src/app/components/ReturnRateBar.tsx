import { RETURN_RATE_BASELINE_PERCENT, returnRateBarWidth } from "@/app/lib/investmentStats"
import { returnRateTone } from "@/app/lib/signedFormat"

type ReturnRateBarProps = {
  rate: number
  /** 太さ。大きなタイルは thick */
  size?: "thin" | "thick"
}

/** 回収率の横棒。0〜150% を幅にし、100% の位置に目印。数値は必ず隣に出すので読み上げ対象にしない */
export function ReturnRateBar({ rate, size = "thin" }: ReturnRateBarProps) {
  const tone = returnRateTone(rate)
  return (
    <div
      aria-hidden="true"
      className={`relative rounded-full bg-border ${size === "thick" ? "h-2" : "h-1.5"}`}
    >
      <div
        data-testid="return-rate-fill"
        className={`absolute inset-y-0 left-0 rounded-full ${tone === "positive" ? "bg-positive" : "bg-negative"}`}
        style={{ width: `${returnRateBarWidth(rate)}%` }}
      />
      <div
        className="absolute -inset-y-1 w-0.5 bg-foreground"
        style={{ left: `${RETURN_RATE_BASELINE_PERCENT}%` }}
      />
    </div>
  )
}
