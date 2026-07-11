"use strict";

/**
 * Comments repository. Replies are Comment rows with a non-null parentId
 * (one level deep — a reply's parent is always a top-level comment). Create and
 * delete keep the post's denormalized commentsCount in sync inside a transaction;
 * delete also removes the comment's (and its replies') orphan Like rows, since
 * Like has no FK to Comment (it's polymorphic).
 */

const { prisma } = require("../../config/prisma");
const { userSummarySelect } = require("../../utils/selects");

const commentSelect = {
  id: true,
  postId: true,
  parentId: true,
  authorId: true,
  text: true,
  likesCount: true,
  createdAt: true,
  author: { select: userSummarySelect },
  _count: { select: { replies: true } },
};

module.exports = {
  commentSelect,

  // Minimal shape for ownership checks / deletes.
  findOwnership(id) {
    return prisma.comment.findUnique({
      where: { id },
      select: { id: true, authorId: true, postId: true, parentId: true },
    });
  },

  // Comment + its post's visibility — used to gate reads/likes/replies.
  findWithPostVisibility(id) {
    return prisma.comment.findUnique({
      where: { id },
      select: {
        id: true,
        authorId: true,
        postId: true,
        parentId: true,
        post: { select: { authorId: true, visibility: true } },
      },
    });
  },

  findById(id) {
    return prisma.comment.findUnique({ where: { id }, select: commentSelect });
  },

  /** Create a comment/reply and bump the post's commentsCount atomically. */
  create({ postId, authorId, parentId, text }) {
    return prisma.$transaction(async (tx) => {
      const comment = await tx.comment.create({
        data: { postId, authorId, parentId: parentId ?? null, text },
        select: commentSelect,
      });
      await tx.post.update({
        where: { id: postId },
        data: { commentsCount: { increment: 1 } },
      });
      return comment;
    });
  },

  update(id, data) {
    return prisma.comment.update({ where: { id }, data, select: commentSelect });
  },

  /**
   * Delete a comment (and, for a top-level comment, its cascade-deleted replies),
   * clean up orphan Like rows, and decrement the post's commentsCount by the
   * exact number of comment rows removed. All atomic.
   */
  remove({ id, postId, parentId }) {
    return prisma.$transaction(async (tx) => {
      let removedCount = 1;
      if (parentId === null) {
        // Top-level comment: gather reply ids for like cleanup, then delete the
        // replies explicitly so the decrement uses the ACTUAL number of rows
        // removed (deleteMany.count) — not a pre-cascade snapshot that could drift
        // if a reply is created concurrently.
        const replies = await tx.comment.findMany({
          where: { parentId: id },
          select: { id: true },
        });
        const replyIds = replies.map((r) => r.id);
        await tx.like.deleteMany({
          where: { targetType: "COMMENT", targetId: { in: [id, ...replyIds] } },
        });
        const deletedReplies = await tx.comment.deleteMany({
          where: { parentId: id },
        });
        await tx.comment.delete({ where: { id } });
        removedCount = 1 + deletedReplies.count;
      } else {
        await tx.like.deleteMany({
          where: { targetType: "COMMENT", targetId: id },
        });
        await tx.comment.delete({ where: { id } });
      }
      await tx.post.update({
        where: { id: postId },
        data: { commentsCount: { decrement: removedCount } },
      });
      return { removedCount };
    });
  },

  findTopLevel({ postId, cursor, take }) {
    const where = cursor
      ? {
          postId,
          parentId: null,
          OR: [
            { createdAt: { lt: cursor.createdAt } },
            { AND: [{ createdAt: cursor.createdAt }, { id: { lt: cursor.id } }] },
          ],
        }
      : { postId, parentId: null };
    return prisma.comment.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take,
      select: commentSelect,
    });
  },

  findReplies({ parentId, cursor, take }) {
    const where = cursor
      ? {
          parentId,
          OR: [
            { createdAt: { lt: cursor.createdAt } },
            { AND: [{ createdAt: cursor.createdAt }, { id: { lt: cursor.id } }] },
          ],
        }
      : { parentId };
    return prisma.comment.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take,
      select: commentSelect,
    });
  },
};
