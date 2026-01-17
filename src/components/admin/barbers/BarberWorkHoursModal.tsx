"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/components/ui/toast/toast";
import { fetchAdminJSON } from "@/lib/fetchAdmin";

type Day = 0 | 1 | 2 | 3 | 4 | 5 | 6;

type WorkDay = {
  weekday: Day; // IMPORTANT: JS weekday (0=Dom..6=Sáb)
  enabled: boolean;
  start: string;
  end: string;
  lunchStart: string;
  lunchEnd: string;
};

type Payload = {
  days: WorkDay[];
};

const inputBase =
  "w-full rounded-md border border-[#2A2E36] bg-[#111318] text-[#E4E7EC] placeholder:text-[#69707D] focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/40 px-3 py-2";

function wdLabel(w: Day) {
  // JS getDay(): 0=Dom,1=Seg,2=Ter,3=Qua,4=Qui,5=Sex,6=Sáb
  switch (w) {
    case 0:
      return "Domingo";
    case 1:
      return "Segunda";
    case 2:
      return "Tuesday";
    case 3:
      return "Quarta";
    case 4:
      return "Quinta";
    case 5:
      return "Sexta";
    case 6:
      return "Saturday";
    default:
      return "—";
  }
}

function clampTime(v: string) {
  const s = v.trim().slice(0, 5);
  if (!/^\d{2}:\d{2}$/.test(s)) return "";
  return s;
}

function hhmmToMins(v: string) {
  const s = clampTime(v);
  if (!s) return null as number | null;
  const [hh, mm] = s.split(":").map(Number);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  const mins = hh * 60 + mm;
  if (mins < 0 || mins > 24 * 60) return null;
  return mins;
}

function buildTimeOptions(stepMins: number) {
  const out: string[] = [];
  for (let m = 0; m < 24 * 60; m += stepMins) {
    const hh = String(Math.floor(m / 60)).padStart(2, "0");
    const mm = String(m % 60).padStart(2, "0");
    out.push(`${hh}:${mm}`);
  }
  return out;
}

const TIME_OPTIONS = buildTimeOptions(15);

// Exibe semana começando na Segunda, mas mantendo weekday JS
const DISPLAY_ORDER: Day[] = [1, 2, 3, 4, 5, 6, 0];

function TimeSelect({
  value,
  onChange,
  disabled,
  allowEmpty,
  emptyLabel,
  minMins,
  maxMins,
  includeMax,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  allowEmpty?: boolean;
  emptyLabel?: string;
  minMins?: number | null;
  maxMins?: number | null;
  includeMax?: boolean;
}) {
  const min = typeof minMins === "number" ? minMins : 0;
  const max = typeof maxMins === "number" ? maxMins : 24 * 60;

  const opts = TIME_OPTIONS.filter((t) => {
    const m = hhmmToMins(t);
    if (m === null) return false;
    if (m < min) return false;
    if (includeMax) return m <= max;
    return m < max;
  });

  return (
    <select className={inputBase} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
      {allowEmpty ? <option value="">{emptyLabel || "—"}</option> : null}
      {opts.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
    </select>
  );
}

function defaultDays(): WorkDay[] {
  // JS weekday default: fecha Domingo, abre Seg-Sáb
  return Array.from({ length: 7 }).map((_, i) => ({
    weekday: i as Day,
    enabled: (i as Day) !== 0,
    start: "09:00",
    end: "18:00",
    lunchStart: "12:00",
    lunchEnd: "13:00",
  }));
}

function normalizeDays(days: WorkDay[] | undefined | null): WorkDay[] {
  const base = defaultDays();
  if (!Array.isArray(days) || days.length !== 7) return base;

  const map = new Map<number, WorkDay>();
  for (const d of days) map.set(Number(d.weekday), d);

  return base.map((b) => {
    const got = map.get(b.weekday);
    return got
      ? {
          ...b,
          ...got,
          weekday: b.weekday, // força permanecer JS weekday correto
        }
      : b;
  });
}

export default function BarberWorkHoursModal({
  open,
  barberId,
  onClose,
  onSaved,
}: {
  open: boolean;
  barberId: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [days, setDays] = useState<WorkDay[]>(defaultDays());

  const [bizByWeekday, setBizByWeekday] = useState<
    Record<number, { isOpen: boolean; openMins: number | null; closeMins: number | null }>
  >({});

  const title = useMemo(() => "Horários de trabalho", []);

  const orderedDays = useMemo(() => {
    const map = new Map<Day, WorkDay>();
    for (const d of days) map.set(d.weekday, d);
    return DISPLAY_ORDER.map((w) => map.get(w)).filter(Boolean) as WorkDay[];
  }, [days]);

  const load = useCallback(async () => {
    if (!open || !barberId) return;
    setLoading(true);
    try {
      const [data, biz] = await Promise.all([
        fetchAdminJSON<Payload>(`/api/admin/barbers/${barberId}/work-hours`),
        fetchAdminJSON<Array<{ weekday: number; isOpen: boolean; openMins: number | null; closeMins: number | null }>>(
          "/api/admin/settings/business-hours"
        ),
      ]);

      setDays(normalizeDays(data?.days));

      if (Array.isArray(biz)) {
        const map: Record<number, { isOpen: boolean; openMins: number | null; closeMins: number | null }> = {};
        for (const d of biz) {
          map[d.weekday] = { isOpen: !!d.isOpen, openMins: d.openMins ?? null, closeMins: d.closeMins ?? null };
        }
        setBizByWeekday(map);
      }
    } catch {
      setDays(defaultDays());
    } finally {
      setLoading(false);
    }
  }, [open, barberId]);

  useEffect(() => {
    load();
  }, [load]);

  const updateDay = useCallback((weekday: Day, patch: Partial<WorkDay>) => {
    setDays((prev) => prev.map((d) => (d.weekday === weekday ? { ...d, ...patch } : d)));
  }, []);

  const onSubmit = useCallback(async () => {
    if (!barberId || saving) return;
    setSaving(true);

    try {
      const normalized = normalizeDays(days).map((d) => ({
        ...d,
        start: clampTime(d.start),
        end: clampTime(d.end),
        lunchStart: d.lunchStart ? clampTime(d.lunchStart) : "",
        lunchEnd: d.lunchEnd ? clampTime(d.lunchEnd) : "",
      }));

      await fetchAdminJSON(`/api/admin/barbers/${barberId}/work-hours`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: normalized }),
      });

      toast.add({ variant: "success", title: "Salvo", description: "Horários atualizados." });
      onSaved();
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed ao salvar.";
      toast.add({ variant: "error", title: "Error", description: msg });
    } finally {
      setSaving(false);
    }
  }, [barberId, saving, days, onSaved, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-3">
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              if (!saving) onClose();
            }}
          />

          <motion.div
            className="relative z-[91] w-full max-w-3xl overflow-hidden rounded-2xl border border-[#24272D] bg-[#0F1115] shadow-2xl max-h-[92vh]"
            initial={{ opacity: 0, y: 18, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.985 }}
            transition={{ type: "spring", stiffness: 420, damping: 36, mass: 0.85 }}
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            <div className="flex items-center justify-between border-b border-[#24272D] px-5 py-4">
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-white truncate">{title}</h3>
                <p className="mt-0.5 text-xs text-[#AEB4BE] break-words">
                  Configure expediente e pausa. Isso deve afetar a disponibilidade no agendamento.
                </p>
              </div>

              <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
                Close
              </Button>
            </div>

            <div className="px-5 py-5">
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <div className="max-h-[60vh] overflow-auto pr-1 space-y-3">
                  {orderedDays.map((d) => (
                    <div key={d.weekday} className="rounded-xl border border-[#24272D] bg-[#0F1115] p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-white">{wdLabel(d.weekday)}</p>
                        <label className="flex items-center gap-2 text-xs text-[#AEB4BE]">
                          <input
                            type="checkbox"
                            checked={d.enabled}
                            onChange={(e) => updateDay(d.weekday, { enabled: e.target.checked })}
                            className="h-4 w-4"
                          />
                          Aberto
                        </label>
                      </div>

                      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
                        <div>
                          <label className="text-xs text-[#AEB4BE]">Início</label>
                          <TimeSelect
                            value={d.start}
                            onChange={(v) => updateDay(d.weekday, { start: v })}
                            disabled={!d.enabled}
                            minMins={bizByWeekday[d.weekday]?.isOpen ? (bizByWeekday[d.weekday]?.openMins ?? null) : null}
                            maxMins={bizByWeekday[d.weekday]?.isOpen ? (bizByWeekday[d.weekday]?.closeMins ?? null) : null}
                            includeMax={false}
                          />
                        </div>

                        <div>
                          <label className="text-xs text-[#AEB4BE]">Fim</label>
                          <TimeSelect
                            value={d.end}
                            onChange={(v) => updateDay(d.weekday, { end: v })}
                            disabled={!d.enabled}
                            minMins={bizByWeekday[d.weekday]?.isOpen ? (bizByWeekday[d.weekday]?.openMins ?? null) : null}
                            maxMins={bizByWeekday[d.weekday]?.isOpen ? (bizByWeekday[d.weekday]?.closeMins ?? null) : null}
                            includeMax
                          />
                        </div>

                        <div>
                          <label className="text-xs text-[#AEB4BE]">Almoço (início)</label>
                          <TimeSelect
                            value={d.lunchStart}
                            onChange={(v) => updateDay(d.weekday, { lunchStart: v })}
                            disabled={!d.enabled}
                            minMins={bizByWeekday[d.weekday]?.isOpen ? (bizByWeekday[d.weekday]?.openMins ?? null) : null}
                            maxMins={bizByWeekday[d.weekday]?.isOpen ? (bizByWeekday[d.weekday]?.closeMins ?? null) : null}
                            includeMax
                            allowEmpty
                            emptyLabel="Sem almoço"
                          />
                        </div>

                        <div>
                          <label className="text-xs text-[#AEB4BE]">Almoço (fim)</label>
                          <TimeSelect
                            value={d.lunchEnd}
                            onChange={(v) => updateDay(d.weekday, { lunchEnd: v })}
                            disabled={!d.enabled}
                            minMins={bizByWeekday[d.weekday]?.isOpen ? (bizByWeekday[d.weekday]?.openMins ?? null) : null}
                            maxMins={bizByWeekday[d.weekday]?.isOpen ? (bizByWeekday[d.weekday]?.closeMins ?? null) : null}
                            includeMax
                            allowEmpty
                            emptyLabel="Sem almoço"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-5 flex items-center justify-end gap-2">
                <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                  Cancel
                </Button>
                <Button type="button" onClick={onSubmit} disabled={saving}>
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}