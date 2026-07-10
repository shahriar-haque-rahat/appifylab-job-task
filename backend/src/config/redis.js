"use strict";

/**
 * Redis client (ioredis). Used for:
 *  - refresh-token source-of-truth (hot-path validation)  [auth module]
 *  - rate limiting (rate-limit-redis store)               [rateLimiter middleware]
 *  - public feed page caching                             [cache/feedCache]
 *
 * A single shared connection is used app-wide. Upstash (hosted) and local Redis
 * (Docker) are both plain redis:// URLs, so no code changes between environments.
 */

const Redis = require("ioredis");
const { env } = require("./env");

const redis = new Redis(env.REDIS_URL, {
  // Fail fast rather than buffering commands forever if Redis is unreachable.
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false,
  // Upstash and most managed Redis over TLS use rediss://; ioredis picks that up
  // from the URL scheme automatically.
});

redis.on("error", (err) => {
  // eslint-disable-next-line no-console
  console.error("[redis] connection error:", err.message);
});

let announced = false;
redis.on("ready", () => {
  if (!announced) {
    announced = true;
    // eslint-disable-next-line no-console
    console.log("[redis] connected");
  }
});

async function disconnectRedis() {
  try {
    await redis.quit();
  } catch {
    redis.disconnect();
  }
}

module.exports = { redis, disconnectRedis };
