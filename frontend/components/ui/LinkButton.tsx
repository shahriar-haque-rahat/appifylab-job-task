import type { ButtonHTMLAttributes } from "react";

interface LinkButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Highlights the action in brand blue (e.g. a liked comment). */
  active?: boolean;
}

/**
 * Text-style inline action button used across the feed (comment Like / Reply /
 * Edit / Delete, "view replies", comment-count toggles). Replaces the old
 * `.linklike` global class with Tailwind utilities:
 *   background:none; border:none; padding/margin:0; font:inherit; weight 500;
 *   color #65676b → hover #1890ff + underline; `.liked` → #1890ff.
 * Font size/family inherit from the surrounding text via bootstrap's reboot.
 * Pass Tailwind spacing utilities through `className` (e.g. "mt-0.5", "ml-11").
 */
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
