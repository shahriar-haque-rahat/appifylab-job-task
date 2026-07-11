"use strict";

/**
 * Per-viewer cache of the FIRST feed page (the hot path — most reads are the
 * newest page, refreshed repeatedly). Cached per viewer because the feed is
 * visibility-filtered (`PUBLIC OR own`), so a shared cache can't serve it
 * without risking a private-post leak.
 *
 * Consistency model (documented in README): short TTL => a user's own new
 * post/comment/like busts their own cache for immediacy; other users' new public
 * posts appear within FEED_CACHE_TTL_SECONDS ("eventually consistent feed").
 *
 * PRIVACY-CRITICAL exception: when a post goes PUBLIC -> PRIVATE (or is removed
 * from public visibility), waiting out the TTL would leak now-private content
 * from OTHER viewers' cached pages. For that we bump a GLOBAL generation counter
 * that is part of every cache key, immediately invalidating all first-page
 * caches. Downgrades are rare, so cache effectiveness is preserved for the common
 * case (new posts / likes / comments).
 */

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
