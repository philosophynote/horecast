'use client'

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { STALE_REFRESH_DELAY_MS, isRenderStale } from "@/app/lib/staleRender"

type StaleRefresherProps = {
  /** サーバーが描画した時刻（ISO 8601） */
  renderedAt: string
  /** 新鮮とみなす秒数。ページの revalidate と同じ値を渡す */
  maxAgeSeconds: number
}

/**
 * ISR は期限切れのページをまず古いまま返し、裏で作り直す。
 * 古い描画を受け取ったら、作り直しが終わる頃に1回だけ取り直して最新にする。
 * 取り直しても描画時刻が変わらなければ effect は再実行されないので、繰り返さない
 */
export function StaleRefresher({ renderedAt, maxAgeSeconds }: StaleRefresherProps) {
  const router = useRouter()

  useEffect(() => {
    if (!isRenderStale(renderedAt, Date.now(), maxAgeSeconds)) return
    const timer = setTimeout(() => router.refresh(), STALE_REFRESH_DELAY_MS)
    return () => clearTimeout(timer)
  }, [renderedAt, maxAgeSeconds, router])

  return null
}
