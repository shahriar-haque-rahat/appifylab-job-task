"use client";

import { useId } from "react";
import { Modal } from "./Modal";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Renders the confirm button in the destructive (red) style. */
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();

  return (
    <Modal open={open} onClose={onCancel} labelledBy={titleId} widthClassName="max-w-sm">
      <h3 id={titleId} className="text-[17px] font-semibold">
        {title}
      </h3>
      <p className="mt-2 text-[14px] leading-relaxed text-muted">{message}</p>

      <div className="mt-6 flex items-center justify-end gap-3">
        <button
          type="button"
          className="cursor-pointer rounded-lg border border-line bg-transparent px-4 py-2 text-[14px] font-medium text-ink hover:bg-surface-2 disabled:opacity-60"
          onClick={onCancel}
          disabled={busy}
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          className={`cursor-pointer rounded-lg border-0 px-4 py-2 text-[14px] font-semibold text-white disabled:opacity-60 ${
            destructive
              ? "bg-danger hover:bg-[#dc2626]"
              : "bg-primary hover:bg-primary-hover"
          }`}
          onClick={onConfirm}
          disabled={busy}
        >
          {busy ? "Working…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
