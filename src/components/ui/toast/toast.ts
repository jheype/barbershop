"use client";

type ToastVariant = "success" | "error" | "info";

export type ToastPayload = {
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
};

const EVT = "app:toast";

function normalize(arg: string | ToastPayload, variant?: ToastVariant): ToastPayload {
  if (typeof arg === "string") {
    return { title: arg, variant };
  }
  return variant ? { ...arg, variant: arg.variant ?? variant } : arg;
}

class ToastBus extends EventTarget {
  add(payload: ToastPayload) {
    this.dispatchEvent(new CustomEvent<ToastPayload>(EVT, { detail: payload }));
  }

  success(arg: string | ToastPayload) {
    this.add(normalize(arg, "success"));
  }

  error(arg: string | ToastPayload) {
    this.add(normalize(arg, "error"));
  }

  info(arg: string | ToastPayload) {
    this.add(normalize(arg, "info"));
  }

  on(handler: (p: ToastPayload) => void) {
    const listener = (e: Event) => handler((e as CustomEvent<ToastPayload>).detail);
    this.addEventListener(EVT, listener);
    return () => this.removeEventListener(EVT, listener);
  }
}

export const toast = new ToastBus();