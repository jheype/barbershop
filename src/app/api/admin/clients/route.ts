import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/requireAdmin";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function str(v: unknown) {
  return typeof v === "string" ? v : "";
}

function toInt(v: unknown, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (guard) return guard;
  try {
    const url = new URL(req.url);
    const q = str(url.searchParams.get("q")).trim();
    const status = str(url.searchParams.get("status")).trim(); // "active" | "inactive" | ""
    const lastVisitDaysRaw = str(url.searchParams.get("lastVisitDays")).trim(); // "7"|"30"|"60"| ""
    const page = Math.max(1, toInt(url.searchParams.get("page"), 1));
    const pageSize = Math.min(50, Math.max(5, toInt(url.searchParams.get("pageSize"), 20)));

    const where: Record<string, unknown> = {};

    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { phoneRaw: { contains: q, mode: "insensitive" } },
        { phoneNormalized: { contains: q, mode: "insensitive" } },
      ];
    }

    if (status === "active") where.active = true;
    if (status === "inactive") where.active = false;

    if (lastVisitDaysRaw === "7" || lastVisitDaysRaw === "30" || lastVisitDaysRaw === "60") {
      const days = Number(lastVisitDaysRaw);
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      where.lastVisitAt = { gte: since };
    }

    const [total, rows] = await Promise.all([
      prisma.client.count({ where }),
      prisma.client.findMany({
        where,
        orderBy: [{ lastVisitAt: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          name: true,
          phoneRaw: true,
          lastVisitAt: true,
          active: true,
        },
      }),
    ]);

    return NextResponse.json({ total, items: rows }, { status: 200 });
  } catch (e: unknown) {
    console.error("GET /api/admin/clients FAILED:", e);
    return NextResponse.json({ error: "Error while  listar clientes." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const guard = await requireAdmin(req);
  if (guard) return guard;
  try {
    const bodyUnknown: unknown = await req.json().catch(() => ({}));
    const body = isRecord(bodyUnknown) ? bodyUnknown : {};

    const name = str(body.name).trim();
    const phoneRaw = str(body.phone).trim();
    const notes = str(body.notes).trim();
    if (notes && (notes.includes("<") || notes.includes(">"))) {
      return NextResponse.json({ error: "Notes devem ser texto puro." }, { status: 400 });
    }

    if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });
    if (!phoneRaw) return NextResponse.json({ error: "Phone is required." }, { status: 400 });

    const phoneNormalized = phoneRaw.replace(/\D+/g, "");
    if (!phoneNormalized) return NextResponse.json({ error: "Invalid phone." }, { status: 400 });

    const created = await prisma.client.create({
      data: {
        name,
        phoneRaw,
        phoneNormalized,
        active: true,
        notes: notes || null,
      },
      select: { id: true },
    });

    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (e: unknown) {
    console.error("POST /api/admin/clients FAILED:", e);
    return NextResponse.json({ error: "Error while creating cliente." }, { status: 500 });
  }
}