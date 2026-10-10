import { courseTypeColorClass } from "@/app/lib/courseType"

type CourseTypeMarkProps = {
  courseType: string | null | undefined
  /** 印の後ろに添える文字。省略時は種別名。距離を含めたいときに渡す */
  children?: React.ReactNode
  className?: string
}

/** コース種別の印（色付きの丸）と文字。色は丸にだけ付け、文字は通常の文字色のまま */
export function CourseTypeMark({ courseType, children, className = "" }: CourseTypeMarkProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${courseTypeColorClass(courseType)}`} />
      <span>{children ?? courseType ?? "–"}</span>
    </span>
  )
}
