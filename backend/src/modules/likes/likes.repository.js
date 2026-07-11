"use strict";

/**
 * Likes repository. Like/unlike mutate the row AND the denormalized counter
 * inside a single transaction, so counts never drift and never go negative.
 * `createMany({ skipDuplicates })` / `deleteMany` return an affected-row count,
 * which makes the operation idempotent and race-safe against the unique index
 * (userId, targetType, targetId) — no P2002 handling needed.
 */

const { prisma } = require("../../config/prisma");
const { userSummarySelect } = require("../../utils/selects");

function counterModel(tx, targetType) {
  return targetType === "POST" ? tx.post : tx.comment;
}

module.exports = {
  /** Set of post ids (from `ids`) that `userId` has liked. One query. */
  async likedPostIds(userId, ids) {
    if (!ids || ids.length === 0) return new Set();
    const rows = await prisma.like.findMany({
      where: { userId, targetType: "POST", targetId: { in: ids } },
      select: { targetId: true },
    });
    return new Set(rows.map((r) => r.targetId));
  },

  /** Set of comment ids (from `ids`) that `userId` has liked. One query. */
  async likedCommentIds(userId, ids) {
    if (!ids || ids.length === 0) return new Set();
    const rows = await prisma.like.findMany({
      where: { userId, targetType: "COMMENT", targetId: { in: ids } },
      select: { targetId: true },
    });
    return new Set(rows.map((r) => r.targetId));
  },

  async isLiked(userId, targetType, targetId) {
    const row = await prisma.like.findUnique({
      where: {
        userId_targetType_targetId: { userId, targetType, targetId },
      },
      select: { id: true },
    });
    return Boolean(row);
  },

  /** Idempotent like + atomic counter increment. Returns the fresh count. */
  like({ userId, targetType, targetId }) {
    return prisma.$transaction(async (tx) => {
      const { count } = await tx.like.createMany({
        data: [{ userId, targetType, targetId }],
        skipDuplicates: true,
      });
      const model = counterModel(tx, targetType);
      const target =
        count === 1
          ? await model.update({
              where: { id: targetId },
              data: { likesCount: { increment: 1 } },
              select: { likesCount: true },
            })
          : await model.findUnique({
              where: { id: targetId },
              select: { likesCount: true },
            });
      return { liked: true, changed: count === 1, likesCount: target?.likesCount ?? 0 };
    });
  },

  /** Idempotent unlike + atomic counter decrement. Returns the fresh count. */
  unlike({ userId, targetType, targetId }) {
    return prisma.$transaction(async (tx) => {
      const { count } = await tx.like.deleteMany({
        where: { userId, targetType, targetId },
      });
      const model = counterModel(tx, targetType);
      const target =
        count > 0
          ? await model.update({
              where: { id: targetId },
              data: { likesCount: { decrement: 1 } },
              select: { likesCount: true },
            })
          : await model.findUnique({
              where: { id: targetId },
              select: { likesCount: true },
            });
      return { liked: false, changed: count > 0, likesCount: target?.likesCount ?? 0 };
    });
  },

  /** Keyset-paginated list of users who liked a target (newest first). */
  findLikers({ targetType, targetId, cursor, take }) {
    const where = cursor
      ? {
          targetType,
          targetId,
          OR: [
            { createdAt: { lt: cursor.createdAt } },
            { AND: [{ createdAt: cursor.createdAt }, { id: { lt: cursor.id } }] },
          ],
        }
      : { targetType, targetId };

    return prisma.like.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take,
      select: { id: true, createdAt: true, user: { select: userSummarySelect } },
    });
  },
};
