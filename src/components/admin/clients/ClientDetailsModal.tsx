"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/components/ui/toast/toast";
import { fetchAdminJSON } from "@/lib/fetchAdmin";
import { getErrorMessage } from "@/lib/errors";
import { centsToBRL } from "@/lib/money";

import ClientMetrics from "./ClientMetrics";
import ClientStatusBadge from "./ClientStatusBadge";

type BookingStatus = "SCHEDULED" | "CONFIRMED" | "DONE" | "CANCELED";

type ClientDTO = {
  id: string;
  name: string;
  phoneRaw: string;
  active: boolean;
  notes?: string | null;
  lastVisitAt?: string | null;
};

type BookingDTO = {
  id: string;
  date: string;
  status: BookingStatus;
  barber?: { id: string; name: string; photo?: string | null } | null;
  services: Array<{ service?: { id: string; name: string; price: number } | null }>;
};

type MetricsDTO = {
  lastVisitAt: string | null;
  ticketAvg: number | null;
  freqDays: number | null;
};

type FavoriteBarberDTO = { id: string; name: string; photo?: string | null };

type DetailsResponse = {
  client: ClientDTO;
  bookings: BookingDTO[];
  favoriteBarber: FavoriteBarberDTO | null;
  metrics: MetricsDTO;
};

type SaleDTO = {
  id: string;
  createdAt: string;
  totalCents: number;
  booking?: { id: string; date: string } | null;
  items: Array<{ id: string; productName: string; qty: number }>;
};

type Props = {
  open: boolean;
  clientId: string | null;
  onCloseAction: () => void;
  onChanged: () => void;
};

export default function ClientDetailsModal({ open, clientId, onCloseAction, onChanged }: Props) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [client, setClient] = useState<ClientDTO | null>(null);
  const [favoriteBarber, setFavoriteBarber] = useState<FavoriteBarberDTO | null>(null);

  const [bookings, setBookings] = useState<BookingDTO[]>([]);
  const [metrics, setMetrics] = useState<MetricsDTO | null>(null);

  const [sales, setSales] = useState<SaleDTO[]>([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesErr, setSalesErr] = useState<string | null>(null);

  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const canLoad = open && !!clientId;

  const load = useCallback(async () => {
    if (!clientId) return;

    setLoading(true);
    setErr(null);

    try {
      const data = await fetchAdminJSON<DetailsResponse>(`/api/admin/clients/${clientId}`);

      setClient(data.client);
      setFavoriteBarber(data.favoriteBarber ?? null);
      setBookings(Array.isArray(data.bookings) ? data.bookings : []);
      setMetrics(data.metrics ?? null);

      setEditName(data.client?.name ?? "");
      setEditPhone(data.client?.phoneRaw ?? "");
      setEditNotes((data.client?.notes ?? "") as string);
    } catch (e: unknown) {
      const msg = getErrorMessage(e, "Failed ao carregar cliente");
      setErr(msg);
      toast.error({ title: "Error", description: msg });
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    if (canLoad) load();
  }, [canLoad, load]);

  useEffect(() => {
    if (!canLoad || !clientId) return;
    let alive = true;
    setSalesLoading(true);
    setSalesErr(null);
    fetchAdminJSON(`/api/admin/clients/${clientId}/sales?page=1&pageSize=20`)
      .then((r) => {
        if (!alive) return;
        const items = (r as { items?: SaleDTO[] })?.items || [];
        setSales(Array.isArray(items) ? items : []);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        const msg = getErrorMessage(e, "Failed ao carregar consumos");
        setSalesErr(msg);
        setSales([]);
      })
      .finally(() => {
        if (!alive) return;
        setSalesLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [canLoad, clientId]);

  const close = useCallback(() => {
    onCloseAction();
  }, [onCloseAction]);

  const onSave = useCallback(async () => {
    if (!clientId) return;

    try {
      await fetchAdminJSON(`/api/admin/clients/${clientId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editName.trim(),
          phone: editPhone.trim(),
          notes: editNotes,
        }),
      });

      toast.success({ title: "Salvo", description: "Client atualizado." });
      onChanged();
      load();
    } catch (e: unknown) {
      toast.error({ title: "Failed ao salvar", description: getErrorMessage(e) });
    }
  }, [clientId, editName, editPhone, editNotes, onChanged, load]);

  const toggleActive = useCallback(async () => {
    if (!clientId || !client) return;

    const next = !client.active;

    try {
      await fetchAdminJSON(`/api/admin/clients/${clientId}`, {
        method: "PATCH",
        body: JSON.stringify({ active: next }),
      });

      toast.success({ title: "OK", description: next ? "Client reativado." : "Client desativado." });
      onChanged();
      load();
    } catch (e: unknown) {
      toast.error({ title: "Failed", description: getErrorMessage(e) });
    }
  }, [clientId, client, onChanged, load]);

  const body = useMemo(() => {
    if (loading) {
      return (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      );
    }

    if (err) {
      return <div className="text-sm text-[#E4E7EC]">{err}</div>;
    }

    if (!client) {
      return <div className="text-sm text-[#E4E7EC]">Client não encontrado.</div>;
    }

    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="text-base font-semibold text-[#E4E7EC]">{client.name}</div>
              <ClientStatusBadge active={client.active} />
            </div>
            <div className="mt-1 text-sm text-[#C9CDD4]">{client.phoneRaw}</div>
          </div>

          <Button variant="secondary" onClick={toggleActive}>
            {client.active ? "Desativar" : "Reativar"}
          </Button>
        </div>

        {metrics ? <ClientMetrics metrics={metrics} favoriteBarber={favoriteBarber} /> : null}

        <div className="rounded-2xl border border-[#24272D] bg-[#0F1115] p-4">
          <div className="mb-3 text-sm font-medium text-[#E4E7EC]">Dados do cliente</div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="sr-only">Nome</span>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full rounded-md border border-[#2A2E36] bg-[#111318] px-3 py-2 text-sm text-[#E4E7EC] outline-none focus-visible:ring-2 focus-visible:ring-[#2B6CB0]"
                placeholder="Nome"
              />
            </label>

            <label className="block">
              <span className="sr-only">Telefone</span>
              <input
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="w-full rounded-md border border-[#2A2E36] bg-[#111318] px-3 py-2 text-sm text-[#E4E7EC] outline-none focus-visible:ring-2 focus-visible:ring-[#2B6CB0]"
                placeholder="Telefone"
              />
            </label>
          </div>

          <div className="mt-3">
            <label className="block">
              <div className="mb-2 text-xs text-[#C9CDD4]">Notes internas</div>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="min-h-[110px] w-full rounded-md border border-[#2A2E36] bg-[#111318] px-3 py-2 text-sm text-[#E4E7EC] outline-none focus-visible:ring-2 focus-visible:ring-[#2B6CB0]"
                placeholder="Somente texto (sem HTML)."
              />
            </label>
          </div>
        </div>

        <div className="rounded-2xl border border-[#24272D] bg-[#0F1115] p-4">
          <div className="mb-3 text-sm font-medium text-[#E4E7EC]">Histórico de agendamentos</div>

          {bookings.length === 0 ? (
            <div className="text-sm text-[#C9CDD4]">Sem agendamentos associados.</div>
          ) : (
            <div className="space-y-2">
              {bookings.map((b) => {
                const total = (b.services || []).reduce((acc, s) => acc + (s.service?.price || 0), 0);
                const servicesText = (b.services || [])
                  .map((s) => s.service?.name)
                  .filter(Boolean)
                  .join(", ");

                return (
                  <div key={b.id} className="rounded-xl border border-[#24272D] bg-[#0F1115] p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm text-[#E4E7EC]">{new Date(b.date).toLocaleString("en-GB")}</div>
                        <div className="mt-1 text-xs text-[#C9CDD4]">
                          {servicesText || "—"} • {b.barber?.name || "—"}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-[#E4E7EC]">£ {total.toFixed(2)}</div>
                        <div className="mt-1 text-xs text-[#C9CDD4]">{b.status}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-[#24272D] bg-[#0F1115] p-4">
          <div className="mb-3 text-sm font-medium text-[#E4E7EC]">Consumos / Bomboniere</div>

          {salesLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          ) : salesErr ? (
            <div className="text-sm text-[#C9CDD4]">{salesErr}</div>
          ) : sales.length === 0 ? (
            <div className="text-sm text-[#C9CDD4]">Sem consumos registrados.</div>
          ) : (
            <div className="space-y-2">
              {sales.map((s) => {
                const itemsText = (s.items || []).map((it) => `${it.productName} x${it.qty}`).join(", ");
                return (
                  <div key={s.id} className="rounded-xl border border-[#24272D] bg-[#0F1115] p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm text-[#E4E7EC]">{new Date(s.createdAt).toLocaleString("en-GB")}</div>
                        <div className="mt-1 text-xs text-[#C9CDD4]">{itemsText || "—"}</div>
                        {s.booking?.id && (
                          <div className="mt-1 text-xs text-[#9AA0A6]">
                            Agendamento: {new Date(s.booking.date).toLocaleString("en-GB")}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-[#E4E7EC]">{centsToBRL(s.totalCents)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }, [
    loading,
    err,
    client,
    bookings,
    metrics,
    favoriteBarber,
    editName,
    editPhone,
    editNotes,
    sales,
    salesLoading,
    salesErr,
    toggleActive,
  ]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-2 md:items-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onMouseDown={close}
        aria-modal="true"
        role="dialog"
      >
        <motion.div
          className="w-full max-w-3xl overflow-hidden rounded-2xl border border-[#24272D] bg-[#0F1115] p-0"
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 16, opacity: 0 }}
          transition={{ duration: 0.15 }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex max-h-[calc(100dvh-1rem)] flex-col">
            <div className="flex-1 overflow-y-auto p-4 pb-24 md:pb-4">{body}</div>

            <div className="shrink-0 border-t border-[#24272D] bg-[#0F1115] p-3 md:p-4">
              <div className="flex items-center justify-end gap-2">
                <Button variant="secondary" onClick={close}>
                  Close
                </Button>
                <Button onClick={onSave}>Salvar</Button>
              </div>
              <div className="h-[env(safe-area-inset-bottom)]" />
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}