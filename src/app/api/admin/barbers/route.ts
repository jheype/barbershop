import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/requireAdmin";

const MAX_NAME = 60;
const MAX_EMAIL = 120;
const MAX_WA = 20;

function normStr(v: unknown, max: number) {
  if (typeof v !== "string") return "";
  return v.trim().replace(/\s+/g, " ").slice(0, max);
}

function normEmail(v: unknown) {
  const s = normStr(v, MAX_EMAIL);
  if (!s) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return null;
  return s;
}

function normWhatsApp(v: unknown) {
  const s = normStr(v, MAX_WA);
  if (!s) return null;
  const cleaned = s.replace(/[^\d+]/g, "").slice(0, MAX_WA);
  if (!cleaned) return null;
  return cleaned;
}

function normCPF(v: unknown) {
  const digits = String(v ?? "").replace(/\D/g, "").slice(0, 11);
  if (!digits) return null;
  if (digits.length !== 11) return null;
  return digits;
}

function parseBirthDate(v: unknown) {
  const s = normStr(v, 10); // YYYY-MM-DD
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

type CreateBody = {
  name?: unknown;
  photo?: unknown;
  active?: unknown;
  email?: unknown;
  whatsapp?: unknown;
  cpf?: unknown;
  birthDate?: unknown; 
};

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (guard) return guard;

  try {
    const items = await prisma.barber.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json(items);
  } catch (e) {
    console.error("GET /api/admin/barbers FAILED:", e);
    return NextResponse.json({ error: "Error while loading barbeiros" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const guard = await requireAdmin(req);
  if (guard) return guard;

  try {
    const body: CreateBody = await req.json().catch(() => ({} as CreateBody));

    const name = normStr(body.name, MAX_NAME);
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

    const photo = typeof body.photo === "string" ? body.photo.trim() : "";
    const active = typeof body.active === "boolean" ? body.active : true;

    const email = normEmail(body.email);
    const whatsapp = normWhatsApp(body.whatsapp);
    const cpf = normCPF(body.cpf);
    const birthDate = parseBirthDate(body.birthDate);

    const created = await prisma.barber.create({
      data: {
        name,
        photo,
        active,
        email,
        whatsapp,
        cpf,
        birthDate,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    console.error("POST /api/admin/barbers FAILED:", e);
    return NextResponse.json({ error: "Error while creating barbeiro" }, { status: 500 });
  }
}