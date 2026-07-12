"use client";

import { useState } from "react";
import { useGetLikersQuery } from "@/store/api/likesApi";
import { Avatar } from "@/components/ui/Avatar";
import { ThumbIcon } from "@/components/icons";
import { fullName } from "@/lib/format";
import type { LikeTarget, UserSummary } from "@/lib/types";

export function LikeAvatarStack({
  targetType,
  targetId,
  count,
  preview = [],
}: {
  targetType: LikeTarget;
  targetId: string;
  count: number;
  preview?: UserSummary[];
}) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const { data, isFetching } = useGetLikersQuery(
    { targetType, targetId, cursor },
    { skip: !open }
  );

  if (count <= 0) return null;

  const stack = preview.slice(0, 3);
  const label = `${count} ${count === 1 ? "like" : "likes"}`;

  return (
    <div className="relative inline-block">
      <button
        type="button"
        className="group inline-flex items-center gap-2 border-0 bg-transparent p-0 text-[14px] font-medium text-muted"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`${label} — show who liked`}
      >
        {stack.length > 0 ? (
          <span className="_reactor_stack">
            {stack.map((u) => (
              <Avatar
                key={u.id}
                src={u.avatarUrl}
                alt={fullName(u)}
                className="_reactor_avatar"
              />
            ))}
          </span>
        ) : (
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary [&>svg]:filter-[brightness(0)_invert(1)]">
            <ThumbIcon filled size={12} />
          </span>
        )}
        <span className="group-hover:underline">{label}</span>
      </button>

      {open ? (
        <div className="absolute left-0 top-[calc(100%+6px)] z-30 max-h-65 min-w-50 overflow-y-auto rounded-lg border border-line bg-white p-2 shadow-dropdown-lg">
          {isFetching && !data ? (
            <span className="block p-1 text-[12px] text-muted-2">Loading…</span>
          ) : null}
          {data?.items.map((u) => (
            <div
              key={u.id}
              className="flex items-center gap-2 px-1 py-1.5 text-[13px] text-[#333]"
            >
              <Avatar
                src={u.avatarUrl}
                alt=""
                className="h-6.5 w-6.5 rounded-full object-cover"
              />
              <span>{fullName(u)}</span>
            </div>
          ))}
          {data && data.items.length === 0 ? (
            <span className="block p-1 text-[12px] text-muted-2">No likes yet</span>
          ) : null}
          {data?.nextCursor ? (
            <button
              type="button"
              className="mt-1 block w-full cursor-pointer border-0 bg-transparent p-1 text-left text-[12px] text-primary hover:underline"
              onClick={() => setCursor(data.nextCursor!)}
              disabled={isFetching}
            >
              {isFetching ? "Loading…" : "Show more"}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
