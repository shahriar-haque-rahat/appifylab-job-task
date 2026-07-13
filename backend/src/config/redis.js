"use strict";

const Redis = require("ioredis");
const { env } = require("./env");
const logger = require("../utils/logger");

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
  logger.error("[redis] connection error:", err.message);
});

let announced = false;
redis.on("ready", () => {
  if (!announced) {
    announced = true;
    // eslint-disable-next-line no-console
    logger.log("[redis] connected");
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
