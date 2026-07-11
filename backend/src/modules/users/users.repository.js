"use strict";

const { prisma } = require("../../config/prisma");
const { userPublicSelect, userSummarySelect } = require("../../utils/selects");

module.exports = {
  // Own profile (includes email).
  findPublicById(id) {
    return prisma.user.findUnique({ where: { id }, select: userPublicSelect });
  },
  // Another user's public profile (no email).
  findSummaryById(id) {
    return prisma.user.findUnique({ where: { id }, select: userSummarySelect });
  },
};
