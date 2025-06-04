import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get('date');
  
  // デフォルトは今日の日付
  const today = new Date();
  const targetDate = dateParam ? new Date(dateParam) : today;
  
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