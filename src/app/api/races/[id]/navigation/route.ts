import { NextResponse } from "next/server"
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request, 
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const currentRace = await prisma.race.findUnique({
    where: { id: Number(id) },
    select: { race_time: true },
  })

  if (!currentRace || currentRace.race_time === null) {
    return NextResponse.json({ error: "Race not found or race time is null" }, { status: 404 })
  }

  const prevRace = await prisma.race.findFirst({
    where: {
      race_time: {
        lt: currentRace.race_time,
      },
    },
    orderBy: {
      race_time: "desc",
    },
    select: { id: true },
  })

  const nextRace = await prisma.race.findFirst({
    where: {
      race_time: {
        gt: currentRace.race_time,
      },
    },
    orderBy: {
      race_time: "asc",
    },
    select: { id: true },
  })

  return NextResponse.json({ prevRaceId: prevRace?.id, nextRaceId: nextRace?.id })
}
