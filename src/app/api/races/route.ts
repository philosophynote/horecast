import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import {
  buildRaceListResponse,
  nowAsStoredClock,
  parseRaceDateParam,
  raceDayRange,
} from '@/app/lib/raceList';
import { cdnCacheHeaders, raceListCachePolicy } from '@/app/lib/cdnCache';

type PrismaClient = ReturnType<typeof getPrisma>

/** 日付指定がないときは、今日（保存規約）以降で最も近い開催日、無ければ直近の過去 */
async function resolveDefaultDate(prisma: PrismaClient): Promise<Date> {
  const today = raceDayRange(nowAsStoredClock(new Date())).start

  const nextRace = await prisma.race.findFirst({
    where: { race_time: { gte: today } },
    orderBy: { race_time: 'asc' },
    select: { race_time: true },
  })
  if (nextRace?.race_time) {
    return nextRace.race_time
  }

  const prevRace = await prisma.race.findFirst({
    where: { race_time: { lt: today } },
    orderBy: { race_time: 'desc' },
    select: { race_time: true },
  })
  return prevRace?.race_time ?? today
}

export async function GET(request: Request) {
  const prisma = getPrisma()
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get('date');

  let targetDate: Date
  let requestedDate: Date | null = null
  if (dateParam !== null) {
    const parsed = parseRaceDateParam(dateParam)
    if (!parsed) {
      return NextResponse.json({ error: 'invalid date' }, { status: 400 })
    }
    targetDate = parsed
    requestedDate = parsed
  } else {
    targetDate = await resolveDefaultDate(prisma)
  }

  const { start, end } = raceDayRange(targetDate)

  // 関連は Prisma が関連ごとにまとめて取るので、問い合わせ回数はレース数に比例しない
  const races = await prisma.race.findMany({
    where: { race_time: { gte: start, lte: end } },
    orderBy: { race_time: 'asc' },
    select: {
      id: true,
      track: true,
      number: true,
      name: true,
      course_type: true,
      distance: true,
      race_time: true,
      entries: {
        select: {
          horse_number: true,
          bracket_number: true,
          HorseMaster: { select: { name: true } },
        },
      },
      predicts: { select: { horse_number: true, score: true } },
      horse_indicators: {
        select: {
          horse_number: true,
          rank: true,
          logic_version: true,
          generated_at: true,
          created_at: true,
          base_ability: true,
          condition_fit: true,
          history_count: true,
          time_index_recent: true,
        },
      },
      recommended_bets: { select: { bet_type: true, numbers: true, bet: true } },
      payouts: { select: { bet_type: true, numbers: true, payout: true } },
    },
  });

  // 日付の指定がないときは、次の開催が登録されると返す日付が変わるので短く持つ
  const today = raceDayRange(nowAsStoredClock(new Date())).start
  return NextResponse.json(buildRaceListResponse(start, races), {
    headers: cdnCacheHeaders(raceListCachePolicy(requestedDate, today)),
  });
}
