import { RacePredictionComment } from "@prisma/client"
import { prisma } from "@/lib/prisma"

export type RacePredictionCommentView = {
  provider: string
  modelId: string | null
  comment: string
  caveat: string | null
  warnings: string[]
  isPartial: boolean
  generatedAt: string | null
}

/**
 * コメント取得の結果。取得失敗（error）と未生成（comments が空）を区別し、
 * 失敗をレース詳細画面全体の失敗へ波及させない。
 */
export type RacePredictionCommentsResult =
  | { status: "ok"; comments: RacePredictionCommentView[] }
  | { status: "error"; comments: [] }

function generatedTime(comment: RacePredictionComment): number {
  return (comment.generated_at ?? comment.created_at).getTime()
}

/**
 * 同一プロバイダーで prompt_version 違いの行がある場合は、最新の生成結果だけを表示する。
 */
function pickLatestPerProvider(comments: RacePredictionComment[]): RacePredictionComment[] {
  const latestByProvider = new Map<string, RacePredictionComment>()

  comments.forEach((comment) => {
    const current = latestByProvider.get(comment.provider)
    if (!current || generatedTime(comment) > generatedTime(current)) {
      latestByProvider.set(comment.provider, comment)
    }
  })

  return Array.from(latestByProvider.values()).sort((a, b) =>
    a.provider.localeCompare(b.provider)
  )
}

function toView(comment: RacePredictionComment): RacePredictionCommentView {
  return {
    provider: comment.provider,
    modelId: comment.model_id,
    comment: comment.comment,
    caveat: comment.caveat,
    warnings: comment.warnings,
    isPartial: comment.is_partial,
    generatedAt: (comment.generated_at ?? comment.created_at).toISOString(),
  }
}

/**
 * レース全体のLLM予想コメントをプロバイダー単位で取得する。
 * 新しいプロバイダーが増えても取得側の変更は不要。
 */
export async function getRacePredictionComments(
  netkeibaRaceId: string
): Promise<RacePredictionCommentsResult> {
  try {
    const comments = await prisma.racePredictionComment.findMany({
      where: { netkeiba_race_id: netkeibaRaceId },
    })

    // 未生成の場合も成功として空配列を返す（画面側で「予想データなし」を表示する）
    return { status: "ok", comments: pickLatestPerProvider(comments).map(toView) }
  } catch (error) {
    console.error("Failed to fetch race prediction comments", error)
    return { status: "error", comments: [] }
  }
}
