"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/components/ui/toast/toast";
import { fetchAdminJSON } from "@/lib/fetchAdmin";

type Service = { id: string; name: string; active: boolean };

const inputBase =
  "w-full rounded-md border border-[#2A2E36] bg-[#111318] text-[#E4E7EC] placeholder:text-[#6B7280] focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/40 px-3 py-2";

function rowCls(on: boolean) {
  return [
    "w-full text-left rounded-xl border px-3 py-3 transition",
    on
      ? "border-indigo-500/50 bg-indigo-500/10"
      : "border-[#24272D] bg-[#0F1115] hover:bg-[#12141A]",
  ].join(" ");
}

export default function BarberServicesModal({
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
  const [services, setServices] = useState<Service[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [q, setQ] = useState("");

  const title = useMemo(() => "Services do barbeiro", []);

  const load = useCallback(async () => {
    if (!open || !barberId) return;
    setLoading(true);
    try {
      const [all, skillIds] = await Promise.all([
        fetchAdminJSON<Service[]>("/api/admin/services"),
        fetchAdminJSON<string[]>(`/api/admin/barbers/${barberId}/skills`),
      ]);

      const active = (all || []).filter((s) => s.active !== false);
      active.sort((a, b) => a.name.localeCompare(b.name, "en-GB"));
      setServices(active);
      setSkills(Array.isArray(skillIds) ? skillIds : []);
    } catch {
      setServices([]);
      setSkills([]);
    } finally {
      setLoading(false);
    }
  }, [open, barberId]);

  useEffect(() => {
    setQ("");
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return services;
    return services.filter((s) => s.name.toLowerCase().includes(needle));
  }, [services, q]);

  const toggle = useCallback((id: string) => {
    setSkills((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const onSubmit = useCallback(async () => {
    if (!barberId || saving) return;
    setSaving(true);
    try {
      await fetchAdminJSON(`/api/admin/barbers/${barberId}/skills`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceIds: skills }),
      });
      toast.add({ variant: "success", title: "Services atualizados" });
      onSaved();
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed ao salvar.";
      toast.add({ variant: "error", title: "Error", description: msg });
    } finally {
      setSaving(false);
    }
  }, [barberId, saving, skills, onSaved, onClose]);

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
            className="relative z-[91] w-full max-w-4xl overflow-hidden rounded-2xl border border-[#24272D] bg-[#0F1115] shadow-2xl flex flex-col max-h-[calc(100dvh-1.5rem)]"
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
                  Choose which services this barber can perform.
                </p>
              </div>

              <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
                Close
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 pb-24 md:pb-5">
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-[#AEB4BE]">Buscar</label>
                    <input
                      className={inputBase}
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="Ex.: corte, barba..."
                    />
                  </div>

                  <div className="space-y-2">
                    {filtered.length === 0 ? (
                      <div className="rounded-xl border border-[#24272D] bg-[#0F1115] p-4 text-sm text-[#AEB4BE]">
                        No serviço encontrado.
                      </div>
                    ) : (
                      filtered.map((s) => {
                        const on = skills.includes(s.id);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            className={rowCls(on)}
                            onClick={() => toggle(s.id)}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-sm font-semibold text-white break-words">{s.name}</p>
                              <span
                                className={
                                  on
                                    ? "text-[11px] text-indigo-200"
                                    : "text-[11px] text-[#AEB4BE]"
                                }
                              >
                                {on ? "Selecionado" : "Selecionar"}
                              </span>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-[#24272D] bg-[#0F1115] px-5 py-3 md:py-4">
              <div className="flex items-center justify-end gap-2">
                <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                  Cancel
                </Button>
                <Button type="button" onClick={onSubmit} disabled={saving}>
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
              </div>
              <div className="h-[env(safe-area-inset-bottom)]" />
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
