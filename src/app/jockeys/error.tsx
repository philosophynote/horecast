"use client"

import Link from "next/link"

export default function Error({ retry }: { retry: () => void }) {
  return (
    <main className="container mx-auto space-y-4 px-4 py-8">
      <h1 className="text-2xl font-bold">騎手成績を取得できませんでした</h1>
      <p role="alert" className="text-muted-foreground">時間をおいて、もう一度お試しください。</p>
      <div className="flex flex-wrap gap-3">
        <button onClick={() => retry()} className="min-h-11 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground">再読み込み</button>
        <Link href="/jockeys" className="inline-flex min-h-11 items-center rounded-lg border border-border px-4 text-sm">騎手検索へ戻る</Link>
      </div>
    </main>
  )
}
