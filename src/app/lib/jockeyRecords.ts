import { prisma } from "@/lib/prisma"
import {
  ALL,
  isJockeyRecordTarget,
  toDistanceBand,
  toJockeyRecordLabels,
  type JockeyRecordSummary,
} from "@/app/lib/jockeyRecordLabels"

type RaceCondition = {
  track: string
  course_type: string
  distance: number
}

/**
 * 1レース分の騎手成績を1クエリで取り、出馬表に渡すラベルへ変換する。
 * 障害レースは対象外として null を返し、取得に失敗してもレース詳細画面を落とさず null にする。
 * null のときは出馬表が騎手成績そのものを表示しない。
 */
export async function getJockeyRecordSummary(
  race: RaceCondition,
  jockeyMasterIds: number[]
): Promise<JockeyRecordSummary | null> {
  if (!isJockeyRecordTarget(race.course_type) || jockeyMasterIds.length === 0) {
    return null
  }

  const condition = {
    racecourse: race.track,
    surface: race.course_type,
    distanceBand: toDistanceBand(race.distance),
  }

  try {
    // 落とし先に使う all 行まで含めて1回で取る（騎手1人あたり最大8行）
    const rows = await prisma.jockeyRacecourseRecord.findMany({
      where: {
        period: ALL,
        jockey_master_id: { in: [...new Set(jockeyMasterIds)] },
        racecourse: { in: [condition.racecourse, ALL] },
        surface: { in: [condition.surface, ALL] },
        distance_band: { in: [condition.distanceBand, ALL] },
      },
      select: {
        jockey_master_id: true,
        racecourse: true,
        surface: true,
        distance_band: true,
        rides: true,
        wins: true,
        seconds: true,
        thirds: true,
        generated_at: true,
      },
    })

    const labels = toJockeyRecordLabels(
      jockeyMasterIds,
      rows.flatMap((row) =>
        row.jockey_master_id === null
          ? []
          : [
              {
                jockeyMasterId: row.jockey_master_id,
                racecourse: row.racecourse,
                surface: row.surface,
                distanceBand: row.distance_band,
                rides: row.rides,
                wins: row.wins,
                seconds: row.seconds,
                thirds: row.thirds,
              },
            ]
      ),
      condition
    )
    const generatedAt = rows.reduce<Date | null>(
      (latest, row) => (latest === null || row.generated_at > latest ? row.generated_at : latest),
      null
    )

    return { labels, generatedAt }
  } catch (error) {
    console.error("Failed to fetch jockey racecourse records", error)
    return null
  }
}
