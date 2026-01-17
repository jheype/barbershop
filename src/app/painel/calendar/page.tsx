"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import BookingEditorModal from "@/components/admin/BookingEditorModal";
import { Skeleton } from "@/components/ui/Skeleton";

type Barber = { id: string; name: string; photo: string };
type Service = {
  id: string;
  name: string;
  price: number;
  duration: number;
  category?: string | null;
  description?: string | null;
  active: boolean;
};
type BookingStatus = "SCHEDULED" | "CONFIRMED" | "DONE" | "CANCELED";
type Booking = {
  id: string;
  clientName: string;
  clientPhone?: string | null;
  date: string;
  barberId?: string | null;
  barber?: { id: string; name: string; photo: string } | null;
  status: BookingStatus;
  services: { service: Service | null }[];
};

const HOUR_START = 7;
const HOUR_END = 23;
const SLOT_MIN = 30;

function startOfWeekLocal(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  return d;
}

function addDaysLocal(d: Date, qty: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + qty);
  return x;
}

function fmtYMDLocal(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function localYMDFromISO(iso: string) {
  const dt = new Date(iso);
  return fmtYMDLocal(dt);
}

function toLocalHHmm(d: Date) {
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function totalDurationMin(b: Booking) {
  const sum = b.services.reduce((a, s) => a + (s.service?.duration ?? 0), 0);
  return sum > 0 ? sum : 30;
}

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

function statusColors(s: BookingStatus) {
  switch (s) {
    case "CONFIRMED":
      return { border: "border-emerald-500", pillBg: "bg-emerald-500/15", pillText: "text-emerald-300" };
    case "DONE":
      return { border: "border-sky-500", pillBg: "bg-sky-500/15", pillText: "text-sky-300" };
    case "CANCELED":
      return { border: "border-rose-500", pillBg: "bg-rose-500/15", pillText: "text-rose-300" };
    default:
      return { border: "border-indigo-500", pillBg: "bg-indigo-500/15", pillText: "text-indigo-300" };
  }
}

function statusLabel(s: BookingStatus) {
  if (s === "SCHEDULED") return "Scheduled";
  if (s === "CONFIRMED") return "Confirmed";
  if (s === "DONE") return "Completed";
  return "Canceled";
}

export default function AdminCalendarPage() {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<string>("");
  const [selectedService, setSelectedService] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "ALL">("ALL");

  const [anchor, setAnchor] = useState(() => startOfWeekLocal(new Date()));
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDaysLocal(anchor, i)), [anchor]);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorBooking, setEditorBooking] = useState<Booking | null>(null);

  const loadBarbers = useCallback(async () => {
    const res = await fetch("/api/barbers");
    const data = await res.json();
    setBarbers(Array.isArray(data) ? data : []);
  }, []);

  const loadServices = useCallback(async () => {
    const params = new URLSearchParams({ page: "1", pageSize: "200" });
    const res = await fetch(`/api/services?${params.toString()}`);
    const data = await res.json();
    const items: Service[] = Array.isArray(data?.items) ? data.items : [];
    setServices(items);
  }, []);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        start: fmtYMDLocal(weekDays[0]),
        end: fmtYMDLocal(addDaysLocal(weekDays[6], 1)),
      });
      if (selectedBarber) params.set("barberId", selectedBarber);
      if (selectedService) params.set("serviceId", selectedService);
      if (statusFilter !== "ALL") params.set("status", statusFilter);

      const res = await fetch(`/api/admin/calendar?${params.toString()}`);
      const data: Booking[] = await res.json();
      setBookings(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, [weekDays, selectedBarber, selectedService, statusFilter]);

  useEffect(() => {
    loadBarbers();
    loadServices();
  }, [loadBarbers, loadServices]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const input =
    "w-full rounded-md border border-[#2A2E36] bg-[#111318] text-white placeholder:text-[#9AA0A6] focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/40 p-2";
  const btnGhost =
    "px-3 py-2 rounded-md border border-[#2A2E36] text-[#E4E7EC] hover:bg-[#1A1C1F] transition";

  const hours = useMemo(() => {
    const out: { label: string; minutes: number }[] = [];
    for (let h = HOUR_START; h < HOUR_END; h++) {
      for (let m = 0; m < 60; m += SLOT_MIN) {
        const label = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        out.push({ label, minutes: (h - HOUR_START) * 60 + m });
      }
    }
    return out;
  }, []);

  const dayCols = 7;

  function openEditor(b: Booking) {
    setEditorBooking(b);
    setEditorOpen(true);
  }

  function closeEditor() {
    setEditorOpen(false);
  }

  async function handleSavedOrDeleted() {
    await loadBookings();
  }

  const bookingsByLocalDay = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const b of bookings) {
      const ymd = localYMDFromISO(b.date);
      const arr = map.get(ymd) ?? [];
      arr.push(b);
      map.set(ymd, arr);
    }
    for (const [k, arr] of map) {
      arr.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      map.set(k, arr);
    }
    return map;
  }, [bookings]);

  return (
    <div className="min-h-[100dvh] px-4 py-6 max-w-7xl mx-auto text-white space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <h1 className="text-3xl font-extrabold">Calendar (Weekly)</h1>
          <p className="text-sm text-[#C9CDD3]">Status with colours and filter by status.</p>
        </div>

        <div className="flex items-center gap-2">
          <button className={btnGhost} onClick={() => setAnchor(addDaysLocal(anchor, -7))}>
            ← Previous Week
          </button>
          <button className={btnGhost} onClick={() => setAnchor(startOfWeekLocal(new Date()))}>
            Today
          </button>
          <button className={btnGhost} onClick={() => setAnchor(addDaysLocal(anchor, 7))}>
            Next Week →
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-[#24272D] bg-[#0F1115] p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <label className="block text-sm text-[#C9CDD3] mb-1">Barber</label>
            <select className={input} value={selectedBarber} onChange={(e) => setSelectedBarber(e.target.value)}>
              <option value="">All</option>
              {barbers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-[#C9CDD3] mb-1">Service</label>
            <select className={input} value={selectedService} onChange={(e) => setSelectedService(e.target.value)}>
              <option value="">All</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-[#C9CDD3] mb-1">Status</label>
            <select
              className={input}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as BookingStatus | "ALL")}
            >
              <option value="ALL">All</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="DONE">Completed</option>
              <option value="CANCELED">Canceled</option>
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button className={btnGhost} onClick={loadBookings}>
              Refresh
            </button>
            <button
              className={btnGhost}
              onClick={() => {
                setSelectedBarber("");
                setSelectedService("");
                setStatusFilter("ALL");
                loadBookings();
              }}
            >
              Clear
            </button>
          </div>

          <div className="text-sm text-[#9AA0A6] md:text-right flex md:justify-end items-end">
            {weekDays[0].toLocaleDateString("en-GB")} – {weekDays[6].toLocaleDateString("en-GB")}
          </div>
        </div>
      </div>

      {/* Mobile: agenda view */}
      <div className="md:hidden rounded-xl border border-[#24272D] bg-[#0F1115] overflow-hidden">
        <div className="p-4 border-b border-[#24272D] flex items-center justify-between">
          <div>
            <div className="text-sm text-[#C9CDD3]">Agenda of the week</div>
            <div className="text-xs text-[#9AA0A6]">
              Tap on a card to edit (rebook/cancel/finalise/payment).
            </div>
          </div>
          <button className={btnGhost} onClick={loadBookings}>
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-4 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        ) : (
          <div className="divide-y divide-[#24272D]">
            {weekDays.map((day) => {
              const ymd = fmtYMDLocal(day);
              const dayBookings = bookingsByLocalDay.get(ymd) ?? [];
              return (
                <div key={ymd} className="p-4">
                  <div className="flex items-baseline justify-between mb-3">
                    <div className="font-semibold">
                      {day.toLocaleDateString("en-GB", { weekday: "long" })}
                    </div>
                    <div className="text-xs text-[#9AA0A6]">
                      {day.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit" })}
                    </div>
                  </div>

                  {dayBookings.length === 0 ? (
                    <div className="text-sm text-[#9AA0A6]">No scheduling.</div>
                  ) : (
                    <div className="space-y-2">
                      {dayBookings.map((b) => {
                        const dt = new Date(b.date);
                        const labelSvc =
                          b.services.map((s) => s.service?.name).filter(Boolean).join(", ") || "Service(s)";
                        const labelBarber = b.barber?.name || "Sem barbeiro";
                        const c = statusColors(b.status);

                        return (
                          <button
                            key={b.id}
                            onClick={() => openEditor(b)}
                            className={`w-full text-left rounded-lg border ${c.border} bg-[#111318] hover:bg-[#131720] transition p-3`}
                            title={`${labelSvc} • ${toLocalHHmm(dt)} (${labelBarber})`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-sm font-semibold truncate">{labelSvc}</div>
                                <div className="text-xs text-[#C9CDD3] truncate">
                                  {toLocalHHmm(dt)} • {b.clientName}
                                </div>
                                <div className="text-xs text-[#9AA0A6] truncate">{labelBarber}</div>
                              </div>

                              <span className={`shrink-0 px-2 py-1 rounded text-[11px] ${c.pillBg} ${c.pillText}`}>
                                {statusLabel(b.status)}
                              </span>
                            </div>

                            <div className="mt-2 h-0.5 w-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 rounded" />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Desktop: grid view */}
      <div className="hidden md:block rounded-xl border border-[#24272D] bg-[#0F1115] overflow-hidden">
        <div className="grid" style={{ gridTemplateColumns: `120px repeat(${dayCols}, 1fr)` }}>
          <div className="bg-[#12141A] border-b border-[#24272D] p-3 text-sm text-[#C9CDD3]">Horário</div>
          {weekDays.map((d, i) => (
            <div key={i} className="bg-[#12141A] border-b border-l border-[#24272D] p-3">
              <div className="text-xs text-[#9AA0A6]">{d.toLocaleDateString("en-GB", { weekday: "long" })}</div>
              <div className="text-white">{d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit" })}</div>
            </div>
          ))}
        </div>

        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-[120px] border-r border-[#24272D]">
            {hours.map((h, idx) => (
              <div
                key={idx}
                className="text-xs text-[#9AA0A6] px-2"
                style={{ height: "28px", display: "flex", alignItems: "flex-start" }}
              >
                {h.label}
              </div>
            ))}
          </div>

          <div className="ml-[120px]">
            <div className="grid" style={{ gridTemplateColumns: `repeat(${dayCols}, 1fr)` }}>
              {Array.from({ length: dayCols }).map((_, col) => (
                <div key={col} className="relative border-l border-[#24272D]">
                  {hours.map((_, r) => (
                    <div key={r} className="border-b border-[#1a1d22]" style={{ height: "28px" }} />
                  ))}
                </div>
              ))}
            </div>

            <div className="pointer-events-none absolute inset-0" style={{ left: 120 }}>
              <div className="grid h-full" style={{ gridTemplateColumns: `repeat(${dayCols}, 1fr)` }}>
                {weekDays.map((day, dayIdx) => {
                  const ymd = fmtYMDLocal(day);
                  const dayBookings = bookingsByLocalDay.get(ymd) ?? [];

                  return (
                    <div key={dayIdx} className="relative">
                      {dayBookings.map((b) => {
                        const dt = new Date(b.date);
                        const h = dt.getHours();
                        const m = dt.getMinutes();

                        const startMin = (h - HOUR_START) * 60 + m;
                        const offMin = clamp(startMin, 0, (HOUR_END - HOUR_START) * 60);

                        const dur = totalDurationMin(b);
                        const heightMin = clamp(dur, 15, 180);

                        const topPx = (offMin / SLOT_MIN) * 28;
                        const heightPx = (heightMin / SLOT_MIN) * 28;

                        const labelSvc =
                          b.services.map((s) => s.service?.name).filter(Boolean).join(", ") || "Service(s)";
                        const labelBarber = b.barber?.name || "Sem barbeiro";
                        const c = statusColors(b.status);

                        return (
                          <button
                            key={b.id}
                            onClick={() => openEditor(b)}
                            className={`pointer-events-auto absolute left-1 right-1 rounded-md border ${c.border} bg-[#111318] shadow-md hover:shadow-lg overflow-hidden text-left`}
                            style={{ top: topPx, height: heightPx, minHeight: 24 }}
                            title={`${labelSvc} • ${toLocalHHmm(dt)} (${labelBarber})`}
                          >
                            <div className="px-2 py-1">
                              <div className="flex items-center gap-2">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] ${c.pillBg} ${c.pillText}`}>
                                  {statusLabel(b.status)}
                                </span>
                                <div className="text-xs text-white truncate">{labelSvc}</div>
                              </div>
                              <div className="text-[11px] text-[#C9CDD3] truncate">
                                {toLocalHHmm(dt)} • {b.clientName}
                              </div>
                              <div className="text-[11px] text-[#9AA0A6] truncate">{labelBarber}</div>
                            </div>
                            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-indigo-500 to-fuchsia-500" />
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {loading && (
          <div className="p-3">
            <div className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
        )}
      </div>

      <BookingEditorModal
        open={editorOpen}
        booking={editorBooking}
        onCloseAction={closeEditor}
        onSaved={handleSavedOrDeleted}
        onDeleted={handleSavedOrDeleted}
      />
    </div>
  );
}