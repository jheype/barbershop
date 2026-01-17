import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const OID = /^[a-fA-F0-9]{24}$/;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const serviceIdsParam = url.searchParams.get("serviceIds");
  const serviceIds = (serviceIdsParam || "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => OID.test(s));

  try {
    if (serviceIds.length === 0) {
      const all = await prisma.barber.findMany({
        where: { active: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, photo: true },
      });
      return NextResponse.json(all);
    }

    const barbers = await prisma.barber.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      include: { skills: true },
    });

    type Skill = { serviceId: string };
    type BarberWithSkills = { id: string; name: string; photo: string; skills: Skill[] };

    const ok = (barbers as BarberWithSkills[])
      .filter((b) => {
        const set = new Set(b.skills.map((s) => s.serviceId));
        return serviceIds.every((id) => set.has(id));
      })
      .map((b) => ({ id: b.id, name: b.name, photo: b.photo }));

    return NextResponse.json(ok);
  } catch (e) {
    console.error("GET /api/barbers FAILED:", e);
    return NextResponse.json({ error: "Error while loading barbeiros" }, { status: 500 });
  }
}