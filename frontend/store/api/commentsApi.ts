import { baseApi } from "./baseApi";
import { postsApi } from "./postsApi";
import { currentUser, toSummary, makeTempId } from "./optimisticHelpers";
import { showToast } from "@/lib/toast";
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
    // We insert a temp row instantly, then swap it for the server row (or roll it
    // back on failure), keeping the feed's commentsCount in sync throughout.
    createComment: build.mutation<
      { comment: Comment },
      { postId: string; text: string; parentId?: string }
    >({
      query: (body) => ({ url: "/comments", method: "POST", body }),
      async onQueryStarted(arg, { dispatch, getState, queryFulfilled }) {
        const user = currentUser(getState);
        const tempId = makeTempId();
        const optimistic: Comment = {
          id: tempId,
          postId: arg.postId,
          parentId: arg.parentId ?? null,
          text: arg.text,
          likesCount: 0,
          repliesCount: 0,
          createdAt: new Date().toISOString(),
          author: user
            ? toSummary(user)
            : { id: "me", firstName: "You", lastName: "", avatarUrl: null },
          likedByMe: false,
          isOwner: true,
          likePreview: [],
        };

        const patches = [];
        if (arg.parentId) {
          patches.push(
            dispatch(
              commentsApi.util.updateQueryData(
                "getReplies",
                { commentId: arg.parentId },
                (draft) => {
                  if (!draft.items.some((c) => c.id === tempId)) {
                    draft.items.unshift(optimistic);
                  }
                }
              )
            )
          );
          patches.push(
            dispatch(
              commentsApi.util.updateQueryData(
                "getComments",
                { postId: arg.postId },
                (draft) => {
                  const parent = draft.items.find((c) => c.id === arg.parentId);
                  if (parent) parent.repliesCount += 1;
                }
              )
            )
          );
        } else {
          patches.push(
            dispatch(
              commentsApi.util.updateQueryData(
                "getComments",
                { postId: arg.postId },
                (draft) => {
                  if (!draft.items.some((c) => c.id === tempId)) {
                    draft.items.unshift(optimistic);
                  }
                }
              )
            )
          );
        }
        // Keep the feed card's comment count fresh, instantly.
        patches.push(
          dispatch(
            postsApi.util.updateQueryData("getFeed", undefined, (draft) => {
              const p = draft.items.find((x) => x.id === arg.postId);
              if (p) p.commentsCount += 1;
            })
          )
        );

        try {
          const { data } = await queryFulfilled;
          // Swap the temp row for the persisted one so its real id backs any
          // later like / edit / delete on it.
          const swap = (draft: Page<Comment>) => {
            const idx = draft.items.findIndex((c) => c.id === tempId);
            if (idx !== -1) draft.items[idx] = data.comment;
            else if (!draft.items.some((c) => c.id === data.comment.id)) {
              draft.items.unshift(data.comment);
            }
          };
          if (arg.parentId) {
            dispatch(
              commentsApi.util.updateQueryData(
                "getReplies",
                { commentId: arg.parentId },
                swap
              )
            );
          } else {
            dispatch(
              commentsApi.util.updateQueryData(
                "getComments",
                { postId: arg.postId },
                swap
              )
            );
          }
        } catch {
          for (const p of patches) p.undo();
          showToast("Couldn't post your comment. Please try again.");
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
        // Instantly show the edited text; reconcile / roll back on resolution.
        const applyText = (draft: Page<Comment>) => {
          const c = draft.items.find((x) => x.id === arg.id);
          if (c) c.text = arg.text;
        };
        const patch = arg.parentId
          ? dispatch(
              commentsApi.util.updateQueryData(
                "getReplies",
                { commentId: arg.parentId },
                applyText
              )
            )
          : dispatch(
              commentsApi.util.updateQueryData(
                "getComments",
                { postId: arg.postId },
                applyText
              )
            );
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
          patch.undo();
          showToast("Couldn't save your edit. Please try again.");
        }
      },
    }),

    deleteComment: build.mutation<
      { id: string; removedCount: number },
      { id: string; postId: string; parentId: string | null }
    >({
      query: ({ id }) => ({ url: `/comments/${id}`, method: "DELETE" }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        // Optimistically remove the comment/reply. A deleted top-level comment
        // cascades to its replies server-side, so decrement the feed count by
        // (1 + its reply count) up front and reconcile with the server's exact
        // removedCount afterward.
        let removed = 1;
        const patches = [];

        if (arg.parentId) {
          patches.push(
            dispatch(
              commentsApi.util.updateQueryData(
                "getReplies",
                { commentId: arg.parentId },
                (draft) => {
                  draft.items = draft.items.filter((c) => c.id !== arg.id);
                }
              )
            )
          );
          patches.push(
            dispatch(
              commentsApi.util.updateQueryData(
                "getComments",
                { postId: arg.postId },
                (draft) => {
                  const parent = draft.items.find((c) => c.id === arg.parentId);
                  if (parent && parent.repliesCount > 0) parent.repliesCount -= 1;
                }
              )
            )
          );
        } else {
          patches.push(
            dispatch(
              commentsApi.util.updateQueryData(
                "getComments",
                { postId: arg.postId },
                (draft) => {
                  const target = draft.items.find((c) => c.id === arg.id);
                  if (target) removed = 1 + (target.repliesCount || 0);
                  draft.items = draft.items.filter((c) => c.id !== arg.id);
                }
              )
            )
          );
        }

        patches.push(
          dispatch(
            postsApi.util.updateQueryData("getFeed", undefined, (draft) => {
              const p = draft.items.find((x) => x.id === arg.postId);
              if (p) p.commentsCount = Math.max(0, p.commentsCount - removed);
            })
          )
        );

        try {
          const { data } = await queryFulfilled;
          const serverRemoved = data.removedCount ?? removed;
          if (serverRemoved !== removed) {
            dispatch(
              postsApi.util.updateQueryData("getFeed", undefined, (draft) => {
                const p = draft.items.find((x) => x.id === arg.postId);
                if (p) {
                  p.commentsCount = Math.max(
                    0,
                    p.commentsCount + removed - serverRemoved
                  );
                }
              })
            );
          }
        } catch {
          for (const p of patches) p.undo();
          showToast("Couldn't delete the comment. Please try again.");
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
