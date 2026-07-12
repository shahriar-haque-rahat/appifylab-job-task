"use client";

import { useRef, useCallback, useEffect } from "react";
import { useAppDispatch } from "@/store/hooks";
import { useAppSelector } from "@/store/hooks";
import { selectAuthUser } from "@/store/authSlice";
import { toSummary } from "./optimisticHelpers";
import {
  patchCache,
  applyPreview,
  reconcileLike,
  type LikeArg,
} from "./likeUtils";
import { showToast } from "@/lib/toast";

export function useDebouncedLike() {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectAuthUser);
  const viewerRef = useRef(user ? toSummary(user) : null);
  viewerRef.current = user ? toSummary(user) : null;

  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const inflight = useRef<Map<string, number>>(new Map());
  const seq = useRef<Map<string, number>>(new Map());

  // Cleanup all pending timers on unmount
  useEffect(() => {
    const t = timers.current;
    return () => {
      for (const [, timer] of t) clearTimeout(timer);
      t.clear();
    };
  }, []);

  const toggle = useCallback(
    (arg: LikeArg, currentlyLiked: boolean) => {
      const viewer = viewerRef.current;
      const newLiked = !currentlyLiked;
      const key = `${arg.targetType}-${arg.targetId}`;

      // --- 1. Instant optimistic patch to Redux cache ---
      patchCache(dispatch, arg, (it) => {
        it.likedByMe = newLiked;
        it.likesCount = Math.max(0, it.likesCount + (newLiked ? 1 : -1));
        applyPreview(it, viewer, newLiked);
      });

      // --- 2. Reset debounce timer for this target ---
      const existing = timers.current.get(key);
      if (existing) clearTimeout(existing);

      // --- 3. Increment sequence number for this target ---
      const nextSeq = (seq.current.get(key) ?? 0) + 1;
      seq.current.set(key, nextSeq);
      const thisSeq = nextSeq;
      inflight.current.set(key, thisSeq);

      // --- 4. Set debounce to fire the actual mutation ---
      timers.current.set(
        key,
        setTimeout(async () => {
          timers.current.delete(key);

          if ((seq.current.get(key) ?? 0) !== thisSeq) return;

          const { likesApi } = await import("./likesApi");

          const action = newLiked
            ? dispatch(likesApi.endpoints.likeTarget.initiate(arg))
            : dispatch(likesApi.endpoints.unlikeTarget.initiate(arg));

          try {
            const result = await action.unwrap();
            if ((seq.current.get(key) ?? 0) === thisSeq) {
              reconcileLike(dispatch, arg, result);
            }
          } catch {
            if ((seq.current.get(key) ?? 0) === thisSeq) {
              patchCache(dispatch, arg, (it) => {
                it.likedByMe = currentlyLiked;
                it.likesCount = Math.max(
                  0,
                  it.likesCount + (currentlyLiked ? 1 : -1)
                );
                applyPreview(it, viewer, currentlyLiked);
              });
              showToast(
                newLiked
                  ? "Couldn't like that. Please try again."
                  : "Couldn't remove your like. Please try again."
              );
            }
          } finally {
            if ((inflight.current.get(key) ?? 0) === thisSeq) {
              inflight.current.delete(key);
            }
          }
        }, 400)
      );
    },
    [dispatch]
  );

  return toggle;
}
