import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/clients/phone";
import { validateAndPickBarber } from "@/lib/availability/computeAvailability";
import { clientIpFromRequest, rateLimit } from "@/lib/security/rateLimit";

const OID = /^[a-fA-F0-9]{24}$/;
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;

type BookingPayload = {
  clientName?: unknown;
  clientPhone?: unknown;
  barberId?: unknown;
  serviceIds?: unknown;
  services?: unknown;
  date?: unknown; // supports "YYYY-MM-DD"
  time?: unknown; // supports "HH:mm"
  dateTime?: unknown; // supports ISO
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function parseBookingDate(body: BookingPayload): Date | null {
  const dateTime = typeof body.dateTime === "string" ? body.dateTime.trim() : "";
  if (dateTime) {
    const d = new Date(dateTime);
    if (!Number.isNaN(d.getTime())) return d;
  }

  const dateKey = typeof body.date === "string" ? body.date.trim() : "";
  const time = typeof body.time === "string" ? body.time.trim() : "";

  if (!DATE_KEY.test(dateKey) || !TIME.test(time)) return null;

  const d = new Date(`${dateKey}T${time}:00-03:00`);
  if (Number.isNaN(d.getTime())) return null;

  return d;
}

function parseString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function parseOptionalOid(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = parseString(v).trim();
  if (!s) return null;
  return OID.test(s) ? s : "__INVALID__";
}

function parseServiceIds(body: BookingPayload): string[] {
  const raw = Array.isArray(body.serviceIds)
    ? body.serviceIds
    : Array.isArray(body.services)
    ? body.services
    : [];

  return raw.map((x) => String(x).trim()).filter((id) => OID.test(id));
}

export async function POST(req: Request) {
  try {
    const ip = clientIpFromRequest(req);

    const json: unknown = await req.json().catch(() => null);
    if (!isRecord(json)) {
      return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
    }

    const body: BookingPayload = json;

    const clientName = parseString(body.clientName).trim();
    const clientPhoneRaw = parseString(body.clientPhone).trim();

    const barberIdParsed = parseOptionalOid(body.barberId);
    if (barberIdParsed === "__INVALID__") {
      return NextResponse.json({ error: "Barber invalid." }, { status: 400 });
    }
    const barberId = barberIdParsed;

    const serviceIds = parseServiceIds(body);
    const date = parseBookingDate(body);

    const missing: string[] = [];
    if (!clientName) missing.push("nome");
    if (!clientPhoneRaw) missing.push("telefone");
    if (!serviceIds.length) missing.push("services");
    if (!date) missing.push("data/hora");

    if (missing.length) {
      return NextResponse.json({ error: `Por favor, informe: ${missing.join(", ")}.` }, { status: 400 });
    }

    const phoneObj = normalizePhone(clientPhoneRaw);
    const phone = (phoneObj.normalized || phoneObj.raw || "").trim();

    if (!phone) {
      return NextResponse.json({ error: "Invalid phone." }, { status: 400 });
    }

    // Anti-abuse: IP
    const rlIp = await rateLimit({ key: `booking:ip:${ip}`, windowMs: 5 * 60_000, max: 10 });
    if (!rlIp.ok) {
      const res = NextResponse.json({ error: "Muitas tentativas. Tente novamente em alguns minutos." }, { status: 429 });
      res.headers.set("Retry-After", Math.ceil((rlIp.resetAt - Date.now()) / 1000).toString());
      return res;
    }

    // Anti-abuse: telefone
    const rlPhone = await rateLimit({ key: `booking:phone:${phone}`, windowMs: 10 * 60_000, max: 3 });
    if (!rlPhone.ok) {
      const res = NextResponse.json({ error: "Muitas tentativas para este telefone. Tente novamente mais tarde." }, { status: 429 });
      res.headers.set("Retry-After", Math.ceil((rlPhone.resetAt - Date.now()) / 1000).toString());
      return res;
    }

    const v = await validateAndPickBarber({ date: date!, barberId, serviceIds });
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: 409 });

    const booking = await prisma.$transaction(async (tx) => {
      const created = await tx.booking.create({
        data: {
          date: date!,
          barberId: v.barberId,
          status: "SCHEDULED",
          clientName,
          clientPhone: phone,
        },
        select: { id: true },
      });

      await tx.bookingService.createMany({
        data: v.serviceIds.map((sid) => ({ bookingId: created.id, serviceId: sid })),
      });

      return created;
    });

    return NextResponse.json({ id: booking.id }, { status: 201 });
  } catch (e) {
    console.error("POST /api/bookings FAILED:", e);
    return NextResponse.json({ error: "Error interno ao criar agendamento." }, { status: 500 });
  }
}