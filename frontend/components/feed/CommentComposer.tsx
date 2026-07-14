"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { useCreateCommentMutation } from "@/store/api/commentsApi";
import { useAppSelector } from "@/store/hooks";
import { selectAuthUser } from "@/store/authSlice";
import { Avatar } from "@/components/ui/Avatar";
import { SendIcon } from "@/components/icons";
import { initials } from "@/lib/format";

// Reused for both top-level comments and replies (pass parentId for a reply).
export function CommentComposer({
  postId,
  parentId,
  replyTo,
  onDone,
  autoFocus = false,
  placeholder = "Write a comment",
}: {
  postId: string;
  parentId?: string;
  replyTo?: string;
  onDone?: () => void;
  autoFocus?: boolean;
  placeholder?: string;
}) {
  const user = useAppSelector(selectAuthUser);
  const [createComment] = useCreateCommentMutation();
  const [text, setText] = useState("");

  function submit() {
    const t = text.trim();
    if (!t) return;
    // Optimistic: clear the input and dismiss the composer instantly. The comment
    // appears in the thread immediately via the mutation's optimistic insert; any
    // failure rolls it back and raises a non-blocking toast.
    setText("");
    onDone?.();
    createComment({ postId, text: t, parentId })
      .unwrap()
      .catch(() => {
        /* rollback + toast handled by the mutation */
      });
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    submit();
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="_feed_inner_comment_box">
      <form className="_feed_inner_comment_box_form" onSubmit={onSubmit}>
        <div className="_feed_inner_comment_box_content">
          <div className="_feed_inner_comment_box_content_image">
            <Avatar src={user?.avatarUrl} alt="" initials={user ? initials(user) : undefined} className="_comment_img" />
          </div>
          <div className="_feed_inner_comment_box_content_txt flex-1">
            {replyTo ? (
              <div className="mb-1 text-[12px] text-muted-2">
                Replying to <span className="font-medium text-ink">{replyTo}</span>
                <button
                  type="button"
                  className="ml-2 cursor-pointer border-0 bg-transparent p-0 text-[13px] text-muted hover:text-ink"
                  onClick={onDone}
                  aria-label="Cancel reply"
                >
                  Cancel
                </button>
              </div>
            ) : null}
            <textarea
              className="form-control _comment_textarea"
              placeholder={placeholder}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onKeyDown}
              autoFocus={autoFocus}
              rows={1}
              maxLength={2000}
            />
          </div>
        </div>
        <div className="_feed_inner_comment_box_icon">
          <button
            type="submit"
            className="_feed_inner_comment_box_icon_btn"
            disabled={!text.trim()}
            aria-label="Send comment"
          >
            <SendIcon />
          </button>
        </div>
      </form>
    </div>
  );
}
