import { prisma } from "@/lib/prisma";

const TZ_OFFSET_MIN = -180;
const OID = /^[a-fA-F0-9]{24}$/;

type DayConfig = {
  weekday: number;
  enabled?: boolean;
  start?: string;
  end?: string;
  lunchStart?: string;
  lunchEnd?: string;
};

function toDateKey(d: Date) {
  const shifted = new Date(d.getTime() + TZ_OFFSET_MIN * 60_000);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const day = String(shifted.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toLocalMinsFromDate(d: Date) {
  const utcMins = d.getUTCHours() * 60 + d.getUTCMinutes();
  const localMins = utcMins + TZ_OFFSET_MIN;
  return ((localMins % (24 * 60)) + (24 * 60)) % (24 * 60);
}

function toLocalDayRangeFromDateKey(dateKey: string) {
  const start = new Date(`${dateKey}T00:00:00-03:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function hhmmToMins(v: string) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(v.trim());
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isDayConfigLike(v: unknown): v is DayConfig {
  if (!isRecord(v)) return false;

  const weekday = v.weekday;
  if (typeof weekday !== "number" || !Number.isFinite(weekday)) return false;

  const enabled = v.enabled;
  if (enabled !== undefined && typeof enabled !== "boolean") return false;

  const start = v.start;
  if (start !== undefined && typeof start !== "string") return false;

  const end = v.end;
  if (end !== undefined && typeof end !== "string") return false;

  const lunchStart = v.lunchStart;
  if (lunchStart !== undefined && typeof lunchStart !== "string") return false;

  const lunchEnd = v.lunchEnd;
  if (lunchEnd !== undefined && typeof lunchEnd !== "string") return false;

  return true;
}

function pickDayConfig(days: unknown, weekday: number): DayConfig | null {
  if (!Array.isArray(days)) return null;

  for (const it of days) {
    if (!isDayConfigLike(it)) continue;
    if (it.weekday === weekday) return it;
  }

  return null;
}

function overlap(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && bStart < aEnd;
}

async function getBusinessWindow(dateKey: string, weekday: number) {
  const ov = await prisma.businessDateOverride.findUnique({
    where: { dateKey },
    select: { isClosed: true, openMins: true, closeMins: true },
  });

  if (ov?.isClosed) return { isOpen: false, openMins: 0, closeMins: 0 };

  const bh = await prisma.businessHours.findUnique({
    where: { weekday },
    select: { isOpen: true, openMins: true, closeMins: true },
  });

  const isOpen = (bh?.isOpen ?? true) && !ov?.isClosed;
  const openMins = ov?.openMins ?? bh?.openMins ?? 9 * 60;
  const closeMins = ov?.closeMins ?? bh?.closeMins ?? 18 * 60;

  return { isOpen, openMins, closeMins };
}

async function getBarberWindow(barberId: string, weekday: number) {
  const wh = await prisma.barberWorkHours.findUnique({
    where: { barberId },
    select: { days: true },
  });

  const d = pickDayConfig(wh?.days, weekday);
  if (!d) {
    return {
      enabled: true,
      openMins: null as number | null,
      closeMins: null as number | null,
      lunch: null as null | [number, number],
    };
  }

  if (d.enabled === false) {
    return {
      enabled: false,
      openMins: null,
      closeMins: null,
      lunch: null,
    };
  }

  const openMins = d.start ? hhmmToMins(String(d.start)) : null;
  const closeMins = d.end ? hhmmToMins(String(d.end)) : null;

  const lunchStart = d.lunchStart ? hhmmToMins(String(d.lunchStart)) : null;
  const lunchEnd = d.lunchEnd ? hhmmToMins(String(d.lunchEnd)) : null;

  const lunch =
    lunchStart !== null && lunchEnd !== null && lunchEnd > lunchStart
      ? ([lunchStart, lunchEnd] as [number, number])
      : null;

  return { enabled: true, openMins, closeMins, lunch };
}

async function getServicesOrThrow(serviceIds: string[]) {
  const clean = serviceIds.map((s) => String(s).trim()).filter((s) => OID.test(s));
  if (!clean.length) return { ok: false as const, error: "Services inválidos." };

  const services = await prisma.service.findMany({
    where: { id: { in: clean }, active: true },
    select: { id: true, duration: true },
  });

  if (services.length !== clean.length) return { ok: false as const, error: "Service inválido ou inativo." };

  const totalDuration = services.reduce((a, s) => a + (s.duration || 0), 0) || 30;

  return { ok: true as const, serviceIds: clean, totalDuration };
}

async function validateSkills(barberId: string, serviceIds: string[]) {
  const cnt = await prisma.barberService.count({
    where: { barberId, serviceId: { in: serviceIds } },
  });
  return cnt === serviceIds.length;
}

async function validateResourceCapacity(dateKey: string, serviceIds: string[]) {
  const { start, end } = toLocalDayRangeFromDateKey(dateKey);

  const req = await prisma.serviceResource.findMany({
    where: { serviceId: { in: serviceIds } },
    select: { resourceId: true, unitsRequired: true },
  });

  const needByRes = new Map<string, number>();
  for (const r of req) {
    needByRes.set(r.resourceId, (needByRes.get(r.resourceId) || 0) + r.unitsRequired);
  }

  if (!needByRes.size) return { ok: true as const };

  const dayBookings = await prisma.booking.findMany({
    where: {
      date: { gte: start, lt: end },
      status: { not: "CANCELED" },
    },
    select: {
      services: {
        select: {
          service: {
            select: {
              resources: { select: { resourceId: true, unitsRequired: true } },
            },
          },
        },
      },
    },
  });

  const usedByRes = new Map<string, number>();
  for (const b of dayBookings) {
    for (const bs of b.services) {
      for (const rr of bs.service?.resources || []) {
        usedByRes.set(rr.resourceId, (usedByRes.get(rr.resourceId) || 0) + rr.unitsRequired);
      }
    }
  }

  const resources = await prisma.resource.findMany({
    where: { id: { in: Array.from(needByRes.keys()) }, active: true },
    select: { id: true, dailyCapacity: true },
  });

  const cap = new Map(resources.map((r) => [r.id, r.dailyCapacity]));

  for (const [resId, need] of needByRes.entries()) {
    const used = usedByRes.get(resId) || 0;
    const capacity = cap.get(resId) ?? 0;
    if (used + need > capacity) {
      return { ok: false as const, error: "Limite diário do recurso exclusivo excedido para esta data." };
    }
  }

  return { ok: true as const };
}

async function isBarberFree(barberId: string, dateKey: string, startMins: number, endMins: number) {
  const { start, end } = toLocalDayRangeFromDateKey(dateKey);

  const bookings = await prisma.booking.findMany({
    where: {
      date: { gte: start, lt: end },
      status: { in: ["SCHEDULED", "CONFIRMED"] },
      barberId,
    },
    select: { id: true, date: true },
  });

  if (!bookings.length) return true;

  const bookingIds = bookings.map((b) => b.id);

  const bs = await prisma.bookingService.findMany({
    where: { bookingId: { in: bookingIds } },
    select: { bookingId: true, service: { select: { duration: true } } },
  });

  const durByBooking = new Map<string, number>();
  for (const row of bs) {
    durByBooking.set(
      row.bookingId,
      (durByBooking.get(row.bookingId) || 0) + (row.service?.duration || 0)
    );
  }

  for (const b of bookings) {
    const bStart = toLocalMinsFromDate(new Date(b.date));
    const bDur = (durByBooking.get(b.id) || 0) || 30;
    const bEnd = bStart + bDur;

    if (overlap(startMins, endMins, bStart, bEnd)) return false;
  }

  return true;
}

function withinWindow(startMins: number, endMins: number, openMins: number, closeMins: number) {
  return startMins >= openMins && endMins <= closeMins;
}

export async function computeAvailability(params: {
  dateKey: string;
  barberId?: string | null;
  serviceIds: string[];
  stepMins?: number;
}) {
  const stepMins = params.stepMins ?? 15;

  const weekday = new Date(`${params.dateKey}T12:00:00-03:00`).getDay();

  const svc = await getServicesOrThrow(params.serviceIds);
  if (!svc.ok) return { ok: false as const, error: svc.error };

  const business = await getBusinessWindow(params.dateKey, weekday);
  if (!business.isOpen) return { ok: true as const, slots: [] as string[] };

  const resCap = await validateResourceCapacity(params.dateKey, svc.serviceIds);
  if (!resCap.ok) return { ok: false as const, error: resCap.error };

  const openBase = business.openMins;
  const closeBase = business.closeMins;

  const slots: string[] = [];

  if (params.barberId) {
    const bw = await getBarberWindow(params.barberId, weekday);
    if (!bw.enabled) return { ok: true as const, slots };

    const open = bw.openMins ?? openBase;
    const close = bw.closeMins ?? closeBase;

    const skillsOk = await validateSkills(params.barberId, svc.serviceIds);
    if (!skillsOk) return { ok: true as const, slots };

    for (let t = open; t + svc.totalDuration <= close; t += stepMins) {
      const tEnd = t + svc.totalDuration;

      if (!withinWindow(t, tEnd, openBase, closeBase)) continue;
      if (bw.lunch && overlap(t, tEnd, bw.lunch[0], bw.lunch[1])) continue;

      const free = await isBarberFree(params.barberId, params.dateKey, t, tEnd);
      if (!free) continue;

      const hh = String(Math.floor(t / 60)).padStart(2, "0");
      const mm = String(t % 60).padStart(2, "0");
      slots.push(`${hh}:${mm}`);
    }

    return { ok: true as const, slots };
  }

  const eligible = await prisma.barber.findMany({
    where: { active: true },
    select: { id: true },
  });

  for (let t = openBase; t + svc.totalDuration <= closeBase; t += stepMins) {
    const tEnd = t + svc.totalDuration;

    let anySlot = false;

    for (const b of eligible) {
      const bw = await getBarberWindow(b.id, weekday);
      if (!bw.enabled) continue;

      const open = bw.openMins ?? openBase;
      const close = bw.closeMins ?? closeBase;

      if (!withinWindow(t, tEnd, open, close)) continue;
      if (bw.lunch && overlap(t, tEnd, bw.lunch[0], bw.lunch[1])) continue;

      const skillsOk = await validateSkills(b.id, svc.serviceIds);
      if (!skillsOk) continue;

      const free = await isBarberFree(b.id, params.dateKey, t, tEnd);
      if (!free) continue;

      anySlot = true;
      break;
    }

    if (!anySlot) continue;

    const hh = String(Math.floor(t / 60)).padStart(2, "0");
    const mm = String(t % 60).padStart(2, "0");
    slots.push(`${hh}:${mm}`);
  }

  return { ok: true as const, slots };
}

export async function validateAndPickBarber(params: {
  date: Date;
  barberId?: string | null;
  serviceIds: string[];
}) {
  const dateKey = toDateKey(params.date);
  const weekday = new Date(`${dateKey}T12:00:00-03:00`).getDay();

  const svc = await getServicesOrThrow(params.serviceIds);
  if (!svc.ok) return { ok: false as const, error: svc.error };

  const business = await getBusinessWindow(dateKey, weekday);
  if (!business.isOpen) return { ok: false as const, error: "Não atendemos neste dia." };

  const startMins = toLocalMinsFromDate(params.date);
  const endMins = startMins + svc.totalDuration;

  if (!withinWindow(startMins, endMins, business.openMins, business.closeMins)) {
    return { ok: false as const, error: "Horário fora do funcionamento." };
  }

  const resCap = await validateResourceCapacity(dateKey, svc.serviceIds);
  if (!resCap.ok) return { ok: false as const, error: resCap.error };

  if (params.barberId) {
    const bw = await getBarberWindow(params.barberId, weekday);
    if (!bw.enabled) return { ok: false as const, error: "Barber indisponível neste dia." };

    const open = bw.openMins ?? business.openMins;
    const close = bw.closeMins ?? business.closeMins;

    if (!withinWindow(startMins, endMins, open, close)) {
      return { ok: false as const, error: "Horário fora do expediente do barbeiro." };
    }

    if (bw.lunch && overlap(startMins, endMins, bw.lunch[0], bw.lunch[1])) {
      return { ok: false as const, error: "Horário cruza o almoço do barbeiro." };
    }

    const skillsOk = await validateSkills(params.barberId, svc.serviceIds);
    if (!skillsOk) return { ok: false as const, error: "Barber não executa todos os serviços selecionados." };

    const free = await isBarberFree(params.barberId, dateKey, startMins, endMins);
    if (!free) return { ok: false as const, error: "Horário já ocupado para este barbeiro." };

    return { ok: true as const, barberId: params.barberId, serviceIds: svc.serviceIds, totalDuration: svc.totalDuration };
  }

  const candidates = await prisma.barber.findMany({
    where: { active: true },
    select: { id: true },
  });

  for (const b of candidates) {
    const bw = await getBarberWindow(b.id, weekday);
    if (!bw.enabled) continue;

    const open = bw.openMins ?? business.openMins;
    const close = bw.closeMins ?? business.closeMins;

    if (!withinWindow(startMins, endMins, open, close)) continue;
    if (bw.lunch && overlap(startMins, endMins, bw.lunch[0], bw.lunch[1])) continue;

    const skillsOk = await validateSkills(b.id, svc.serviceIds);
    if (!skillsOk) continue;

    const free = await isBarberFree(b.id, dateKey, startMins, endMins);
    if (!free) continue;

    return { ok: true as const, barberId: b.id, serviceIds: svc.serviceIds, totalDuration: svc.totalDuration };
  }

  return { ok: false as const, error: "No barbeiro disponível para este horário." };
}