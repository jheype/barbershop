import { prisma } from "@/lib/prisma";

type Day = 0 | 1 | 2 | 3 | 4 | 5 | 6;

type WorkDay = {
  weekday: Day;
  enabled: boolean;
  start: string;
  end: string;
  lunchStart: string;
  lunchEnd: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function isWorkDay(v: unknown): v is WorkDay {
  if (!isRecord(v)) return false;
  const wd = Number(v.weekday);
  return Number.isInteger(wd) && wd >= 0 && wd <= 6;
}

function isoToJsWeekday(weekday: number): Day {
  return ((weekday + 1) % 7) as Day;
}

async function main() {
  const rows = await prisma.barberWorkHours.findMany({
    select: { barberId: true, days: true },
  });

  let changed = 0;

  for (const row of rows) {
    const raw = row.days;
    if (!Array.isArray(raw) || raw.length !== 7) continue;

    const parsed = raw.filter(isWorkDay);
    if (parsed.length !== 7) continue;

    const migrated: WorkDay[] = parsed.map((d) => ({
      ...d,
      weekday: isoToJsWeekday(Number(d.weekday)),
    }));

    migrated.sort((a, b) => a.weekday - b.weekday);

    await prisma.barberWorkHours.update({
      where: { barberId: row.barberId },
      data: { days: migrated as any },
    });

    changed++;
  }

  console.log(`OK. Registros migrados: ${changed}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
