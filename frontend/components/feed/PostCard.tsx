"use client";

import { useId, useState } from "react";
import {
  useUpdatePostMutation,
  useDeletePostMutation,
} from "@/store/api/postsApi";
import { Avatar } from "@/components/ui/Avatar";
import { Dropdown } from "@/components/ui/Dropdown";
import { LinkButton } from "@/components/ui/LinkButton";
import { FormError } from "@/components/ui/FormError";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ReactionBar } from "./ReactionBar";
import { LikeAvatarStack } from "./LikeAvatarStack";
import { CommentsSection } from "./CommentsSection";
import { VisibilitySelector } from "./VisibilitySelector";
import {
  DotsIcon,
  EditIcon,
  TrashIcon,
  GlobeIcon,
  LockIcon,
} from "@/components/icons";
import { timeAgo, fullName } from "@/lib/format";
import { getErrorMessage } from "@/lib/apiError";
import { cloudinaryVariant } from "@/lib/img";
import type { Post, Visibility } from "@/lib/types";

export function PostCard({ post }: { post: Post }) {
  const [updatePost, { isLoading: saving }] = useUpdatePostMutation();
  const [deletePost, { isLoading: deleting }] = useDeletePostMutation();

  const [showComments, setShowComments] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [editText, setEditText] = useState(post.text);
  const [editVis, setEditVis] = useState<Visibility>(post.visibility);
  const [error, setError] = useState<string | null>(null);
  const [imgBroken, setImgBroken] = useState(false);
  const editTitleId = useId();

  function openEdit() {
    setEditText(post.text);
    setEditVis(post.visibility);
    setError(null);
    setEditing(true);
  }

  async function saveEdit() {
    setError(null);
    if (!editText.trim() && !post.imageUrl) {
      setError("A post must have text or an image.");
      return;
    }
    try {
      await updatePost({
        id: post.id,
        body: { text: editText.trim(), visibility: editVis },
      }).unwrap();
      setEditing(false);
    } catch (err) {
      // Non-blocking toast is raised by the mutation; keep an inline hint too.
      setError(getErrorMessage(err, "Could not update the post."));
    }
  }

  function confirmDelete() {
    // Optimistic removal happens instantly; errors surface via toast + rollback.
    setConfirmingDelete(false);
    deletePost(post.id)
      .unwrap()
      .catch(() => {
        /* handled by the mutation's rollback + toast */
      });
  }

  return (
    <div className="_feed_inner_timeline_post_area _b_radious6 _padd_b24 _padd_t24 _mar_b16">
      <div className="_feed_inner_timeline_content _padd_r24 _padd_l24">
        <div className="_feed_inner_timeline_post_top">
          <div className="_feed_inner_timeline_post_box">
            <div className="_feed_inner_timeline_post_box_image">
              <Avatar src={post.author.avatarUrl} alt="" className="_post_img" />
            </div>
            <div className="_feed_inner_timeline_post_box_txt">
              <h4 className="_feed_inner_timeline_post_box_title">
                {fullName(post.author)}
              </h4>
              <p className="_feed_inner_timeline_post_box_para">
                {timeAgo(post.createdAt)} ·{" "}
                <span className="inline-flex items-center gap-1 text-muted">
                  {post.visibility === "PUBLIC" ? (
                    <>
                      <GlobeIcon /> Public
                    </>
                  ) : (
                    <>
                      <LockIcon /> Private
                    </>
                  )}
                </span>
              </p>
            </div>
          </div>

          {post.isOwner ? (
            <Dropdown
              wrapperClassName="_feed_inner_timeline_post_box_dropdown"
              panelClassName="_feed_timeline_dropdown _timeline_dropdown"
              trigger={({ toggle }) => (
                <div className="_feed_timeline_post_dropdown">
                  <button
                    type="button"
                    className="_feed_timeline_post_dropdown_link"
                    onClick={toggle}
                    aria-label="Post options"
                  >
                    <DotsIcon />
                  </button>
                </div>
              )}
            >
              {({ close }) => (
                <ul className="_feed_timeline_dropdown_list">
                  <li className="_feed_timeline_dropdown_item">
                    <button
                      type="button"
                      className="_feed_timeline_dropdown_link"
                      onClick={() => {
                        close();
                        openEdit();
                      }}
                    >
                      <span>
                        <EditIcon />
                      </span>{" "}
                      Edit Post
                    </button>
                  </li>
                  <li className="_feed_timeline_dropdown_item">
                    <button
                      type="button"
                      className="_feed_timeline_dropdown_link"
                      onClick={() => {
                        close();
                        setConfirmingDelete(true);
                      }}
                    >
                      <span>
                        <TrashIcon />
                      </span>{" "}
                      Delete Post
                    </button>
                  </li>
                </ul>
              )}
            </Dropdown>
          ) : null}
        </div>

        {post.text ? (
          <h4 className="_feed_inner_timeline_post_title whitespace-pre-wrap">
            {post.text}
          </h4>
        ) : null}

        {post.imageUrl && !imgBroken ? (
          <div className="_feed_inner_timeline_image">
            <img
              src={cloudinaryVariant(post.imageUrl, 900)}
              alt=""
              className="_time_img"
              loading="lazy"
              onError={() => setImgBroken(true)}
            />
          </div>
        ) : null}
      </div>

      {post.likesCount > 0 || post.commentsCount > 0 ? (
        <div className="_feed_inner_timeline_total_reacts _padd_r24 _padd_l24 _mar_b26">
          <div className="_feed_inner_timeline_total_reacts_image">
            <LikeAvatarStack
              targetType="post"
              targetId={post.id}
              count={post.likesCount}
              preview={post.likePreview}
            />
          </div>
          <div className="_feed_inner_timeline_total_reacts_txt">
            {post.commentsCount > 0 ? (
              <p className="_feed_inner_timeline_total_reacts_para1">
                <LinkButton onClick={() => setShowComments((s) => !s)}>
                  <span>{post.commentsCount}</span>{" "}
                  {post.commentsCount === 1 ? "Comment" : "Comments"}
                </LinkButton>
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      <ReactionBar
        postId={post.id}
        liked={post.likedByMe}
        likesCount={post.likesCount}
        onCommentClick={() => setShowComments((s) => !s)}
      />

      {showComments ? <CommentsSection postId={post.id} /> : null}

      {/* Edit post — styled modal (Item 3). */}
      <Modal open={editing} onClose={() => setEditing(false)} labelledBy={editTitleId}>
        <div className="mb-4 flex items-center justify-between">
          <h3 id={editTitleId} className="text-[17px] font-semibold">
            Edit post
          </h3>
          <button
            type="button"
            className="cursor-pointer rounded-md border-0 bg-transparent px-1 text-[22px] leading-none text-muted hover:text-ink"
            onClick={() => setEditing(false)}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <textarea
          className="w-full resize-none rounded-lg border border-line bg-surface-2/40 p-3 text-[14px] leading-relaxed text-ink-strong outline-none focus:border-primary"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          rows={4}
          maxLength={5000}
          autoFocus
        />

        {error ? <FormError>{error}</FormError> : null}

        <div className="mt-4 flex items-center justify-between gap-3">
          <VisibilitySelector value={editVis} onChange={setEditVis} disabled={saving} />
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="cursor-pointer rounded-lg border border-line bg-transparent px-4 py-2 text-[14px] font-medium text-ink hover:bg-surface-2 disabled:opacity-60"
              onClick={() => setEditing(false)}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="cursor-pointer rounded-lg border-0 bg-primary px-5 py-2 text-[14px] font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
              onClick={saveEdit}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete post — non-blocking confirm (Item 3 / Item 9). */}
      <ConfirmDialog
        open={confirmingDelete}
        title="Delete post?"
        message="This post will be permanently removed. This cannot be undone."
        confirmLabel="Delete"
        destructive
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </div>
  );
}
