function Line({ className }: { className: string }) {
  return <div className={`rounded bg-muted ${className}`} />
}

function Panel({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={`rounded-xl border border-border bg-card p-5 ${className ?? ""}`}>{children}</div>
}

export default function Loading() {
  return (
    <main
      className="container mx-auto flex min-h-screen animate-pulse flex-col gap-7 bg-background px-4 py-6"
      aria-label="レース情報を読み込み中"
    >
      <div className="flex flex-col gap-3 border-b border-border pb-6">
        <Line className="h-4 w-48" />
        <Line className="h-11 w-3/4 max-w-xl" />
        <Line className="h-5 w-64" />
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] gap-4">
        <Panel>
          <Line className="mb-3 h-5 w-24" />
          <Line className="mb-2 h-8 w-full" />
          <Line className="mb-2 h-8 w-full" />
        </Panel>
        <Panel>
          <Line className="mb-3 h-5 w-24" />
          <Line className="mb-2 h-8 w-full" />
          <Line className="mb-2 h-8 w-full" />
        </Panel>
      </div>
      <Panel>
        <Line className="mb-4 h-6 w-40" />
        {Array.from({ length: 8 }, (_, index) => (
          <Line key={index} className="mb-2 h-10 w-full" />
        ))}
      </Panel>
    </main>
  )
}
