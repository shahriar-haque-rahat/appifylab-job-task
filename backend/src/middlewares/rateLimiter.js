"use strict";

const rateLimit = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const { redis } = require("../config/redis");
const { ApiError } = require("../utils/ApiError");
const { parseJti } = require("../utils/tokens");
const { REFRESH_COOKIE } = require("../utils/cookies");

const MINUTE = 60 * 1000;

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

// Google sign-in verifies a signed token server-side, so this is a light
// abuse guard rather than a credential-stuffing guard: per-IP, fairly generous
// (a shared network may have several users signing in).
const googleLimiter = createLimiter({
  prefix: "google",
  windowMs: 15 * MINUTE,
  max: 20,
  keyGenerator: (req) => ipKey(req),
  message: "Too many Google sign-in attempts. Try again in a few minutes.",
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
  googleLimiter,
  refreshLimiter,
  contentCreateLimiter,
  generalLimiter,
};
