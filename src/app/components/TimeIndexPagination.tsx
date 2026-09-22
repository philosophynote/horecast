import Link from "next/link"
import { Button } from "@/app/components/ui/button"
import type { TimeIndexPage } from "@/app/lib/timeIndex"
import { TIME_INDEX_PAGE_SIZE, timeIndexHref, type TimeIndexFilter } from "@/app/lib/timeIndexFilters"

type Props = {
  filter: TimeIndexFilter
  page: TimeIndexPage
}

export function TimeIndexPagination({ filter, page }: Props) {
  const first = page.total === 0 ? 0 : (page.page - 1) * TIME_INDEX_PAGE_SIZE + 1
  const last = Math.min(page.total, page.page * TIME_INDEX_PAGE_SIZE)
  const hasPrev = page.page > 1
  const hasNext = page.page < page.pageCount

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <p className="text-gray-600 tabular-nums">
        {page.total.toLocaleString()}件中 {first.toLocaleString()}〜{last.toLocaleString()}件
        <span className="ml-2 text-gray-400">({page.page} / {page.pageCount}ページ)</span>
      </p>
      <div className="flex gap-2">
        {hasPrev ? (
          <Button asChild variant="outline" size="sm">
            <Link href={`${timeIndexHref(filter, { page: page.page - 1 })}#list`}>前へ</Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>前へ</Button>
        )}
        {hasNext ? (
          <Button asChild variant="outline" size="sm">
            <Link href={`${timeIndexHref(filter, { page: page.page + 1 })}#list`}>次へ</Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>次へ</Button>
        )}
      </div>
    </div>
  )
}
