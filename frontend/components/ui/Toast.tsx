"use client";

import { useSyncExternalStore } from "react";
import {
  subscribeToasts,
  getToastsSnapshot,
  getToastsServerSnapshot,
  dismissToast,
  type ToastType,
} from "@/lib/toast";

// Accent + icon per toast type. Kept theme-neutral (works on the template's
// light and _dark_wrapper dark surfaces) by using a solid dark card.
const STYLES: Record<ToastType, { bar: string; icon: string }> = {
  error: { bar: "bg-danger", icon: "!" },
  success: { bar: "bg-success", icon: "✓" },
  info: { bar: "bg-primary", icon: "i" },
};

export function ToastViewport() {
  const toasts = useSyncExternalStore(
    subscribeToasts,
    getToastsSnapshot,
    getToastsServerSnapshot
  );

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-1000 flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
    >
      {toasts.map((t) => {
        const s = STYLES[t.type];
        return (
          <div
            key={t.id}
            role={t.type === "error" ? "alert" : "status"}
            className="pointer-events-auto flex items-start gap-3 overflow-hidden rounded-lg bg-[#232e42] py-3 pl-3 pr-2.5 text-white shadow-dropdown-lg"
          >
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[12px] font-bold leading-none text-white ${s.bar}`}
              aria-hidden="true"
            >
              {s.icon}
            </span>
            <p className="flex-1 py-0.5 text-[13px] leading-snug">{t.message}</p>
            <button
              type="button"
              className="shrink-0 cursor-pointer rounded-md border-0 bg-transparent px-1.5 py-0.5 text-[16px] leading-none text-white/70 hover:text-white"
              onClick={() => dismissToast(t.id)}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
