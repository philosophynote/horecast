import Link from "next/link"
import { Button } from "@/app/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card"
import type { TimeIndexFilterOptions } from "@/app/lib/timeIndex"
import {
  CONFIDENCE_LABELS,
  CONFIDENCE_LEVELS,
  FILTER_PARAM_KEYS,
  type Period,
  type TimeIndexFilter,
} from "@/app/lib/timeIndexFilters"

type Props = {
  filter: TimeIndexFilter
  options: TimeIndexFilterOptions
  /** 実際に適用されている期間。未指定時の既定値を入力欄に見せる */
  period: Period
  /** 実際に適用されているバージョン */
  version: string | null
}

const selectClass = "w-full border rounded px-3 py-2 bg-white text-sm"
const labelClass = "block text-sm font-medium mb-1"

function SelectField({
  id,
  name,
  label,
  value,
  choices,
  allLabel = "すべて",
}: {
  id: string
  name: string
  label: string
  value: string | undefined
  choices: Array<{ value: string; label: string }>
  allLabel?: string
}) {
  return (
    <div>
      <label className={labelClass} htmlFor={id}>{label}</label>
      <select id={id} name={name} defaultValue={value ?? ""} className={selectClass}>
        <option value="">{allLabel}</option>
        {choices.map((choice) => (
          <option key={choice.value} value={choice.value}>{choice.label}</option>
        ))}
      </select>
    </div>
  )
}

/**
 * GETフォームで絞り込む。送信するとURLのクエリが差し替わり、ページはサーバー側で再描画される。
 * ページ番号は送らないので絞り込み直すと1ページ目に戻る。
 */
export function TimeIndexFilterForm({ filter, options, period, version }: Props) {
  const asChoices = (values: string[]) => values.map((value) => ({ value, label: value }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>絞り込み</CardTitle>
      </CardHeader>
      <CardContent>
        <form method="get" action="/time-index" className="space-y-4">
          {filter.horse && <input type="hidden" name={FILTER_PARAM_KEYS.horse} value={filter.horse} />}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SelectField
              id="time-index-racecourse"
              name={FILTER_PARAM_KEYS.racecourse}
              label="競馬場"
              value={filter.racecourse}
              choices={asChoices(options.racecourses)}
            />
            <SelectField
              id="time-index-surface"
              name={FILTER_PARAM_KEYS.surface}
              label="芝/ダート"
              value={filter.surface}
              choices={asChoices(options.surfaces)}
            />
            <SelectField
              id="time-index-distance"
              name={FILTER_PARAM_KEYS.distance}
              label="距離"
              value={filter.distance?.toString()}
              choices={options.distances.map((distance) => ({ value: String(distance), label: `${distance}m` }))}
            />
            <SelectField
              id="time-index-class"
              name={FILTER_PARAM_KEYS.className}
              label="クラス"
              value={filter.className}
              choices={asChoices(options.classNames)}
            />
            <SelectField
              id="time-index-going"
              name={FILTER_PARAM_KEYS.going}
              label="馬場状態"
              value={filter.going}
              choices={asChoices(options.goings)}
            />
            <SelectField
              id="time-index-confidence"
              name={FILTER_PARAM_KEYS.confidence}
              label="信頼度"
              value={filter.confidence}
              choices={CONFIDENCE_LEVELS.map((level) => ({ value: level, label: CONFIDENCE_LABELS[level] }))}
            />
            <div>
              <label className={labelClass} htmlFor="time-index-start">開始日</label>
              <input
                id="time-index-start"
                type="date"
                name={FILTER_PARAM_KEYS.startDate}
                defaultValue={period.startDate ?? ""}
                max={period.endDate}
                className={selectClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="time-index-end">終了日</label>
              <input
                id="time-index-end"
                type="date"
                name={FILTER_PARAM_KEYS.endDate}
                defaultValue={period.endDate ?? ""}
                min={period.startDate}
                className={selectClass}
              />
            </div>
            {options.versions.length > 1 && (
              <SelectField
                id="time-index-version"
                name={FILTER_PARAM_KEYS.version}
                label="基準タイムのバージョン"
                value={filter.version}
                choices={asChoices(options.versions)}
                allLabel={`最新（${version ?? "-"}）`}
              />
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit">絞り込む</Button>
            <Button asChild variant="outline">
              <Link href="/time-index">条件をリセット</Link>
            </Button>
            <p className="text-xs text-gray-500">
              期間を指定しないときは最新の開催日から1週間分を表示します。片方だけ指定するともう一方は無制限になります。
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
