"use client";

type Props = {
  id: string;
  name: string;
  price: number;
  duration: number;
  category?: string | null;
  description?: string | null;
  selected: boolean;
  onToggleAction: (id: string) => void;
  variant?: "dark" | "light";
};

export default function ServiceCard({
  id, name, price, duration, category, description, selected, onToggleAction, variant = "dark",
}: Props) {
  const isLight = variant === "light";
  const base = isLight
    ? "rounded-xl border p-4 transition w-full text-gray-900"
    : "rounded-xl border p-4 transition w-full text-white";
  const card = selected
    ? isLight
      ? "border-indigo-500 bg-indigo-50"
      : "border-indigo-500 bg-[#1a1210]"
    : isLight
      ? "border-gray-300 bg-white hover:bg-gray-50"
      : "border-[#24272D] bg-[#0F1115] hover:bg-[#12141A]";
  const sub = isLight ? "text-sm text-gray-600" : "text-sm text-[#C9CDD3]";
  const chip = selected
    ? "shrink-0 rounded-full w-5 h-5 border border-transparent bg-gradient-to-r from-indigo-500 to-fuchsia-500"
    : isLight
      ? "shrink-0 rounded-full w-5 h-5 border border-gray-300 bg-white"
      : "shrink-0 rounded-full w-5 h-5 border border-[#2A2E36]";

  return (
    <button type="button" onClick={() => onToggleAction(id)} className={`${base} ${card}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className={`font-semibold truncate ${isLight ? "text-gray-900" : "text-white"}`}>{name}</div>
          <div className={`text-xs ${isLight ? "text-gray-600" : "text-[#C9CDD3]"}`}>{category || "-"}</div>
        </div>
        <div className={chip} />
      </div>
      {description && <p className={`${sub} mt-2 line-clamp-2`}>{description}</p>}
      <div className={`${isLight ? "text-gray-700" : "text-[#E4E7EC]"} mt-3 text-sm`}>
        £ {price.toFixed(2)} • {duration} min
      </div>
    </button>
  );
}
