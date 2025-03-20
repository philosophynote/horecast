import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  const targetDate = new Date('2025-03-16T00:00:00+09:00');

  const races = await prisma.race.findMany({
    where: {
      race_time: {
        gte: targetDate,
      },
    },
    orderBy: { race_time: 'asc' },
  });

  return NextResponse.json(races);
}