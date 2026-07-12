"use strict";

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
