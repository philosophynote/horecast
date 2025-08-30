import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // レースが存在する日付の一覧を取得（重複なし、降順）
    const raceDates = await prisma.race.findMany({
      where: {
        race_time: {
          not: null,
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
