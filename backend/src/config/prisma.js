"use strict";

/**
 * Prisma client singleton.
 * ONLY the repository layer imports this. Services depend on repositories, never
 * on Prisma directly (repository pattern) — this keeps query concerns in one place.
 */

const { PrismaClient } = require("@prisma/client");
const { env } = require("./env");

const prisma = new PrismaClient({
  log: env.isProd ? ["warn", "error"] : ["warn", "error"],
});

async function disconnectPrisma() {
  await prisma.$disconnect();
}

module.exports = { prisma, disconnectPrisma };
