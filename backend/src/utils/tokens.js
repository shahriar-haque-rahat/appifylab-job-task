"use strict";

/**
 * Token helpers.
 *  - Access token: short-lived signed JWT (HS256), subject = userId.
 *  - Refresh token: opaque random string of the form `<jti>.<secret>`. Only its
 *    SHA-256 hash is ever persisted (Redis + Postgres); the raw value lives only
 *    in the httpOnly cookie on the client.
 */

const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { env } = require("../config/env");

function signAccessToken(userId) {
  return jwt.sign({ sub: userId }, env.JWT_ACCESS_SECRET, {
    algorithm: "HS256",
    expiresIn: env.ACCESS_TOKEN_TTL,
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET, { algorithms: ["HS256"] });
}

function generateRefreshToken() {
  const jti = crypto.randomUUID();
  const secret = crypto.randomBytes(48).toString("hex");
  return { jti, token: `${jti}.${secret}` };
}

function parseJti(token) {
  if (typeof token !== "string") return null;
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const jti = token.slice(0, dot);
  return /^[0-9a-fA-F-]{36}$/.test(jti) ? jti : null;
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function refreshExpiryDate() {
  return new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
}

function refreshTtlSeconds() {
  return env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60;
}

function generateCsrfToken() {
  return crypto.randomBytes(24).toString("hex");
}

/** Constant-time string comparison. */
function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  parseJti,
  hashToken,
  refreshExpiryDate,
  refreshTtlSeconds,
  generateCsrfToken,
  safeEqual,
};
