"use strict";

/**
 * Auth service — orchestrates registration, login, refresh-token rotation and
 * logout. Depends on the auth repository (Postgres) and token store (Redis);
 * never touches Prisma or Redis directly beyond those.
 *
 * Refresh flow (rotation + reuse detection):
 *  - On login/register a session is issued: an opaque refresh token whose hash
 *    is stored in Redis (source of truth, TTL) and Postgres (backstop, audit).
 *  - On refresh the presented token is validated against Redis first, Postgres
 *    second (durability). The old token is ALWAYS revoked and a new one issued.
 *  - If a token that was ALREADY rotated (revoked in Postgres) is replayed, that
 *    is treated as theft: ALL of the user's sessions are revoked immediately.
 */

const bcrypt = require("bcrypt");
const { env } = require("../../config/env");
const { ApiError } = require("../../utils/ApiError");
const {
  signAccessToken,
  generateRefreshToken,
  generateCsrfToken,
  hashToken,
  parseJti,
  refreshExpiryDate,
  refreshTtlSeconds,
  safeEqual,
} = require("../../utils/tokens");
const repo = require("./auth.repository");
const tokenStore = require("./auth.tokenStore");

// Precomputed dummy hash so login timing is comparable whether or not the email
// exists (mitigates user-enumeration via timing).
const DUMMY_HASH = bcrypt.hashSync("dummy-password-placeholder", env.BCRYPT_COST);

/**
 * Create access + refresh + csrf tokens for a user and persist the refresh token
 * to Redis (source of truth) and Postgres (backstop).
 */
async function issueSession(userId) {
  const accessToken = signAccessToken(userId);
  const { jti, token: refreshToken } = generateRefreshToken();
  const csrfToken = generateCsrfToken();
  const tokenHash = hashToken(refreshToken);

  await tokenStore.set(jti, userId, tokenHash, refreshTtlSeconds());
  await repo.createRefreshToken({
    jti,
    userId,
    tokenHash,
    expiresAt: refreshExpiryDate(),
  });

  return { accessToken, refreshToken, csrfToken };
}

async function revokeSession(jti) {
  if (!jti) return;
  await tokenStore.del(jti);
  await repo.revokeByJti(jti);
}

async function revokeAllSessions(userId) {
  const active = await repo.findActiveJtisByUser(userId);
  await tokenStore.delMany(active.map((r) => r.jti));
  await repo.revokeAllByUser(userId);
}

async function register({ firstName, lastName, email, password }) {
  const existing = await repo.findUserByEmailWithHash(email);
  if (existing) {
    throw ApiError.conflict("An account with this email already exists", {
      code: "EMAIL_TAKEN",
    });
  }
  const passwordHash = await bcrypt.hash(password, env.BCRYPT_COST);
  const user = await repo.createUser({ firstName, lastName, email, passwordHash });
  const session = await issueSession(user.id);
  return { user, ...session };
}

async function login({ email, password }) {
  const account = await repo.findUserByEmailWithHash(email);
  // Always run a bcrypt comparison to keep timing uniform.
  const hashToCompare = account ? account.passwordHash : DUMMY_HASH;
  const ok = await bcrypt.compare(password, hashToCompare);
  if (!account || !ok) {
    throw ApiError.unauthorized("Invalid email or password", {
      code: "INVALID_CREDENTIALS",
    });
  }
  const user = repo.toPublicUser(account);
  const session = await issueSession(user.id);
  return { user, ...session };
}

/**
 * Validate + rotate a refresh token. Returns a fresh session and the user.
 * @param {string|undefined} presentedToken raw refresh token from the cookie
 */
async function refresh(presentedToken) {
  const jti = parseJti(presentedToken);
  if (!presentedToken || !jti) {
    throw ApiError.unauthorized("Invalid session", { code: "NO_REFRESH_TOKEN" });
  }
  const presentedHash = hashToken(presentedToken);

  let userId = null;

  const redisEntry = await tokenStore.get(jti);
  if (redisEntry && safeEqual(redisEntry.hash, presentedHash)) {
    // Fast path: valid per Redis (source of truth).
    userId = redisEntry.userId;
  } else {
    // Redis miss/mismatch — consult Postgres backstop.
    const row = await repo.findRefreshByJti(jti);
    if (!row || !safeEqual(row.tokenHash, presentedHash)) {
      throw ApiError.unauthorized("Invalid session", {
        code: "REFRESH_INVALID",
      });
    }
    if (row.revokedAt) {
      // A previously-rotated token is being replayed => probable theft.
      await revokeAllSessions(row.userId);
      throw ApiError.unauthorized(
        "Session revoked for security reasons, please log in again",
        { code: "SESSION_REUSE_DETECTED" }
      );
    }
    if (row.expiresAt.getTime() <= Date.now()) {
      await revokeSession(jti);
      throw ApiError.unauthorized("Session expired, please log in again", {
        code: "REFRESH_EXPIRED",
      });
    }
    // Valid via durability backstop (Redis was cold).
    userId = row.userId;
  }

  // Rotate: revoke the presented token, issue a brand-new session.
  await revokeSession(jti);
  const session = await issueSession(userId);
  const user = await repo.findPublicUserById(userId);
  if (!user) {
    // User was deleted between issuing and refreshing.
    await revokeAllSessions(userId);
    throw ApiError.unauthorized("Account no longer exists", {
      code: "ACCOUNT_GONE",
    });
  }
  return { user, ...session };
}

async function logout(presentedToken) {
  const jti = parseJti(presentedToken);
  if (jti) await revokeSession(jti);
}

module.exports = { register, login, refresh, logout, revokeAllSessions };
