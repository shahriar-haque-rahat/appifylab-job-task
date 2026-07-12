"use strict";

const crypto = require("crypto");
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

// Lazily constructed Google OAuth verifier. Kept lazy so the app boots fine when
// Google sign-in is not configured (and even if the optional dependency is
// absent) — it's only touched when a Google credential actually arrives.
let googleClient = null;
function getGoogleClient() {
  if (!env.GOOGLE_CLIENT_ID) return null;
  if (googleClient) return googleClient;
  // eslint-disable-next-line global-require
  const { OAuth2Client } = require("google-auth-library");
  googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);
  return googleClient;
}

async function loginWithGoogle(credential) {
  const client = getGoogleClient();
  if (!client) {
    throw ApiError.badRequest("Google sign-in is not configured on this server", {
      code: "GOOGLE_NOT_CONFIGURED",
    });
  }

  let payload;
  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch {
    throw ApiError.unauthorized("Could not verify your Google sign-in", {
      code: "GOOGLE_INVALID",
    });
  }

  if (!payload || !payload.email || payload.email_verified === false) {
    throw ApiError.unauthorized("Your Google email is not verified", {
      code: "GOOGLE_EMAIL_UNVERIFIED",
    });
  }

  const email = String(payload.email).trim().toLowerCase();
  let user = await repo.findPublicUserByEmail(email);

  if (!user) {
    const fromName = (payload.name || "").trim();
    const firstName =
      (payload.given_name || fromName.split(" ")[0] || "User").slice(0, 60);
    const lastName = (
      payload.family_name ||
      fromName.split(" ").slice(1).join(" ") ||
      ""
    ).slice(0, 60);
    // No usable password: hash a random secret so password login is impossible
    // for a Google-provisioned account (keeps the non-null column satisfied).
    const passwordHash = await bcrypt.hash(
      crypto.randomBytes(32).toString("hex"),
      env.BCRYPT_COST
    );
    user = await repo.createUser({
      firstName,
      lastName,
      email,
      passwordHash,
      avatarUrl: payload.picture || null,
    });
  }

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

module.exports = {
  register,
  login,
  loginWithGoogle,
  refresh,
  logout,
  revokeAllSessions,
};
