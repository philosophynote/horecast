import { NextResponse } from "next/server"
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const id = Number.parseInt(params.id)

  const currentRace = await prisma.race.findUnique({
    where: { id },
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

