"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { isActiveNavPath, NAV_ITEMS } from "@/app/lib/navigation"
import { ThemeToggle } from "./ThemeToggle"

// next.config で cacheComponents を有効にすると /races/[id] 配下の usePathname が
// Suspense を要求する。今は無効なので対応していない
export function Header() {
  const pathname = usePathname()

  return (
    <header className="border-b border-border bg-background">
      <div className="container mx-auto flex min-h-16 flex-wrap items-center justify-between gap-x-8 gap-y-3 px-4">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
          <Link href="/" className="flex items-center gap-2.5 text-foreground">
            <span aria-hidden="true" className="size-3 rounded-sm bg-primary" />
            <span className="font-mono text-base font-semibold tracking-[0.18em]">HORECAST</span>
            <span className="text-xs text-muted-foreground">AI競馬予想</span>
          </Link>
          <nav aria-label="主要ページ" className="flex flex-wrap gap-1">
            {NAV_ITEMS.map((item) => {
              const active = isActiveNavPath(pathname, item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`border-b-2 px-3 pt-5 pb-4 text-sm transition-colors ${
                    active
                      ? "border-primary font-bold text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>
        <ThemeToggle />
      </div>
    </header>
  )
}
