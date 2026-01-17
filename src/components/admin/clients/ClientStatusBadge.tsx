"use client";

export default function ClientStatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs",
        active
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
          : "border-[#2A2E36] bg-[#111318] text-[#C9CDD4]",
      ].join(" ")}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}
