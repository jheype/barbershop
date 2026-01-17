"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast/toast";
import { Skeleton } from "@/components/ui/Skeleton";
import { fetchAdminJSON } from "@/lib/fetchAdmin";

type Barber = {
  id: string;
  name: string;
  photo: string;
  active: boolean;
  email?: string | null;
  whatsapp?: string | null;
  birthDate?: string | null;
  cpf?: string | null;
};

type Props = {
  open: boolean;
  mode: "create" | "edit";
  barberId?: string | null;
  onClose: () => void;
  onSaved: () => void;
};

const inputBase =
  "w-full rounded-md border border-[#2A2E36] bg-[#111318] text-[#E4E7EC] placeholder:text-[#6B7280] focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/40 px-3 py-2";

function photoSafe(url: string) {
  const s = (url || "").trim();
  if (!s) return false;
  if (s.startsWith("/")) return true;
  return s.startsWith("http://") || s.startsWith("https://");
}

function onlyDigits(v: string) {
  return v.replace(/\D/g, "");
}

function maskCPF(raw: string) {
  const d = onlyDigits(raw).slice(0, 11);
  const p1 = d.slice(0, 3);
  const p2 = d.slice(3, 6);
  const p3 = d.slice(6, 9);
  const p4 = d.slice(9, 11);

  let out = p1;
  if (p2) out += `.${p2}`;
  if (p3) out += `.${p3}`;
  if (p4) out += `-${p4}`;
  return out;
}

function maskBirth(raw: string) {
  const d = onlyDigits(raw).slice(0, 8); // DDMMYYYY
  const dd = d.slice(0, 2);
  const mm = d.slice(2, 4);
  const yy = d.slice(4, 8);

  let out = dd;
  if (mm) out += `/${mm}`;
  if (yy) out += `/${yy}`;
  return out;
}

function birthToISO(masked: string) {
  const d = onlyDigits(masked).slice(0, 8);
  if (d.length !== 8) return null;
  const dd = d.slice(0, 2);
  const mm = d.slice(2, 4);
  const yy = d.slice(4, 8);
  const iso = `${yy}-${mm}-${dd}`;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  return iso;
}

export default function BarberPersonalModal({ open, mode, barberId, onClose, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    active: true,
    photo: "",
    email: "",
    whatsapp: "",
    birthDate: "", // DD/MM/YYYY in UI
    cpf: "", // masked in UI
  });

  const fileRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    if (!open) return;

    if (mode === "create") {
      setForm({
        name: "",
        active: true,
        photo: "",
        email: "",
        whatsapp: "",
        birthDate: "",
        cpf: "",
      });
      return;
    }

    if (!barberId) return;

    setLoading(true);
    try {
      const b = await fetchAdminJSON<Barber>(`/api/admin/barbers/${barberId}`);
      setForm({
        name: b.name || "",
        active: !!b.active,
        photo: b.photo || "",
        email: (b.email || "").toString(),
        whatsapp: (b.whatsapp || "").toString(),
        birthDate: b.birthDate ? maskBirth(String(b.birthDate).slice(0, 10).replace(/-/g, "")) : "",
        cpf: b.cpf ? maskCPF(String(b.cpf)) : "",
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error ao carregar.";
      toast.add({ variant: "error", title: "Error", description: msg });
    } finally {
      setLoading(false);
    }
  }, [open, mode, barberId]);

  useEffect(() => {
    load();
  }, [load]);

  const uploadPhoto = useCallback(async (file: File) => {
    const maxBytes = 3 * 1024 * 1024;
    const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);

    if (!allowed.has(file.type)) throw new Error("Formato inválido. Use JPG, PNG ou WEBP.");
    if (file.size > maxBytes) throw new Error("Imagem muito grande. Máximo 3MB.");

    const fd = new FormData();
    fd.append("file", file);

    const up = await fetchAdminJSON<{ url: string }>("/api/admin/barbers/upload", {
      method: "POST",
      body: fd,
    });

    if (!up?.url) throw new Error("Error ao enviar imagem.");
    return up.url;
  }, []);

  const onPickPhoto = useCallback(() => fileRef.current?.click(), []);

  const onFileChange = useCallback(
    async (file: File | null) => {
      if (!file) return;
      try {
        setSaving(true);
        const url = await uploadPhoto(file);
        setForm((p) => ({ ...p, photo: url }));
        toast.add({ variant: "success", title: "Foto enviada" });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed ao enviar imagem.";
        toast.add({ variant: "error", title: "Error", description: msg });
      } finally {
        setSaving(false);
      }
    },
    [uploadPhoto]
  );

  const onSubmit = useCallback(async () => {
    if (saving) return;
    setSaving(true);

    try {
      const name = form.name.trim().replace(/\s+/g, " ").slice(0, 60);
      if (!name) throw new Error("Nome é obrigatório.");

      const birthISO = form.birthDate.trim() ? birthToISO(form.birthDate) : null;
      if (form.birthDate.trim() && !birthISO) throw new Error("Nascimento inválido.");

      const cpfDigits = form.cpf.trim() ? onlyDigits(form.cpf).slice(0, 11) : null;
      if (form.cpf.trim() && (!cpfDigits || cpfDigits.length !== 11)) throw new Error("CPF inválido.");

      const payload = {
        name,
        active: !!form.active,
        photo: form.photo || "",
        email: form.email.trim().slice(0, 120) || null,
        whatsapp: form.whatsapp.trim().slice(0, 20) || null,
        birthDate: birthISO,
        cpf: cpfDigits,
      };

      if (mode === "create") {
        await fetchAdminJSON("/api/admin/barbers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        toast.add({ variant: "success", title: "Barber criado" });
      } else {
        if (!barberId) throw new Error("ID inválido.");
        await fetchAdminJSON(`/api/admin/barbers/${barberId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        toast.add({ variant: "success", title: "Dados atualizados" });
      }

      onSaved();
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed ao salvar.";
      toast.add({ variant: "error", title: "Error", description: msg });
    } finally {
      setSaving(false);
    }
  }, [saving, form, mode, barberId, onSaved, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center p-3 md:items-center">
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
            className="relative z-[81] w-full max-w-2xl overflow-hidden rounded-2xl border border-[#24272D] bg-[#0F1115] shadow-2xl"
            initial={{ opacity: 0, y: 18, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.985 }}
            transition={{ type: "spring", stiffness: 420, damping: 36, mass: 0.85 }}
            role="dialog"
            aria-modal="true"
            aria-label={mode === "create" ? "Add barber" : "Edit profile"}
          >
            <div className="flex items-center justify-between border-b border-[#24272D] px-5 py-4">
              <div>
                <h3 className="text-lg font-bold text-white">
                  {mode === "create" ? "Add barber" : "Edit profile"}
                </h3>
                <p className="mt-0.5 text-xs text-[#AEB4BE]">
                  {mode === "create"
                    ? "Crie o barbeiro já com contatos e dados pessoais."
                    : "Atualize contatos e dados pessoais do barbeiro."}
                </p>
              </div>

              <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
                Close
              </Button>
            </div>

            <div className="px-5 py-5">
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-24 w-24 rounded-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-[220px_1fr]">
                  <div className="rounded-2xl border border-[#24272D] bg-[#0F1115] p-4 overflow-hidden">
                    <div className="relative h-24 w-24 overflow-hidden rounded-full border border-[#2A2E36] bg-[#111318]">
                      {photoSafe(form.photo) ? (
                        <Image
                          src={form.photo}
                          alt="Foto do barbeiro"
                          fill
                          className="object-cover"
                          sizes="96px"
                          priority
                        />
                      ) : null}
                    </div>

                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => onFileChange(e.target.files?.[0] || null)}
                    />

                    <div className="mt-3">
                      <Button type="button" variant="outline" onClick={onPickPhoto} disabled={saving}>
                        Enviar foto
                      </Button>
                      <p className="mt-2 text-xs text-[#AEB4BE]">JPG/PNG/WEBP • até 3MB</p>
                    </div>

                    <div className="mt-4">
                      <label className="text-xs text-[#AEB4BE]">Status</label>
                      <select
                        className={inputBase}
                        value={form.active ? "1" : "0"}
                        onChange={(e) => setForm((p) => ({ ...p, active: e.target.value === "1" }))}
                      >
                        <option value="1">Active</option>
                        <option value="0">Inactive</option>
                      </select>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#24272D] bg-[#0F1115] p-4 overflow-hidden">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div className="md:col-span-2">
                        <label className="text-xs text-[#AEB4BE]">Nome</label>
                        <input
                          className={inputBase}
                          value={form.name}
                          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value.slice(0, 60) }))}
                          placeholder="Nome do barbeiro"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-[#AEB4BE]">Email</label>
                        <input
                          className={inputBase}
                          value={form.email}
                          onChange={(e) => setForm((p) => ({ ...p, email: e.target.value.slice(0, 120) }))}
                          placeholder="hello.com"
                          inputMode="email"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-[#AEB4BE]">WhatsApp</label>
                        <input
                          className={inputBase}
                          value={form.whatsapp}
                          onChange={(e) => setForm((p) => ({ ...p, whatsapp: e.target.value.slice(0, 20) }))}
                          placeholder="+55..."
                          inputMode="tel"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-[#AEB4BE]">Nascimento</label>
                        <input
                          className={inputBase}
                          value={form.birthDate}
                          onChange={(e) => setForm((p) => ({ ...p, birthDate: maskBirth(e.target.value) }))}
                          placeholder="DD/MM/AAAA"
                          inputMode="numeric"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-[#AEB4BE]">CPF</label>
                        <input
                          className={inputBase}
                          value={form.cpf}
                          onChange={(e) => setForm((p) => ({ ...p, cpf: maskCPF(e.target.value) }))}
                          placeholder="000.000.000-00"
                          inputMode="numeric"
                        />
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-end gap-2">
                      <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                        Cancel
                      </Button>
                      <Button type="button" onClick={onSubmit} disabled={saving}>
                        {saving ? "Salvando..." : "Salvar"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}