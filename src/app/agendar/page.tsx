"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FiSearch, FiX } from "react-icons/fi";
import ServiceCard from "@/components/booking/ServiceCard";
import BarberPicker from "@/components/booking/BarberPicker";
import ConfirmModal from "@/components/booking/ConfirmModal";
import StockErrorDialog from "@/components/booking/StockErrorDialog";
import DatePicker from "@/components/ui/DatePicker";
import TimePicker from "@/components/ui/TimePicker";
import { Skeleton } from "@/components/ui/Skeleton";

type Service = {
  id: string;
  name: string;
  price: number;
  duration: number;
  category?: string | null;
  description?: string | null;
  active: boolean;
};

type Barber = { id: string; name: string; photo: string };

function toParamDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatPhoneBR(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function LocalBookingSummary(props: {
  services: Service[];
  barbers: Barber[];
  selectedServiceIds: string[];
  selectedBarberId: string | null;
  date?: Date;
  time?: string;
}) {
  const selected = props.services.filter((s) => props.selectedServiceIds.includes(s.id));
  const totalPrice = selected.reduce((acc, s) => acc + (s.price || 0), 0);
  const totalDuration = selected.reduce((acc, s) => acc + (s.duration || 0), 0);

  const barber = props.selectedBarberId
    ? props.barbers.find((b) => b.id === props.selectedBarberId) || null
    : null;

  const when =
    props.date && props.time
      ? new Date(`${toParamDate(props.date)}T${props.time}:00-03:00`).toLocaleString("en-GB", {
          dateStyle: "short",
          timeStyle: "short",
        })
      : "—";

  return (
    <aside className="w-full rounded-2xl border border-[#24272D] bg-[#0F1115] p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-white">Summary</div>
        <div className="text-xs text-[#9AA0A6]">{selected.length} service(s)</div>
      </div>

      <div className="mt-3 space-y-2">
        {selected.length === 0 ? (
          <div className="text-sm text-[#9AA0A6]">Choose at least 1 service.</div>
        ) : (
          <div className="space-y-1">
            {selected.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-white truncate">{s.name}</span>
                <span className="text-[#C9CDD3] shrink-0">
                  £ {Number(s.price || 0).toFixed(2)} • {s.duration || 0}m
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-2 flex items-center justify-between border-t border-[#2A2E36] pt-2 text-sm">
          <span className="text-white">Total</span>
          <span className="text-white">
            £ {Number(totalPrice).toFixed(2)} • {totalDuration}m
          </span>
        </div>

        <div className="mt-3 space-y-1">
          <div className="text-xs text-[#9AA0A6]">Barber</div>
          <div className="text-sm text-white">{barber ? barber.name : "Automatic"}</div>
        </div>

        <div className="mt-3 space-y-1">
          <div className="text-xs text-[#9AA0A6]">Date/Time</div>
          <div className="text-sm text-white">{when}</div>
        </div>
      </div>
    </aside>
  );
}

function StepperTrail({
  step,
  steps,
  onStepClick,
}: {
  step: 1 | 2 | 3;
  steps: readonly { n: 1 | 2 | 3; t: string }[];
  onStepClick: (n: 1 | 2 | 3) => void;
}) {
  const max = steps.length;
  const progress = (step - 1) / (max - 1);

  return (
    <div className="mb-6">
      <div className="relative">
        <div className="relative h-6">
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[3px] rounded-full bg-[#2A2E36]" />

          <motion.div
            className="absolute left-0 top-1/2 -translate-y-1/2 h-[3px] rounded-full bg-indigo-500"
            initial={false}
            animate={{ width: `${progress * 100}%` }}
            transition={{ type: "spring", stiffness: 220, damping: 30 }}
          />

          <div className="absolute inset-0 grid grid-cols-3">
            {steps.map((s) => {
              const isDone = step > s.n;
              const isActive = step === s.n;
              const reached = isDone || isActive;

              return (
                <button
                  key={s.n}
                  type="button"
                  onClick={() => onStepClick(s.n)}
                  className="relative"
                  aria-label={`Go to step ${s.n}`}
                >
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                    <motion.div
                      className={`h-3 w-3 rounded-full ${reached ? "bg-indigo-500" : "bg-[#6B7280]"}`}
                      initial={false}
                      animate={{ scale: isActive ? 1.2 : 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3">
          {steps.map((s) => {
            const isDone = step > s.n;
            const isActive = step === s.n;
            const reached = isDone || isActive;

            return (
              <button
                key={s.n}
                type="button"
                onClick={() => onStepClick(s.n)}
                className="flex flex-col items-center text-center leading-tight"
              >
                <div className={`text-xs sm:text-sm font-semibold ${reached ? "text-white" : "text-[#9AA0A6]"}`}>
                  Step {s.n}
                </div>
                <div
                  className={`text-[11px] sm:text-xs ${
                    isActive ? "text-indigo-300" : reached ? "text-[#C9CDD3]" : "text-[#8B9098]"
                  }`}
                >
                  {s.t}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CategoryChips({
  value,
  items,
  onChange,
  loading,
}: {
  value: string;
  items: string[];
  onChange: (v: string) => void;
  loading?: boolean;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
      <button
        type="button"
        onClick={() => onChange("")}
        className={
          value === ""
            ? "shrink-0 h-9 px-3 rounded-full border border-indigo-500 bg-indigo-500/15 text-white text-sm font-semibold"
            : "shrink-0 h-9 px-3 rounded-full border border-[#2A2E36] bg-[#111318] text-white/80 text-sm hover:bg-[#151821] transition"
        }
      >
        All
      </button>

      {loading && (
        <div className="shrink-0 h-9 px-3 rounded-full border border-[#2A2E36] bg-[#111318] text-white/60 text-sm inline-flex items-center">
          Loading...
        </div>
      )}

      {!loading &&
        items.slice(0, 24).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className={
              value === c
                ? "shrink-0 h-9 px-3 rounded-full border border-indigo-500 bg-indigo-500/15 text-white text-sm font-semibold"
                : "shrink-0 h-9 px-3 rounded-full border border-[#2A2E36] bg-[#111318] text-white/80 text-sm hover:bg-[#151821] transition"
            }
            title={c}
          >
            {c}
          </button>
        ))}
    </div>
  );
}

function MobileSummarySheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            className="fixed inset-0 z-[60] bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-label="Close summary"
          />

          <motion.div
            className="fixed left-0 right-0 bottom-0 z-[61] rounded-t-3xl border border-white/10 bg-[#0B0D10] p-4 pb-[calc(env(safe-area-inset-bottom)+16px)]"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
            role="dialog"
            aria-modal="true"
          >
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-white/15" />

            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="text-sm font-semibold text-white">Summary</div>
              <button
                type="button"
                onClick={onClose}
                className="h-9 px-3 rounded-xl border border-[#2A2E36] text-white"
              >
                Close
              </button>
            </div>

            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default function BookingPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [summaryOpen, setSummaryOpen] = useState(false);

  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  const [categories, setCategories] = useState<string[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loadingBarbers, setLoadingBarbers] = useState(false);
  const [selectedBarber, setSelectedBarber] = useState<string | null>(null);

  const [date, setDate] = useState<Date | undefined>(undefined);
  const [times, setTimes] = useState<string[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [time, setTime] = useState<string | undefined>(undefined);

  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uiError, setUiError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmData, setConfirmData] = useState<{
    id?: string;
    dateISO: string;
    services: { name: string; price: number; duration: number }[];
    barber: { name: string; photo: string } | null;
  } | null>(null);

  const [stockDialog, setStockDialog] = useState<{
    open: boolean;
    message: string;
    details?: { productId?: string; productName?: string; need?: number; have?: number }[];
  }>({ open: false, message: "" });

  const selectedServiceDetails = useMemo(
    () => services.filter((s) => selectedServices.includes(s.id)),
    [services, selectedServices]
  );

  const totals = useMemo(() => {
    const totalPrice = selectedServiceDetails.reduce((acc, s) => acc + (s.price || 0), 0);
    const totalDuration = selectedServiceDetails.reduce((acc, s) => acc + (s.duration || 0), 0);
    return { totalPrice, totalDuration };
  }, [selectedServiceDetails]);

  const loadBarbers = useCallback(async () => {
    setLoadingBarbers(true);
    try {
      const res = await fetch("/api/barbers");
      const data: Barber[] = await res.json();
      setBarbers(Array.isArray(data) ? data : []);
    } finally {
      setLoadingBarbers(false);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    setLoadingCategories(true);
    try {
      const params = new URLSearchParams({ page: "1", pageSize: "200" });
      if (q) params.set("q", q);
      const res = await fetch(`/api/services?${params.toString()}`);
      const data = await res.json();
      const list: Service[] = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];

      const cats = list.map((s) => (s.category ?? "").trim()).filter((c) => c.length > 0);
      const unique = Array.from(new Set(cats)).sort((a, b) => a.localeCompare(b, "en-GB"));
      setCategories(unique);
    } finally {
      setLoadingCategories(false);
    }
  }, [q]);

  const loadServices = useCallback(async () => {
    setLoadingServices(true);
    try {
      const params = new URLSearchParams({ page: "1", pageSize: "60" });
      if (q) params.set("q", q);
      if (category) params.set("category", category);
      const res = await fetch(`/api/services?${params.toString()}`);
      const data = await res.json();
      const list: Service[] = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      setServices(list);
    } finally {
      setLoadingServices(false);
    }
  }, [q, category]);

  useEffect(() => {
    loadServices();
    loadCategories();
    loadBarbers();
  }, [loadServices, loadCategories, loadBarbers]);

  useEffect(() => {
    const t = setTimeout(() => {
      loadServices();
      loadCategories();
    }, 250);
    return () => clearTimeout(t);
  }, [q, category, loadServices, loadCategories]);

  const loadTimes = useCallback(async () => {
    if (!date || selectedServices.length === 0) {
      setTimes([]);
      return;
    }

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setLoadingTimes(true);
    try {
      const params = new URLSearchParams();
      params.set("serviceIds", selectedServices.join(","));
      params.set("date", toParamDate(date));
      if (selectedBarber) params.set("barberId", selectedBarber);

      const res = await fetch(`/api/available-times?${params.toString()}`, { signal: ac.signal });
      const data: string[] = await res.json();
      setTimes(Array.isArray(data) ? data : []);
    } catch {
      // ignore abort
    } finally {
      setLoadingTimes(false);
    }
  }, [date, selectedServices, selectedBarber]);

  useEffect(() => {
    loadTimes();
  }, [loadTimes]);

  useEffect(() => {
    setTime(undefined);
  }, [date, selectedServices, selectedBarber]);

  function toggleService(id: string) {
    setSelectedServices((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function canGoStep2() {
    return selectedServices.length > 0;
  }

  function canGoStep3() {
    return selectedServices.length > 0 && !!date;
  }

  async function submitBooking() {
    setUiError("");

    if (selectedServices.length === 0 || !date || !time || !clientName.trim() || !clientPhone.trim()) {
      setUiError("Please select services, date, and time, and provide your name and phone number.");
      return;
    }

    const iso = new Date(`${toParamDate(date)}T${time}:00-03:00`).toISOString();

    try {
      setSubmitting(true);

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: clientName.trim(),
          clientPhone: clientPhone.trim(),
          dateTime: iso,
          barberId: selectedBarber || null,
          serviceIds: selectedServices,
        }),
      });

      if (!res.ok) {
        if (res.status === 409) {
          const j = await res.json().catch(() => ({}));
          const message =
            (j as { error?: string })?.error ||
            "There is not enough capacity for these services on this date. Please try another day or time.";

          const details = Array.isArray((j as { details?: unknown })?.details)
            ? (j as {
                details?: {
                  productId?: string;
                  productName?: string;
                  need?: number;
                  have?: number;
                }[];
              }).details
            : undefined;

          setStockDialog({ open: true, message, details });
          return;
        }

        const j = await res.json().catch(() => ({}));
        throw new Error((j as { error?: string })?.error || "Error creating booking.");
      }

      const parsed = await res.json().catch(() => ({ id: undefined as string | undefined }));
      const id = (parsed as { id?: string }).id;

      const barber = selectedBarber
        ? (() => {
            const b = barbers.find((x) => x.id === selectedBarber);
            return b ? { name: b.name, photo: b.photo } : null;
          })()
        : null;

      setConfirmData({
        id,
        dateISO: iso,
        services: selectedServiceDetails.map((s) => ({ name: s.name, price: s.price, duration: s.duration })),
        barber,
      });
      setConfirmOpen(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error sending booking.";
      setUiError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const btnPrimary =
    "inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white px-4 py-2.5 hover:opacity-95 transition disabled:opacity-50";
  const btnGhost =
    "inline-flex items-center justify-center px-4 py-2.5 rounded-xl border border-[#2A2E36] text-[#E4E7EC] hover:bg-[#1A1C1F] transition";
  const input =
    "w-full h-11 rounded-xl border border-[#2A2E36] bg-[#111318] text-white placeholder:text-[#9AA0A6] focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/40 px-3";

  const stepDefs =
    [
      { n: 1, t: "Services" },
      { n: 2, t: "Date & Barber" },
      { n: 3, t: "Time & Confirmation" },
    ] as const;

  return (
    <div className="min-h-[100dvh] px-4 pt-4 pb-24 sm:pb-6 sm:py-6 max-w-6xl mx-auto text-white">
      <div className="flex items-start justify-between gap-4 mb-3 sm:mb-4">
        <div>
          <h1 className="text-[22px] sm:text-2xl md:text-3xl font-extrabold leading-tight">Book an appointment</h1>
          <p className="mt-1 text-[13px] sm:text-sm text-white/70">
            Choose your services and complete the booking in just a few clicks.
          </p>
        </div>

        <div className="hidden md:block text-right">
          <div className="text-xs text-white/60">Total</div>
          <div className="text-sm font-semibold">
            £ {totals.totalPrice.toFixed(2)} • {totals.totalDuration}m
          </div>
        </div>
      </div>

      <div className="sticky top-0 z-40 -mx-4 px-4 pt-3 pb-3 backdrop-blur sm:static sm:mx-0 sm:px-0 sm:pt-0 sm:pb-0 sm:bg-transparent sm:backdrop-blur-0 sm:border-b-0">
        <StepperTrail step={step} steps={stepDefs} onStepClick={setStep} />
      </div>

      {uiError && (
        <div className="mb-4 rounded-2xl border border-fuchsia-900/40 bg-fuchsia-900/20 text-fuchsia-300 px-4 py-3 text-sm">
          {uiError}
        </div>
      )}

      {step === 1 && (
        <section className="space-y-4">
          <div className="rounded-2xl border border-[#24272D] bg-[#0F1115] p-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-start">
              <div className="lg:col-span-2">
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
                  <input
                    className={`${input} pl-10`}
                    placeholder="Search for services..."
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={loadServices} className={btnGhost}>
                  Refresh
                </button>
                <button
                  onClick={() => {
                    setQ("");
                    setCategory("");
                  }}
                  className={btnGhost}
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="mt-4">
              <div className="text-xs text-white/60 mb-2">Categories</div>
              <CategoryChips value={category} items={categories} onChange={setCategory} loading={loadingCategories} />
            </div>

            {selectedServiceDetails.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs text-white/60">Selected</div>
                  <button
                    type="button"
                    className="text-xs text-indigo-300 hover:text-indigo-200"
                    onClick={() => setSelectedServices([])}
                  >
                    Clear selection
                  </button>
                </div>

                <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
                  {selectedServiceDetails.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleService(s.id)}
                      className="inline-flex items-center gap-2 h-9 px-3 rounded-full border border-indigo-500/40 bg-indigo-500/10 text-white text-sm"
                      title="Remove"
                    >
                      <span className="max-w-[220px] truncate">{s.name}</span>
                      <FiX className="h-4 w-4 text-white/80" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {loadingServices &&
                  Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="rounded-2xl border border-[#24272D] bg-[#0F1115] p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-5 w-2/3" rounded="lg" />
                          <Skeleton className="h-4 w-1/3" />
                        </div>
                        <Skeleton className="h-5 w-5" rounded="sm" />
                      </div>
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-10 w-full" rounded="lg" />
                    </div>
                  ))}

                {!loadingServices && services.length === 0 && (
                  <div className="col-span-full text-[#9AA0A6]">No services found.</div>
                )}

                {!loadingServices &&
                  services.map((s) => (
                    <ServiceCard
                      key={s.id}
                      id={s.id}
                      name={s.name}
                      price={s.price}
                      duration={s.duration}
                      category={s.category}
                      description={s.description || ""}
                      selected={selectedServices.includes(s.id)}
                      onToggleAction={toggleService}
                    />
                  ))}
              </div>
            </div>

            <div className="hidden lg:block lg:col-span-1">
              <div className="lg:sticky lg:top-6">
                <LocalBookingSummary
                  services={services}
                  barbers={barbers}
                  selectedServiceIds={selectedServices}
                  selectedBarberId={selectedBarber}
                  date={date}
                  time={time}
                />
              </div>
            </div>
          </div>

          <div className="hidden sm:flex gap-2 justify-end">
            <button
              disabled={!canGoStep2()}
              onClick={() => setStep(2)}
              className={btnPrimary}
              title={!canGoStep2() ? "Select at least 1 service." : ""}
            >
              Continue
            </button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="rounded-2xl border border-[#24272D] bg-[#0F1115] p-4">
                  <div className="font-semibold mb-2">Choose a date</div>
                  <DatePicker value={date} onChangeAction={setDate} disabledBeforeToday />
                  <div className="mt-2 text-xs text-white/60">Select a day to see available times.</div>
                </div>

                <div className="lg:col-span-2 rounded-2xl border border-[#24272D] bg-[#0F1115] p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div>
                      <div className="font-semibold">Barber</div>
                      <div className="text-xs text-white/60">
                        Optional — if you leave it on automatic, we will choose the best available barber.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedBarber(null)}
                      className="text-xs text-indigo-300 hover:text-indigo-200"
                    >
                      Automatic
                    </button>
                  </div>

                  <BarberPicker value={selectedBarber} onChangeAction={setSelectedBarber} barbers={barbers} loading={loadingBarbers} />
                </div>
              </div>
            </div>

            <div className="hidden lg:block lg:col-span-1">
              <div className="lg:sticky lg:top-6">
                <LocalBookingSummary
                  services={services}
                  barbers={barbers}
                  selectedServiceIds={selectedServices}
                  selectedBarberId={selectedBarber}
                  date={date}
                  time={time}
                />
              </div>
            </div>
          </div>

          <div className="hidden sm:flex gap-2 justify-between">
            <button onClick={() => setStep(1)} className={btnGhost}>
              Back
            </button>
            <button
              disabled={!canGoStep3()}
              onClick={() => setStep(3)}
              className={btnPrimary}
              title={!canGoStep3() ? "Choose a date" : ""}
            >
              View available times
            </button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3 space-y-6">
              <div className="rounded-2xl border border-[#24272D] bg-[#0F1115] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold">Available times</div>
                    <div className="text-xs text-white/60">
                      Times take into account the total duration of the selected services.
                    </div>
                  </div>
                  <button type="button" onClick={loadTimes} className="text-xs text-indigo-300 hover:text-indigo-200">
                    Refresh
                  </button>
                </div>

                <div className="mt-4">
                  <TimePicker
                    mode="grid"
                    columns={4}
                    value={time}
                    options={times}
                    onChangeAction={setTime}
                    loading={loadingTimes}
                    placeholder={loadingTimes ? "Loading times..." : "Select a time"}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-[#24272D] bg-[#0F1115] p-4">
                <div className="font-semibold mb-3">Your details</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-[#C9CDD3] mb-1">Your name</label>
                    <input
                      className={input}
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="How should we address you?"
                      autoComplete="name"
                      required
                    />

                    <label className="block text-sm text-[#C9CDD3] mb-1 mt-3">Your phone (WhatsApp)</label>
                    <input
                      className={input}
                      value={clientPhone}
                      onChange={(e) => setClientPhone(formatPhoneBR(e.target.value))}
                      placeholder="(+00 000 000 0000"
                      inputMode="tel"
                      autoComplete="tel"
                      required
                    />

                    <div className="mt-2 text-xs text-white/60">
                      Once confirmed, you will receive a confirmation via WhatsApp (coming soon).
                    </div>
                  </div>

                  <div className="text-xs text-[#C9CDD3] space-y-1">
                    {selectedServices.length === 0 && <div>• Select services in Step 1.</div>}
                    {!date && <div>• Pick a date in Step 2.</div>}
                    {date && !time && <div>• Choose an available time.</div>}
                    {!clientName.trim() && <div>• Enter your name.</div>}
                    {!clientPhone.trim() && <div>• Enter your phone number.</div>}
                    {selectedServices.length > 0 && date && time && clientName.trim() && clientPhone.trim() && (
                      <div className="mt-2 text-indigo-300">All set — you can confirm.</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="hidden sm:flex gap-2 justify-between">
                <button onClick={() => setStep(2)} className={btnGhost}>
                  Back
                </button>
                <button
                  onClick={submitBooking}
                  disabled={
                    submitting ||
                    selectedServices.length === 0 ||
                    !date ||
                    !time ||
                    !clientName.trim() ||
                    !clientPhone.trim()
                  }
                  className={btnPrimary}
                >
                  {submitting ? "Confirming..." : "Confirm booking"}
                </button>
              </div>
            </div>

            <div className="hidden lg:block lg:col-span-1">
              <div className="lg:sticky lg:top-6">
                <LocalBookingSummary
                  services={services}
                  barbers={barbers}
                  selectedServiceIds={selectedServices}
                  selectedBarberId={selectedBarber}
                  date={date}
                  time={time}
                />
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-black/70 backdrop-blur px-4 py-3">
        <div className="max-w-6xl mx-auto space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] text-white/60">Total</div>
              <div className="text-sm font-semibold truncate">
                £ {totals.totalPrice.toFixed(2)} • {totals.totalDuration}m
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSummaryOpen(true)}
              className="h-10 px-3 rounded-xl border border-[#2A2E36] text-white"
            >
              Summary
            </button>
          </div>

          <div className="flex items-center gap-2">
            {step !== 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => (s === 3 ? 2 : 1))}
                className="h-11 px-4 rounded-xl border border-[#2A2E36] text-white"
              >
                Back
              </button>
            )}

            {step === 1 && (
              <button
                type="button"
                disabled={!canGoStep2()}
                onClick={() => setStep(2)}
                className="h-11 flex-1 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white font-semibold disabled:opacity-50"
              >
                Continue
              </button>
            )}

            {step === 2 && (
              <button
                type="button"
                disabled={!canGoStep3()}
                onClick={() => setStep(3)}
                className="h-11 flex-1 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white font-semibold disabled:opacity-50"
              >
                View times
              </button>
            )}

            {step === 3 && (
              <button
                type="button"
                onClick={submitBooking}
                disabled={
                  submitting ||
                  selectedServices.length === 0 ||
                  !date ||
                  !time ||
                  !clientName.trim() ||
                  !clientPhone.trim()
                }
                className="h-11 flex-1 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 text-white font-semibold disabled:opacity-50"
              >
                {submitting ? "Confirming..." : "Confirm"}
              </button>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {confirmData && confirmOpen && (
          <ConfirmModal
            open={true}
            onCloseAction={() => setConfirmOpen(false)}
            bookingId={confirmData.id}
            dateISO={confirmData.dateISO}
            barber={confirmData.barber}
            services={confirmData.services}
          />
        )}
      </AnimatePresence>

      <StockErrorDialog
        open={stockDialog.open}
        message={stockDialog.message}
        details={stockDialog.details}
        onClose={() => setStockDialog({ open: false, message: "" })}
      />

      <MobileSummarySheet open={summaryOpen} onClose={() => setSummaryOpen(false)}>
        <LocalBookingSummary
          services={services}
          barbers={barbers}
          selectedServiceIds={selectedServices}
          selectedBarberId={selectedBarber}
          date={date}
          time={time}
        />
      </MobileSummarySheet>
    </div>
  );
}