"use strict";

const { prisma } = require("../../config/prisma");
const { userPublicSelect, toPublicUser } = require("../../utils/selects");

module.exports = {
  userPublicSelect,
  toPublicUser,

  // --- Users ---
  // Full row (incl. passwordHash) — used only inside the service for verification.
  findUserByEmailWithHash(email) {
    return prisma.user.findUnique({ where: { email } });
  },
  findPublicUserById(id) {
    return prisma.user.findUnique({ where: { id }, select: userPublicSelect });
  },
  findPublicUserByEmail(email) {
    return prisma.user.findUnique({ where: { email }, select: userPublicSelect });
  },
  createUser(data) {
    return prisma.user.create({ data, select: userPublicSelect });
  },

  // --- Refresh tokens (Postgres backstop) ---
  createRefreshToken(data) {
    return prisma.refreshToken.create({ data });
  },
  findRefreshByJti(jti) {
    return prisma.refreshToken.findUnique({ where: { jti } });
  },
  revokeByJti(jti) {
    return prisma.refreshToken.updateMany({
      where: { jti, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },
  findActiveJtisByUser(userId) {
    return prisma.refreshToken.findMany({
      where: { userId, revokedAt: null },
      select: { jti: true },
    });
  },
  revokeAllByUser(userId) {
    return prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },
};
