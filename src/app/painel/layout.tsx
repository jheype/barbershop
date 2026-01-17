import type { ReactNode } from "react";
import type { Metadata } from "next";
import PainelNav from "@/components/PainelNav";

export const metadata: Metadata = {
  title: "Dashboard | Studio",
};

export default function PainelLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PainelNav />
      <main className="max-w-6xl mx-auto px-4 py-6">
        {children}
      </main>
    </>
  );
}
