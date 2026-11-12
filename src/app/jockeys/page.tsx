import type { Metadata } from "next"
import Link from "next/link"
import { JockeyDashboard, JockeySearchForm } from "@/app/components/JockeyDashboard"
import { jockeyDashboardHref, parseJockeyDashboardParams, type JockeySearchParams } from "@/app/lib/jockeyDashboard"
import { getJockeyDashboardData, searchJockeys } from "@/app/lib/jockeyDashboardData"

export const metadata: Metadata = {
  title: "騎手成績 | Horecast",
  description: "騎手名で検索し、競馬場・芝ダート・距離帯ごとの勝率や複勝率を確認する",
}

export default async function JockeysPage({ searchParams }: { searchParams: Promise<JockeySearchParams> }) {
  const { filter, error } = parseJockeyDashboardParams(await searchParams)
  const search = !error && !filter.jockeyId ? await searchJockeys(filter.q) : null
  const selectedId = filter.jockeyId ?? (search?.jockeys.length === 1 && !search.hasMore ? search.jockeys[0].id : undefined)
  const jockey = !error && selectedId ? await getJockeyDashboardData(selectedId) : null

  return (
    <main className="container mx-auto flex min-h-screen flex-col gap-6 bg-background px-4 py-8">
      <section>
        <div className="numeric text-xs tracking-[0.14em] text-muted-foreground">HORECAST JOCKEY RECORDS</div>
        <h1 className="mt-1 text-[32px] font-bold leading-tight">騎手成績</h1>
        <p className="mt-2 text-muted-foreground">気になる騎手を検索して、得意な競馬場や距離帯を確認できます。</p>
      </section>
      <JockeySearchForm q={filter.q} />
      {error ? <p role="alert" className="rounded-xl border border-border bg-card p-5 text-negative">{error}</p> : (
        <>
          {jockey ? <JockeyDashboard jockey={jockey} records={jockey.JockeyRacecourseRecord} filter={filter} /> : selectedId ? (
            <p role="status" className="text-muted-foreground">指定した騎手が見つかりません。騎手名から検索し直してください。</p>
          ) : search && search.jockeys.length > 0 ? (
            <section aria-labelledby="jockey-results" className="rounded-xl border border-border bg-card p-5">
              <h2 id="jockey-results" className="text-lg font-bold">騎手を選択</h2>
              {search.hasMore && <p className="mt-2 text-sm text-muted-foreground">候補が多いため先頭20件を表示しています。名前を追加して絞り込めます。</p>}
              <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {search.jockeys.map((candidate) => (
                  <li key={candidate.id}>
                    <Link href={jockeyDashboardHref(candidate.id, filter.q)} prefetch={false} className="flex min-h-12 items-center justify-between rounded-lg border border-border px-4 py-3 text-sm font-bold hover:bg-accent">
                      {candidate.name}<span aria-hidden="true" className="text-primary">→</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <p role="status" className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
              {filter.q ? "該当する騎手が見つかりません。名前の一部や別の表記で検索してください。" : "騎手名を入力すると成績を表示します。出馬表の騎手名からも開けます。"}
            </p>
          )}
        </>
      )}
    </main>
  )
}
