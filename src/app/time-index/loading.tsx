function SkeletonSection({ title }: { title: string }) {
  return (
    <section aria-busy="true" className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-lg font-bold">{title}</h2>
      <div className="mt-3 animate-pulse space-y-3">
        <div className="h-4 w-1/3 rounded bg-muted" />
        <div className="h-24 w-full rounded bg-muted" />
      </div>
    </section>
  )
}

export default function Loading() {
  return (
    <main className="container mx-auto flex min-h-screen flex-col gap-7 bg-background px-4 py-8">
      <div>
        <div className="numeric text-xs tracking-[0.14em] text-muted-foreground">HORECAST TIME INDEX</div>
        <h1 className="mt-1 text-[32px] font-bold leading-tight">タイム指数</h1>
        <p className="mt-1 text-sm text-muted-foreground">読み込み中…</p>
      </div>
      <SkeletonSection title="絞り込み" />
      <SkeletonSection title="一覧" />
      <SkeletonSection title="分布" />
    </main>
  )
}
