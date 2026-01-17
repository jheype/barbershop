"use client";

import { useEffect, useMemo, useState } from "react";
import { parseBRLToCents, centsToNumber } from "@/lib/money";

type Props = {
  id: string;
  label: string;
  valueCents: number | null | undefined;
  onChangeCentsAction: (next: number | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

export default function MoneyInput({
  id,
  label,
  valueCents,
  onChangeCentsAction,
  placeholder,
  className,
  disabled,
}: Props) {
  const [text, setText] = useState<string>("");

  const display = useMemo(() => {
    const n = centsToNumber(valueCents);
    if (n === null) return "";
    return n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }, [valueCents]);

  useEffect(() => {
    setText(display);
  }, [display]);

  return (
    <div>
      <label htmlFor={id} className="block text-sm text-[#C9CDD3] mb-1">
        {label}
      </label>
      <input
        id={id}
        inputMode="decimal"
        autoComplete="off"
        disabled={disabled}
        className={className}
        value={text}
        onChange={(e) => {
          const v = e.target.value;
          setText(v);
          onChangeCentsAction(parseBRLToCents(v));
        }}
        placeholder={placeholder}
      />
    </div>
  );
}
