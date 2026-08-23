import { Card, CardContent, CardHeader } from "@/app/components/ui/card"

function Line({ className }: { className: string }) {
  return <div className={`rounded bg-gray-200 ${className}`} />
}

export default function Loading() {
  return (
    <main
      className="container mx-auto min-h-screen bg-gray-50 py-6"
      aria-label="レース情報を読み込み中"
    >
      <div className="animate-pulse space-y-6">
        <Card className="border border-gray-200 bg-white">
          <CardContent className="flex flex-col items-center space-y-4 p-8">
            <Line className="h-12 w-3/4 max-w-xl" />
            <Line className="h-5 w-64" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Line className="h-7 w-28" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 8 }, (_, index) => (
              <Line key={index} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
