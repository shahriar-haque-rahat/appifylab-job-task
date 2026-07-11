"use strict";

/**
 * Shared Prisma `select` shapes and mappers for user data, so every module
 * returns a consistent, safe user projection.
 *  - userPublicSelect  : the viewer's own profile (includes email).
 *  - userSummarySelect : author info embedded in posts/comments/likes — NO email,
 *                        so other users' emails never leak into the feed.
 */

const userPublicSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  avatarUrl: true,
  createdAt: true,
};

const userSummarySelect = {
  id: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
};

function toPublicUser(user) {
  if (!user) return null;
  // Strip anything sensitive/internal if a full row was passed in.
  const { passwordHash, updatedAt, ...pub } = user;
  return pub;
}

module.exports = { userPublicSelect, userSummarySelect, toPublicUser };
