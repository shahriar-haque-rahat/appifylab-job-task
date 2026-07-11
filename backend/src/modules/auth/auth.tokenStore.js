"use strict";

/**
 * Redis-backed refresh-token store — the SOURCE OF TRUTH for hot-path refresh
 * validation. Each active refresh token is stored as `rt:<jti> -> "<userId>:<hash>"`
 * with a TTL equal to the token lifetime, so expiry is automatic. The Postgres
 * refresh_tokens table is the durability/audit backstop (survives a Redis flush
 * and records revocations for reuse detection).
 */

const { redis } = require("../../config/redis");

const key = (jti) => `rt:${jti}`;

async function set(jti, userId, hash, ttlSeconds) {
  await redis.set(key(jti), `${userId}:${hash}`, "EX", ttlSeconds);
}

async function get(jti) {
  const value = await redis.get(key(jti));
  if (!value) return null;
  const sep = value.indexOf(":");
  if (sep < 0) return null;
  return { userId: value.slice(0, sep), hash: value.slice(sep + 1) };
}

async function del(jti) {
  await redis.del(key(jti));
}

async function delMany(jtis) {
  if (jtis && jtis.length) {
    await redis.del(...jtis.map(key));
  }
}

module.exports = { set, get, del, delMany };
