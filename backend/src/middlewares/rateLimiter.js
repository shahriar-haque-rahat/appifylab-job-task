"use strict";

/**
 * Redis-backed rate limiters (express-rate-limit + rate-limit-redis), so limits
 * are shared across instances and survive restarts. Limits mirror the security
 * checklist:
 *   login    5 / 15min  per IP+email
 *   register 10 / 1hr   per IP
 *   refresh  20 / 15min per refresh-token (falls back to IP)
 *   content  20 / 1min  per user (post/comment creation)
 *   general  100 / 1min per IP (all /api)
 */

const rateLimit = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const { redis } = require("../config/redis");
const { ApiError } = require("../utils/ApiError");
const { parseJti } = require("../utils/tokens");
const { REFRESH_COOKIE } = require("../utils/cookies");

const MINUTE = 60 * 1000;

/**
 * IPv6-safe IP key. (express-rate-limit's `ipKeyGenerator` helper is not exported
 * by the installed CJS build, so we normalize here.) IPv6 addresses are
 * aggregated to their /64 network so a client can't trivially bypass a per-IP
 * limit by rotating addresses within its own subnet.
 */
function ipKey(req) {
  const ip = req.ip || req.socket?.remoteAddress || "unknown";
  if (ip.includes(":")) {
    return `${ip.split(":").slice(0, 4).join(":")}::/64`;
  }
  return ip;
}

function createLimiter({ windowMs, max, prefix, keyGenerator, message }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator,
    store: new RedisStore({
      // ioredis: forward raw commands to the shared connection.
      sendCommand: (...args) => redis.call(...args),
      prefix: `rl:${prefix}:`,
    }),
    handler: (req, res, next) =>
      next(
        ApiError.tooManyRequests(message || "Too many requests, please slow down")
      ),
  });
}

const loginLimiter = createLimiter({
  prefix: "login",
  windowMs: 15 * MINUTE,
  max: 5,
  keyGenerator: (req) => {
    const email = String(req.body?.email || "").trim().toLowerCase();
    return `${ipKey(req)}:${email}`;
  },
  message: "Too many login attempts. Try again in a few minutes.",
});

const registerLimiter = createLimiter({
  prefix: "register",
  windowMs: 60 * MINUTE,
  max: 10,
  keyGenerator: (req) => ipKey(req),
  message: "Too many accounts created from this network. Try again later.",
});

const refreshLimiter = createLimiter({
  prefix: "refresh",
  windowMs: 15 * MINUTE,
  max: 20,
  keyGenerator: (req) => {
    const jti = parseJti(req.cookies?.[REFRESH_COOKIE]);
    return jti ? `jti:${jti}` : ipKey(req);
  },
});

// Applied after `authenticate`, so req.user is present.
const contentCreateLimiter = createLimiter({
  prefix: "content",
  windowMs: 1 * MINUTE,
  max: 20,
  keyGenerator: (req) =>
    req.user?.id ? `u:${req.user.id}` : ipKey(req),
  message: "You're posting too fast. Please wait a moment.",
});

const generalLimiter = createLimiter({
  prefix: "general",
  windowMs: 1 * MINUTE,
  max: 100,
  keyGenerator: (req) => ipKey(req),
});

module.exports = {
  createLimiter,
  loginLimiter,
  registerLimiter,
  refreshLimiter,
  contentCreateLimiter,
  generalLimiter,
};
