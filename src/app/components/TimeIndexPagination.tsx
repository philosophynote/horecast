import Link from "next/link"
import type { TimeIndexPage } from "@/app/lib/timeIndex"
import { timeIndexHref, type TimeIndexFilter } from "@/app/lib/timeIndexFilters"

type Props = {
  filter: TimeIndexFilter
  page: Pick<TimeIndexPage, "page" | "pageCount">
}

const LINK_CLASS = "inline-flex min-h-11 items-center rounded-[10px] border border-border px-4 text-sm"

/** 前後のページへ。無い側はリンクにせず薄く出す */
export function TimeIndexPagination({ filter, page }: Props) {
  const hasPrev = page.page > 1
  const hasNext = page.page < page.pageCount

  return (
    <nav aria-label="ページ送り" className="flex justify-end gap-2">
      {hasPrev ? (
        <Link href={`${timeIndexHref(filter, { page: page.page - 1 })}#list`} className={`${LINK_CLASS} text-foreground hover:bg-accent`}>
          ← 前へ
        </Link>
      ) : (
        <span aria-disabled="true" className={`${LINK_CLASS} text-muted-foreground opacity-60`}>
          ← 前へ
        </span>
      )}
      {hasNext ? (
        <Link href={`${timeIndexHref(filter, { page: page.page + 1 })}#list`} className={`${LINK_CLASS} text-foreground hover:bg-accent`}>
          次へ →
        </Link>
      ) : (
        <span aria-disabled="true" className={`${LINK_CLASS} text-muted-foreground opacity-60`}>
          次へ →
        </span>
      )}
    </nav>
  )
}
