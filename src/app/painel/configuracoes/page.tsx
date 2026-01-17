"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchAdminJSON } from "@/lib/fetchAdmin";
import { FiClock, FiCheckCircle, FiXCircle } from "react-icons/fi";
import { Skeleton } from "@/components/ui/Skeleton";

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;

type DayConfig = {
  weekday: number;
  isOpen: boolean;
  openMins: number;
  closeMins: number;
};

function minsToTime(m: number) {
  const h = Math.floor(m / 60)
    .toString()
    .padStart(2, "0");
  const min = (m % 60).toString().padStart(2, "0");
  return `${h}:${min}`;
}

function timeToMins(t: string) {
  const [h, m] = t.split(":").map((x) => parseInt(x, 10));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return Math.max(0, Math.min(24 * 60, h * 60 + m));
}

function clampTimeInput(v: string) {
  if (!/^\d{2}:\d{2}$/.test(v)) return "07:00";
  return v;
}

const TIME_STEP_MIN = 15;
const TIME_OPTIONS = Array.from({ length: (24 * 60) / TIME_STEP_MIN }, (_, i) => {
  const m = i * TIME_STEP_MIN;
  const hh = String(Math.floor(m / 60)).padStart(2, "0");
  const mm = String(m % 60).padStart(2, "0");
  return `${hh}:${mm}`;
});

function TimeSelect({
  label,
  value,
  onChange,
  disabled,
  min,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  min?: string;
}) {
  const options = useMemo(() => {
    if (!min) return TIME_OPTIONS;
    const minM = timeToMins(min) + TIME_STEP_MIN;
    return TIME_OPTIONS.filter((t) => timeToMins(t) >= minM);
  }, [min]);

  return (
    <div>
      <label className="text-xs text-[#9AA0A6]">{label}</label>

      <div className="relative mt-2">
        <FiClock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9AA0A6]" />

        <select
          className={[
            "w-full appearance-none rounded-md border border-[#2A2E36]",
            "bg-[#0F1115] text-[#E4E7EC]",
            "pl-10 pr-10 py-2",
            "outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/40",
            "disabled:opacity-60 disabled:cursor-not-allowed",
          ].join(" ")}
          value={value}
          onChange={(e) => onChange(clampTimeInput(e.target.value))}
          disabled={disabled}
        >
          {options.map((t) => (
            <option key={t} value={t} className="bg-[#0F1115] text-[#E4E7EC]">
              {t}
            </option>
          ))}
        </select>

        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#9AA0A6]">
          ▾
        </div>

        {/* subtle highlight */}
        <div className="pointer-events-none absolute inset-0 rounded-md ring-1 ring-white/5" />
      </div>
    </div>
  );
}

export default function ConfiguracoesPage() {
  const [days, setDays] = useState<DayConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selected, setSelected] = useState<number[]>([]);
  const [isOpen, setIsOpen] = useState(true);
  const [open, setOpen] = useState("07:00");
  const [close, setClose] = useState("23:00");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const btnPrimary =
    "inline-flex items-center justify-center rounded-md bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white px-4 py-2 hover:opacity-95 transition disabled:opacity-50";
  const btnGhost =
    "inline-flex items-center justify-center rounded-md border border-[#2A2E36] px-4 py-2 text-[#E4E7EC] hover:bg-[#1A1C1F] transition disabled:opacity-50";
  const badgeOpen = "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20";
  const badgeClosed = "bg-[#1A1C1F] text-[#9AA0A6] border border-[#2A2E36]";

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminJSON<DayConfig[]>("/api/admin/settings/business-hours");
      setDays(Array.isArray(data) ? data : []);
    } catch {
      setError("Failed to load. Verify if you are logged in admin.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const selectedLabel = useMemo(() => {
    if (!selected.length) return "No day selected";
    const s = [...selected].sort((a, b) => a - b);
    return s.map((d) => DAYS[d]).join(", ");
  }, [selected]);

  function toggleSelect(weekday: number) {
    setSuccess(null);
    setError(null);
    setSelected((prev) =>
      prev.includes(weekday) ? prev.filter((d) => d !== weekday) : [...prev, weekday]
    );
  }

  function selectAll() {
    setSelected([0, 1, 2, 3, 4, 5, 6]);
  }

  function clearSelection() {
    setSelected([]);
  }

  async function apply() {
    setSuccess(null);
    setError(null);

    if (!selected.length) {
      setError("Select at least one day.");
      return;
    }

    const openMins = timeToMins(open);
    const closeMins = timeToMins(close);

    if (isOpen && openMins >= closeMins) {
      setError("Invalid hours: opening hours must be shorter than closing hours.");
      return;
    }

    try {
      setSaving(true);

      await fetchAdminJSON("/api/admin/settings/business-hours", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekdays: selected,
          isOpen,
          openMins: isOpen ? openMins : 0,
          closeMins: isOpen ? closeMins : 0,
        }),
      });

      await load();
      setSuccess("Configuration successfully applied.");
      setSelected([]);
    } catch {
      setError("Failed to save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="text-sm text-[#9AA0A6]">
            Set the standard schedules by day of the week.
          </p>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <button
            type="button"
            className={[btnGhost, "flex-1 md:flex-none"].join(" ")}
            onClick={selectAll}
            disabled={loading || saving}
          >
            Select all
          </button>
          <button
            type="button"
            className={[btnGhost, "flex-1 md:flex-none"].join(" ")}
            onClick={clearSelection}
            disabled={loading || saving}
          >
            Clear
          </button>
        </div>
      </div>

      {(error || success) && (
        <div
          className={[
            "rounded-lg border px-4 py-3 text-sm",
            error
              ? "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-200"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
          ].join(" ")}
        >
          {error ?? success}
        </div>
      )}

      <div className="rounded-xl border border-[#24272D] bg-[var(--hef-surface)] p-4">
        <div className="flex items-center justify-between">
          <div className="font-semibold">Weekly schedule</div>
          <div className="text-xs text-[#9AA0A6]">Click the cards to select</div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-60" />
            </div>
          ) : (
            days.map((d) => {
              const isSelected = selected.includes(d.weekday);

              return (
                <button
                  key={d.weekday}
                  type="button"
                  onClick={() => toggleSelect(d.weekday)}
                  className={[
                    "w-full rounded-lg border px-4 py-3 text-left transition",
                    "bg-[#0F1115] border-[#24272D] hover:bg-[#12141A]",
                    isSelected ? "ring-2 ring-indigo-500/40 border-indigo-500/40" : "",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-semibold">{DAYS[d.weekday]}</div>
                      <div
                        className={[
                          "text-[11px] rounded-full px-2 py-1 border",
                          d.isOpen ? badgeOpen : badgeClosed,
                        ].join(" ")}
                      >
                        {d.isOpen ? "Aberto" : "Fechado"}
                      </div>
                    </div>

                    <div className="text-[11px] text-[#9AA0A6]">{isSelected ? "Selected" : " "}</div>
                  </div>

                  <div className="mt-2 flex items-center gap-2 text-sm text-[#E4E7EC]">
                    <FiClock className="opacity-80" />
                    {d.isOpen ? (
                      <span className="text-[#E4E7EC]">
                        {minsToTime(d.openMins)} — {minsToTime(d.closeMins)}
                      </span>
                    ) : (
                      <span className="text-[#9AA0A6]">No office hours</span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="rounded-xl border border-[#24272D] bg-[var(--hef-surface)] p-4">
        <div className="flex flex-col gap-1">
          <div className="font-semibold">Apply configuration</div>
          <div className="text-sm text-[#9AA0A6]">
            Selected: <span className="text-[#E4E7EC]">{selectedLabel}</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="md:col-span-1">
            <label className="text-xs text-[#9AA0A6]">Status</label>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(true)}
                className={[btnGhost, "flex-1", isOpen ? "border-indigo-500/50 bg-[#12141A]" : ""].join(" ")}
                disabled={saving || loading}
              >
                <FiCheckCircle className="mr-2" />
                Open
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className={[btnGhost, "flex-1", !isOpen ? "border-indigo-500/50 bg-[#12141A]" : ""].join(" ")}
                disabled={saving || loading}
              >
                <FiXCircle className="mr-2" />
                Closed
              </button>
            </div>
          </div>

          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
            <TimeSelect
              label="Abre"
              value={open}
              onChange={(v) => {
                const next = clampTimeInput(v);
                setOpen(next);
                const o = timeToMins(next);
                const c = timeToMins(close);
                if (c <= o) {
                  const bumped = minsToTime(Math.min(24 * 60, o + TIME_STEP_MIN));
                  setClose(bumped);
                }
              }}
              disabled={!isOpen || saving || loading}
            />

            <TimeSelect
              label="Fecha"
              value={close}
              onChange={(v) => setClose(clampTimeInput(v))}
              disabled={!isOpen || saving || loading}
              min={open}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className={btnPrimary}
            onClick={apply}
            disabled={saving || loading || selected.length === 0}
          >
            {saving ? "Applying..." : "Apply to the selected"}
          </button>

          <button
            type="button"
            className={btnGhost}
            onClick={() => {
              setIsOpen(true);
              setOpen("07:00");
              setClose("23:00");
              setSuccess(null);
              setError(null);
            }}
            disabled={saving || loading}
          >
            Reset 07:00–23:00
          </button>
        </div>
      </div>
    </div>
  );
}