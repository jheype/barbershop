"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast/toast";

const MAX_BYTES = 2 * 1024 * 1024;

function getCookie(name: string) {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(
    new RegExp(`(?:^|; )${name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")}=([^;]*)`)
  );
  return m ? decodeURIComponent(m[1]) : null;
}

function isAllowedType(type: string) {
  return type === "image/jpeg" || type === "image/png" || type === "image/webp" || type === "image/avif";
}

export default function BarberPhotoPicker({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [tempUrl, setTempUrl] = useState(value || "");

  const preview = useMemo(() => value || tempUrl, [value, tempUrl]);

  const uploadFile = useCallback(async (file: File) => {
    if (!isAllowedType(file.type)) throw new Error("Tipo de arquivo não permitido.");
    if (file.size > MAX_BYTES) throw new Error("Arquivo muito grande (máx 2MB).");

    const csrf = getCookie("admin_csrf");
    if (!csrf) throw new Error("CSRF ausente. Recarregue e tente novamente.");

    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch("/api/admin/barbers/upload", {
      method: "POST",
      headers: { "x-admin-csrf": csrf },
      body: fd,
    });

    const ct = res.headers.get("content-type") || "";
    const isJSON = ct.includes("application/json");
    const data = isJSON ? await res.json() : null;

    if (!res.ok) {
      const msg = data?.error || data?.message || `Failed (${res.status}).`;
      throw new Error(msg);
    }

    const url = data?.url;
    if (!url || typeof url !== "string") throw new Error("Upload inválido.");
    return url;
  }, []);

  const onPick = useCallback(() => {
    if (disabled || busy) return;
    fileRef.current?.click();
  }, [disabled, busy]);

  const onFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] || null;
      e.target.value = "";
      if (!file) return;

      setBusy(true);
      try {
        const url = await uploadFile(file);
        onChange(url);
        toast.add({ variant: "success", title: "Foto atualizada" });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error no upload.";
        toast.add({ variant: "error", title: "Failed no upload", description: msg });
      } finally {
        setBusy(false);
      }
    },
    [uploadFile, onChange]
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="relative h-16 w-16 overflow-hidden rounded-full border border-[#2A2E36] bg-[#111318]">
          {preview ? (
            <Image src={preview} alt="Foto" fill className="object-cover" sizes="64px" />
          ) : (
            <div className="grid h-full w-full place-items-center text-xs text-[#AEB4BE]">Sem foto</div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="hidden"
            onChange={onFile}
            disabled={disabled || busy}
          />

          <Button type="button" variant="outline" onClick={onPick} disabled={disabled || busy}>
            {busy ? "Enviando..." : "Enviar foto"}
          </Button>
        </div>
      </div>

      <div>
        <label className="text-xs text-[#AEB4BE]">Ou cole uma URL</label>
        <input
          value={tempUrl}
          onChange={(e) => setTempUrl(e.target.value)}
          placeholder="https://..."
          className="mt-1 w-full rounded-md border border-[#2A2E36] bg-[#111318] text-[#E4E7EC] placeholder:text-[#6B7280] focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/40 p-2"
          disabled={disabled || busy}
        />
        <div className="mt-2 flex items-center justify-end">
          <Button type="button" variant="secondary" onClick={() => onChange(tempUrl.trim())} disabled={disabled || busy}>
            Apply URL
          </Button>
        </div>
      </div>
    </div>
  );
}