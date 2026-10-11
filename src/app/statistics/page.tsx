import type { Metadata } from "next"
import { InvestmentDashboard } from "@/app/components/InvestmentDashboard"

export const metadata: Metadata = {
  title: "投資成績 - Horecast",
}

export default function StatisticsPage() {
  return (
    <main className="container mx-auto flex min-h-screen flex-col gap-7 bg-background px-4 py-8">
      <div>
        <div className="numeric text-xs tracking-[0.14em] text-muted-foreground">PERFORMANCE</div>
        <h1 className="mt-1 text-[32px] font-bold leading-tight">投資成績</h1>
        <p className="mt-1 text-muted-foreground">AIの推奨馬券を毎レース購入した場合の成績です。確定したレースだけを集計します。</p>
      </div>
      <InvestmentDashboard />
    </main>
  )
}
