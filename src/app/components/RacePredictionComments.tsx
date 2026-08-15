import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Badge } from "@/app/components/ui/badge"
import { formatInTimeZone } from "date-fns-tz"
import {
  getRacePredictionComments,
  RacePredictionCommentView,
} from "@/app/lib/racePredictionComments"

type Props = {
  netkeibaRaceId: string
}

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

function providerName(provider: string): string {
  return PROVIDER_NAMES[provider.toLowerCase()] ?? provider
}

function formatGeneratedAt(generatedAt: string | null): string | null {
  if (!generatedAt) {
    return null
  }
  const date = new Date(generatedAt)
  if (Number.isNaN(date.getTime())) {
    return null
  }
  return formatInTimeZone(date, "Asia/Tokyo", "yyyy年M月d日 HH:mm")
}

function CommentsCard({ children }: { children: React.ReactNode }) {
  return (
    <Card className="mt-8 bg-white border border-gray-200 shadow-sm">
      <CardHeader>
        <CardTitle>AI予想コメント</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

/** 取得中に表示するスケルトン */
export function RacePredictionCommentsSkeleton() {
  return (
    <CommentsCard>
      <div className="animate-pulse space-y-3" aria-label="AI予想コメントを読み込み中">
        <div className="h-4 w-32 rounded bg-gray-200" />
        <div className="h-3 w-full rounded bg-gray-200" />
        <div className="h-3 w-11/12 rounded bg-gray-200" />
        <div className="h-3 w-9/12 rounded bg-gray-200" />
      </div>
    </CommentsCard>
  )
}

function ProviderComment({ comment }: { comment: RacePredictionCommentView }) {
  const generatedAt = formatGeneratedAt(comment.generatedAt)

  return (
    <div className="flex flex-col bg-gray-100 p-4 rounded-lg border border-gray-200">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <h3 className="text-lg font-semibold">{providerName(comment.provider)}</h3>
        {comment.modelId && (
          <Badge variant="outline" className="text-gray-600">
            {comment.modelId}
          </Badge>
        )}
        {comment.isPartial && (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            材料少なめ
          </Badge>
        )}
      </div>
      <p className="flex-1 leading-relaxed whitespace-pre-wrap">{comment.comment}</p>
      {comment.caveat && (
        <p className="mt-3 pt-3 border-t text-sm text-gray-600 whitespace-pre-wrap">
          {comment.caveat}
        </p>
      )}
      {comment.warnings.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm text-gray-600">
          {comment.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}
      {generatedAt && (
        <p className="mt-3 text-xs text-gray-500 text-right">生成: {generatedAt}</p>
      )}
    </div>
  )
}

export async function RacePredictionComments({ netkeibaRaceId }: Props) {
  const result = await getRacePredictionComments(netkeibaRaceId)

  if (result.status === "error") {
    // 取得失敗はこの領域だけに閉じ込め、レース詳細画面は表示を続ける
    return (
      <CommentsCard>
        <p className="text-center text-gray-600">AI予想コメントを取得できませんでした</p>
      </CommentsCard>
    )
  }

  if (result.comments.length === 0) {
    return (
      <CommentsCard>
        <p className="text-center text-gray-600">予想データなし</p>
      </CommentsCard>
    )
  }

  return (
    <CommentsCard>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {result.comments.map((comment) => (
          <ProviderComment key={comment.provider} comment={comment} />
        ))}
      </div>
    </CommentsCard>
  )
}
