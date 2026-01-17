"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { confirm } from "@/components/ui/confirm/confirm";
import LowStockCard from "@/components/admin/LowStockCard";
import { getErrorMessage } from "@/lib/errors";

type BookingWithRelations = {
  id: string;
  clientName: string;
  date: string;
  status?: "SCHEDULED" | "CONFIRMED" | "DONE" | "CANCELED";
  barber?: { id: string; name: string; photo?: string | null } | null;
  services: Array<{ service?: { id: string; name: string } | null }>;
};

function formatTimeLeft(targetISO: string) {
  const now = Date.now();
  const t = new Date(targetISO).getTime();
  if (!Number.isFinite(t)) return "—";
  const diff = t - now;

  if (diff <= 0) return "Now";

  const totalMin = Math.floor(diff / 60000);
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const mins = totalMin % 60;

  if (days > 0) return `In ${days}d ${hours}h`;
  if (hours > 0) return `In ${hours}h ${mins}m`;
  return `In ${mins}m`;
}

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "—", time: "—" };
  const date = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return { date, time };
}

export default function PainelPage() {
  const [bookings, setBookings] = useState<BookingWithRelations[]>([]);
  const [filterDate, setFilterDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [uiError, setUiError] = useState("");

  const nextBooking = useMemo(() => {
    const now = Date.now();
    const max = now + 30 * 60_000;

    const candidates = bookings
      .filter((b) => {
        const t = new Date(b.date).getTime();
        if (!Number.isFinite(t)) return false;

        const status = b.status ?? "SCHEDULED";
        if (status === "DONE" || status === "CANCELED") return false;

        return t >= now && t <= max;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return candidates[0] ?? null;
  }, [bookings]);

  function toParamDate(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  const loadBookings = useCallback(async (date?: string) => {
    setUiError("");
    setLoading(true);
    try {
      let url = "/api/admin/bookings";
      if (date) url += `?date=${encodeURIComponent(date)}`;

      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        const raw = await res.text().catch(() => "");
        let message = `Failed to load (${res.status})`;
        try {
          const j = raw ? JSON.parse(raw) : null;
          if (j?.error) message = j.error;
          if (j?.detail) message += ` – ${j.detail}`;
        } catch {}
        setUiError(message);
        setBookings([]);
        return;
      }

      const data = (await res.json().catch(() => null)) as unknown;
      setBookings(Array.isArray(data) ? (data as BookingWithRelations[]) : []);
    } catch (err) {
      setBookings([]);
      setUiError(getErrorMessage(err) || "Error loading bookings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const input =
    "w-full rounded-md border border-[#2A2E36] bg-[#111318] text-white placeholder:text-[#9AA0A6] focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/40 p-2";
  const btnPrimary =
    "inline-flex items-center justify-center rounded-md bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white px-4 py-2 hover:opacity-95 transition";
  const btnGhost =
    "px-3 py-2 rounded-md border border-[#2A2E36] text-[#E4E7EC] hover:bg-[#1A1C1F] transition";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div className="mr-auto">
          <h1 className="text-4xl font-extrabold">Bookings</h1>
          <p className="text-sm text-[#C9CDD3]">Filter by date and track upcoming appointments.</p>
        </div>

        <div className="flex items-end gap-2">
          <div className="w-56">
            <label className="block text-sm mb-1 text-[#C9CDD3]">Filter by date</label>
            <input
              type="date"
              className={input}
              value={filterDate ? toParamDate(filterDate) : ""}
              onChange={(e) => {
                const v = e.target.value;
                if (!v) {
                  setFilterDate(null);
                  return;
                }
                const d = new Date(`${v}T00:00:00`);
                if (!Number.isNaN(d.getTime())) setFilterDate(d);
              }}
            />
          </div>

          <button
            onClick={() => {
              if (!filterDate) return loadBookings();
              loadBookings(toParamDate(filterDate));
            }}
            className={btnPrimary}
          >
            Apply
          </button>

          <button
            onClick={() => {
              setFilterDate(null);
              loadBookings();
            }}
            className={btnGhost}
          >
            Clear
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-[#24272D] bg-[#0F1115] p-4 sm:p-5 shadow-inner lg:aspect-square">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white">Next appointment</h2>
              <p className="text-sm text-[#C9CDD3]">The closest upcoming time from now.</p>
            </div>
            <span className="text-xs rounded-md px-2 py-1 border border-[#2A2E36] text-[#C9CDD3]">
              {nextBooking ? formatTimeLeft(nextBooking.date) : "—"}
            </span>
          </div>

          <div className="mt-4">
            {nextBooking ? (
              <div className="rounded-xl border border-white/10 bg-[#111318] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs text-[#9AA0A6]">Client</div>
                    <div className="text-base sm:text-lg font-semibold text-white truncate">
                      {nextBooking.clientName}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs text-[#9AA0A6]">When</div>
                    <div className="text-sm font-semibold text-white">
                      {fmtDateTime(nextBooking.date).date} • {fmtDateTime(nextBooking.date).time}
                    </div>
                  </div>
                </div>

                <div className="mt-3 rounded-lg border border-[#24272D] bg-[#0F1115] p-3">
                  <div className="text-xs text-[#9AA0A6]">Service</div>
                  <div className="text-white font-semibold">
                    {nextBooking.services?.[0]?.service?.name ?? "Service"}
                  </div>
                  <div className="mt-1 text-xs text-[#C9CDD3]">
                    {nextBooking.barber?.name ? `Barber: ${nextBooking.barber.name}` : "Barber: —"}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-[#24272D] bg-[#111318] p-4 text-[#9AA0A6]">
                No appointments in the next 30 minutes.
              </div>
            )}
          </div>
        </div>

        <LowStockCard initialThreshold={80} autoRefreshMs={60_000} />
      </div>

      {uiError && (
        <div className="rounded-xl border border-fuchsia-500/30 bg-fuchsia-500/10 p-4 text-fuchsia-200">
          {uiError}
        </div>
      )}

      <div className="rounded-xl border border-[#24272D] bg-[#0F1115] shadow-inner overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#111318] text-[#C9CDD3] text-sm">
              <tr>
                <th className="p-3 border-b border-[#24272D] text-left">Client</th>
                <th className="p-3 border-b border-[#24272D] text-left">Services</th>
                <th className="p-3 border-b border-[#24272D] text-left">Barber</th>
                <th className="p-3 border-b border-[#24272D] text-left">Date</th>
                <th className="p-3 border-b border-[#24272D] text-left">Time</th>
                <th className="p-3 border-b border-[#24272D] text-left">Status</th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-[#9AA0A6]">
                    Loading...
                  </td>
                </tr>
              )}

              {!loading && bookings.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-[#9AA0A6]">
                    No bookings found.
                  </td>
                </tr>
              )}

              {!loading &&
                bookings.map((b) => {
                  const dt = fmtDateTime(b.date);
                  const services = b.services
                    .map((x) => x.service?.name)
                    .filter(Boolean)
                    .join(", ");

                  const status = b.status ?? "SCHEDULED";
                  const statusLabel =
                    status === "SCHEDULED"
                      ? "Scheduled"
                      : status === "CONFIRMED"
                      ? "Confirmed"
                      : status === "DONE"
                      ? "Completed"
                      : "Cancelled";

                  return (
                    <tr key={b.id} className="hover:bg-[#111318]/60 transition">
                      <td className="p-3 border-b border-[#24272D] text-white">{b.clientName}</td>
                      <td className="p-3 border-b border-[#24272D] text-[#C9CDD3]">{services || "—"}</td>
                      <td className="p-3 border-b border-[#24272D] text-[#C9CDD3]">{b.barber?.name ?? "—"}</td>
                      <td className="p-3 border-b border-[#24272D] text-[#C9CDD3]">{dt.date}</td>
                      <td className="p-3 border-b border-[#24272D] text-[#C9CDD3]">{dt.time}</td>
                      <td className="p-3 border-b border-[#24272D]">
                        <span
                          className={`text-xs rounded-md px-2 py-1 border ${
                            status === "CANCELED"
                              ? "border-fuchsia-700/50 text-fuchsia-300"
                              : status === "DONE"
                              ? "border-emerald-700/50 text-emerald-300"
                              : status === "CONFIRMED"
                              ? "border-sky-700/50 text-sky-300"
                              : "border-indigo-700/50 text-indigo-300"
                          }`}
                        >
                          {statusLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="pt-2">
        <button
          onClick={async () => {
            const ok = await confirm({
              title: "Sign out",
              description: "Are you sure you want to end your session?",
              confirmText: "Sign out",
              cancelText: "Cancel",
              confirmVariant: "danger",
            });
            if (!ok) return;
            await fetch("/api/admin/logout", { method: "POST" });
            location.href = "/admin/login";
          }}
          className="px-3 py-2 rounded-md border border-[#2A2E36] text-[#E4E7EC] hover:bg-[#1A1C1F] transition"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
