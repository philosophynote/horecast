import { getRacePredictionComments } from "@/app/lib/racePredictionComments"
import { RacePredictionCommentCard } from "./RacePredictionCommentCard"

type Props = {
  netkeibaRaceId: string
}

function CommentsSection({ children }: { children: React.ReactNode }) {
  return (
    <section aria-labelledby="comments-title" className="flex flex-col gap-3.5">
      <h2 id="comments-title" className="text-xl font-bold">
        AI予想コメント
      </h2>
      <div className="grid max-w-[920px] grid-cols-1 gap-4">{children}</div>
    </section>
  )
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-border px-5 py-6 text-center text-sm text-muted-foreground">
      {children}
    </p>
  )
}

/** 取得中に表示するスケルトン */
export function RacePredictionCommentsSkeleton() {
  return (
    <CommentsSection>
      <div
        className="flex animate-pulse flex-col gap-3 rounded-xl border border-border bg-card p-5"
        aria-label="AI予想コメントを読み込み中"
      >
        <div className="h-4 w-32 rounded bg-muted" />
        <div className="h-3 w-full rounded bg-muted" />
        <div className="h-3 w-11/12 rounded bg-muted" />
        <div className="h-3 w-9/12 rounded bg-muted" />
      </div>
    </CommentsSection>
  )
}

export async function RacePredictionComments({ netkeibaRaceId }: Props) {
  const result = await getRacePredictionComments(netkeibaRaceId)

  if (result.status === "error") {
    // 取得失敗はこの領域だけに閉じ込め、レース詳細画面は表示を続ける
    return (
      <CommentsSection>
        <Notice>AI予想コメントを取得できませんでした</Notice>
      </CommentsSection>
    )
  }

  if (result.comments.length === 0) {
    return (
      <CommentsSection>
        <Notice>このレースのAI予想コメントはまだありません</Notice>
      </CommentsSection>
    )
  }

  return (
    <CommentsSection>
      {result.comments.map((comment) => (
        <RacePredictionCommentCard key={comment.provider} comment={comment} />
      ))}
    </CommentsSection>
  )
}
