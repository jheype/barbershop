import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where =
    from && to
      ? { dateKey: { gte: from, lte: to } }
      : {};

  const items = await prisma.businessDateOverride.findMany({
    where,
    orderBy: { dateKey: "asc" },
  });

  return NextResponse.json(items);
}

export async function PUT(req: Request) {
  const body = await req.json();

  const { dateKey, isClosed, openMins, closeMins } = body;

  if (!dateKey) {
    return NextResponse.json({ error: "dateKey required." }, { status: 400 });
  }

  await prisma.businessDateOverride.upsert({
    where: { dateKey },
    update: {
      isClosed,
      openMins: isClosed ? null : openMins,
      closeMins: isClosed ? null : closeMins,
    },
    create: {
      dateKey,
      isClosed,
      openMins: isClosed ? null : openMins,
      closeMins: isClosed ? null : closeMins,
    },
  });

  return NextResponse.json({ ok: true });
}
