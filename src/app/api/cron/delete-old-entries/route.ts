import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function getOneMonthAgo(now: Date): Date {
  const targetMonthIndex = now.getMonth() - 1;
  const lastDayOfTargetMonth = new Date(
    now.getFullYear(),
    targetMonthIndex + 1,
    0
  ).getDate();
  const targetDay = Math.min(now.getDate(), lastDayOfTargetMonth);

  return new Date(
    now.getFullYear(),
    targetMonthIndex,
    targetDay,
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
    now.getMilliseconds()
  );
}

function isAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get('authorization');

  return Boolean(cronSecret && authorization === `Bearer ${cronSecret}`);
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: '認証に失敗しました' }, { status: 401 });
  }

  const deletionCutoff = getOneMonthAgo(new Date());

  try {
    const result = await prisma.entry.deleteMany({
      where: {
        created_at: {
          lt: deletionCutoff,
        },
      },
    });

    return NextResponse.json({
      deletedCount: result.count,
      deletionCutoff: deletionCutoff.toISOString(),
    });
  } catch {
    return NextResponse.json(
      { error: '古い出馬表の削除に失敗しました' },
      { status: 500 }
    );
  }
}
