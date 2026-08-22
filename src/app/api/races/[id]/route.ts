import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const race = await prisma.race.findFirst({
    where: { id: Number(id) },
    include: {
      entries: {
        include: {
          HorseMaster: true,
          JockeyMaster: true,
        },
      },
      predicts: true,
      results: true,
      payouts: true,
      recommended_bets: true,
    },
  });

  if (!race) {
    return NextResponse.json({ error: 'Race not found' }, { status: 404 });
  }

  return NextResponse.json(race);
}
