"use client";

type Props = {
  value?: string;
  options: string[];
  onChangeAction: (v?: string) => void;
  loading?: boolean;
  placeholder?: string;
  mode?: "select" | "grid";
  columns?: 3 | 4 | 5 | 6;
};

export default function TimePicker({
  value,
  options,
  onChangeAction,
  loading,
  placeholder = "Selecione um horário",
  mode = "select",
  columns = 4,
}: Props) {
  if (mode === "grid") {
    const cols = columns;

    return (
      <div className="w-full">
        {loading ? (
          <div className="text-sm text-white/70">Carregando horários...</div>
        ) : options.length === 0 ? (
          <div className="text-sm text-white/70">No horário disponível.</div>
        ) : (
          <div
            className={
              cols === 6
                ? "grid grid-cols-3 sm:grid-cols-6 gap-2"
                : cols === 5
                  ? "grid grid-cols-3 sm:grid-cols-5 gap-2"
                  : cols === 3
                    ? "grid grid-cols-3 gap-2"
                    : "grid grid-cols-3 sm:grid-cols-4 gap-2"
            }
          >
            {options.map((t) => {
              const selected = value === t;

              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => onChangeAction(selected ? undefined : t)}
                  className={
                    selected
                      ? "h-10 rounded-md border border-indigo-500 bg-indigo-500/15 text-white text-sm font-semibold"
                      : "h-10 rounded-md border border-[#2A2E36] bg-[#111318] text-white/90 text-sm hover:bg-[#151821] transition"
                  }
                >
                  {t}
                </button>
              );
            })}
          </div>
        )}

        {!value && !loading && options.length > 0 && (
          <div className="mt-2 text-xs text-white/60">{placeholder}</div>
        )}
      </div>
    );
  }

  return (
    <select
      className="w-full rounded-md border border-[#2A2E36] bg-[#111318] text-white p-2
                 focus:outline-none focus:ring-2 focus:ring-indigo-500/60
                 disabled:opacity-50"
      value={value ?? ""}
      disabled={loading}
      onChange={(e) => {
        const v = e.target.value;
        onChangeAction(v ? v : undefined);
      }}
    >
      <option value="">{loading ? "Carregando horários..." : placeholder}</option>

      {options.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
    </select>
  );
}