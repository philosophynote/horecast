import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  const now = new Date(Date.now());
  // const nextDay = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const races = await prisma.race.findMany({
    // where: {
    //   race_time: {
    //     gte: now,
    //     lt: nextDay,
    //   },
    // },
    orderBy: { race_time: 'asc' },
  });

  return NextResponse.json(races);
}