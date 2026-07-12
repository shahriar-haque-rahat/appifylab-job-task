"use strict";

const { ApiError } = require("../../utils/ApiError");
const { decodeCursor, encodeCursor } = require("../../utils/cursor");
const repo = require("./likes.repository");
const postsRepo = require("../posts/posts.repository");
const commentsRepo = require("../comments/comments.repository");
const feedCache = require("../../cache/feedCache");

const TYPE = { post: "POST", comment: "COMMENT" };

async function assertTargetVisible(viewerId, targetType, targetId) {
  if (targetType === "POST") {
    const post = await postsRepo.findOwnership(targetId);
    if (!post || (post.visibility === "PRIVATE" && post.authorId !== viewerId)) {
      throw ApiError.notFound("Post not found");
    }
    return;
  }
  const comment = await commentsRepo.findWithPostVisibility(targetId);
  if (
    !comment ||
    (comment.post.visibility === "PRIVATE" &&
      comment.post.authorId !== viewerId)
  ) {
    throw ApiError.notFound("Comment not found");
  }
}

async function setLike({ viewerId, targetTypeParam, targetId, like }) {
  const targetType = TYPE[targetTypeParam];
  await assertTargetVisible(viewerId, targetType, targetId);
  const result = like
    ? await repo.like({ userId: viewerId, targetType, targetId })
    : await repo.unlike({ userId: viewerId, targetType, targetId });
  await feedCache.invalidateForUser(viewerId);
  return {
    targetType: targetTypeParam,
    targetId,
    liked: result.liked,
    likesCount: result.likesCount,
  };
}

async function getLikers({ viewerId, targetTypeParam, targetId, cursorRaw, limit }) {
  const targetType = TYPE[targetTypeParam];
  await assertTargetVisible(viewerId, targetType, targetId);

  let cursor = null;
  if (cursorRaw) {
    cursor = decodeCursor(cursorRaw);
    if (!cursor) throw ApiError.badRequest("Invalid pagination cursor");
  }

  const rows = await repo.findLikers({
    targetType,
    targetId,
    cursor,
    take: limit + 1,
  });
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? encodeCursor(items[items.length - 1]) : null;

  return { items: items.map((r) => r.user), nextCursor };
}

module.exports = { setLike, getLikers };
