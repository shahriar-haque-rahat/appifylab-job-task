import type { ButtonHTMLAttributes } from "react";

interface LinkButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Highlights the action in brand blue (e.g. a liked comment). */
  active?: boolean;
}

export function LinkButton({
  active = false,
  className = "",
  type = "button",
  ...rest
}: LinkButtonProps) {
  return (
    <button
      type={type}
      className={`m-0 border-0 bg-transparent p-0 font-medium hover:underline ${
        active ? "text-primary" : "text-muted hover:text-primary"
      } ${className}`}
      {...rest}
    />
  );
}
