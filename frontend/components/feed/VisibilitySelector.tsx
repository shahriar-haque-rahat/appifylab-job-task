"use client";

import type { ReactNode } from "react";
import { Dropdown } from "@/components/ui/Dropdown";
import { GlobeIcon, LockIcon, ChevronDownIcon } from "@/components/icons";
import type { Visibility } from "@/lib/types";

// Design deviation: the original template shows a static "Public" label. This
// adds a real public/private selector, built with Tailwind utilities (theme
// tokens from tailwind.config.js) to sit alongside the existing composer
// controls. Reused by the composer and the post edit form.
const OPTIONS: { value: Visibility; label: string; icon: ReactNode }[] = [
  { value: "PUBLIC", label: "Public", icon: <GlobeIcon /> },
  { value: "PRIVATE", label: "Private", icon: <LockIcon /> },
];

export function VisibilitySelector({
  value,
  onChange,
  disabled = false,
}: {
  value: Visibility;
  onChange: (v: Visibility) => void;
  disabled?: boolean;
}) {
  const current = OPTIONS.find((o) => o.value === value) ?? OPTIONS[0];

  return (
    <Dropdown
      wrapperClassName="inline-block"
      renderWhenClosed={false}
      panelClassName="absolute left-0 top-[calc(100%+6px)] z-30 min-w-37.5 rounded-lg border border-line bg-white p-1.5 shadow-dropdown"
      trigger={({ toggle }) => (
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-md border border-line bg-white px-3 py-1.5 text-[13px] font-medium text-[#333] hover:bg-surface-3"
          onClick={toggle}
          disabled={disabled}
          aria-label={`Post visibility: ${current.label}`}
        >
          {current.icon}
          <span>{current.label}</span>
          <ChevronDownIcon size={14} />
        </button>
      )}
    >
      {({ close }) => (
        <>
          {OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              className={`flex w-full items-center gap-2 rounded-md border-0 px-2.5 py-2 text-left text-[13px] hover:bg-surface ${
                o.value === value
                  ? "bg-active-surface text-primary"
                  : "bg-transparent text-[#333]"
              }`}
              onClick={() => {
                onChange(o.value);
                close();
              }}
            >
              {o.icon}
              <span>{o.label}</span>
            </button>
          ))}
        </>
      )}
    </Dropdown>
  );
}
