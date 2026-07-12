export type ToastType = "error" | "success" | "info";

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

type Listener = (toasts: ToastItem[]) => void;

let toasts: ToastItem[] = [];
const listeners = new Set<Listener>();
let counter = 0;

// Stable empty reference for the SSR snapshot (useSyncExternalStore requires the
// server snapshot to be referentially stable to avoid hydration loops).
const SERVER_SNAPSHOT: ToastItem[] = [];

function emit() {
  for (const l of listeners) l(toasts);
}

export function subscribeToasts(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getToastsSnapshot(): ToastItem[] {
  return toasts;
}

export function getToastsServerSnapshot(): ToastItem[] {
  return SERVER_SNAPSHOT;
}

export function dismissToast(id: string): void {
  const next = toasts.filter((t) => t.id !== id);
  if (next.length !== toasts.length) {
    toasts = next;
    emit();
  }
}

export function showToast(
  message: string,
  type: ToastType = "error",
  ttl = type === "error" ? 6000 : 4000
): string {
  const id = `toast_${++counter}`;
  toasts = [...toasts, { id, message, type }];
  emit();
  if (ttl > 0 && typeof window !== "undefined") {
    window.setTimeout(() => dismissToast(id), ttl);
  }
  return id;
}
