"use client";

import dynamic from "next/dynamic";
import { ToastProvider } from "@/components/ui/toast/ToastProvider";

const ConfirmProvider = dynamic(() => import("@/components/ui/confirm/ConfirmProvider"), {
  ssr: false,
});

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ConfirmProvider>{children}</ConfirmProvider>
    </ToastProvider>
  );
}
