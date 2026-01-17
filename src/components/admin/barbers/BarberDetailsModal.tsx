"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/Skeleton";
import { toast } from "@/components/ui/toast/toast";
import { fetchAdminJSON } from "@/lib/fetchAdmin";

import BarberWorkHoursModal from "./BarberWorkHoursModal";
import BarberCommissionsModal from "./BarberComissionsModal";
import BarberSalaryModal from "./BarberSalaryModal";
import BarberAdvancesModal from "./BarberAdvancesModal";
import BarberServicesModal from "./BarberServicesModal";

type Service = { id: string; name: string; active: boolean };

type BarberDetail = {
  id: string;
  name: string;
  photo: string;
  active: boolean;
  email?: string | null;
  whatsapp?: string | null;
  birthDate?: string | null;
  cpf?: string | null;
};

type RecentActivity = {
  id: string;
  clientName: string;
  date: string;
  netTotal: number | null;
  description?: string | null;
  situationLabel?: string | null;
  situationRef?: string | null;
};

type BarberStats = {
  periodLabel: string;
  count: number;
  revenue: number;
  avgTicket: number;
  recent: RecentActivity[];
};

type TabKey = "PROFILE" | "CONFIG" | "ACTIVITY" | "SKILLS";

const inputBase =
  "w-full rounded-md border border-[#2A2E36] bg-[#111318] text-[#E4E7EC] placeholder:text-[#6B7280] focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/40 px-3 py-2";

const panel = "rounded-2xl border border-[#24272D] bg-[#0F1115] overflow-hidden";

function photoSafe(url: string) {
  const s = (url || "").trim();
  if (!s) return false;
  if (s.startsWith("/")) return true;
  return s.startsWith("http://") || s.startsWith("https://");
}

function fmtMoneyBRL(v: number) {
  try {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency: "BRL" }).format(v);
  } catch {
    return `£ ${v.toFixed(2)}`;
  }
}

function fmtDateShort(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const day = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return `${day} • ${time}`;
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={[
        "rounded-full px-3 py-1 text-xs transition border",
        "whitespace-nowrap",
        active
          ? "border-indigo-500/50 bg-indigo-500/15 text-white"
          : "border-[#24272D] bg-[#0F1115] text-[#AEB4BE] hover:bg-[#12141A]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#24272D] bg-[#0F1115] p-3">
      <p className="text-[11px] text-[#AEB4BE]">{label}</p>
      <p className="mt-1 text-lg font-bold text-white">{value}</p>
    </div>
  );
}

function fmtCPF(cpf: string) {
  const digits = String(cpf || "").replace(/\D/g, "").slice(0, 11);
  if (digits.length !== 11) return cpf;
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

function fmtBRDate(v: string) {
  const s = (v || "").trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-");
    return `${d}/${m}/${y}`;
  }
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-GB");
}

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#24272D] bg-[#0F1115] p-3">
      <p className="text-xs text-[#AEB4BE]">{label}</p>
      <div className="mt-1 rounded-md border border-[#2A2E36] bg-[#111318] px-3 py-2">
        <p className="text-sm text-white break-words whitespace-normal">{value || "—"}</p>
      </div>
    </div>
  );
}

function ToggleSwitch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => {
        if (!disabled) onChange(!checked);
      }}
      disabled={disabled}
      className={[
        "relative inline-flex h-7 w-12 items-center rounded-full border transition",
        disabled ? "opacity-60" : "hover:brightness-110",
        checked ? "bg-emerald-500/20 border-emerald-500/40" : "bg-[#111318] border-[#2A2E36]",
      ].join(" ")}
    >
      <span
        className={[
          "inline-block h-5 w-5 rounded-full transition",
          checked ? "translate-x-6 bg-emerald-400" : "translate-x-1 bg-[#AEB4BE]",
        ].join(" ")}
      />
    </button>
  );
}

function SituationPill({ refText, label }: { refText: string; label: string }) {
  return (
    <div className="flex flex-col items-end gap-0.5 max-w-[200px]">
      <span className="text-xs text-white/90 break-words whitespace-normal text-right">{refText}</span>
      <span className="text-[11px] text-[#AEB4BE] break-words whitespace-normal text-right">{label}</span>
    </div>
  );
}

function SettingsRow({
  title,
  description,
  onClick,
}: {
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-xl border border-[#24272D] bg-[#0F1115] px-3 py-3 hover:bg-[#12141A] transition"
    >
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-0.5 text-xs text-[#AEB4BE] break-words">{description}</p>
    </button>
  );
}

export default function BarberDetailsModal({
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
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("PROFILE");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [services, setServices] = useState<Service[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [skillsQ, setSkillsQ] = useState("");

  const [stats, setStats] = useState<BarberStats | null>(null);
  const [statsError, setStatsError] = useState("");

  const [form, setForm] = useState({
    name: "",
    photo: "",
    active: true,
    email: "",
    whatsapp: "",
    birthDate: "",
    cpf: "",
  });

  const [workHoursOpen, setWorkHoursOpen] = useState(false);
  const [commOpen, setCommOpen] = useState(false);
  const [salaryOpen, setSalaryOpen] = useState(false);
  const [advOpen, setAdvOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);

  const title = useMemo(() => "Detalhes do barbeiro", []);

  const loadServices = useCallback(async () => {
    try {
      const all = await fetchAdminJSON<Service[]>("/api/admin/services");
      const active = all.filter((s) => s.active !== false);
      active.sort((a, b) => a.name.localeCompare(b.name, "en-GB"));
      setServices(active);
    } catch {
      setServices([]);
    }
  }, []);

  const loadDetail = useCallback(async () => {
    if (!open || !barberId) return;

    setLoading(true);
    setError("");
    setStats(null);
    setStatsError("");

    try {
      await loadServices();

      const detail = await fetchAdminJSON<BarberDetail>(`/api/admin/barbers/${barberId}`);
      setForm({
        name: detail.name || "",
        photo: detail.photo || "",
        active: !!detail.active,
        email: (detail.email || "").toString(),
        whatsapp: (detail.whatsapp || "").toString(),
        birthDate: detail.birthDate ? String(detail.birthDate).slice(0, 10) : "",
        cpf: (detail.cpf || "").toString(),
      });

      try {
        const skillIds = await fetchAdminJSON<string[]>(`/api/admin/barbers/${barberId}/skills`);
        setSkills(Array.isArray(skillIds) ? skillIds : []);
      } catch {
        setSkills([]);
      }

      try {
        const s = await fetchAdminJSON<BarberStats>(`/api/admin/barbers/${barberId}/stats`);
        setStats(s);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Dados indisponíveis.";
        setStatsError(msg);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error ao carregar dados.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [open, barberId, loadServices]);

  useEffect(() => {
    if (!open) return;
    setTab("PROFILE");
    setSkillsQ("");
    loadDetail();
  }, [open, loadDetail]);

  const onToggleSkill = useCallback((id: string) => {
    setSkills((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const onSave = useCallback(async () => {
    if (!barberId || saving) return;
    setSaving(true);
    setError("");

    try {
      await fetchAdminJSON(`/api/admin/barbers/${barberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: form.active }),
      });

      await fetchAdminJSON(`/api/admin/barbers/${barberId}/skills`, {
        method: "PUT",
        body: JSON.stringify({ serviceIds: skills }),
      });

      toast.add({ variant: "success", title: "Salvo" });
      onSaved();
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed ao salvar.";
      setError(msg);
      toast.add({ variant: "error", title: "Error", description: msg });
    } finally {
      setSaving(false);
    }
  }, [barberId, saving, form.active, skills, onSaved, onClose]);

  const filteredServices = useMemo(() => {
    const q = skillsQ.trim().toLowerCase();
    if (!q) return services;
    return services.filter((s) => s.name.toLowerCase().includes(q));
  }, [services, skillsQ]);

  const profileCpf = useMemo(() => {
    const d = String(form.cpf || "").replace(/\D/g, "");
    return d.length === 11 ? fmtCPF(d) : (form.cpf || "").trim();
  }, [form.cpf]);

  const profileBirth = useMemo(() => fmtBRDate(form.birthDate || ""), [form.birthDate]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-2 md:p-3">
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
            className={[
              "relative z-[81] w-full rounded-2xl border border-[#24272D] bg-[#0F1115] shadow-2xl",
              "overflow-hidden flex flex-col",
              "max-w-5xl",
              // ✅ em vez de altura fixa, usamos max-h
              "h-auto max-h-[98svh] md:max-h-[88vh]",
            ].join(" ")}
            initial={{ opacity: 0, y: 18, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.985 }}
            transition={{ type: "spring", stiffness: 420, damping: 36, mass: 0.85 }}
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            <div className="flex items-center justify-between border-b border-[#24272D] px-4 py-3 md:px-5 md:py-4 shrink-0">
              <div className="min-w-0">
                <h3 className="text-base md:text-lg font-bold text-white truncate">{title}</h3>
                <p className="mt-0.5 text-[11px] md:text-xs text-[#AEB4BE] truncate">
                  Perfil, configurações, atividades.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => barberId && router.push(`/painel/barbeiros/${barberId}/metricas`)}
                  disabled={saving || !barberId}
                  className="h-9 px-3"
                >
                  Métricas
                </Button>
                <Button type="button" onClick={onSave} disabled={saving} className="md:hidden h-9 px-3">
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
                <Button type="button" variant="ghost" onClick={onClose} disabled={saving} className="h-9 px-3">
                  Close
                </Button>
              </div>
            </div>

            {/* ✅ conteúdo agora scrolla quando precisar, e encolhe quando sobrar */}
            <div
              className={[
                "px-2 py-2 md:px-5 md:py-5",
                "overflow-y-auto",
                // header ~56px no mobile e ~72px no desktop (folga proposital)
                "max-h-[calc(98svh-56px)] md:max-h-[calc(88vh-72px)]",
              ].join(" ")}
            >
              {loading ? (
                <div className="flex flex-col gap-4 md:grid md:grid-cols-[320px_1fr]">
                  <div className={`${panel} hidden md:block p-4`}>
                    <Skeleton className="h-20 w-20 rounded-full" />
                    <Skeleton className="mt-3 h-4 w-40" />
                    <Skeleton className="mt-2 h-3 w-24" />
                    <Skeleton className="mt-5 h-9 w-full rounded-md" />
                  </div>
                  <div className={`${panel} p-4`}>
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="mt-4 h-10 w-full" />
                    <Skeleton className="mt-3 h-10 w-full" />
                    <Skeleton className="mt-3 h-10 w-full" />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3 md:gap-4 md:grid md:grid-cols-[320px_1fr]">
                  <div className={`${panel} hidden md:block`}>
                    <div className="p-4">
                      {error && (
                        <div className="mb-3 rounded-xl border border-[#3A1F1F] bg-[#120A0A] p-3 text-sm text-fuchsia-200">
                          {error}
                        </div>
                      )}

                      <div className="flex items-center gap-3">
                        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-[#2A2E36] bg-[#111318]">
                          {photoSafe(form.photo) ? (
                            <Image src={form.photo} alt="Foto do barbeiro" fill className="object-cover" sizes="80px" />
                          ) : null}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">{form.name.trim() || "Sem nome"}</p>
                          <p className="mt-0.5 text-xs text-[#AEB4BE]">{form.active ? "Active" : "Inactive"}</p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-[#24272D] bg-[#0F1115] p-3">
                        <div className="min-w-0">
                          <p className="text-xs text-[#AEB4BE]">Status</p>
                          <p className="mt-0.5 text-sm font-semibold text-white">{form.active ? "Active" : "Inactive"}</p>
                        </div>
                        <ToggleSwitch
                          checked={form.active}
                          onChange={(v) => setForm((p) => ({ ...p, active: v }))}
                          disabled={saving}
                        />
                      </div>

                      <div className="mt-5 flex items-center justify-end gap-2">
                        <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                          Cancel
                        </Button>
                        <Button type="button" onClick={onSave} disabled={saving}>
                          {saving ? "Salvando..." : "Salvar"}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className={`${panel} flex flex-col overflow-hidden`}>
                    <div className="md:hidden border-b border-[#24272D] px-3 py-3">
                      {error && (
                        <div className="mb-2 rounded-xl border border-[#3A1F1F] bg-[#120A0A] p-3 text-sm text-fuchsia-200">
                          {error}
                        </div>
                      )}

                      <div className="flex items-center gap-3">
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-[#2A2E36] bg-[#111318]">
                          {photoSafe(form.photo) ? (
                            <Image src={form.photo} alt="Foto do barbeiro" fill className="object-cover" sizes="56px" />
                          ) : null}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-white">{form.name.trim() || "Sem nome"}</p>
                          <p className="mt-0.5 text-xs text-[#AEB4BE]">{form.active ? "Active" : "Inactive"}</p>
                        </div>
                      </div>

                      <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-[#24272D] bg-[#0F1115] p-2.5">
                        <div className="min-w-0">
                          <p className="text-[11px] text-[#AEB4BE]">Status</p>
                          <p className="mt-0.5 text-sm font-semibold text-white">{form.active ? "Active" : "Inactive"}</p>
                        </div>
                        <ToggleSwitch
                          checked={form.active}
                          onChange={(v) => setForm((p) => ({ ...p, active: v }))}
                          disabled={saving}
                        />
                      </div>
                    </div>

                    <div
                      role="tablist"
                      aria-label="Seções do barbeiro"
                      className="flex flex-wrap items-center gap-2 border-b border-[#24272D] px-3 py-2"
                    >
                      <TabButton active={tab === "PROFILE"} onClick={() => setTab("PROFILE")}>
                        Perfil
                      </TabButton>
                      <TabButton active={tab === "CONFIG"} onClick={() => setTab("CONFIG")}>
                        Settings
                      </TabButton>
                      <TabButton active={tab === "ACTIVITY"} onClick={() => setTab("ACTIVITY")}>
                        Atividades
                      </TabButton>
                    </div>

                    <div className="px-3 py-3 md:px-4 md:py-4">
                      {tab === "PROFILE" && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <ReadonlyField label="Email" value={form.email.trim()} />
                            <ReadonlyField label="WhatsApp" value={form.whatsapp.trim()} />
                          </div>

                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <ReadonlyField label="CPF" value={profileCpf} />
                            <ReadonlyField label="Nascimento" value={profileBirth} />
                          </div>
                        </div>
                      )}

                      {tab === "CONFIG" && (
                        <div className="space-y-3">
                          <SettingsRow
                            title="Horários de trabalho"
                            description="Defina os dias, horários e almoço do barbeiro."
                            onClick={() => setWorkHoursOpen(true)}
                          />

                          <SettingsRow
                            title="Services"
                            description="Defina quais serviços o barbeiro executa."
                            onClick={() => setServicesOpen(true)}
                          />

                          <SettingsRow
                            title="Comissões e gorjetas"
                            description="Defina comissões, assistente e gorjetas."
                            onClick={() => setCommOpen(true)}
                          />

                          <SettingsRow
                            title="Salário"
                            description="Registre pagamentos (impacta no Cashier)."
                            onClick={() => setSalaryOpen(true)}
                          />

                          <SettingsRow
                            title="Vales"
                            description="Registre vales/adiantamentos (impacta no Cashier)."
                            onClick={() => setAdvOpen(true)}
                          />
                        </div>
                      )}

                      {tab === "ACTIVITY" && (
                        <div className="space-y-4">
                          <div className="flex flex-col gap-2">
                            <p className="text-sm font-semibold text-white">{stats?.periodLabel || "Resumo"}</p>
                            {statsError ? (
                              <div className="rounded-xl border border-[#3A1F1F] bg-[#120A0A] p-3 text-sm text-fuchsia-200">
                                {statsError}
                              </div>
                            ) : null}

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                              <MetricCard label="Atendimentos" value={String(stats?.count ?? 0)} />
                              <MetricCard label="Receita" value={fmtMoneyBRL(stats?.revenue ?? 0)} />
                              <MetricCard label="Ticket médio" value={fmtMoneyBRL(stats?.avgTicket ?? 0)} />
                            </div>
                          </div>

                          <div className="space-y-3">
                            <p className="text-sm font-semibold text-white">Atividades recentes</p>

                            {stats?.recent?.length ? (
                              stats.recent.map((r) => (
                                <div key={r.id} className="rounded-xl border border-[#24272D] bg-[#0F1115] p-4">
                                  <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="text-sm font-semibold text-white break-words whitespace-normal">
                                        {r.clientName || "Client"}
                                      </p>
                                      <p className="mt-1 text-xs text-[#AEB4BE]">{fmtDateShort(r.date)}</p>
                                    </div>

                                    {r.situationRef && r.situationLabel ? (
                                      <SituationPill refText={r.situationRef} label={r.situationLabel} />
                                    ) : null}
                                  </div>

                                  {r.description ? (
                                    <p className="mt-3 text-sm text-[#E4E7EC] break-words whitespace-normal">
                                      {r.description}
                                    </p>
                                  ) : null}

                                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                                    <span className="text-xs text-[#AEB4BE]">Total</span>
                                    <span className="text-sm font-semibold text-white">{fmtMoneyBRL(r.netTotal ?? 0)}</span>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="rounded-xl border border-[#24272D] bg-[#0F1115] p-4 text-sm text-[#AEB4BE]">
                                Nenhuma atividade encontrada.
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {tab === "SKILLS" && (
                        <div className="space-y-3">
                          <div className="rounded-xl border border-[#24272D] bg-[#0F1115] p-3">
                            <p className="text-xs text-[#AEB4BE]">Buscar serviço</p>
                            <input
                              className={inputBase + " mt-2"}
                              value={skillsQ}
                              onChange={(e) => setSkillsQ(e.target.value)}
                              placeholder="Ex: barba, corte..."
                            />
                          </div>

                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            {filteredServices.map((s) => {
                              const checked = skills.includes(s.id);
                              return (
                                <button
                                  key={s.id}
                                  type="button"
                                  onClick={() => onToggleSkill(s.id)}
                                  className={[
                                    "w-full text-left rounded-xl border px-4 py-3 transition",
                                    checked
                                      ? "border-indigo-500/40 bg-indigo-500/10"
                                      : "border-[#24272D] bg-[#0F1115] hover:bg-[#12141A]",
                                  ].join(" ")}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="text-sm font-semibold text-white break-words whitespace-normal">
                                        {s.name}
                                      </p>
                                      <p className="mt-1 text-xs text-[#AEB4BE]">
                                        {checked ? "Selecionado" : "Toque para selecionar"}
                                      </p>
                                    </div>

                                    <div
                                      className={[
                                        "h-5 w-5 rounded border shrink-0 mt-0.5",
                                        checked ? "border-indigo-500 bg-indigo-500/20" : "border-[#2A2E36] bg-[#111318]",
                                      ].join(" ")}
                                    />
                                  </div>
                                </button>
                              );
                            })}
                          </div>

                          {!filteredServices.length ? (
                            <div className="rounded-xl border border-[#24272D] bg-[#0F1115] p-4 text-sm text-[#AEB4BE]">
                              No serviço encontrado.
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <BarberWorkHoursModal
              open={workHoursOpen}
              barberId={barberId}
              onClose={() => setWorkHoursOpen(false)}
              onSaved={() => {
                toast.add({ variant: "success", title: "Horários atualizados" });
                setWorkHoursOpen(false);
              }}
            />

            <BarberServicesModal
              open={servicesOpen}
              barberId={barberId}
              onClose={() => setServicesOpen(false)}
              onSaved={() => {
                toast.add({ variant: "success", title: "Services atualizados" });
                setServicesOpen(false);
              }}
            />

            <BarberCommissionsModal
              open={commOpen}
              barberId={barberId}
              onClose={() => setCommOpen(false)}
              onSaved={() => {
                toast.add({ variant: "success", title: "Settings salvas" });
                setCommOpen(false);
              }}
            />

            <BarberSalaryModal
              open={salaryOpen}
              barberId={barberId}
              onClose={() => setSalaryOpen(false)}
              onSaved={() => {
                toast.add({ variant: "success", title: "Salário registrado" });
                setSalaryOpen(false);
              }}
            />

            <BarberAdvancesModal
              open={advOpen}
              barberId={barberId}
              onClose={() => setAdvOpen(false)}
              onSaved={() => {
                toast.add({ variant: "success", title: "Vale registrado" });
                setAdvOpen(false);
              }}
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}