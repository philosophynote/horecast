export default function Loading() {
  return (
    <main aria-busy="true" className="container mx-auto space-y-6 px-4 py-8">
      <h1 className="text-[32px] font-bold">騎手成績</h1>
      <p role="status" className="text-muted-foreground">騎手成績を読み込んでいます…</p>
      <div className="h-32 animate-pulse rounded-xl bg-muted" />
      <div className="h-64 animate-pulse rounded-xl bg-muted" />
    </main>
  )
}
