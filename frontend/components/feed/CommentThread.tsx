"use client";

import { useState } from "react";
import {
  useGetRepliesQuery,
  useUpdateCommentMutation,
  useDeleteCommentMutation,
} from "@/store/api/commentsApi";
import {
  useLikeTargetMutation,
  useUnlikeTargetMutation,
} from "@/store/api/likesApi";
import { Avatar } from "@/components/ui/Avatar";
import { Spinner } from "@/components/ui/Spinner";
import { LinkButton } from "@/components/ui/LinkButton";
import { FormError } from "@/components/ui/FormError";
import { CommentComposer } from "./CommentComposer";
import { LikeAvatarStack } from "./LikeAvatarStack";
import { timeAgo, fullName } from "@/lib/format";
import { getErrorMessage } from "@/lib/apiError";
import type { Comment } from "@/lib/types";

/**
 * Recursive comment renderer. The SAME component renders a top-level comment
 * (depth 0, with Reply + a replies thread) and each reply (depth 1). Replies are
 * one level deep by design, so depth 1 renders no further Reply affordance.
 */
export function CommentThread({
  comment,
  depth = 0,
}: {
  comment: Comment;
  depth?: number;
}) {
  const [like] = useLikeTargetMutation();
  const [unlike] = useUnlikeTargetMutation();
  const [updateComment, { isLoading: saving }] = useUpdateCommentMutation();
  const [deleteComment] = useDeleteCommentMutation();

  const [replying, setReplying] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [repliesCursor, setRepliesCursor] = useState<string | undefined>(undefined);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);
  const [error, setError] = useState<string | null>(null);

  const repliesQuery = useGetRepliesQuery(
    { commentId: comment.id, cursor: repliesCursor },
    { skip: depth > 0 || !showReplies }
  );

  const likeArg = {
    targetType: "comment" as const,
    targetId: comment.id,
    postId: comment.postId,
    parentId: comment.parentId,
  };

  function toggleLike() {
    if (comment.likedByMe) unlike(likeArg);
    else like(likeArg);
  }

  async function saveEdit() {
    const t = editText.trim();
    if (!t) return;
    setError(null);
    try {
      await updateComment({
        id: comment.id,
        postId: comment.postId,
        parentId: comment.parentId,
        text: t,
      }).unwrap();
      setEditing(false);
    } catch (err) {
      setError(getErrorMessage(err, "Could not update the comment."));
    }
  }

  async function onDelete() {
    if (!window.confirm("Delete this comment?")) return;
    try {
      await deleteComment({
        id: comment.id,
        postId: comment.postId,
        parentId: comment.parentId,
      }).unwrap();
    } catch (err) {
      window.alert(getErrorMessage(err, "Could not delete the comment."));
    }
  }

  return (
    <div className={`_comment_main${depth > 0 ? " ml-11" : ""}`}>
      <div className="_comment_image">
        <span className="_comment_image_link">
          <Avatar src={comment.author.avatarUrl} alt="" className="_comment_img1" />
        </span>
      </div>
      <div className="_comment_area flex-1">
        <div className="_comment_details">
          <div className="_comment_details_top">
            <div className="_comment_name">
              <h4 className="_comment_name_title">{fullName(comment.author)}</h4>
            </div>
          </div>

          {editing ? (
            <div className="mt-1.5">
              <textarea
                className="form-control _comment_textarea"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={2}
                maxLength={2000}
              />
              <div className="mt-1.5 flex gap-3">
                <LinkButton onClick={saveEdit} disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </LinkButton>
                <LinkButton
                  onClick={() => {
                    setEditing(false);
                    setEditText(comment.text);
                  }}
                >
                  Cancel
                </LinkButton>
              </div>
              {error ? <FormError>{error}</FormError> : null}
            </div>
          ) : (
            <div className="_comment_status">
              <p className="_comment_status_text">
                <span className="whitespace-pre-wrap">{comment.text}</span>
              </p>
            </div>
          )}
        </div>

        {comment.likesCount > 0 ? (
          <div className="my-1">
            <LikeAvatarStack
              targetType="comment"
              targetId={comment.id}
              count={comment.likesCount}
            />
          </div>
        ) : null}

        <div className="_comment_reply">
          <div className="_comment_reply_num">
            <ul className="_comment_reply_list">
              <li>
                <LinkButton active={comment.likedByMe} onClick={toggleLike}>
                  {comment.likedByMe ? "Liked" : "Like"}.
                </LinkButton>
              </li>
              {depth === 0 ? (
                <li>
                  <LinkButton onClick={() => setReplying((r) => !r)}>
                    Reply.
                  </LinkButton>
                </li>
              ) : null}
              {comment.isOwner ? (
                <li>
                  <LinkButton
                    onClick={() => {
                      setEditText(comment.text);
                      setEditing(true);
                    }}
                  >
                    Edit.
                  </LinkButton>
                </li>
              ) : null}
              {comment.isOwner ? (
                <li>
                  <LinkButton onClick={onDelete}>Delete.</LinkButton>
                </li>
              ) : null}
              <li>
                <span className="_time_link">{timeAgo(comment.createdAt)}</span>
              </li>
            </ul>
          </div>
        </div>

        {depth === 0 && comment.repliesCount > 0 ? (
          <LinkButton
            className="mt-0.5"
            onClick={() => setShowReplies((s) => !s)}
          >
            {showReplies
              ? "Hide replies"
              : `View ${comment.repliesCount} ${
                  comment.repliesCount === 1 ? "reply" : "replies"
                }`}
          </LinkButton>
        ) : null}

        {depth === 0 && showReplies ? (
          <div className="mt-2">
            {repliesQuery.isLoading ? <Spinner dark /> : null}
            {repliesQuery.data?.items.map((r) => (
              <CommentThread key={r.id} comment={r} depth={1} />
            ))}
            {repliesQuery.data?.nextCursor ? (
              <LinkButton
                className="ml-11"
                onClick={() => setRepliesCursor(repliesQuery.data!.nextCursor!)}
                disabled={repliesQuery.isFetching}
              >
                {repliesQuery.isFetching ? "Loading…" : "Load more replies"}
              </LinkButton>
            ) : null}
          </div>
        ) : null}

        {depth === 0 && replying ? (
          <div className="mt-2">
            <CommentComposer
              postId={comment.postId}
              parentId={comment.id}
              autoFocus
              placeholder="Write a reply"
              onDone={() => {
                setReplying(false);
                setShowReplies(true);
              }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
