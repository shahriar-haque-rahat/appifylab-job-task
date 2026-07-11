"use client";

import {
  useLikeTargetMutation,
  useUnlikeTargetMutation,
} from "@/store/api/likesApi";
import { ThumbIcon, CommentIcon, ShareIcon } from "@/components/icons";

// Post action bar (Like / Comment / Share). Like state comes from the post prop
// (backed by the RTK cache); the like mutation patches that cache optimistically.
export function ReactionBar({
  postId,
  liked,
  onCommentClick,
}: {
  postId: string;
  liked: boolean;
  likesCount?: number;
  onCommentClick: () => void;
}) {
  const [like] = useLikeTargetMutation();
  const [unlike] = useUnlikeTargetMutation();

  function toggle() {
    const arg = { targetType: "post" as const, targetId: postId, postId };
    if (liked) unlike(arg);
    else like(arg);
  }

  return (
    <div className="_feed_inner_timeline_reaction">
      <button
        type="button"
        className={`_feed_inner_timeline_reaction_emoji _feed_reaction${
          liked ? " _feed_reaction_active" : ""
        }`}
        onClick={toggle}
        aria-pressed={liked}
      >
        <span className="_feed_inner_timeline_reaction_link">
          <span>
            <ThumbIcon filled={liked} /> {liked ? "Liked" : "Like"}
          </span>
        </span>
      </button>

      <button
        type="button"
        className="_feed_inner_timeline_reaction_comment _feed_reaction"
        onClick={onCommentClick}
      >
        <span className="_feed_inner_timeline_reaction_link">
          <span>
            <CommentIcon className="_reaction_svg" /> Comment
          </span>
        </span>
      </button>

      <button
        type="button"
        className="_feed_inner_timeline_reaction_share _feed_reaction"
        title="Sharing is out of scope for this task"
        disabled
      >
        <span className="_feed_inner_timeline_reaction_link">
          <span>
            <ShareIcon className="_reaction_svg" /> Share
          </span>
        </span>
      </button>
    </div>
  );
}
