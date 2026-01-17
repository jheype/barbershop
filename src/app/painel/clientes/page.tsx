"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast/toast";
import { fetchAdminJSON } from "@/lib/fetchAdmin";
import { getErrorMessage } from "@/lib/errors";

import ClientFiltersBar from "@/components/admin/clients/ClientFiltersBar";
import ClientsTable, { type ClientListItem } from "@/components/admin/clients/ClientsTable";
import ClientDetailsModal from "@/components/admin/clients/ClientDetailsModal";

type ClientListResponse = {
  items: ClientListItem[];
  total: number;
};

export default function ClientesPage() {
  const [items, setItems] = useState<ClientListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"" | "active" | "inactive">("");
  const [lastVisitDays, setLastVisitDays] = useState<"" | "7" | "30" | "60">("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsId, setDetailsId] = useState<string | null>(null);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [pageSize, total]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);

    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (status) params.set("status", status);
      if (lastVisitDays) params.set("lastVisitDays", lastVisitDays);
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));

      const data = await fetchAdminJSON<ClientListResponse>(`/api/admin/clients?${params.toString()}`);

      setItems(Array.isArray(data.items) ? data.items : []);
      setTotal(Number.isFinite(data.total) ? data.total : Number(data.total || 0));
    } catch (e: unknown) {
      const msg = getErrorMessage(e, "Failed to load customers");
      setErr(msg);
      toast.error({ title: "Failed to load", description: msg });
    } finally {
      setLoading(false);
    }
  }, [lastVisitDays, page, pageSize, q, status]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [q, status, lastVisitDays]);

  const openDetails = useCallback((id: string) => {
    setDetailsId(id);
    setDetailsOpen(true);
  }, []);

  const onChanged = useCallback(() => {
    load();
  }, [load]);

  const empty = !loading && !err && items.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-[#E4E7EC]">Customers</h1>
          <p className="mt-1 text-sm text-[#C9CDD4]">history, metrics and fast actions.</p>
        </div>
      </div>

      <ClientFiltersBar
        q={q}
        onQ={setQ}
        status={status}
        onStatus={setStatus}
        lastVisitDays={lastVisitDays}
        onLastVisitDays={setLastVisitDays}
      />

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : err ? (
        <div className="rounded-2xl border border-[#24272D] bg-[#0F1115] p-4 text-sm text-[#E4E7EC]">{err}</div>
      ) : empty ? (
        <div className="rounded-2xl border border-[#24272D] bg-[#0F1115] p-4 text-sm text-[#E4E7EC]">
          No customer found.
        </div>
      ) : (
        <ClientsTable items={items} onOpen={openDetails} />
      )}

      <div className="flex items-center justify-between">
        <div className="text-xs text-[#C9CDD4]">
          Page {page} of {totalPages} • {total} customer(s)
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={loading || page <= 1}>
            Previous
          </Button>
          <Button
            variant="secondary"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={loading || page >= totalPages}
          >
            Next
          </Button>
        </div>
      </div>

      <ClientDetailsModal
        open={detailsOpen}
        clientId={detailsId}
        onCloseAction={() => setDetailsOpen(false)}
        onChanged={onChanged}
      />
    </div>
  );
}