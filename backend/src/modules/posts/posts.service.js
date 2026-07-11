"use strict";

const { env } = require("../../config/env");
const { ApiError } = require("../../utils/ApiError");
const { sanitizeText } = require("../../utils/sanitize");
const { encodeCursor, decodeCursor } = require("../../utils/cursor");
const repo = require("./posts.repository");
const likesRepo = require("../likes/likes.repository");
const feedCache = require("../../cache/feedCache");

function toPostView(post, viewerId, likedByMe) {
  return {
    id: post.id,
    text: post.text,
    imageUrl: post.imageUrl,
    visibility: post.visibility,
    likesCount: post.likesCount,
    commentsCount: post.commentsCount,
    createdAt: post.createdAt,
    author: post.author,
    likedByMe: Boolean(likedByMe),
    isOwner: post.authorId === viewerId,
  };
}

/**
 * A user-submitted imageUrl must be a URL we produced (Cloudinary, our cloud).
 * This blocks embedding arbitrary/SSRF URLs via the create/update body. Seed
 * images bypass this because they are written server-side, not via this path.
 */
function assertValidImageUrl(imageUrl) {
  if (imageUrl == null) return;
  if (!env.cloudinaryConfigured) {
    throw ApiError.badRequest("Image uploads are not enabled on this server", {
      code: "UPLOADS_DISABLED",
    });
  }
  const prefix = `https://res.cloudinary.com/${env.CLOUDINARY_CLOUD_NAME}/`;
  if (!imageUrl.startsWith(prefix)) {
    throw ApiError.badRequest("Image URL is not from an allowed source", {
      code: "INVALID_IMAGE_URL",
    });
  }
}

async function createPost({ authorId, text, imageUrl, visibility }) {
  assertValidImageUrl(imageUrl);
  const cleanText = sanitizeText(text || "");
  if (!cleanText && !imageUrl) {
    throw ApiError.badRequest("A post must have text or an image");
  }
  const post = await repo.create({
    authorId,
    text: cleanText,
    imageUrl: imageUrl || null,
    visibility,
  });
  await feedCache.invalidateForUser(authorId);
  return toPostView(post, authorId, false);
}

async function getFeedPage({ viewerId, cursorRaw, limit }) {
  // First page (no cursor) is served from the per-viewer cache when warm.
  if (!cursorRaw) {
    const cached = await feedCache.getFirstPage(viewerId);
    if (cached) return cached;
  }

  let cursor = null;
  if (cursorRaw) {
    cursor = decodeCursor(cursorRaw);
    if (!cursor) throw ApiError.badRequest("Invalid pagination cursor");
  }

  const rows = await repo.findFeedPage({ viewerId, cursor, take: limit + 1 });
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;

  const likedSet = await likesRepo.likedPostIds(
    viewerId,
    items.map((p) => p.id)
  );

  const viewItems = items.map((p) => toPostView(p, viewerId, likedSet.has(p.id)));
  const nextCursor = hasMore
    ? encodeCursor(items[items.length - 1])
    : null;

  const page = { items: viewItems, nextCursor };
  if (!cursorRaw) await feedCache.setFirstPage(viewerId, page);
  return page;
}

async function getPostById({ viewerId, id }) {
  const post = await repo.findById(id);
  // 404 (not 403) for a private post the viewer can't see — don't reveal existence.
  if (!post || (post.visibility === "PRIVATE" && post.authorId !== viewerId)) {
    throw ApiError.notFound("Post not found");
  }
  const liked = await likesRepo.isLiked(viewerId, "POST", id);
  return toPostView(post, viewerId, liked);
}

async function updatePost({ viewerId, resource, data }) {
  const update = {};
  if (data.text !== undefined) update.text = sanitizeText(data.text);
  if (data.visibility !== undefined) update.visibility = data.visibility;
  if (data.imageUrl !== undefined) {
    if (data.imageUrl === null) {
      update.imageUrl = null;
    } else {
      assertValidImageUrl(data.imageUrl);
      update.imageUrl = data.imageUrl;
    }
  }

  const resultingText = update.text !== undefined ? update.text : resource.text;
  const resultingImage =
    update.imageUrl !== undefined ? update.imageUrl : resource.imageUrl;
  if (!resultingText && !resultingImage) {
    throw ApiError.badRequest("A post must have text or an image");
  }

  const post = await repo.update(resource.id, update);
  await feedCache.invalidateForUser(viewerId);
  // A PUBLIC -> PRIVATE downgrade must not linger in other viewers' cached feed.
  if (resource.visibility === "PUBLIC" && update.visibility === "PRIVATE") {
    await feedCache.bumpGeneration();
  }
  const liked = await likesRepo.isLiked(viewerId, "POST", resource.id);
  return toPostView(post, viewerId, liked);
}

async function deletePost({ viewerId, resource }) {
  await repo.remove(resource.id);
  await feedCache.invalidateForUser(viewerId);
  return { id: resource.id };
}

module.exports = {
  createPost,
  getFeedPage,
  getPostById,
  updatePost,
  deletePost,
};
