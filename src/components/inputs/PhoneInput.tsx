"use client";

import { useState } from "react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  className?: string;
};

export default function PhoneInput({ value, onChange, label = "Telefone", className = "" }: Props) {
  const [v, setV] = useState(value);

  function mask(raw: string) {
    const d = raw.replace(/\D/g, "");
    if (d.length <= 10) {
      return d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").trim();
    }
    return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").trim();
  }

  return (
    <div className={className}>
      <label className="block text-sm text-[#C9CDD3] mb-1">{label}</label>
      <input
        className="w-full rounded-md border border-[#2A2E36] bg-[#111318] text-white placeholder:text-[#9AA0A6] focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/40 p-2"
        value={v}
        onChange={(e) => {
          const m = mask(e.target.value);
          setV(m);
          onChange(m);
        }}
        placeholder="(+00 000 000 0000"
        inputMode="tel"
      />
    </div>
  );
}
