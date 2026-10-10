"use client"

import { useTheme } from "next-themes"
import { useSyncExternalStore } from "react"

const OPTIONS = [
  { value: "light", label: "ライト" },
  { value: "dark", label: "ダーク" },
] as const

const subscribeNoop = () => () => {}

/**
 * マウント済みかどうか。サーバーとクライアント初回描画は false で揃え、
 * hydration 後に true になる。useEffect + setState は lint（set-state-in-effect）に当たるので使わない
 */
function useMounted() {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  )
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const mounted = useMounted()

  return (
    <div
      role="group"
      aria-label="表示モード"
      className="flex rounded-full border border-border bg-card p-[3px]"
    >
      {OPTIONS.map((option) => {
        const pressed = mounted && resolvedTheme === option.value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={pressed}
            disabled={!mounted}
            onClick={() => setTheme(option.value)}
            className={`min-h-9 rounded-full px-4 text-[13px] font-bold transition-colors ${
              pressed
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
