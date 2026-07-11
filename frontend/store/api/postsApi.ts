import { baseApi } from "./baseApi";
import type { Post, Page, Visibility } from "@/lib/types";

interface CreatePostBody {
  text: string;
  visibility: Visibility;
  imageUrl?: string | null;
}
interface UpdatePostBody {
  text?: string;
  visibility?: Visibility;
  imageUrl?: string | null;
}

export const postsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // Infinite feed: one cache entry, appended page-by-page via `merge`.
    getFeed: build.query<Page<Post>, string | undefined>({
      query: (cursor) => ({
        url: "/posts",
        params: cursor ? { cursor } : undefined,
      }),
      serializeQueryArgs: ({ endpointName }) => endpointName,
      merge: (current, incoming, { arg }) => {
        if (!arg) return incoming; // first page / reset -> replace
        const seen = new Set(current.items.map((p) => p.id));
        current.items.push(...incoming.items.filter((p) => !seen.has(p.id)));
        current.nextCursor = incoming.nextCursor;
      },
      forceRefetch: ({ currentArg, previousArg }) => currentArg !== previousArg,
      providesTags: (result) =>
        result
          ? [
              ...result.items.map((p) => ({ type: "Post" as const, id: p.id })),
              { type: "Post" as const, id: "LIST" },
            ]
          : [{ type: "Post" as const, id: "LIST" }],
    }),

    createPost: build.mutation<{ post: Post }, CreatePostBody>({
      query: (body) => ({ url: "/posts", method: "POST", body }),
      // Prepend the new post to the feed cache — instant, keeps scroll/pages.
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(
            postsApi.util.updateQueryData("getFeed", undefined, (draft) => {
              draft.items.unshift(data.post);
            })
          );
        } catch {
          /* surfaced to the composer */
        }
      },
    }),

    updatePost: build.mutation<{ post: Post }, { id: string; body: UpdatePostBody }>({
      query: ({ id, body }) => ({ url: `/posts/${id}`, method: "PATCH", body }),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(
            postsApi.util.updateQueryData("getFeed", undefined, (draft) => {
              const idx = draft.items.findIndex((p) => p.id === data.post.id);
              if (idx !== -1) draft.items[idx] = data.post;
            })
          );
        } catch {
          /* surfaced to the caller */
        }
      },
    }),

    deletePost: build.mutation<void, string>({
      query: (id) => ({ url: `/posts/${id}`, method: "DELETE" }),
      // Optimistic removal with rollback.
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          postsApi.util.updateQueryData("getFeed", undefined, (draft) => {
            draft.items = draft.items.filter((p) => p.id !== id);
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
    }),
  }),
});

export const {
  useGetFeedQuery,
  useCreatePostMutation,
  useUpdatePostMutation,
  useDeletePostMutation,
} = postsApi;
