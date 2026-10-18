import { CONFIDENCE_LABELS, isConfidenceLevel } from "@/app/lib/timeIndexFilters"

/** 信頼度が高いほど濃い。文字を必ず添え、色だけで区別しない */
const PILL_CLASSES: Record<string, string> = {
  high: "border-muted-foreground text-foreground",
  medium: "border-border text-muted-foreground",
  low: "border-dashed border-border text-muted-foreground",
  unavailable: "border-dashed border-border text-muted-foreground",
}

export function ConfidencePill({ confidence }: { confidence: string }) {
  const label = isConfidenceLevel(confidence) ? CONFIDENCE_LABELS[confidence] : confidence
  const toneClass = PILL_CLASSES[confidence] ?? "border-border text-muted-foreground"
  return (
    <span
      className={`inline-block min-w-7 whitespace-nowrap rounded-full border px-2 py-px text-center text-xs font-bold ${toneClass}`}
    >
      {label}
    </span>
  )
}
