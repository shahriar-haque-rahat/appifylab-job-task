"use client";

import { useState } from "react";
import { useGetCommentsQuery } from "@/store/api/commentsApi";
import { CommentComposer } from "./CommentComposer";
import { CommentThread } from "./CommentThread";
import { CommentSkeleton } from "@/components/ui/Skeleton";

export function CommentsSection({ postId }: { postId: string }) {
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const { data, isLoading, isFetching } = useGetCommentsQuery({ postId, cursor });
  const items = data?.items ?? [];

  return (
    <div className="_feed_inner_timeline_cooment_area">
      <CommentComposer postId={postId} />

      <div className="_timline_comment_main">
        {isLoading ? (
          <>
            <CommentSkeleton />
            <CommentSkeleton />
          </>
        ) : null}

        {items.map((c) => (
          <CommentThread key={c.id} comment={c} depth={0} />
        ))}

        {data?.nextCursor ? (
          <div className="_previous_comment">
            <button
              type="button"
              className="_previous_comment_txt"
              onClick={() => setCursor(data.nextCursor!)}
              disabled={isFetching}
            >
              {isFetching ? "Loading…" : "View more comments"}
            </button>
          </div>
        ) : null}

        {!isLoading && items.length === 0 ? (
          <p className="py-1.5 text-[13px] text-muted-2">
            No comments yet. Start the conversation.
          </p>
        ) : null}
      </div>
    </div>
  );
}
