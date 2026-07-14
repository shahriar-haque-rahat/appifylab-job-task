"use client";

import { useState } from "react";
import {
  useGetRepliesQuery,
  useUpdateCommentMutation,
  useDeleteCommentMutation,
} from "@/store/api/commentsApi";
import { useDebouncedLike } from "@/store/api/useDebouncedLike";
import { Avatar } from "@/components/ui/Avatar";
import { CommentSkeleton } from "@/components/ui/Skeleton";
import { LinkButton } from "@/components/ui/LinkButton";
import { FormError } from "@/components/ui/FormError";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CommentComposer } from "./CommentComposer";
import { LikeAvatarStack } from "./LikeAvatarStack";
import { ThumbIcon, CommentIcon, EditIcon, TrashIcon } from "@/components/icons";
import { timeAgo, fullName, initials } from "@/lib/format";
import type { Comment } from "@/lib/types";

// Shared classes so every icon button in this row looks and behaves identically
const ACTION_BTN =
  "group relative inline-flex items-center gap-1 rounded p-1 border-0 bg-transparent text-gray-500 transition-colors hover:bg-gray-100 hover:text-blue-600";
const TOOLTIP =
  "pointer-events-none absolute -top-8 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-[11px] font-medium text-white shadow-sm group-hover:block";

export function CommentThread({
  comment,
  depth = 0,
}: {
  comment: Comment;
  depth?: number;
}) {
  const debouncedToggle = useDebouncedLike();
  const [updateComment] = useUpdateCommentMutation();
  const [deleteComment, { isLoading: deleting }] = useDeleteCommentMutation();

  const [replying, setReplying] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [repliesCursor, setRepliesCursor] = useState<string | undefined>(undefined);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

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
    debouncedToggle(likeArg, comment.likedByMe);
  }

  function toggleReply() {
    setReplying((r) => !r);
    setShowReplies(true);
  }

  function saveEdit() {
    const t = editText.trim();
    if (!t) {
      setError("Comment can't be empty.");
      return;
    }
    setError(null);
    setEditing(false);
    updateComment({
      id: comment.id,
      postId: comment.postId,
      parentId: comment.parentId,
      text: t,
    })
      .unwrap()
      .catch(() => { });
  }

  function confirmDelete() {
    setConfirmingDelete(false);
    deleteComment({
      id: comment.id,
      postId: comment.postId,
      parentId: comment.parentId,
    })
      .unwrap()
      .catch(() => { });
  }

  return (
    <div className={`_comment_main flex w-full items-start gap-3 ${depth > 0 ? "ml-8 md:ml-12" : ""}`}>
      <div className="_comment_image">
        <span className="_comment_image_link">
          <Avatar src={comment.author.avatarUrl} alt="" initials={initials(comment.author)} className="_comment_img1" />
        </span>
      </div>
      <div className="_comment_area flex-1 space-y-1">
        <div className="_comment_details">
          <div className="_comment_details_top">
            <div className="_comment_name">
              <h4 className="_comment_name_title">{fullName(comment.author)}</h4>
            </div>
          </div>

          {editing ? (
            <div className="">
              <textarea
                className="form-control _comment_textarea border border-gray-300 focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={2}
                maxLength={2000}
              />
              <div className="flex gap-3 text-xs mt-1">
                <LinkButton active onClick={saveEdit}>
                  Save
                </LinkButton>
                <LinkButton
                  onClick={() => {
                    setEditing(false);
                    setError(null);
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
          <LikeAvatarStack
            targetType="comment"
            targetId={comment.id}
            count={comment.likesCount}
            preview={comment.likePreview}
          />
        ) : null}

        <div className="flex flex-wrap items-center gap-x-1 text-sm">
          <button
            type="button"
            className={`${ACTION_BTN} ${comment.likedByMe ? "text-blue-600" : ""}`}
            onClick={toggleLike}
            aria-label={comment.likedByMe ? "Unlike comment" : "Like comment"}
          >
            <ThumbIcon filled={comment.likedByMe} className="h-4 w-4" />
            <span className={TOOLTIP}>Like</span>
          </button>

          {depth === 0 ? (
            <button
              type="button"
              className={ACTION_BTN}
              onClick={toggleReply}
              aria-label="Reply to comment"
            >
              <CommentIcon className="h-4 w-4" />
              <span className={TOOLTIP}>Reply</span>
            </button>
          ) : null}

          {comment.isOwner ? (
            <button
              type="button"
              className={ACTION_BTN}
              onClick={() => {
                setEditText(comment.text);
                setEditing(true);
              }}
              aria-label="Edit comment"
            >
              <EditIcon className="h-4 w-4" />
              <span className={TOOLTIP}>Edit</span>
            </button>
          ) : null}

          {comment.isOwner ? (
            <button
              type="button"
              className={`${ACTION_BTN} hover:bg-red-50 hover:text-red-600`}
              onClick={() => setConfirmingDelete(true)}
              aria-label="Delete comment"
            >
              <TrashIcon className="h-4 w-4" />
              <span className={TOOLTIP}>Delete</span>
            </button>
          ) : null}

          <span className="ml-2 text-xs text-gray-400">· {timeAgo(comment.createdAt)}</span>
        </div>

        {depth === 0 && comment.repliesCount > 0 ? (
          <LinkButton
            className="text-sm text-gray-500 hover:text-blue-600"
            onClick={() => setShowReplies((s) => !s)}
          >
            {showReplies
              ? "Hide replies"
              : `View ${comment.repliesCount} ${comment.repliesCount === 1 ? "reply" : "replies"}`}
          </LinkButton>
        ) : null}

        {depth === 0 && showReplies ? (
          <div className="space-y-3 pt-1">
            {repliesQuery.isLoading ? <CommentSkeleton /> : null}
            {repliesQuery.data?.items.map((r) => (
              <CommentThread key={r.id} comment={r} depth={1} />
            ))}
            {repliesQuery.data?.nextCursor ? (
              <LinkButton
                className="ml-11"
                onClick={() => setRepliesCursor(repliesQuery.data!.nextCursor!)}
                disabled={repliesQuery.isFetching}
              >
                {repliesQuery.isFetching ? "Loading..." : "Load more replies"}
              </LinkButton>
            ) : null}
          </div>
        ) : null}

        {depth === 0 && replying ? (
          <div className="mb-3">
            <CommentComposer
              postId={comment.postId}
              parentId={comment.id}
              replyTo={fullName(comment.author)}
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

      <ConfirmDialog
        open={confirmingDelete}
        title={depth > 0 ? "Delete reply?" : "Delete comment?"}
        message={
          depth > 0
            ? "This reply will be permanently removed."
            : "This comment and all of its replies will be permanently removed."
        }
        confirmLabel="Delete"
        destructive
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </div>
  );
}