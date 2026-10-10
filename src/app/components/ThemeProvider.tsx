"use client"

import { ThemeProvider as NextThemesProvider } from "next-themes"
import type { ReactNode } from "react"

/**
 * ライト／ダークの切替。<html> に class="dark" を付け外しし、
 * 選択は localStorage（key: theme）に保存される。既定は OS 設定に従う。
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider attribute="class" disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  )
}
