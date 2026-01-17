"use client";

import ClientStatusBadge from "./ClientStatusBadge";

export type ClientListItem = {
  id: string;
  name: string;
  phoneRaw: string | null;
  active: boolean;
  lastVisitAt: string | null;
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB");
}

export default function ClientsTable({
  items,
  onOpen,
}: {
  items: ClientListItem[];
  onOpen: (id: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#24272D] bg-[#0F1115]">
      <div className="hidden md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[#24272D] text-[#C9CDD4]">
            <tr>
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium">Telefone</th>
              <th className="px-4 py-3 font-medium">Última visita</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#24272D]">
            {items.map((c) => (
              <tr
                key={c.id}
                tabIndex={0}
                role="button"
                onClick={() => onOpen(c.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") onOpen(c.id);
                }}
                className="cursor-pointer outline-none hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-indigo-500/60"
              >
                <td className="px-4 py-3 text-[#E4E7EC]">{c.name}</td>
                <td className="px-4 py-3 text-[#C9CDD4]">{c.phoneRaw || "—"}</td>
                <td className="px-4 py-3 text-[#C9CDD4]">{fmtDate(c.lastVisitAt)}</td>
                <td className="px-4 py-3">
                  <ClientStatusBadge active={c.active} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden">
        <div className="divide-y divide-[#24272D]">
          {items.map((c) => (
            <div
              key={c.id}
              tabIndex={0}
              role="button"
              onClick={() => onOpen(c.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onOpen(c.id);
              }}
              className="cursor-pointer p-4 outline-none hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-indigo-500/60"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm text-[#E4E7EC]">{c.name}</div>
                  <div className="mt-1 text-xs text-[#C9CDD4]">{c.phoneRaw || "—"}</div>
                </div>
                <ClientStatusBadge active={c.active} />
              </div>
              <div className="mt-2 text-xs text-[#C9CDD4]">Última visita: {fmtDate(c.lastVisitAt)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
