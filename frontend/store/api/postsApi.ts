import { baseApi } from "./baseApi";
import { currentUser, toSummary, makeTempId } from "./optimisticHelpers";
import { showToast } from "@/lib/toast";
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
      // Prepend a temp post immediately (instant feel), then swap it for the
      // server's post on success or roll it back + toast on failure.
      async onQueryStarted(arg, { dispatch, getState, queryFulfilled }) {
        const user = currentUser(getState);
        const tempId = makeTempId("temp_post");
        const optimistic: Post = {
          id: tempId,
          text: arg.text,
          imageUrl: arg.imageUrl ?? null,
          visibility: arg.visibility,
          likesCount: 0,
          commentsCount: 0,
          createdAt: new Date().toISOString(),
          author: user
            ? toSummary(user)
            : { id: "me", firstName: "You", lastName: "", avatarUrl: null },
          likedByMe: false,
          isOwner: true,
          likePreview: [],
        };
        const patch = dispatch(
          postsApi.util.updateQueryData("getFeed", undefined, (draft) => {
            draft.items.unshift(optimistic);
          })
        );
        try {
          const { data } = await queryFulfilled;
          dispatch(
            postsApi.util.updateQueryData("getFeed", undefined, (draft) => {
              const idx = draft.items.findIndex((p) => p.id === tempId);
              if (idx !== -1) draft.items[idx] = data.post;
              else if (!draft.items.some((p) => p.id === data.post.id)) {
                draft.items.unshift(data.post);
              }
            })
          );
        } catch {
          patch.undo();
          showToast("Couldn't publish your post. Please try again.");
        }
      },
    }),

    updatePost: build.mutation<{ post: Post }, { id: string; body: UpdatePostBody }>({
      query: ({ id, body }) => ({ url: `/posts/${id}`, method: "PATCH", body }),
      // Apply the edit to the cached post immediately; reconcile / roll back.
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          postsApi.util.updateQueryData("getFeed", undefined, (draft) => {
            const p = draft.items.find((x) => x.id === arg.id);
            if (p) {
              if (arg.body.text !== undefined) p.text = arg.body.text;
              if (arg.body.visibility !== undefined)
                p.visibility = arg.body.visibility;
              if (arg.body.imageUrl !== undefined)
                p.imageUrl = arg.body.imageUrl;
            }
          })
        );
        try {
          const { data } = await queryFulfilled;
          dispatch(
            postsApi.util.updateQueryData("getFeed", undefined, (draft) => {
              const idx = draft.items.findIndex((p) => p.id === data.post.id);
              if (idx !== -1) draft.items[idx] = data.post;
            })
          );
        } catch {
          patch.undo();
          showToast("Couldn't update the post. Please try again.");
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
          showToast("Couldn't delete the post. Please try again.");
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
