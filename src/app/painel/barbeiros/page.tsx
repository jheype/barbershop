"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/button";
import { fetchAdminJSON } from "@/lib/fetchAdmin";
import { toast } from "@/components/ui/toast/toast";
import BarberDetailsModal from "@/components/admin/barbers/BarberDetailsModal";
import BarberPersonalModal from "@/components/admin/barbers/BarberPersonalModal";
import { ConfirmDialog } from "@/components/ui/confirm/ConfirmDialog";
import { FaUserEdit, FaTrash } from "react-icons/fa";

type Barber = {
  id: string;
  name: string;
  photo?: string | null;
  active?: boolean;
};

function photoSafe(url?: string | null) {
  const s = (url || "").trim();
  if (!s) return false;
  if (s.startsWith("/")) return true;
  return s.startsWith("http://") || s.startsWith("https://");
}

const inputBase =
  "w-full rounded-md border border-[#2A2E36] bg-[#111318] text-[#E4E7EC] placeholder:text-[#6B7280] focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/40 px-3 py-2";

export default function BarbersPage() {
  const [items, setItems] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"" | "1" | "0">("");

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsId, setDetailsId] = useState<string | null>(null);

  const [personalOpen, setPersonalOpen] = useState(false);
  const [personalMode, setPersonalMode] = useState<"create" | "edit">("create");
  const [personalId, setPersonalId] = useState<string | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchAdminJSON<Barber[]>("/api/admin/barbers");
      setItems(Array.isArray(list) ? list : []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load barbers.";
      toast.add({ variant: "error", title: "Error", description: msg });
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return items.filter((b) => {
      const okName = !qq || (b.name || "").toLowerCase().includes(qq);
      const a = !!b.active;
      const okStatus = status === "" ? true : status === "1" ? a : !a;
      return okName && okStatus;
    });
  }, [items, q, status]);

  const openDetails = useCallback((id: string) => {
    setDetailsId(id);
    setDetailsOpen(true);
  }, []);

  const openPersonalCreate = useCallback(() => {
    setPersonalMode("create");
    setPersonalId(null);
    setPersonalOpen(true);
  }, []);

  const openPersonalEdit = useCallback((id: string) => {
    setPersonalMode("edit");
    setPersonalId(id);
    setPersonalOpen(true);
  }, []);

  const askDelete = useCallback((b: Barber) => {
    setDeleteTarget({ id: b.id, name: b.name });
    setDeleteOpen(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);

    try {
      await fetchAdminJSON(`/api/admin/barbers/${deleteTarget.id}`, {
        method: "DELETE",
      });

      toast.add({ variant: "success", title: "Barber removed" });
      setDeleteOpen(false);
      setDeleteTarget(null);
      await load();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Delete failed.";
      toast.add({
        variant: "error",
        title: "Delete error",
        description:
          msg +
          " — If your backend does not support DELETE, implement the route (or use deactivation via Status).",
      });
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, deleting, load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Barbers</h1>
          <p className="text-sm text-[#AEB4BE]">Manage staff, details, and capabilities.</p>
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={load} disabled={loading}>
            Refresh
          </Button>
          <Button type="button" onClick={openPersonalCreate}>
            Add barber
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <input
          className={inputBase}
          placeholder="Search by name..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        <select
          className="w-full md:w-56 rounded-md border border-[#2A2E36] bg-[#111318] text-[#E4E7EC] focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/40 px-3 py-2"
          value={status}
          onChange={(e) => setStatus(e.target.value as "" | "1" | "0")}
        >
          <option value="">All</option>
          <option value="1">Active</option>
          <option value="0">Inactive</option>
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-[#24272D] bg-[#0F1115] p-4 overflow-hidden">
              <Skeleton className="mx-auto h-20 w-20 rounded-full" />
              <Skeleton className="mt-4 h-4 w-2/3 mx-auto" />
              <Skeleton className="mt-2 h-3 w-1/3 mx-auto" />
              <Skeleton className="mt-4 h-10 w-full rounded-md" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-[#24272D] bg-[#0F1115] p-6 text-sm text-[#AEB4BE]">
          No barbers found.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((b) => (
            <div key={b.id} className="rounded-2xl border border-[#24272D] bg-[#0F1115] p-4 overflow-hidden">
              <div className="relative mx-auto h-20 w-20 overflow-hidden rounded-full border border-[#2A2E36] bg-[#111318]">
                {photoSafe(b.photo) ? (
                  <Image src={b.photo as string} alt={b.name} fill className="object-cover" sizes="80px" />
                ) : null}
              </div>

              <p className="mt-4 text-center text-sm font-semibold text-white truncate">{b.name}</p>
              <p className="mt-1 text-center text-xs text-[#AEB4BE]">{b.active ? "Active" : "Inactive"}</p>

              <div className="mt-4 flex items-center gap-2">
                <Button className="flex-1" type="button" onClick={() => openDetails(b.id)}>
                  View details
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => openPersonalEdit(b.id)}
                  aria-label="Edit personal details"
                  title="Edit personal details"
                  className="px-3"
                >
                  <FaUserEdit />
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => askDelete(b)}
                  aria-label="Delete barber"
                  title="Delete barber"
                  className="px-3"
                >
                  <FaTrash />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <BarberDetailsModal open={detailsOpen} barberId={detailsId} onClose={() => setDetailsOpen(false)} onSaved={load} />

      <BarberPersonalModal
        open={personalOpen}
        mode={personalMode}
        barberId={personalId}
        onClose={() => setPersonalOpen(false)}
        onSaved={load}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="Delete barber?"
        description={
          deleteTarget
            ? `This will permanently remove “${deleteTarget.name}”. This action cannot be undone.`
            : "This action cannot be undone."
        }
        confirmText={deleting ? "Deleting..." : "Delete"}
        confirmTone="danger"
        onClose={() => {
          if (!deleting) setDeleteOpen(false);
        }}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
