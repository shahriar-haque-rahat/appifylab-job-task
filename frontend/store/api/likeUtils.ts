import type { AppDispatch } from "../store";
import type { LikeTarget, UserSummary } from "@/lib/types";
import { postsApi } from "./postsApi";
import { commentsApi } from "./commentsApi";

export interface LikeArg {
  targetType: LikeTarget;
  targetId: string;
  postId?: string;
  parentId?: string | null;
}

export type Likeable = {
  likedByMe: boolean;
  likesCount: number;
  likePreview?: UserSummary[];
};

export function patchCache(
  dispatch: AppDispatch,
  arg: LikeArg,
  recipe: (item: Likeable) => void
) {
  if (arg.targetType === "post") {
    return dispatch(
      postsApi.util.updateQueryData("getFeed", undefined, (draft) => {
        const p = draft.items.find((x) => x.id === arg.targetId);
        if (p) recipe(p);
      })
    );
  }
  if (arg.parentId) {
    return dispatch(
      commentsApi.util.updateQueryData(
        "getReplies",
        { commentId: arg.parentId },
        (draft) => {
          const c = draft.items.find((x) => x.id === arg.targetId);
          if (c) recipe(c);
        }
      )
    );
  }
  return dispatch(
    commentsApi.util.updateQueryData(
      "getComments",
      { postId: arg.postId as string },
      (draft) => {
        const c = draft.items.find((x) => x.id === arg.targetId);
        if (c) recipe(c);
      }
    )
  );
}

export function applyPreview(item: Likeable, viewer: UserSummary | null, liked: boolean) {
  if (!viewer) return;
  const rest = (item.likePreview ?? []).filter((u) => u.id !== viewer.id);
  item.likePreview = liked ? [viewer, ...rest].slice(0, 3) : rest;
}

export function reconcileLike(
  dispatch: AppDispatch,
  arg: LikeArg,
  data: { liked: boolean; likesCount: number }
) {
  patchCache(dispatch, arg, (it) => {
    it.likedByMe = data.liked;
    it.likesCount = data.likesCount;
  });
}
