"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useCreatePostMutation } from "@/store/api/postsApi";
import { useUploadImageMutation } from "@/store/api/uploadsApi";
import { useAppSelector } from "@/store/hooks";
import { selectAuthUser } from "@/store/authSlice";
import { Avatar } from "@/components/ui/Avatar";
import { Spinner } from "@/components/ui/Spinner";
import { FormError } from "@/components/ui/FormError";
import { VisibilitySelector } from "./VisibilitySelector";
import { PhotoIcon, SendIcon } from "@/components/icons";
import { getErrorMessage } from "@/lib/apiError";
import type { Visibility } from "@/lib/types";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function PostComposer({ onCreated }: { onCreated?: () => void }) {
  const user = useAppSelector(selectAuthUser);
  const [createPost, { isLoading: creating }] = useCreatePostMutation();
  const [uploadImage, { isLoading: uploading }] = useUploadImageMutation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [text, setText] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("PUBLIC");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = text.trim();
    if (!trimmed && !file) {
      setError("Write something or add an image.");
      return;
    }
    try {
      let imageUrl: string | undefined;
      if (file) {
        const fd = new FormData();
        fd.append("image", file);
        const res = await uploadImage(fd).unwrap();
        imageUrl = res.url;
      }
      await createPost({ text: trimmed, visibility, imageUrl }).unwrap();
      setText("");
      removeImage();
      setVisibility("PUBLIC");
      onCreated?.();
    } catch (err) {
      setError(getErrorMessage(err, "Could not publish your post."));
    }
  }

  return (
    <div className="_feed_inner_text_area _b_radious6 _padd_b24 _padd_t24 _padd_r24 _padd_l24 _mar_b16">
      <form onSubmit={onSubmit}>
        <div className="_feed_inner_text_area_box">
          <div className="_feed_inner_text_area_box_image">
            <Avatar src={user?.avatarUrl} alt="" className="_txt_img" />
          </div>
          <div className="_feed_inner_text_area_box_form flex-1">
            <textarea
              className="form-control _textarea"
              placeholder="Write something ..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={2}
              maxLength={5000}
            />
          </div>
        </div>

        {preview ? (
          <div className="relative my-3 max-w-[320px]">
            <img
              src={preview}
              alt="Selected attachment"
              className="block h-auto w-full rounded-[10px]"
            />
            <button
              type="button"
              className="absolute right-2 top-2 h-7 w-7 rounded-full border-0 bg-black/60 text-lg leading-none text-white"
              onClick={removeImage}
              aria-label="Remove image"
            >
              ×
            </button>
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
                {uploading ? "Uploading…" : creating ? "Posting…" : "Post"}
              </span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
