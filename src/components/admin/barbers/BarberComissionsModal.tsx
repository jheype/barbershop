"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/components/ui/toast/toast";
import { fetchAdminJSON } from "@/lib/fetchAdmin";

type Mode = "PERCENT" | "FIXED";

type Payload = {
  enabled: boolean;

  mode: Mode;

  ownRate: number;
  withAssistantRate: number;
  assistantRate: number;
  productsRate: number;

  tipOnlyIfDone: boolean;
  tipIndependent: boolean;
};

const inputBase =
  "w-full rounded-md border border-[#2A2E36] bg-[#111318] text-[#E4E7EC] placeholder:text-[#6B7280] focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/40 px-3 py-2";

function clampNum(v: string, min: number, max: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

export default function BarberCommissionsModal({
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

  const [form, setForm] = useState<Payload>({
    enabled: false,
    mode: "PERCENT",
    ownRate: 0,
    withAssistantRate: 0,
    assistantRate: 0,
    productsRate: 0,
    tipOnlyIfDone: true,
    tipIndependent: false,
  });

  const title = useMemo(() => "Comissões e gorjetas", []);

  const load = useCallback(async () => {
    if (!open || !barberId) return;
    setLoading(true);
    try {
      const data = await fetchAdminJSON<Payload>(`/api/admin/barbers/${barberId}/commissions`);
      if (data) setForm(data);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [open, barberId]);

  useEffect(() => {
    load();
  }, [load]);

  const onSubmit = useCallback(async () => {
    if (!barberId || saving) return;
    setSaving(true);

    try {
      const safe: Payload = {
        ...form,
        ownRate: clampNum(String(form.ownRate), 0, form.mode === "PERCENT" ? 100 : 1_000_000),
        withAssistantRate: clampNum(String(form.withAssistantRate), 0, form.mode === "PERCENT" ? 100 : 1_000_000),
        assistantRate: clampNum(String(form.assistantRate), 0, form.mode === "PERCENT" ? 100 : 1_000_000),
        productsRate: clampNum(String(form.productsRate), 0, form.mode === "PERCENT" ? 100 : 1_000_000),
        tipOnlyIfDone: !!form.tipOnlyIfDone,
        tipIndependent: !!form.tipIndependent,
      };

      await fetchAdminJSON(`/api/admin/barbers/${barberId}/commissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(safe),
      });

      onSaved();
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed ao salvar.";
      toast.add({ variant: "error", title: "Error", description: msg });
    } finally {
      setSaving(false);
    }
  }, [barberId, saving, form, onSaved, onClose]);

  const suffix = form.mode === "PERCENT" ? "%" : "£";

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
                  Define regras de comissão e gorjetas. Deve impactar repasse e caixa.
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
                <div className="max-h-[60vh] overflow-auto pr-1 space-y-4">
                  <div className="rounded-xl border border-[#24272D] bg-[#0F1115] p-3">
                    <label className="flex items-center gap-2 text-sm text-white">
                      <input
                        type="checkbox"
                        checked={form.enabled}
                        onChange={(e) => setForm((p) => ({ ...p, enabled: e.target.checked }))}
                        className="h-4 w-4"
                      />
                      Recebe comissão
                    </label>

                    <div className="mt-3">
                      <label className="text-xs text-[#AEB4BE]">Modelo</label>
                      <select
                        className={inputBase}
                        value={form.mode}
                        onChange={(e) => setForm((p) => ({ ...p, mode: e.target.value as Mode }))}
                        disabled={!form.enabled}
                      >
                        <option value="PERCENT">Porcentagem</option>
                        <option value="FIXED">Amount fixo</option>
                      </select>
                      <p className="mt-2 text-xs text-[#AEB4BE]">
                        In “valor fixo”, os campos devem ser interpretados como valor por atendimento/produto.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#24272D] bg-[#0F1115] p-3">
                    <p className="text-sm font-semibold text-white">Comissões</p>

                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div>
                        <label className="text-xs text-[#AEB4BE]">Commission sozinho ({suffix})</label>
                        <input
                          className={inputBase}
                          value={String(form.ownRate)}
                          onChange={(e) => setForm((p) => ({ ...p, ownRate: clampNum(e.target.value, 0, 1_000_000) }))}
                          inputMode="decimal"
                          disabled={!form.enabled}
                        />
                      </div>

                      <div>
                        <label className="text-xs text-[#AEB4BE]">Commission com assistente ({suffix})</label>
                        <input
                          className={inputBase}
                          value={String(form.withAssistantRate)}
                          onChange={(e) =>
                            setForm((p) => ({ ...p, withAssistantRate: clampNum(e.target.value, 0, 1_000_000) }))
                          }
                          inputMode="decimal"
                          disabled={!form.enabled}
                        />
                      </div>

                      <div>
                        <label className="text-xs text-[#AEB4BE]">Commission do assistente ({suffix})</label>
                        <input
                          className={inputBase}
                          value={String(form.assistantRate)}
                          onChange={(e) =>
                            setForm((p) => ({ ...p, assistantRate: clampNum(e.target.value, 0, 1_000_000) }))
                          }
                          inputMode="decimal"
                          disabled={!form.enabled}
                        />
                      </div>

                      <div>
                        <label className="text-xs text-[#AEB4BE]">Commission de produtos ({suffix})</label>
                        <input
                          className={inputBase}
                          value={String(form.productsRate)}
                          onChange={(e) =>
                            setForm((p) => ({ ...p, productsRate: clampNum(e.target.value, 0, 1_000_000) }))
                          }
                          inputMode="decimal"
                          disabled={!form.enabled}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#24272D] bg-[#0F1115] p-3">
                    <p className="text-sm font-semibold text-white">Gorjetas</p>

                    <div className="mt-3 space-y-2">
                      <label className="flex items-center gap-2 text-xs text-[#AEB4BE]">
                        <input
                          type="checkbox"
                          checked={form.tipOnlyIfDone}
                          onChange={(e) => setForm((p) => ({ ...p, tipOnlyIfDone: e.target.checked }))}
                          className="h-4 w-4"
                        />
                        Aceita gorjeta somente de atendimentos realizados
                      </label>

                      <label className="flex items-center gap-2 text-xs text-[#AEB4BE]">
                        <input
                          type="checkbox"
                          checked={form.tipIndependent}
                          onChange={(e) => setForm((p) => ({ ...p, tipIndependent: e.target.checked }))}
                          className="h-4 w-4"
                        />
                        Aceita gorjeta independente de realizar atendimento
                      </label>
                    </div>
                  </div>
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