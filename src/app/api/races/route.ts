import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get('date');
  
  // 日付指定がない場合は、直近で開催されるレースの日付を取得する
  let targetDate: Date

  if (dateParam) {
    targetDate = new Date(dateParam)
  } else {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // まず今日以降で最も近いレース日を探す
    const nextRace = await prisma.race.findFirst({
      where: {
        race_time: {
          gte: today,
        },
      },
      orderBy: {
        race_time: 'asc',
      },
      select: {
        race_time: true,
      },
    })

    if (nextRace?.race_time) {
      targetDate = nextRace.race_time
    } else {
      // 今後のレースがなければ直近の過去のレース日を取得
      const prevRace = await prisma.race.findFirst({
        where: {
          race_time: {
            lt: today,
          },
        },
        orderBy: {
          race_time: 'desc',
        },
        select: {
          race_time: true,
        },
      })

      targetDate = prevRace?.race_time ?? today
    }
  }
  
  // 指定された日付の00:00:00から23:59:59までのレースを取得
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  const races = await prisma.race.findMany({
    where: {
      race_time: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    orderBy: { race_time: 'asc' },
  });

  return NextResponse.json(races);
}