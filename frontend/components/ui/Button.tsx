"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Spinner } from "./Spinner";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  children: ReactNode;
}

export function Button({
  loading = false,
  loadingText,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button disabled={loading || disabled} {...rest}>
      {loading ? (
        <>
          <Spinner />
          <span className="ml-2">{loadingText ?? "Please wait…"}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
