"use client";

import type { InputHTMLAttributes } from "react";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  wrapperClassName?: string;
  labelClassName?: string;
}

export function Field({
  label,
  error,
  wrapperClassName,
  labelClassName,
  className,
  id,
  ...rest
}: FieldProps) {
  const inputId = id || `field-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div className={wrapperClassName}>
      <label className={labelClassName} htmlFor={inputId}>
        {label}
      </label>
      <input
        id={inputId}
        className={className}
        aria-invalid={error ? true : undefined}
        {...rest}
      />
      {error ? (
        <span className="mt-1 block font-sans text-[12px] text-danger">{error}</span>
      ) : null}
    </div>
  );
}
