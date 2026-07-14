"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useCreatePostMutation } from "@/store/api/postsApi";
import { useAppSelector } from "@/store/hooks";
import { selectAuthUser } from "@/store/authSlice";
import { Avatar } from "@/components/ui/Avatar";
import { Spinner } from "@/components/ui/Spinner";
import { initials } from "@/lib/format";
import { FormError } from "@/components/ui/FormError";
import { VisibilitySelector } from "./VisibilitySelector";
import { PhotoIcon, SendIcon } from "@/components/icons";
import { uploadImageWithProgress } from "@/lib/upload";
import type { Visibility } from "@/lib/types";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_TEXT = 5000;

export function PostComposer({ onCreated }: { onCreated?: () => void }) {
  const user = useAppSelector(selectAuthUser);
  const [createPost, { isLoading: creating }] = useCreatePostMutation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [text, setText] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("PUBLIC");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const busy = creating || uploading;

  function pickImage(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_IMAGE_BYTES) {
      setError("Image must be 5MB or smaller.");
      return;
    }
    setError(null);
    setFile(f);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(f));
  }

  function removeImage() {
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function resetComposer() {
    setText("");
    removeImage();
    setVisibility("PUBLIC");
  }

  // Publish optimistically: the post is prepended to the feed the instant
  // createPost dispatches (see postsApi), so the composer resets immediately and
  // the post appears at the top without waiting on the request. Failures roll the
  // post back and raise a non-blocking toast. Image uploads still run first and
  // show their own progress bar (we need the hosted URL before creating).
  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = text.trim();
    if (!trimmed && !file) {
      setError("Write something or add an image.");
      return;
    }

    let imageUrl: string | undefined;
    if (file) {
      setUploading(true);
      setProgress(0);
      try {
        imageUrl = await uploadImageWithProgress(file, setProgress);
      } catch (upErr) {
        // Failed upload → clear the preview so ONLY the error shows (no
        // stray/phantom image left hanging in the composer).
        removeImage();
        setError(upErr instanceof Error ? upErr.message : "Image upload failed.");
        return;
      } finally {
        setUploading(false);
      }
    }

    resetComposer();
    onCreated?.();
    createPost({ text: trimmed, visibility, imageUrl })
      .unwrap()
      .catch(() => {
        /* optimistic rollback + toast handled by the mutation */
      });
  }

  return (
    <div className="_feed_inner_text_area _b_radious6 _padd_b24 _padd_t24 _padd_r24 _padd_l24 _mar_b16">
      <form onSubmit={onSubmit}>
        <div className="_feed_inner_text_area_box">
          <div className="_feed_inner_text_area_box_image">
            <Avatar src={user?.avatarUrl} alt="" initials={user ? initials(user) : undefined} className="_txt_img" />
          </div>
          <div className="_feed_inner_text_area_box_form flex-1">
            <textarea
              className="form-control _textarea"
              placeholder="Write something ..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={2}
              maxLength={MAX_TEXT}
            />
            {text.length > MAX_TEXT * 0.8 ? (
              <span className="mt-1 block text-right text-[11px] text-muted-2">
                {text.length}/{MAX_TEXT}
              </span>
            ) : null}
          </div>
        </div>

        {preview ? (
          <div className="relative my-3 max-w-[320px]">
            <img
              src={preview}
              alt="Selected attachment"
              className="block h-auto w-full rounded-[10px]"
            />
            {uploading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-[10px] bg-black/45">
                <div className="h-1.5 w-4/5 overflow-hidden rounded-full bg-white/30">
                  <div
                    className="h-full rounded-full bg-white transition-[width] duration-150"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-[12px] font-medium text-white">
                  Uploading… {progress}%
                </span>
              </div>
            ) : (
              <button
                type="button"
                className="absolute right-2 top-2 h-7 w-7 rounded-full border-0 bg-black/60 text-lg leading-none text-white"
                onClick={removeImage}
                aria-label="Remove image"
              >
                ×
              </button>
            )}
          </div>
        ) : null}

        {error ? <FormError>{error}</FormError> : null}

        <div className="_feed_inner_text_area_bottom">
          <div className="_feed_inner_text_area_item flex items-center gap-2.5">
            <div className="_feed_inner_text_area_bottom_photo _feed_common">
              <button
                type="button"
                className="_feed_inner_text_area_bottom_photo_link"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy}
              >
                <span className="_feed_inner_text_area_bottom_photo_iamge _mar_img">
                  <PhotoIcon />
                </span>
                Photo
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                hidden
                onChange={pickImage}
              />
            </div>
            <VisibilitySelector
              value={visibility}
              onChange={setVisibility}
              disabled={busy}
            />
          </div>
          <div className="_feed_inner_text_area_btn">
            <button
              type="submit"
              className="_feed_inner_text_area_btn_link"
              disabled={busy}
            >
              {busy ? <Spinner /> : <SendIcon className="_mar_img" />}
              <span className="ml-1.5">
                {uploading
                  ? `Uploading… ${progress}%`
                  : creating
                    ? "Posting…"
                    : "Post"}
              </span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
