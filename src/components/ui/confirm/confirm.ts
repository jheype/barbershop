"use client";

export type ConfirmOptions = {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: "default" | "danger";
};

type InternalEvent = {
  type: "open";
  payload: ConfirmOptions;
  resolve: (ok: boolean) => void;
};

const EVT = "app:confirm";

class ConfirmBus extends EventTarget {
  confirm(opts: ConfirmOptions = {}) {
    return new Promise<boolean>((resolve) => {
      const ev: InternalEvent = { type: "open", payload: opts, resolve };
      this.dispatchEvent(new CustomEvent(EVT, { detail: ev }));
    });
  }

  on(handler: (ev: InternalEvent) => void) {
    const listener = (e: Event) => handler((e as CustomEvent).detail as InternalEvent);
    this.addEventListener(EVT, listener);
    return () => this.removeEventListener(EVT, listener);
  }
}

export const confirmBus = new ConfirmBus();

export function confirm(options?: ConfirmOptions) {
  return confirmBus.confirm(options);
}
