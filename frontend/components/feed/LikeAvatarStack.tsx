"use client";

import { useState } from "react";
import { useGetLikersQuery } from "@/store/api/likesApi";
import { Avatar } from "@/components/ui/Avatar";
import { ThumbIcon } from "@/components/icons";
import { fullName } from "@/lib/format";
import type { LikeTarget } from "@/lib/types";

// Shows the like count and, on click, the list of who liked (fetched lazily so
// the feed query stays cheap). Reused for posts, comments and replies.
export function LikeAvatarStack({
  targetType,
  targetId,
  count,
}: {
  targetType: LikeTarget;
  targetId: string;
  count: number;
}) {
  const [open, setOpen] = useState(false);
  const { data, isFetching } = useGetLikersQuery(
    { targetType, targetId },
    { skip: !open }
  );

  if (count <= 0) return null;

  return (
    <div className="relative inline-block">
      <button
        type="button"
        className="group inline-flex items-center gap-1.5 border-0 bg-transparent p-0 text-[14px] font-medium text-muted"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary [&>svg]:filter-[brightness(0)_invert(1)]">
          <ThumbIcon filled size={12} />
        </span>
        <span className="group-hover:underline">
          {count} {count === 1 ? "like" : "likes"}
        </span>
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
          {data && data.items.length === 0 ? <span>No likes yet</span> : null}
          {data?.nextCursor ? (
            <span className="block p-1 text-[12px] text-muted-2">…and more</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
