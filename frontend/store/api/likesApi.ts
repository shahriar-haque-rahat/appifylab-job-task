import { baseApi } from "./baseApi";
import { currentUser, toSummary } from "./optimisticHelpers";
import {
  patchCache,
  applyPreview,
  reconcileLike,
  type LikeArg,
} from "./likeUtils";
import type { LikeResult, LikeTarget, Page, UserSummary } from "@/lib/types";
import { showToast } from "@/lib/toast";

type Likeable = {
  likedByMe: boolean;
  likesCount: number;
  likePreview?: UserSummary[];
};

function patchLikers(
  dispatch: any,
  arg: LikeArg,
  viewer: UserSummary | null,
  liked: boolean
) {
  if (!viewer) return undefined;
  return dispatch(
    likesApi.util.updateQueryData(
      "getLikers",
      { targetType: arg.targetType, targetId: arg.targetId },
      (draft: Page<UserSummary>) => {
        const exists = draft.items.some((u) => u.id === viewer.id);
        if (liked && !exists) draft.items.unshift(viewer);
        else if (!liked && exists)
          draft.items = draft.items.filter((u) => u.id !== viewer.id);
      }
    )
  );
}

async function optimisticToggle(
  arg: LikeArg,
  liked: boolean,
  dispatch: any,
  getState: () => unknown,
  queryFulfilled: Promise<{ data: LikeResult }>
) {
  const user = currentUser(getState);
  const viewer = user ? toSummary(user) : null;

  const patches = [
    patchCache(dispatch, arg, (it) => {
      it.likedByMe = liked;
      it.likesCount = Math.max(0, it.likesCount + (liked ? 1 : -1));
      applyPreview(it, viewer, liked);
    }),
    patchLikers(dispatch, arg, viewer, liked),
  ];

  try {
    const { data } = await queryFulfilled;
    reconcileLike(dispatch, arg, data);
  } catch {
    for (const p of patches) p?.undo();
    showToast(
      liked ? "Couldn't like that. Please try again." : "Couldn't remove your like. Please try again."
    );
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
      onQueryStarted: (arg, { dispatch, getState, queryFulfilled }) =>
        optimisticToggle(arg, true, dispatch, getState, queryFulfilled),
    }),

    unlikeTarget: build.mutation<LikeResult, LikeArg>({
      query: ({ targetType, targetId }) => ({
        url: `/likes/${targetType}/${targetId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_r, _e, arg) => [
        { type: "Likers", id: `${arg.targetType}-${arg.targetId}` },
      ],
      onQueryStarted: (arg, { dispatch, getState, queryFulfilled }) =>
        optimisticToggle(arg, false, dispatch, getState, queryFulfilled),
    }),

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
