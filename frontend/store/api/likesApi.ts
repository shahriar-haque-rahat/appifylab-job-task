import { baseApi } from "./baseApi";
import { postsApi } from "./postsApi";
import { commentsApi } from "./commentsApi";
import type { AppDispatch } from "../store";
import type { LikeResult, LikeTarget, Page, UserSummary } from "@/lib/types";

// Extra context lets us optimistically patch the RIGHT cache entry (the feed for
// posts, the comments/replies list for comments).
export interface LikeArg {
  targetType: LikeTarget;
  targetId: string;
  postId?: string;
  parentId?: string | null;
}

type Likeable = { likedByMe: boolean; likesCount: number };

// Apply `recipe` to the cached item for this like target; returns the patch so
// it can be undone on failure.
function patchCache(
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

async function optimisticToggle(
  arg: LikeArg,
  liked: boolean,
  dispatch: AppDispatch,
  queryFulfilled: Promise<{ data: LikeResult }>
) {
  const patch = patchCache(dispatch, arg, (it) => {
    it.likedByMe = liked;
    it.likesCount = Math.max(0, it.likesCount + (liked ? 1 : -1));
  });
  try {
    const { data } = await queryFulfilled;
    // Reconcile to the server's authoritative values.
    patchCache(dispatch, arg, (it) => {
      it.likedByMe = data.liked;
      it.likesCount = data.likesCount;
    });
  } catch {
    patch.undo();
  }
}

export const likesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    likeTarget: build.mutation<LikeResult, LikeArg>({
      query: ({ targetType, targetId }) => ({
        url: `/likes/${targetType}/${targetId}`,
        method: "POST",
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: "Likers", id: `${arg.targetType}-${arg.targetId}` },
      ],
      onQueryStarted: (arg, { dispatch, queryFulfilled }) =>
        optimisticToggle(arg, true, dispatch, queryFulfilled),
    }),

    unlikeTarget: build.mutation<LikeResult, LikeArg>({
      query: ({ targetType, targetId }) => ({
        url: `/likes/${targetType}/${targetId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: "Likers", id: `${arg.targetType}-${arg.targetId}` },
      ],
      onQueryStarted: (arg, { dispatch, queryFulfilled }) =>
        optimisticToggle(arg, false, dispatch, queryFulfilled),
    }),

    // "Who liked" — lazy-loaded on demand (keeps the feed query cheap at scale).
    getLikers: build.query<
      Page<UserSummary>,
      { targetType: LikeTarget; targetId: string; cursor?: string }
    >({
      query: ({ targetType, targetId, cursor }) => ({
        url: `/likes/${targetType}/${targetId}`,
        params: cursor ? { cursor } : undefined,
      }),
      serializeQueryArgs: ({ endpointName, queryArgs }) =>
        `${endpointName}-${queryArgs.targetType}-${queryArgs.targetId}`,
      merge: (current, incoming, { arg }) => {
        if (!arg.cursor) return incoming;
        const seen = new Set(current.items.map((u) => u.id));
        current.items.push(...incoming.items.filter((u) => !seen.has(u.id)));
        current.nextCursor = incoming.nextCursor;
      },
      forceRefetch: ({ currentArg, previousArg }) =>
        currentArg?.cursor !== previousArg?.cursor,
      providesTags: (_r, _e, arg) => [
        { type: "Likers", id: `${arg.targetType}-${arg.targetId}` },
      ],
    }),
  }),
});

export const {
  useLikeTargetMutation,
  useUnlikeTargetMutation,
  useGetLikersQuery,
} = likesApi;
