import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Payload = {
  weekdays: number[];
  isOpen: boolean;
  openMins: number | null;
  closeMins: number | null;
};

function isInt(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n);
}

function clampMins(n: number) {
  if (n < 0) return 0;
  if (n > 24 * 60) return 24 * 60;
  return n;
}

export async function GET() {
  const hours = await prisma.businessHours.findMany({
    orderBy: { weekday: "asc" },
  });

  return NextResponse.json(hours);
}

export async function PUT(req: Request) {
  let body: Payload;
  try {
    body = (await req.json()) as Payload;
  } catch {
    return NextResponse.json({ error: "JSON invalid." }, { status: 400 });
  }

  if (!Array.isArray(body.weekdays) || body.weekdays.length === 0) {
    return NextResponse.json({ error: "Dias invalid." }, { status: 400 });
  }

  for (const d of body.weekdays) {
    if (!isInt(d) || d < 0 || d > 6) {
      return NextResponse.json({ error: "Dia da semana invalid." }, { status: 400 });
    }
  }

  if (typeof body.isOpen !== "boolean") {
    return NextResponse.json({ error: "isOpen invalid." }, { status: 400 });
  }

  let openMins = 0;
  let closeMins = 0;

  if (body.isOpen) {
    if (!isInt(body.openMins) || !isInt(body.closeMins)) {
      return NextResponse.json({ error: "openMins/closeMins invalid." }, { status: 400 });
    }

    openMins = clampMins(body.openMins);
    closeMins = clampMins(body.closeMins);

    if (openMins >= closeMins) {
      return NextResponse.json({ error: "Invalid time: openMins must be less than closeMins." }, { status: 400 });
    }
  }

  await prisma.$transaction(
    body.weekdays.map((weekday) =>
      prisma.businessHours.upsert({
        where: { weekday },
        update: {
          isOpen: body.isOpen,
          openMins,
          closeMins,
        },
        create: {
          weekday,
          isOpen: body.isOpen,
          openMins,
          closeMins,
        },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
