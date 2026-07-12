"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useGetFeedQuery } from "@/store/api/postsApi";
import { PostComposer } from "./PostComposer";
import { PostCard } from "./PostCard";
import { PostCardSkeleton } from "@/components/ui/Skeleton";
import { FormError } from "@/components/ui/FormError";
import { getErrorMessage } from "@/lib/apiError";

export function Feed() {
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const { data, isLoading, isFetching, isError, error, refetch } =
    useGetFeedQuery(cursor);

  const items = data?.items ?? [];
  const nextCursor = data?.nextCursor ?? null;

  const loadMore = useCallback(() => {
    if (nextCursor && !isFetching) setCursor(nextCursor);
  }, [nextCursor, isFetching]);

  // New posts are prepended to the cache by createPost's optimistic update, so
  // we only need to scroll the user up to see theirs.
  const onCreated = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Infinite scroll via IntersectionObserver sentinel.
  const scrollRootRef = useRef<HTMLDivElement>(null); // pass this down or find via closest()
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const root = el.closest("._layout_middle_wrap") as HTMLElement | null;
    const obs = new IntersectionObserver(
      (entries) => {
        console.log("sentinel intersecting:", entries[0]?.isIntersecting);
        if (entries[0]?.isIntersecting) loadMore();
      },
      { root, rootMargin: "300px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore]);

  console.log("nextCursor:", nextCursor, "isFetching:", isFetching, "items:", items.length);

  return (
    <>
      <PostComposer onCreated={onCreated} />

      {isLoading ? (
        <>
          <PostCardSkeleton />
          <PostCardSkeleton />
          <PostCardSkeleton />
        </>
      ) : null}

      {isError && items.length === 0 ? (
        <div className="_feed_inner_timeline_post_area _b_radious6 _padd_b24 _padd_t24 _mar_b16 p-6 text-center">
          <FormError>
            {getErrorMessage(error, "Could not load the feed.")}
          </FormError>
          <button className="_btn1 px-6 py-2" onClick={() => refetch()}>
            Retry
          </button>
        </div>
      ) : null}

      {!isLoading && !isError && items.length === 0 ? (
        <div className="_feed_inner_timeline_post_area _b_radious6 _padd_b24 _padd_t24 _mar_b16 px-6 py-10 text-center text-muted">
          <p>No posts yet. Be the first to share something!</p>
        </div>
      ) : null}

      {items.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}

      <div ref={sentinelRef} aria-hidden="true" />

      {isFetching && cursor ? <PostCardSkeleton /> : null}

      {!nextCursor && items.length > 0 ? (
        <p className="pb-10 pt-3 text-center text-muted-2">
          You&apos;re all caught up ✨
        </p>
      ) : null}
    </>
  );
}
