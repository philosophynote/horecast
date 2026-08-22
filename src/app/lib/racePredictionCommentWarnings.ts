export type RacePredictionWarning = {
  code: string | null
  message: string
  horseNumber: string | null
}

function stringValue(
  value: Record<string, unknown>,
  key: string
): string | null {
  const property = value[key]
  return typeof property === "string" ? property : null
}

/**
 * DBから受け取ったJSONを画面表示用の警告へ変換する。
 * messageを持たない要素は、壊れたデータを画面へ出さないため除外する。
 */
export function parseRacePredictionWarnings(
  value: unknown
): RacePredictionWarning[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap((warning) => {
    if (warning === null || typeof warning !== "object" || Array.isArray(warning)) {
      return []
    }

    const object = warning as Record<string, unknown>
    const message = stringValue(object, "message")
    if (message === null) {
      return []
    }

    return [{
      code: stringValue(object, "code"),
      message,
      horseNumber: stringValue(object, "horse_number"),
    }]
  })
}
