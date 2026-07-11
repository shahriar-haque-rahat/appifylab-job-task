import type { ReactNode } from "react";

// Inline form / submit error message. Replaces the old `.app-error-text` global
// rule (color #ef4444, 13px, 6px top-margin, Poppins) with Tailwind utilities so
// the styling lives with the component, not in globals.css.
export function FormError({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p role="alert" className={`mt-1.5 font-sans text-[13px] text-danger ${className}`}>
      {children}
    </p>
  );
}
