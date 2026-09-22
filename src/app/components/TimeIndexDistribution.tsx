import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card"
import type { TimeIndexDistribution as Distribution } from "@/app/lib/timeIndex"
import { CONFIDENCE_LABELS, HISTOGRAM_MAX, HISTOGRAM_MIN, isConfidenceLevel } from "@/app/lib/timeIndexFilters"
import { ConfidenceBadge } from "./TimeIndexTable"

const CHART_WIDTH = 640
const CHART_HEIGHT = 220
const PADDING = { top: 12, right: 12, bottom: 28, left: 40 }
const BAR_GAP = 2

function formatNumber(value: number | null, digits = 1): string {
  return value === null ? "-" : value.toFixed(digits)
}

/** 指数の階級ごとの件数を棒グラフにする。単一系列なので凡例は置かず、値は title で読める */
function Histogram({ distribution }: { distribution: Distribution }) {
  const { bins } = distribution
  const maxCount = Math.max(1, ...bins.map((bin) => bin.count))
  const plotWidth = CHART_WIDTH - PADDING.left - PADDING.right
  const plotHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom
  const barWidth = plotWidth / bins.length
  const yTicks = [0, 0.5, 1].map((ratio) => Math.round(maxCount * ratio))
  const xTicks = Array.from({ length: (HISTOGRAM_MAX - HISTOGRAM_MIN) / 10 + 1 }, (_, i) => HISTOGRAM_MIN + i * 10)

  return (
    <svg
      viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
      className="w-full h-auto"
      role="img"
      aria-label="タイム指数の分布"
    >
      {yTicks.map((tick) => {
        const y = PADDING.top + plotHeight - (tick / maxCount) * plotHeight
        return (
          <g key={tick}>
            <line x1={PADDING.left} x2={CHART_WIDTH - PADDING.right} y1={y} y2={y} stroke="#e5e7eb" strokeWidth={1} />
            <text x={PADDING.left - 6} y={y + 4} textAnchor="end" fontSize={11} fill="#6b7280">{tick}</text>
          </g>
        )
      })}
      {bins.map((bin, index) => {
        const height = (bin.count / maxCount) * plotHeight
        const x = PADDING.left + index * barWidth + BAR_GAP / 2
        const y = PADDING.top + plotHeight - height
        return (
          <rect
            key={bin.from}
            x={x}
            y={y}
            width={Math.max(0, barWidth - BAR_GAP)}
            height={height}
            rx={2}
            fill="#3b82f6"
          >
            <title>{`${bin.from}〜${bin.to}: ${bin.count}件`}</title>
          </rect>
        )
      })}
      <line
        x1={PADDING.left}
        x2={CHART_WIDTH - PADDING.right}
        y1={PADDING.top + plotHeight}
        y2={PADDING.top + plotHeight}
        stroke="#9ca3af"
        strokeWidth={1}
      />
      {xTicks.map((tick) => {
        const x = PADDING.left + ((tick - HISTOGRAM_MIN) / (HISTOGRAM_MAX - HISTOGRAM_MIN)) * plotWidth
        return (
          <text key={tick} x={x} y={CHART_HEIGHT - 8} textAnchor="middle" fontSize={11} fill="#6b7280">
            {tick}
          </text>
        )
      })}
    </svg>
  )
}

function ConfidenceBreakdown({ distribution }: { distribution: Distribution }) {
  const total = distribution.totalCount
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b">
          <th className="text-left p-2">信頼度</th>
          <th className="text-right p-2">件数</th>
          <th className="text-right p-2">割合</th>
          <th className="p-2 w-1/3"><span className="sr-only">割合のバー</span></th>
        </tr>
      </thead>
      <tbody>
        {distribution.confidences.map((item) => {
          const ratio = total > 0 ? item.count / total : 0
          const label = isConfidenceLevel(item.confidence) ? CONFIDENCE_LABELS[item.confidence] : item.confidence
          return (
            <tr key={item.confidence} className="border-b">
              <td className="p-2"><ConfidenceBadge confidence={item.confidence} /></td>
              <td className="text-right p-2 tabular-nums">{item.count.toLocaleString()}</td>
              <td className="text-right p-2 tabular-nums">{(ratio * 100).toFixed(1)}%</td>
              <td className="p-2">
                <div className="h-2 w-full rounded bg-gray-100" aria-hidden="true">
                  <div
                    className="h-2 rounded bg-blue-500"
                    style={{ width: `${Math.round(ratio * 100)}%` }}
                    title={`${label}: ${item.count}件`}
                  />
                </div>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

export function TimeIndexDistribution({ distribution }: { distribution: Distribution }) {
  return (
    <Card id="distribution">
      <CardHeader>
        <CardTitle>分布</CardTitle>
        <p className="text-sm text-gray-500">
          絞り込んだ条件の指数のヒストグラム（{HISTOGRAM_MIN}未満と{HISTOGRAM_MAX}以上は両端に含む）と、基準タイムの信頼度の内訳。
          標本が少なく信頼度が低い条件を見つける目的で使う。
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <dt className="text-gray-500">指数あり / 全件</dt>
            <dd className="text-xl font-bold tabular-nums">
              {distribution.indexedCount.toLocaleString()}
              <span className="text-sm font-normal text-gray-500"> / {distribution.totalCount.toLocaleString()}</span>
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">平均</dt>
            <dd className="text-xl font-bold tabular-nums">{formatNumber(distribution.average)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">最小</dt>
            <dd className="text-xl font-bold tabular-nums">{formatNumber(distribution.min)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">最大</dt>
            <dd className="text-xl font-bold tabular-nums">{formatNumber(distribution.max)}</dd>
          </div>
        </dl>
        {distribution.indexedCount === 0 ? (
          <p className="text-center py-4 text-gray-500">指数が算出された行がありません</p>
        ) : (
          <Histogram distribution={distribution} />
        )}
        <ConfidenceBreakdown distribution={distribution} />
      </CardContent>
    </Card>
  )
}
