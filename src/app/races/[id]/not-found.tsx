import Link from "next/link"

export default function RaceNotFound() {
  return (
    <main className="container mx-auto flex min-h-screen flex-col items-center gap-4 bg-background px-4 py-16">
      <h1 className="text-2xl font-bold">レースが見つかりません</h1>
      <p className="text-sm text-muted-foreground">指定されたレースは存在しないか、削除されています。</p>
      <Link
        href="/"
        className="inline-flex min-h-11 items-center rounded-[10px] bg-primary px-5 text-sm font-bold text-primary-foreground"
      >
        レース一覧へ
      </Link>
    </main>
  )
}
