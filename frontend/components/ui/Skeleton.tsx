"use client";

export function Skeleton({
  className = "",
  rounded = "rounded",
}: {
  className?: string;
  rounded?: string;
}) {
  return (
    <span className={`skeleton block ${rounded} ${className}`} aria-hidden="true" />
  );
}

/** A single feed post placeholder, matching the post-card silhouette. */
export function PostCardSkeleton() {
  return (
    <div className="_feed_inner_timeline_post_area _b_radious6 _padd_b24 _padd_t24 _mar_b16">
      <div className="_feed_inner_timeline_content _padd_r24 _padd_l24">
        <div className="mb-4 flex items-center gap-3">
          <Skeleton className="h-11 w-11 shrink-0" rounded="rounded-full" />
          <div className="flex-1">
            <Skeleton className="mb-2 h-3.5 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="mb-2 h-3.5 w-full" />
        <Skeleton className="mb-4 h-3.5 w-4/5" />
        <Skeleton className="h-56 w-full" rounded="rounded-md" />
      </div>
    </div>
  );
}

/** A single comment placeholder. */
export function CommentSkeleton() {
  return (
    <div className="_comment_main">
      <div className="_comment_image">
        <Skeleton className="h-9 w-9" rounded="rounded-full" />
      </div>
      <div className="_comment_area flex-1">
        <Skeleton className="mb-2 h-3 w-32" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    </div>
  );
}
