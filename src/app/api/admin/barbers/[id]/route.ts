import { requireAdmin } from "@/lib/security/requireAdmin";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const OID = /^[a-fA-F0-9]{24}$/;

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

type PatchBody = {
  name?: unknown;
  photo?: unknown;
  active?: unknown;
  email?: unknown;
  whatsapp?: unknown;
  cpf?: unknown;
  birthDate?: unknown; // YYYY-MM-DD
};

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: RouteCtx) {
  const guard = await requireAdmin(req);
  if (guard) return guard;

  const { id } = await ctx.params;
  if (!OID.test(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  try {
    const barber = await prisma.barber.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        photo: true,
        active: true,
        email: true,
        whatsapp: true,
        cpf: true,
        birthDate: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!barber) return NextResponse.json({ error: "Barber not found" }, { status: 404 });
    return NextResponse.json(barber);
  } catch (e) {
    console.error("GET /api/admin/barbers/[id] FAILED:", e);
    return NextResponse.json({ error: "Error while loading barbeiro" }, { status: 500 });
  }
}

export async function PATCH(req: Request, ctx: RouteCtx) {
  const guard = await requireAdmin(req);
  if (guard) return guard;

  const { id } = await ctx.params;
  if (!OID.test(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  try {
    const body: PatchBody = await req.json().catch(() => ({} as PatchBody));

    const data: {
      name?: string;
      photo?: string;
      active?: boolean;
      email?: string | null;
      whatsapp?: string | null;
      cpf?: string | null;
      birthDate?: Date | null;
    } = {};

    if (body.name !== undefined) {
      const name = normStr(body.name, MAX_NAME);
      if (!name) return NextResponse.json({ error: "Invalid name" }, { status: 400 });
      data.name = name;
    }

    if (body.photo !== undefined) {
      data.photo = typeof body.photo === "string" ? body.photo.trim() : "";
    }

    if (body.active !== undefined) {
      if (typeof body.active !== "boolean") {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      data.active = body.active;
    }

    if (body.email !== undefined) data.email = normEmail(body.email);
    if (body.whatsapp !== undefined) data.whatsapp = normWhatsApp(body.whatsapp);
    if (body.cpf !== undefined) data.cpf = normCPF(body.cpf);
    if (body.birthDate !== undefined) data.birthDate = parseBirthDate(body.birthDate);

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nada para atualizar" }, { status: 400 });
    }

    const updated = await prisma.barber.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (e) {
    console.error("PATCH /api/admin/barbers/[id] FAILED:", e);
    return NextResponse.json({ error: "Error while  atualizar barbeiro" }, { status: 500 });
  }
}

export async function DELETE(req: Request, ctx: RouteCtx) {
  const guard = await requireAdmin(req);
  if (guard) return guard;

  const { id } = await ctx.params;
  if (!OID.test(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  try {
    const countBookings = await prisma.booking.count({ where: { barberId: id } });
    if (countBookings > 0) {
      return NextResponse.json(
        { error: "Cannot delete: there are linked bookings." },
        { status: 409 }
      );
    }

    await prisma.barberService.deleteMany({ where: { barberId: id } });
    await prisma.barber.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/admin/barbers/[id] FAILED:", e);
    return NextResponse.json({ error: "Error while  excluir" }, { status: 500 });
  }
}