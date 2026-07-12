"use strict";

const { PrismaClient } = require("@prisma/client");
const { env } = require("./env");

const prisma = new PrismaClient({
  log: env.isProd ? ["warn", "error"] : ["warn", "error"],
});

async function disconnectPrisma() {
  await prisma.$disconnect();
}

module.exports = { prisma, disconnectPrisma };
