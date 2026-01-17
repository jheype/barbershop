"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import Image from "next/image";

type Svc = { name: string; price: number; duration: number };
type Barber = { name: string; photo: string } | null;

type Props = {
  open: boolean;
  onCloseAction: () => void;
  bookingId?: string;
  dateISO: string;
  barber: Barber;
  services: Svc[];
};

export default function ConfirmModal({
  open,
  onCloseAction,
  bookingId,
  dateISO,
  barber,
  services,
}: Props) {
  if (!open) return null;

  const totalPrice = services.reduce((a, s) => a + (s.price ?? 0), 0);
  const totalMin = services.reduce((a, s) => a + (s.duration ?? 0), 0);
  const dt = new Date(dateISO);

  const btnPrimary =
    "inline-flex items-center justify-center rounded-md bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white px-4 py-2 hover:opacity-95 transition";
  const btnGhost =
    "px-3 py-2 rounded-md border border-[#2A2E36] text-[#E4E7EC] hover:bg-[#1A1C1F] transition";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.button
        type="button"
        aria-label="Close"
        onClick={onCloseAction}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      {/* Dialog */}
      <motion.div
        className="relative z-[61] w-full max-w-lg rounded-2xl border border-[#24272D] bg-[#0F1115] shadow-2xl"
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.8 }}
      >
        <div className="p-5 md:p-6">
          <div className="flex items-start gap-3">
            <div className="shrink-0 rounded-full w-10 h-10 bg-gradient-to-tr from-indigo-500 to-fuchsia-500 grid place-items-center">
              <span className="text-white font-bold">✓</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Agendamento confirmado!</h2>
              <p className="text-sm text-[#C9CDD3]">
                Enviamos sua confirmação. Guarde os detalhes abaixo.
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-[#24272D] bg-[#0F1115]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
              <div className="p-4 border-b md:border-b-0 md:border-r border-[#24272D]">
                <div className="text-xs text-[#9AA0A6] mb-1">Data & horário</div>
                <div className="text-white">
                  {dt.toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long" })}
                  {" • "}
                  {dt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
              <div className="p-4">
                <div className="text-xs text-[#9AA0A6] mb-1">Barber</div>
                {barber ? (
                  <div className="flex items-center gap-3">
                    <Image
                      src={barber.photo}
                      alt={barber.name}
                      width={20}
                      height={20}
                      className="w-10 h-10 rounded-full object-cover border border-[#2A2E36]"
                      onError={(e) => ((e.target as HTMLImageElement).src = "/avatar-placeholder.png")}
                    />
                    <div className="text-white">{barber.name}</div>
                  </div>
                ) : (
                  <div className="text-white">Sem preferência</div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-[#24272D]">
              <div className="text-xs text-[#9AA0A6] mb-2">Services</div>
              <ul className="space-y-2">
                {services.map((s, i) => (
                  <li key={`${s.name}-${i}`} className="flex items-center justify-between text-sm">
                    <span className="text-white">{s.name}</span>
                    <span className="text-[#C9CDD3]">
                      £ {s.price?.toFixed(2)} • {s.duration} min
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex items-center justify-between border-t border-[#24272D] pt-3">
                <div className="text-[#C9CDD3] text-sm">Total estimado</div>
                <div className="text-white font-semibold">
                  £ {totalPrice.toFixed(2)} • {totalMin} min
                </div>
              </div>
            </div>

            {bookingId && (
              <div className="px-4 pb-2 text-xs text-[#9AA0A6]">
                Nº do agendamento: <span className="text-[#E4E7EC]">{bookingId}</span>
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-col sm:flex-row gap-2 justify-end">
            <button className={btnGhost} onClick={onCloseAction}>Close</button>
            <Link href="/" className={btnPrimary}>Ir para o início</Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
