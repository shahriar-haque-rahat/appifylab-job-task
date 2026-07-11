"use client";

import { useState } from "react";
import {
  useUpdatePostMutation,
  useDeletePostMutation,
} from "@/store/api/postsApi";
import { Avatar } from "@/components/ui/Avatar";
import { Dropdown } from "@/components/ui/Dropdown";
import { LinkButton } from "@/components/ui/LinkButton";
import { FormError } from "@/components/ui/FormError";
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
import type { Post, Visibility } from "@/lib/types";

export function PostCard({ post }: { post: Post }) {
  const [updatePost, { isLoading: saving }] = useUpdatePostMutation();
  const [deletePost] = useDeletePostMutation();

  const [showComments, setShowComments] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(post.text);
  const [editVis, setEditVis] = useState<Visibility>(post.visibility);
  const [error, setError] = useState<string | null>(null);

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
      setError(getErrorMessage(err, "Could not update the post."));
    }
  }

  async function onDelete() {
    if (!window.confirm("Delete this post? This cannot be undone.")) return;
    try {
      await deletePost(post.id).unwrap();
    } catch (err) {
      window.alert(getErrorMessage(err, "Could not delete the post."));
    }
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
                        setEditText(post.text);
                        setEditVis(post.visibility);
                        setEditing(true);
                        close();
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
                        onDelete();
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

        {editing ? (
          <div className="mt-3">
            <textarea
              className="form-control _textarea"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={3}
              maxLength={5000}
            />
            <div className="mt-2.5 flex flex-wrap items-center gap-3">
              <VisibilitySelector
                value={editVis}
                onChange={setEditVis}
                disabled={saving}
              />
              <button
                type="button"
                className="_btn1 px-5.5 py-2 text-[14px]"
                onClick={saveEdit}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <LinkButton
                onClick={() => {
                  setEditing(false);
                  setEditText(post.text);
                  setEditVis(post.visibility);
                  setError(null);
                }}
              >
                Cancel
              </LinkButton>
            </div>
            {error ? <FormError>{error}</FormError> : null}
          </div>
        ) : post.text ? (
          <h4 className="_feed_inner_timeline_post_title whitespace-pre-wrap">
            {post.text}
          </h4>
        ) : null}

        {post.imageUrl && !editing ? (
          <div className="_feed_inner_timeline_image">
            <img src={post.imageUrl} alt="" className="_time_img" />
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
    </div>
  );
}
