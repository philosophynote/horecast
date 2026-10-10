import { formatInTimeZone } from "date-fns-tz"
import type { RacePredictionCommentView } from "@/app/lib/racePredictionComments"

/**
 * 表示名の対応が無いプロバイダーは識別子をそのまま表示する。
 * 新しいLLMが増えてもUIの変更なしにカードが追加される。
 */
const PROVIDER_NAMES: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Claude",
  claude: "Claude",
  google: "Gemini",
  gemini: "Gemini",
}

export function providerName(provider: string): string {
  return PROVIDER_NAMES[provider.toLowerCase()] ?? provider
}

/** generated_at は timestamptz なので JST で整形する */
export function formatGeneratedAt(generatedAt: string): string | null {
  const date = new Date(generatedAt)
  if (Number.isNaN(date.getTime())) {
    return null
  }
  return formatInTimeZone(date, "Asia/Tokyo", "yyyy/MM/dd HH:mm")
}

function SparkIcon() {
  return (
    <span className="flex size-7 items-center justify-center rounded-lg border border-border bg-muted">
      <svg
        width={16}
        height={16}
        viewBox="0 0 24 24"
        fill="none"
        className="stroke-primary"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 3v3M12 18v3M3 12h3M18 12h3M6.3 6.3l2.1 2.1M15.6 15.6l2.1 2.1M6.3 17.7l2.1-2.1M15.6 8.4l2.1-2.1" />
      </svg>
    </span>
  )
}

function WarningIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="mt-0.5 shrink-0"
    >
      <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
    </svg>
  )
}

/** プロバイダー1件分の予想コメント */
export function RacePredictionCommentCard({ comment }: { comment: RacePredictionCommentView }) {
  const generatedAt = formatGeneratedAt(comment.generatedAt)
  const hasFooter = comment.caveat || comment.warnings.length > 0

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center gap-2.5">
        <SparkIcon />
        <h3 className="text-base font-bold">{providerName(comment.provider)}</h3>
        {comment.modelId && (
          <span className="numeric rounded-md border border-border px-2 text-xs text-muted-foreground">{comment.modelId}</span>
        )}
        {comment.isPartial && (
          <span className="rounded-md border border-warning px-2 text-xs text-warning">材料少なめ</span>
        )}
      </div>
      <p className="whitespace-pre-wrap text-[15px] leading-[1.85]">{comment.comment}</p>
      {hasFooter && (
        <div className="flex flex-col gap-1.5 border-t border-border pt-3 text-[13px] text-muted-foreground">
          {comment.caveat && <p className="whitespace-pre-wrap">{comment.caveat}</p>}
          {comment.warnings.map((warning, index) => (
            <p
              key={`${warning.code ?? "warning"}-${warning.horseNumber ?? "race"}-${index}`}
              className="flex items-start gap-2 text-warning"
            >
              <WarningIcon />
              <span>{warning.message}</span>
            </p>
          ))}
        </div>
      )}
      {generatedAt && <p className="numeric text-right text-[11px] text-muted-foreground">生成 {generatedAt}</p>}
    </article>
  )
}
