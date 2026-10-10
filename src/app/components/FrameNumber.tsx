import { frameColorClass } from "@/app/lib/frameColors"

type FrameNumberProps = {
  /** 枠番（1〜8）。色の決定に使う */
  bracketNumber: number | null | undefined
  /** 表示する番号。省略時は枠番そのもの */
  children?: number | string
  className?: string
}

/** 枠番の色で塗った番号チップ。馬番を枠色で出すときにも使う */
export function FrameNumber({ bracketNumber, children, className = "" }: FrameNumberProps) {
  const label = children ?? bracketNumber ?? "–"
  return (
    <span
      className={`numeric inline-flex size-[30px] shrink-0 items-center justify-center rounded-md text-sm font-semibold ${frameColorClass(bracketNumber)} ${className}`}
    >
      {label}
    </span>
  )
}
