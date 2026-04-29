import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function getOneMonthAgo(now: Date): Date {
  const oneMonthAgo = new Date(now);
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  return oneMonthAgo;
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
}
