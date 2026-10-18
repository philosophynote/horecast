import Link from "next/link"
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

const FIELD_CLASS =
  "min-h-11 w-full rounded-lg border border-input bg-input-background px-2.5 text-sm text-foreground"
const LABEL_CLASS = "flex flex-col gap-1 text-xs text-muted-foreground"

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
    <label className={LABEL_CLASS} htmlFor={id}>
      {label}
      <select id={id} name={name} defaultValue={value ?? ""} className={FIELD_CLASS}>
        <option value="">{allLabel}</option>
        {choices.map((choice) => (
          <option key={choice.value} value={choice.value}>
            {choice.label}
          </option>
        ))}
      </select>
    </label>
  )
}

/**
 * GETフォームで絞り込む。送信するとURLのクエリが差し替わり、ページはサーバー側で再描画される。
 * ページ番号は送らないので絞り込み直すと1ページ目に戻る。
 */
export function TimeIndexFilterForm({ filter, options, period, version }: Props) {
  const asChoices = (values: string[]) => values.map((value) => ({ value, label: value }))

  return (
    <form
      method="get"
      action="/time-index"
      aria-label="絞り込み"
      className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] items-end gap-3 rounded-xl border border-border bg-card px-5 py-4"
    >
      {filter.horse && <input type="hidden" name={FILTER_PARAM_KEYS.horse} value={filter.horse} />}
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
        label="芝・ダート"
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
        label="馬場"
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
      <label className={LABEL_CLASS} htmlFor="time-index-start">
        期間（開始）
        <input
          id="time-index-start"
          type="date"
          name={FILTER_PARAM_KEYS.startDate}
          defaultValue={period.startDate ?? ""}
          max={period.endDate}
          className={`numeric ${FIELD_CLASS}`}
        />
      </label>
      <label className={LABEL_CLASS} htmlFor="time-index-end">
        期間（終了）
        <input
          id="time-index-end"
          type="date"
          name={FILTER_PARAM_KEYS.endDate}
          defaultValue={period.endDate ?? ""}
          min={period.startDate}
          className={`numeric ${FIELD_CLASS}`}
        />
      </label>
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
      <button
        type="submit"
        className="min-h-11 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
      >
        この条件で表示
      </button>
      <Link
        href="/time-index"
        className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-4 text-sm font-bold text-foreground transition-colors hover:bg-accent"
      >
        条件をリセット
      </Link>
      <p className="col-span-full text-xs text-muted-foreground">
        期間を指定しないときは最新の開催日から1週間分を表示します。片方だけ指定するともう一方は無制限になります。
      </p>
    </form>
  )
}
