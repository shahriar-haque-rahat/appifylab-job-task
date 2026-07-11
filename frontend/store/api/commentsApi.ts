import { baseApi } from "./baseApi";
import { postsApi } from "./postsApi";
import type { Comment, Page } from "@/lib/types";

function mergePage(
  current: Page<Comment>,
  incoming: Page<Comment>,
  hasCursor: boolean
) {
  if (!hasCursor) return incoming;
  const seen = new Set(current.items.map((c) => c.id));
  current.items.push(...incoming.items.filter((c) => !seen.has(c.id)));
  current.nextCursor = incoming.nextCursor;
}

export const commentsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getComments: build.query<Page<Comment>, { postId: string; cursor?: string }>({
      query: ({ postId, cursor }) => ({
        url: "/comments",
        params: { postId, ...(cursor ? { cursor } : {}) },
      }),
      serializeQueryArgs: ({ endpointName, queryArgs }) =>
        `${endpointName}-${queryArgs.postId}`,
      merge: (current, incoming, { arg }) =>
        mergePage(current, incoming, Boolean(arg.cursor)),
      forceRefetch: ({ currentArg, previousArg }) =>
        currentArg?.cursor !== previousArg?.cursor,
    }),

    getReplies: build.query<Page<Comment>, { commentId: string; cursor?: string }>({
      query: ({ commentId, cursor }) => ({
        url: `/comments/${commentId}/replies`,
        params: cursor ? { cursor } : undefined,
      }),
      serializeQueryArgs: ({ endpointName, queryArgs }) =>
        `${endpointName}-${queryArgs.commentId}`,
      merge: (current, incoming, { arg }) =>
        mergePage(current, incoming, Boolean(arg.cursor)),
      forceRefetch: ({ currentArg, previousArg }) =>
        currentArg?.cursor !== previousArg?.cursor,
    }),

    // Optimistic cache updates (not tag invalidation): the comment/reply lists
    // are accumulated infinite-scroll caches, so an invalidation refetch would
    // re-run with the last cursor and APPEND rather than surface the new item.
    // We patch the caches directly and keep the feed's commentsCount in sync.
    createComment: build.mutation<
      { comment: Comment },
      { postId: string; text: string; parentId?: string }
    >({
      query: (body) => ({ url: "/comments", method: "POST", body }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          const comment = data.comment;
          if (arg.parentId) {
            dispatch(
              commentsApi.util.updateQueryData(
                "getReplies",
                { commentId: arg.parentId },
                (draft) => {
                  if (!draft.items.some((c) => c.id === comment.id)) {
                    draft.items.unshift(comment);
                  }
                }
              )
            );
            dispatch(
              commentsApi.util.updateQueryData(
                "getComments",
                { postId: arg.postId },
                (draft) => {
                  const parent = draft.items.find((c) => c.id === arg.parentId);
                  if (parent) parent.repliesCount += 1;
                }
              )
            );
          } else {
            dispatch(
              commentsApi.util.updateQueryData(
                "getComments",
                { postId: arg.postId },
                (draft) => {
                  if (!draft.items.some((c) => c.id === comment.id)) {
                    draft.items.unshift(comment);
                  }
                }
              )
            );
          }
          // Keep the feed card's comment count fresh.
          dispatch(
            postsApi.util.updateQueryData("getFeed", undefined, (draft) => {
              const p = draft.items.find((x) => x.id === arg.postId);
              if (p) p.commentsCount += 1;
            })
          );
        } catch {
          /* surfaced to the composer */
        }
      },
    }),

    updateComment: build.mutation<
      { comment: Comment },
      { id: string; postId: string; parentId: string | null; text: string }
    >({
      query: ({ id, text }) => ({
        url: `/comments/${id}`,
        method: "PATCH",
        body: { text },
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          const replace = (draft: Page<Comment>) => {
            const idx = draft.items.findIndex((c) => c.id === data.comment.id);
            if (idx !== -1) draft.items[idx] = data.comment;
          };
          if (arg.parentId) {
            dispatch(
              commentsApi.util.updateQueryData(
                "getReplies",
                { commentId: arg.parentId },
                replace
              )
            );
          } else {
            dispatch(
              commentsApi.util.updateQueryData(
                "getComments",
                { postId: arg.postId },
                replace
              )
            );
          }
        } catch {
          /* surfaced to the caller */
        }
      },
    }),

    deleteComment: build.mutation<
      { id: string; removedCount: number },
      { id: string; postId: string; parentId: string | null }
    >({
      query: ({ id }) => ({ url: `/comments/${id}`, method: "DELETE" }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          const removeItem = (draft: Page<Comment>) => {
            draft.items = draft.items.filter((c) => c.id !== arg.id);
          };
          if (arg.parentId) {
            dispatch(
              commentsApi.util.updateQueryData(
                "getReplies",
                { commentId: arg.parentId },
                removeItem
              )
            );
          } else {
            dispatch(
              commentsApi.util.updateQueryData(
                "getComments",
                { postId: arg.postId },
                removeItem
              )
            );
          }
          if (arg.parentId) {
            dispatch(
              commentsApi.util.updateQueryData(
                "getComments",
                { postId: arg.postId },
                (draft) => {
                  const parent = draft.items.find((c) => c.id === arg.parentId);
                  if (parent && parent.repliesCount > 0) parent.repliesCount -= 1;
                }
              )
            );
          }
          dispatch(
            postsApi.util.updateQueryData("getFeed", undefined, (draft) => {
              const p = draft.items.find((x) => x.id === arg.postId);
              if (p) {
                p.commentsCount = Math.max(
                  0,
                  p.commentsCount - (data.removedCount || 1)
                );
              }
            })
          );
        } catch {
          /* surfaced to the caller */
        }
      },
    }),
  }),
});

export const {
  useGetCommentsQuery,
  useGetRepliesQuery,
  useCreateCommentMutation,
  useUpdateCommentMutation,
  useDeleteCommentMutation,
} = commentsApi;
