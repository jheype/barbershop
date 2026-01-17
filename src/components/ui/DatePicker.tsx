"use client";

import * as React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FiCalendar, FiChevronDown } from "react-icons/fi";
import { AnimatePresence, motion } from "framer-motion";
import { Calendar } from "@/components/ui/calendar";

type Props = {
  value?: Date;
  onChangeAction: (date?: Date) => void;
  disabledBeforeToday?: boolean;
  placeholder?: string;
  className?: string;
};

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function cn(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(" ");
}

function useIsMobile(breakpointPx = 640) {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpointPx - 1}px)`);
    const onChange = () => setIsMobile(mq.matches);

    onChange();
    mq.addEventListener?.("change", onChange);

    return () => mq.removeEventListener?.("change", onChange);
  }, [breakpointPx]);

  return isMobile;
}

export default function DatePicker({
  value,
  onChangeAction,
  disabledBeforeToday,
  placeholder = "Selecione a data",
  className = "",
}: Props) {
  const [open, setOpen] = React.useState(false);
  const btnRef = React.useRef<HTMLButtonElement | null>(null);
  const isMobile = useIsMobile(640);

  const disabled = React.useMemo(() => {
    if (!disabledBeforeToday) return undefined;
    const today = startOfDay(new Date());
    return (date: Date) => startOfDay(date) < today;
  }, [disabledBeforeToday]);

  React.useEffect(() => {
    if (!open || !isMobile) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, isMobile]);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const label = value ? format(value, "dd/MM/yyyy", { locale: ptBR }) : placeholder;

  return (
    <div className={cn("relative w-full", className)}>
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className={cn(
          "w-full h-11 rounded-xl border border-[#2A2E36] bg-[#111318] px-3",
          "inline-flex items-center justify-between gap-3",
          "text-left text-sm",
          "hover:bg-[#151821] transition",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60"
        )}
      >
        <span className={value ? "text-white" : "text-white/60"}>{label}</span>
        <span className="inline-flex items-center gap-2 text-white/70">
          <FiCalendar className="h-4 w-4" />
          <FiChevronDown className="h-4 w-4" />
        </span>
      </button>

      {/* MOBILE MODAL CENTRALIZADO */}
      <AnimatePresence>
        {open && isMobile && (
          <motion.div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Selecionar data"
              className="w-full max-w-[420px] rounded-2xl border border-white/10 bg-[#0B0D10] shadow-2xl p-2"
              initial={{ opacity: 0, scale: 0.97, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 12 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="rounded-xl border border-white/10 bg-black/30 p-2">
                <Calendar
                  mode="single"
                  selected={value}
                  disabled={disabled}
                  onSelect={(d) => {
                    onChangeAction(d ?? undefined);
                    setOpen(false);
                    btnRef.current?.focus();
                  }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DESKTOP: dropdown normal */}
      {open && !isMobile && (
        <div className="absolute z-50 mt-2 rounded-2xl border border-white/10 bg-[#0B0D10] shadow-2xl p-2">
          <Calendar
            mode="single"
            selected={value}
            disabled={disabled}
            onSelect={(d) => {
              onChangeAction(d ?? undefined);
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
