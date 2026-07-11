"use strict";

const { ApiError } = require("../../utils/ApiError");
const { sanitizeText } = require("../../utils/sanitize");
const { decodeCursor, encodeCursor } = require("../../utils/cursor");
const repo = require("./comments.repository");
const postsRepo = require("../posts/posts.repository");
const likesRepo = require("../likes/likes.repository");
const feedCache = require("../../cache/feedCache");

function toCommentView(comment, viewerId, likedByMe) {
  return {
    id: comment.id,
    postId: comment.postId,
    parentId: comment.parentId,
    text: comment.text,
    likesCount: comment.likesCount,
    repliesCount: comment._count?.replies ?? 0,
    createdAt: comment.createdAt,
    author: comment.author,
    likedByMe: Boolean(likedByMe),
    isOwner: comment.authorId === viewerId,
  };
}

async function assertPostVisible(viewerId, postId) {
  const post = await postsRepo.findOwnership(postId);
  if (!post || (post.visibility === "PRIVATE" && post.authorId !== viewerId)) {
    throw ApiError.notFound("Post not found");
  }
  return post;
}

async function buildPage(rows, viewerId, limit) {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const likedSet = await likesRepo.likedCommentIds(
    viewerId,
    items.map((c) => c.id)
  );
  const viewItems = items.map((c) =>
    toCommentView(c, viewerId, likedSet.has(c.id))
  );
  const nextCursor = hasMore ? encodeCursor(items[items.length - 1]) : null;
  return { items: viewItems, nextCursor };
}

async function createComment({ viewerId, postId, text, parentId }) {
  await assertPostVisible(viewerId, postId);
  if (parentId) {
    const parent = await repo.findOwnership(parentId);
    if (!parent || parent.postId !== postId) {
      throw ApiError.badRequest("Invalid parent comment", {
        code: "INVALID_PARENT",
      });
    }
    if (parent.parentId !== null) {
      throw ApiError.badRequest(
        "Replies can only be added to top-level comments",
        { code: "NESTED_REPLY" }
      );
    }
  }
  const clean = sanitizeText(text);
  if (!clean) throw ApiError.badRequest("Comment cannot be empty");

  const comment = await repo.create({
    postId,
    authorId: viewerId,
    parentId: parentId ?? null,
    text: clean,
  });
  await feedCache.invalidateForUser(viewerId);
  return toCommentView(comment, viewerId, false);
}

async function listComments({ viewerId, postId, cursorRaw, limit }) {
  await assertPostVisible(viewerId, postId);
  let cursor = null;
  if (cursorRaw) {
    cursor = decodeCursor(cursorRaw);
    if (!cursor) throw ApiError.badRequest("Invalid pagination cursor");
  }
  const rows = await repo.findTopLevel({ postId, cursor, take: limit + 1 });
  return buildPage(rows, viewerId, limit);
}

async function listReplies({ viewerId, commentId, cursorRaw, limit }) {
  const parent = await repo.findWithPostVisibility(commentId);
  if (
    !parent ||
    (parent.post.visibility === "PRIVATE" &&
      parent.post.authorId !== viewerId)
  ) {
    throw ApiError.notFound("Comment not found");
  }
  let cursor = null;
  if (cursorRaw) {
    cursor = decodeCursor(cursorRaw);
    if (!cursor) throw ApiError.badRequest("Invalid pagination cursor");
  }
  const rows = await repo.findReplies({
    parentId: commentId,
    cursor,
    take: limit + 1,
  });
  return buildPage(rows, viewerId, limit);
}

async function getComment({ viewerId, id }) {
  const comment = await repo.findById(id);
  if (!comment) throw ApiError.notFound("Comment not found");
  const post = await postsRepo.findOwnership(comment.postId);
  if (!post || (post.visibility === "PRIVATE" && post.authorId !== viewerId)) {
    throw ApiError.notFound("Comment not found");
  }
  const liked = await likesRepo.isLiked(viewerId, "COMMENT", id);
  return toCommentView(comment, viewerId, liked);
}

async function updateComment({ viewerId, resource, data }) {
  const clean = sanitizeText(data.text);
  if (!clean) throw ApiError.badRequest("Comment cannot be empty");
  const comment = await repo.update(resource.id, { text: clean });
  const liked = await likesRepo.isLiked(viewerId, "COMMENT", resource.id);
  return toCommentView(comment, viewerId, liked);
}

async function deleteComment({ viewerId, resource }) {
  const result = await repo.remove({
    id: resource.id,
    postId: resource.postId,
    parentId: resource.parentId,
  });
  await feedCache.invalidateForUser(viewerId);
  return { id: resource.id, ...result };
}

module.exports = {
  createComment,
  listComments,
  listReplies,
  getComment,
  updateComment,
  deleteComment,
};
