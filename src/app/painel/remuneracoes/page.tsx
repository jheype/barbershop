"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Skeleton } from "@/components/ui/Skeleton";
import { fetchAdminJSON } from "@/lib/fetchAdmin";
import { centsToBRL } from "@/lib/money";

type Row = {
  id: string;
  name: string;
  photo?: string | null;
  active?: boolean | null;
  totalCents: number;
  paidCents: number;
  pendingCents: number;
  advancesPendingCents: number;
};

function photoSafe(url?: string | null) {
  const s = String(url || "").trim();
  if (!s) return false;
  if (s.startsWith("/")) return true;
  return s.startsWith("http://") || s.startsWith("https://");
}

export default function RemuneracoesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchAdminJSON(`/api/admin/remunerations`)
      .then((r) => {
        if (!alive) return;
        setRows(((r as { items?: Row[] })?.items || []) as Row[]);
      })
      .catch(() => {
        if (!alive) return;
        setRows([]);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const totals = useMemo(() => {
    const sum = (k: keyof Row) => rows.reduce((a, r) => a + Number(r[k] || 0), 0);
    return {
      total: sum("totalCents"),
      paid: sum("paidCents"),
      pending: sum("pendingCents"),
      advances: sum("advancesPendingCents"),
    };
  }, [rows]);

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Compensation</h1>
          <p className="text-sm text-[#AEB4BE] mt-1">Summary of amounts payable per barber (based on the finished services).</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-[#24272D] bg-[#0F1115] p-4">
          <div className="text-xs text-[#AEB4BE]">Total</div>
          <div className="text-lg font-bold text-white mt-1">{centsToBRL(totals.total)}</div>
        </div>
        <div className="rounded-2xl border border-[#24272D] bg-[#0F1115] p-4">
          <div className="text-xs text-[#AEB4BE]">Paid</div>
          <div className="text-lg font-bold text-white mt-1">{centsToBRL(totals.paid)}</div>
        </div>
        <div className="rounded-2xl border border-[#24272D] bg-[#0F1115] p-4">
          <div className="text-xs text-[#AEB4BE]">Pending</div>
          <div className="text-lg font-bold text-white mt-1">{centsToBRL(totals.pending)}</div>
        </div>
        <div className="rounded-2xl border border-[#24272D] bg-[#0F1115] p-4">
          <div className="text-xs text-[#AEB4BE]">Pending Compensations</div>
          <div className="text-lg font-bold text-white mt-1">{centsToBRL(totals.advances)}</div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-[#24272D] bg-[#0F1115] p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-28 mt-2" />
                  </div>
                </div>
                <Skeleton className="h-16 w-full mt-4" />
              </div>
            ))
          : rows.map((r) => (
              <Link
                key={r.id}
                href={`/painel/remuneracoes/${r.id}`}
                className="group rounded-2xl border border-[#24272D] bg-[#0F1115] p-4 hover:border-[#2A2E36] hover:bg-[#111318] transition"
              >
                <div className="flex items-center gap-3">
                  <div className="relative h-12 w-12 rounded-full overflow-hidden border border-[#2A2E36] bg-[#111318]">
                    {photoSafe(r.photo) ? (
                      <Image src={r.photo as string} alt={r.name} fill className="object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-[#AEB4BE] text-xs">—</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-semibold truncate">{r.name}</h3>
                      {r.active === false && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full border border-[#2A2E36] text-[#AEB4BE]">inative</span>
                      )}
                    </div>
                    <p className="text-xs text-[#AEB4BE] truncate">Click for details and payments</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl border border-[#24272D] bg-black/20 p-3">
                    <div className="text-[11px] text-[#AEB4BE]">Total Amount</div>
                    <div className="text-white font-semibold mt-1">{centsToBRL(r.totalCents)}</div>
                  </div>
                  <div className="rounded-xl border border-[#24272D] bg-black/20 p-3">
                    <div className="text-[11px] text-[#AEB4BE]">Paid</div>
                    <div className="text-white font-semibold mt-1">{centsToBRL(r.paidCents)}</div>
                  </div>
                  <div className="rounded-xl border border-[#24272D] bg-black/20 p-3">
                    <div className="text-[11px] text-[#AEB4BE]">Pending</div>
                    <div className="text-white font-semibold mt-1">{centsToBRL(r.pendingCents)}</div>
                  </div>
                  <div className="rounded-xl border border-[#24272D] bg-black/20 p-3">
                    <div className="text-[11px] text-[#AEB4BE]">Pending Compensantions</div>
                    <div className="text-white font-semibold mt-1">{centsToBRL(r.advancesPendingCents)}</div>
                  </div>
                </div>
              </Link>
            ))}
      </div>
    </div>
  );
}
