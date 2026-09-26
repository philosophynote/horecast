import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card"

function SkeletonCard({ title }: { title: string }) {
  return (
    <Card aria-busy="true">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 animate-pulse">
          <div className="h-4 w-1/3 rounded bg-gray-200" />
          <div className="h-24 w-full rounded bg-gray-100" />
        </div>
      </CardContent>
    </Card>
  )
}

export default function Loading() {
  return (
    <main className="container mx-auto py-6 px-4 min-h-screen bg-gray-50 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">タイム指数</h1>
        <p className="text-sm text-gray-500 mt-1">読み込み中...</p>
      </div>
      <SkeletonCard title="絞り込み" />
      <SkeletonCard title="一覧" />
      <SkeletonCard title="分布" />
    </main>
  )
}
