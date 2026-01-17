"use client";

import { useCallback } from "react";

const inputBase =
  "w-full rounded-md border border-[#2A2E36] bg-[#111318] tex... focus:ring-indigo-500/60 focus:border-indigo-500/40 px-3 py-2";

type Props = {
  q: string;
  onQ: (v: string) => void;
  status: "" | "active" | "inactive";
  onStatus: (v: "" | "active" | "inactive") => void;
  lastVisitDays: "" | "7" | "30" | "60";
  onLastVisitDays: (v: "" | "7" | "30" | "60") => void;
};

export default function ClientFiltersBar({ q, onQ, status, onStatus, lastVisitDays, onLastVisitDays }: Props) {
  const onChangeQ = useCallback((e: React.ChangeEvent<HTMLInputElement>) => onQ(e.target.value), [onQ]);
  const onChangeStatus = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => onStatus(e.target.value as Props["status"]),
    [onStatus]
  );
  const onChangeLast = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => onLastVisitDays(e.target.value as Props["lastVisitDays"]),
    [onLastVisitDays]
  );

  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-12">
      <div className="md:col-span-6">
        <label className="sr-only" htmlFor="client-q">
          Buscar cliente
        </label>
        <input
          id="client-q"
          value={q}
          onChange={onChangeQ}
          placeholder="Buscar por nome ou telefone"
          className={inputBase}
          autoComplete="off"
        />
      </div>

      <div className="md:col-span-3">
        <label className="sr-only" htmlFor="client-status">
          Status
        </label>
        <select id="client-status" value={status} onChange={onChangeStatus} className={inputBase}>
          <option value="">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="md:col-span-3">
        <label className="sr-only" htmlFor="client-last">
          Última visita
        </label>
        <select id="client-last" value={lastVisitDays} onChange={onChangeLast} className={inputBase}>
          <option value="">Qualquer data</option>
          <option value="7">Últimos 7 dias</option>
          <option value="30">Últimos 30 dias</option>
          <option value="60">Últimos 60 dias</option>
        </select>
      </div>
    </div>
  );
}
