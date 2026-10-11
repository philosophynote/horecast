"use client"

import { CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from "recharts"
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/app/components/ui/chart"
import {
  type CumulativePoint,
  type StatisticsModel,
  mergeCumulativeSeries,
  thinDateTicks,
} from "@/app/lib/investmentStats"
import { formatRaceDateMonthDay, formatRaceDateShort } from "@/app/lib/raceList"
import { formatSignedYen } from "@/app/lib/signedFormat"

const CHART_CONFIG = {
  original: { label: "独自予想", color: "var(--primary)" },
  openai: { label: "OpenAI", color: "var(--slow)" },
} satisfies ChartConfig

type CumulativeProfitChartProps = {
  original: CumulativePoint[]
  openai: CumulativePoint[]
  /** 太く描くモデル */
  activeModel: StatisticsModel
}

/** 累積収支の推移。開催日ごとの累積を2モデル並べる */
export function CumulativeProfitChart({ original, openai, activeModel }: CumulativeProfitChartProps) {
  const data = mergeCumulativeSeries(original, openai)
  const ticks = thinDateTicks(data.map((point) => point.date))

  return (
    <section
      aria-labelledby="curve-title"
      className="rounded-xl border border-border bg-card px-5 pb-3 pt-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="curve-title" className="text-lg font-bold">
          累積収支の推移
        </h2>
        <span className="text-xs text-muted-foreground">開催日ごとの累積 · 2モデル比較</span>
      </div>
      {data.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">期間内に確定したレースがありません</p>
      ) : (
        <ChartContainer config={CHART_CONFIG} className="mt-2 aspect-auto h-[300px] w-full" aria-label="累積収支の推移">
          <LineChart data={data} margin={{ top: 12, right: 16, bottom: 4, left: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              ticks={ticks}
              tickFormatter={formatRaceDateShort}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              className="numeric"
            />
            <YAxis
              tickFormatter={(value: number) => formatSignedYen(value)}
              tickLine={false}
              axisLine={false}
              width={72}
              className="numeric"
            />
            <ReferenceLine y={0} strokeDasharray="4 4" className="stroke-muted-foreground" />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(label) => formatRaceDateMonthDay(String(label))}
                  formatter={(value, name, item) => (
                    <div className="flex w-full items-center gap-2">
                      <span className="size-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: item.color }} />
                      <span className="flex-1 text-muted-foreground">
                        {CHART_CONFIG[name as StatisticsModel]?.label ?? name}
                      </span>
                      <span className="numeric font-medium text-foreground">{formatSignedYen(Number(value))}</span>
                    </div>
                  )}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Line
              dataKey="original"
              type="monotone"
              stroke="var(--color-original)"
              strokeWidth={activeModel === "original" ? 3 : 1.5}
              strokeOpacity={activeModel === "original" ? 1 : 0.55}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              dataKey="openai"
              type="monotone"
              stroke="var(--color-openai)"
              strokeWidth={activeModel === "openai" ? 3 : 1.5}
              strokeOpacity={activeModel === "openai" ? 1 : 0.55}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ChartContainer>
      )}
    </section>
  )
}
