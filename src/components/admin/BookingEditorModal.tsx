"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DatePicker from "@/components/ui/DatePicker";
import TimePicker from "@/components/ui/TimePicker";
import BarberAvatarPicker from "@/components/booking/BarberAvatarPicker";
import { toast } from "@/components/ui/toast/toast";
import PaymentModal from "@/components/admin/PaymentModal";
import { fetchAdminJSON } from "@/lib/fetchAdmin";
import { buildWhatsAppLink, toE164BR } from "@/lib/whatsappLink";

type Service = { id: string; name: string; duration: number; price: number };
type Barber = { id: string; name: string; photo: string };
type BookingStatus = "SCHEDULED" | "CONFIRMED" | "DONE" | "CANCELED";
type Booking = {
  id: string;
  clientName: string;
  clientPhone?: string | null; 
  date: string;
  barberId?: string | null;
  barber?: Barber | null;
  status: BookingStatus;
  services: { service: Service | null }[];
};

type Props = {
  open: boolean;
  booking: Booking | null;
  onCloseAction: () => void;
  onSaved: () => void;
  onDeleted: () => void;
};

function toParamDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatLocalBR(iso: string) {
  const d = new Date(iso);

  const date = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);

  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);

  return { date, time };
}

function buildConfirmMessage(b: Pick<Booking, "clientName" | "date" | "barber" | "services">) {
  const { date, time } = formatLocalBR(b.date);
  const barberName = b.barber?.name || "Studio";
  const services = (b.services || [])
    .map((x) => x.service?.name || "")
    .filter(Boolean)
    .join(", ");

  return [
    `Olá, ${b.clientName}.`,
    "",
    "Seu agendamento foi confirmado.",
    `Data: ${date} às ${time}.`,
    `Barber: ${barberName}.`,
    services ? `Services: ${services}.` : null,
    "",
    "Se precisar remarcar, responda por aqui.",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildCancelMessage(b: Pick<Booking, "clientName" | "date">) {
  const { date, time } = formatLocalBR(b.date);

  return [
    `Olá, ${b.clientName}.`,
    "",
    "Seu agendamento foi canceled.",
    `Data: ${date} às ${time}.`,
    "",
    "Se quiser, posso te ajudar a remarcar.",
  ].join("\n");
}

function openWhatsAppDraft(opts: { phone?: string | null; message: string }) {
  const e164 = toE164BR(opts.phone || "");
  if (!e164) return null;
  return buildWhatsAppLink(e164, opts.message);
}

/* ---------------------------------------------------------------- */

function StatusBadge({ status }: { status?: BookingStatus }) {
  const map: Record<BookingStatus, { text: string; cls: string }> = {
    SCHEDULED: { text: "Scheduled", cls: "bg-indigo-500/15 text-indigo-300" },
    CONFIRMED: { text: "Confirmed", cls: "bg-emerald-500/15 text-emerald-300" },
    DONE: { text: "Completed", cls: "bg-sky-500/15 text-sky-300" },
    CANCELED: { text: "Canceled", cls: "bg-rose-500/15 text-rose-300" },
  };
  const s = status ? map[status] : { text: "—", cls: "bg-[#2A2E36] text-[#C9CDD3]" };
  return <span className={`px-2 py-0.5 rounded text-xs ${s.cls}`}>{s.text}</span>;
}

export default function BookingEditorModal({ open, booking, onCloseAction, onSaved, onDeleted }: Props) {
  const [clientName, setClientName] = useState("");
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState<string | undefined>(undefined);

  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<string | null>(null);

  const [times, setTimes] = useState<string[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [loading, setLoading] = useState(false);

  const [payOpen, setPayOpen] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  const selectedServiceIds = useMemo(
    () => (booking?.services || []).map((bs) => bs.service?.id).filter(Boolean) as string[],
    [booking]
  );

  const total = useMemo(
    () => (booking?.services || []).reduce((a, s) => a + (s.service?.price || 0), 0),
    [booking]
  );

  useEffect(() => {
    if (!open || !booking) return;
    setClientName(booking.clientName);

    const d = new Date(booking.date);
    const dayOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    setDate(dayOnly);

    setTime(d.toTimeString().slice(0, 5));
    setSelectedBarber(booking.barberId ?? null);
  }, [open, booking]);

  useEffect(() => {
    if (!open) return;

    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/barbers", { cache: "no-store" });
        const data: Barber[] = await res.json();
        if (!alive) return;
        setBarbers(Array.isArray(data) ? data : []);
      } catch {
        if (!alive) return;
        setBarbers([]);
      }
    })();

    return () => {
      alive = false;
    };
  }, [open]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, []);

  const loadTimes = useCallback(async () => {
    if (!open || !date || selectedServiceIds.length === 0) {
      setTimes([]);
      return;
    }

    if (abortRef.current) {
      try {
        abortRef.current.abort();
      } catch {}
    }

    const ac = new AbortController();
    abortRef.current = ac;

    setLoadingTimes(true);

    try {
      const params = new URLSearchParams();
      params.set("serviceIds", selectedServiceIds.join(","));
      params.set("date", toParamDate(date));
      if (selectedBarber) params.set("barberId", selectedBarber);

      const res = await fetch(`/api/available-times?${params.toString()}`, {
        signal: ac.signal,
        cache: "no-store",
      });

      if (ac.signal.aborted) return;

      const data: string[] = await res.json();
      setTimes(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        console.error("Error ao carregar horários:", err);
      }
    } finally {
      if (!ac.signal.aborted) setLoadingTimes(false);
    }
  }, [open, date, selectedBarber, selectedServiceIds]);

  useEffect(() => {
    loadTimes();
  }, [loadTimes]);

  async function handleSave() {
    if (!booking) return;
    if (!clientName.trim() || !date || !time) return;

    setLoading(true);
    try {
      const iso = new Date(`${toParamDate(date)}T${time}`).toISOString();

      await fetchAdminJSON(`/api/admin/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: clientName.trim(),
          date: iso,
          barberId: selectedBarber || null,
        }),
      });

      onSaved();
      toast.add({
        variant: "success",
        title: "Agendamento atualizado",
        description: "As alterações foram salvas.",
      });
      onCloseAction();
    } catch (err) {
      const e = err as Error;
      toast.add({
        variant: "error",
        title: "Error ao salvar",
        description: e.message || "Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function setStatus(next: BookingStatus) {
    if (!booking) return;

    setLoading(true);
    try {
      await fetchAdminJSON(`/api/admin/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });

      onSaved();
      toast.add({
        variant: "success",
        title: "Status atualizado",
        description: "O status do agendamento foi alterado.",
      });

      if (next === "CONFIRMED" || next === "CANCELED") {
        const link = openWhatsAppDraft({
          phone: booking.clientPhone,
          message: next === "CONFIRMED" ? buildConfirmMessage(booking) : buildCancelMessage(booking),
        });

        if (!link) {
          toast.add({
            variant: "error",
            title: "Invalid phone",
            description: "Este agendamento não possui telefone válido para WhatsApp.",
          });
        } else {
          window.open(link, "_blank", "noopener,noreferrer");
        }
      }

      onCloseAction();
    } catch (err) {
      const e = err as Error;
      toast.add({
        variant: "error",
        title: "Error ao atualizar status",
        description: e.message || "Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!booking) return;

    setLoading(true);
    try {
      await fetchAdminJSON(`/api/admin/bookings/${booking.id}`, { method: "DELETE" });

      onDeleted();
      toast.add({
        variant: "success",
        title: "Agendamento excluído",
        description: "Registro removido com sucesso.",
      });
      onCloseAction();
    } catch (err) {
      const e = err as Error;
      toast.add({
        variant: "error",
        title: "Error ao excluir",
        description: e.message || "Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  }

  const btnPrimary =
    "inline-flex items-center justify-center rounded-md bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white px-4 py-2 hover:opacity-95 transition disabled:opacity-50";
  const btnGhost =
    "px-3 py-2 rounded-md border border-[#2A2E36] text-[#E4E7EC] hover:bg-[#1A1C1F] transition";
  const input =
    "w-full rounded-md border border-[#2A2E36] bg-[#111318] text-white placeholder:text-[#9AA0A6] focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/40 p-2";

  return (
    <AnimatePresence>
      {open && booking && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-4">
          <motion.button
            type="button"
            aria-label="Close"
            onClick={onCloseAction}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            className="relative z-[71] w-full max-w-3xl rounded-2xl border border-[#24272D] bg-[#0F1115] shadow-2xl overflow-hidden max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)]"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.8 }}
          >
            <div className="p-4 sm:p-5 md:p-6 overflow-y-auto max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)]">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 rounded-full w-10 h-10 bg-gradient-to-tr from-indigo-500 to-fuchsia-500 grid place-items-center">
                    <span className="text-white font-bold">✎</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Agendamento</h2>
                    <p className="text-sm text-[#C9CDD3]">Editar, reagendar ou alterar status.</p>
                  </div>
                </div>
                <div className="mt-1">
                  <StatusBadge status={booking.status} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 rounded-xl border border-[#24272D] bg-[#0F1115] p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-[#C9CDD3] mb-1">Nome do cliente</label>
                      <input className={input} value={clientName} onChange={(e) => setClientName(e.target.value)} />
                    </div>

                    <div>
                      <label className="block text-sm text-[#C9CDD3] mb-1">Barber</label>
                      <BarberAvatarPicker
                        value={selectedBarber}
                        onChangeAction={setSelectedBarber}
                        barbers={barbers}
                        loading={false}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                    <div className="min-w-0">
                      <label className="block text-sm text-[#C9CDD3] mb-1">Data</label>
                      <DatePicker value={date} onChangeAction={setDate} disabledBeforeToday />
                    </div>

                    <div className="min-w-0">
                      <label className="block text-sm text-[#C9CDD3] mb-1">Horário</label>
                      <TimePicker
                        value={time}
                        options={times}
                        onChangeAction={setTime}
                        loading={loadingTimes}
                        placeholder={loadingTimes ? "Carregando horários..." : "Selecione um horário"}
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-[#24272D] bg-[#0F1115] p-4">
                  <div className="text-sm text-[#C9CDD3] mb-2">Resumo</div>

                  <ul className="space-y-1">
                    {(booking.services || []).map((bs, i) => (
                      <li
                        key={`${bs.service?.id ?? "service"}-${i}`}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-white">{bs.service?.name ?? "Service"}</span>
                        <span className="text-[#C9CDD3]">{bs.service?.duration ?? 0} min</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-3 text-sm text-white font-semibold">Total: £ {total.toFixed(2)}</div>
                  <div className="mt-3 text-xs text-[#9AA0A6]">* Alterar serviços será implementado em outra etapa.</div>

                  <div className="mt-6 flex flex-col gap-2 sm:mt-6 sm:static sticky bottom-0 bg-[#0F1115] pt-3 border-t border-[#24272D]">
                    <button
                      disabled={loading || !clientName.trim() || !date || !time}
                      className={btnPrimary}
                      onClick={handleSave}
                      title={!clientName.trim() || !date || !time ? "Preencha cliente, data e horário" : ""}
                    >
                      {loading ? "Salvando..." : "Save changes"}
                    </button>

                    <button
                      disabled={!booking || total <= 0}
                      className="px-3 py-2 rounded-md border border-amber-700/50 text-amber-300 hover:bg-amber-900/20 transition disabled:opacity-50"
                      onClick={() => setPayOpen(true)}
                      title={total <= 0 ? "Sem serviços com preço" : "Registrar pagamento"}
                    >
                      Registrar pagamento
                    </button>

                    {booking.status !== "CONFIRMED" && booking.status !== "DONE" && booking.status !== "CANCELED" && (
                      <button
                        disabled={loading}
                        className="px-3 py-2 rounded-md border border-emerald-800/50 text-emerald-300 hover:bg-emerald-900/20 transition disabled:opacity-50"
                        onClick={() => setStatus("CONFIRMED")}
                      >
                        Confirmar
                      </button>
                    )}

                    {booking.status !== "DONE" && booking.status !== "CANCELED" && (
                      <button
                        disabled={loading}
                        className="px-3 py-2 rounded-md border border-sky-800/50 text-sky-300 hover:bg-sky-900/20 transition disabled:opacity-50"
                        onClick={() => setStatus("DONE")}
                      >
                        Finalizar
                      </button>
                    )}

                    {booking.status !== "CANCELED" && (
                      <button
                        disabled={loading}
                        className="px-3 py-2 rounded-md border border-rose-800/50 text-rose-300 hover:bg-rose-900/20 transition disabled:opacity-50"
                        onClick={() => setStatus("CANCELED")}
                      >
                        Cancel
                      </button>
                    )}

                    {booking.status === "CANCELED" && (
                      <button
                        disabled={loading}
                        className="px-3 py-2 rounded-md border border-indigo-800/50 text-indigo-300 hover:bg-indigo-900/20 transition disabled:opacity-50"
                        onClick={() => setStatus("SCHEDULED")}
                      >
                        Reabrir (agendado)
                      </button>
                    )}

                    <button className={btnGhost} onClick={onCloseAction}>
                      Close
                    </button>

                    <button
                      disabled={loading}
                      className="mt-2 px-3 py-2 rounded-md border border-fuchsia-800/50 text-fuchsia-300 hover:bg-fuchsia-900/20 transition disabled:opacity-50"
                      onClick={handleDelete}
                      title="Excluir definitivamente este agendamento"
                    >
                      Excluir definitivamente
                    </button>
                  </div>
                </div>
              </div>

              <div className="h-2 sm:hidden" />
            </div>
          </motion.div>

          <PaymentModal
            open={payOpen}
            bookingId={booking?.id ?? null}
            total={total}
            onClose={() => setPayOpen(false)}
            onSaved={onSaved}
          />
        </div>
      )}
    </AnimatePresence>
  );
}
