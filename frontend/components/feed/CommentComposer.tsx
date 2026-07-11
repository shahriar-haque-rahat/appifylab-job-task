"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { useCreateCommentMutation } from "@/store/api/commentsApi";
import { useAppSelector } from "@/store/hooks";
import { selectAuthUser } from "@/store/authSlice";
import { Avatar } from "@/components/ui/Avatar";
import { Spinner } from "@/components/ui/Spinner";
import { FormError } from "@/components/ui/FormError";
import { SendIcon } from "@/components/icons";
import { getErrorMessage } from "@/lib/apiError";

// Reused for both top-level comments and replies (pass parentId for a reply).
export function CommentComposer({
  postId,
  parentId,
  onDone,
  autoFocus = false,
  placeholder = "Write a comment",
}: {
  postId: string;
  parentId?: string;
  onDone?: () => void;
  autoFocus?: boolean;
  placeholder?: string;
}) {
  const user = useAppSelector(selectAuthUser);
  const [createComment, { isLoading }] = useCreateCommentMutation();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const t = text.trim();
    if (!t || isLoading) return;
    setError(null);
    try {
      await createComment({ postId, text: t, parentId }).unwrap();
      setText("");
      onDone?.();
    } catch (err) {
      setError(getErrorMessage(err, "Could not post your comment."));
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void submit();
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  }

  return (
    <div className="_feed_inner_comment_box">
      <form className="_feed_inner_comment_box_form" onSubmit={onSubmit}>
        <div className="_feed_inner_comment_box_content">
          <div className="_feed_inner_comment_box_content_image">
            <Avatar src={user?.avatarUrl} alt="" className="_comment_img" />
          </div>
          <div className="_feed_inner_comment_box_content_txt flex-1">
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
            disabled={isLoading || !text.trim()}
            aria-label="Send comment"
          >
            {isLoading ? <Spinner dark /> : <SendIcon />}
          </button>
        </div>
      </form>
      {error ? <FormError>{error}</FormError> : null}
    </div>
  );
}
