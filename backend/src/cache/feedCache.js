"use strict";

const { redis } = require("../config/redis");
const { env } = require("../config/env");

const GEN_KEY = "feed:gen";
const key = (gen, viewerId) => `feed:first:v1:g${gen}:u:${viewerId}`;

async function currentGeneration() {
  const gen = await redis.get(GEN_KEY);
  return gen || "0";
}

async function getFirstPage(viewerId) {
  const gen = await currentGeneration();
  const raw = await redis.get(key(gen, viewerId));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function setFirstPage(viewerId, page) {
  const gen = await currentGeneration();
  await redis.set(
    key(gen, viewerId),
    JSON.stringify(page),
    "EX",
    env.FEED_CACHE_TTL_SECONDS
  );
}

async function invalidateForUser(viewerId) {
  const gen = await currentGeneration();
  await redis.del(key(gen, viewerId));
}

// Invalidate EVERY viewer's cached first page at once (old-gen keys expire on TTL).
async function bumpGeneration() {
  await redis.incr(GEN_KEY);
}

module.exports = {
  getFirstPage,
  setFirstPage,
  invalidateForUser,
  bumpGeneration,
};
