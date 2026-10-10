/**
 * コース種別（芝・ダート・障害）の印の色。両モード共通。
 * 白地でのコントラストが低いので印（丸）にだけ使い、文字には使わない
 */
const COURSE_TYPE_DOT_CLASSES: Record<string, string> = {
  芝: "bg-course-turf",
  ダート: "bg-course-dirt",
  障害: "bg-course-jump",
}

export const COURSE_TYPE_FALLBACK_CLASS = "bg-muted-foreground"

export function courseTypeColorClass(courseType: string | null | undefined): string {
  if (!courseType) return COURSE_TYPE_FALLBACK_CLASS
  return COURSE_TYPE_DOT_CLASSES[courseType] ?? COURSE_TYPE_FALLBACK_CLASS
}
