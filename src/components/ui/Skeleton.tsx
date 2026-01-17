import type { HTMLAttributes } from "react";

type Props = HTMLAttributes<HTMLDivElement> & {
  rounded?: "sm" | "md" | "lg" | "xl" | "full";
};

const roundedMap: Record<NonNullable<Props["rounded"]>, string> = {
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  full: "rounded-full",
};

export function Skeleton({ className = "", rounded = "md", ...props }: Props) {
  const r = roundedMap[rounded];
  return (
    <div
      {...props}
      className={`animate-pulse ${r} bg-black/10 dark:bg-white/10 ${className}`}
    />
  );
}
