"use strict";

/**
 * Posts repository — all post queries live here, including the visibility filter,
 * which is applied INSIDE the query (`visibility = 'PUBLIC' OR authorId = viewer`),
 * never as a post-fetch filter in JS. This is the single source of the feed's
 * privacy rule.
 */

const { prisma } = require("../../config/prisma");
const { userSummarySelect } = require("../../utils/selects");

const postSelect = {
  id: true,
  authorId: true,
  text: true,
  imageUrl: true,
  visibility: true,
  likesCount: true,
  commentsCount: true,
  createdAt: true,
  author: { select: userSummarySelect },
};

// The privacy rule, in one place.
const visibilityWhere = (viewerId) => ({
  OR: [{ visibility: "PUBLIC" }, { authorId: viewerId }],
});

module.exports = {
  postSelect,
  visibilityWhere,

  create(data) {
    return prisma.post.create({ data, select: postSelect });
  },

  findById(id) {
    return prisma.post.findUnique({ where: { id }, select: postSelect });
  },

  // Minimal shape for ownership checks / deletes.
  findOwnership(id) {
    return prisma.post.findUnique({
      where: { id },
      select: { id: true, authorId: true, imageUrl: true, text: true, visibility: true },
    });
  },

  update(id, data) {
    return prisma.post.update({ where: { id }, data, select: postSelect });
  },

  // Deletes the post (cascade-removes its comments) and cleans up the polymorphic
  // Like rows for the post AND its comments — Like has no FK to Post/Comment, so
  // those would otherwise be orphaned.
  remove(id) {
    return prisma.$transaction(async (tx) => {
      const comments = await tx.comment.findMany({
        where: { postId: id },
        select: { id: true },
      });
      const commentIds = comments.map((c) => c.id);
      await tx.like.deleteMany({
        where: {
          OR: [
            { targetType: "POST", targetId: id },
            ...(commentIds.length
              ? [{ targetType: "COMMENT", targetId: { in: commentIds } }]
              : []),
          ],
        },
      });
      await tx.post.delete({ where: { id } });
    });
  },

  /**
   * Combined, visibility-filtered feed page. Keyset pagination ordered
   * (createdAt DESC, id DESC). `take` should be pageSize + 1 to detect a next page.
   * @param {{ viewerId: string, cursor: {createdAt: Date, id: string}|null, take: number }} args
   */
  findFeedPage({ viewerId, cursor, take }) {
    const where = cursor
      ? {
          AND: [
            visibilityWhere(viewerId),
            {
              OR: [
                { createdAt: { lt: cursor.createdAt } },
                {
                  AND: [{ createdAt: cursor.createdAt }, { id: { lt: cursor.id } }],
                },
              ],
            },
          ],
        }
      : visibilityWhere(viewerId);

    return prisma.post.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take,
      select: postSelect,
    });
  },
};
