import type { Metadata } from "next"
import { StatisticsView } from "@/app/components/StatisticsView"

export const metadata: Metadata = {
  title: "投資成績 - Horecast",
}

// ヘッダーの「投資成績」の着地点。新デザインのダッシュボードは #98 でここに作り直す
export default function StatisticsPage() {
  return (
    <main className="container mx-auto min-h-screen bg-background px-4 py-6">
      <StatisticsView />
    </main>
  )
}
