import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    // 2週間より前の開催日は日付選択欄に表示しない。
    // 14日前の日付と未来の開催日は表示対象に含める。
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setUTCHours(0, 0, 0, 0);
    twoWeeksAgo.setUTCDate(twoWeeksAgo.getUTCDate() - 14);

    // レースが存在する日付の一覧を取得（重複なし、降順）
    const raceDates = await prisma.race.findMany({
      where: {
        race_time: {
          not: null,
          gte: twoWeeksAgo,
        },
      },
      select: {
        race_time: true,
      },
      orderBy: {
        race_time: 'desc',
      },
    });

    // 日付のみを抽出し、重複を除去
    const uniqueDates = Array.from(
      new Set(
        raceDates
          .map((race) => race.race_time?.toISOString().split('T')[0])
          .filter((date): date is string => date !== undefined)
      )
    );

    return NextResponse.json(uniqueDates);
  } catch (error) {
    console.error('Error fetching race dates:', error);
    return NextResponse.json({ error: 'Failed to fetch race dates' }, { status: 500 });
  }
}