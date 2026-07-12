"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "@/components/theme/ThemeProvider";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  labelledBy?: string;
  widthClassName?: string;
}

export function Modal({
  open,
  onClose,
  children,
  labelledBy,
  widthClassName = "max-w-lg",
}: ModalProps) {
  const { dark } = useTheme();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  // Modals always start closed, so `open` is false during SSR/first render — we
  // never touch `document` on the server. Safe to portal once opened (client).
  if (!open || typeof document === "undefined") return null;

  const surface = dark
    ? "bg-[#242526] text-white border border-white/10"
    : "bg-white text-ink-strong";

  return createPortal(
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
    >
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`relative z-1 w-full ${widthClassName} rounded-xl ${surface} p-5 shadow-dropdown-lg sm:p-6`}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
