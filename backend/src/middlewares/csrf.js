"use strict";

/**
 * Double-submit-cookie CSRF protection for cookie-authenticated, state-changing
 * requests. The client reads the (non-httpOnly) csrf_token cookie and echoes it
 * in the x-csrf-token header; a forged cross-site request cannot read that
 * cookie, so it cannot produce a matching header. Safe (read-only) methods and
 * the credential-based login/register endpoints are exempt (they aren't
 * authorized by an ambient cookie).
 */

const { CSRF_COOKIE } = require("../utils/cookies");
const { safeEqual } = require("../utils/tokens");
const { ApiError } = require("../utils/ApiError");

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function csrfProtection(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();

  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.get("x-csrf-token");

  if (!cookieToken || !headerToken || !safeEqual(cookieToken, headerToken)) {
    return next(
      ApiError.forbidden("CSRF token missing or invalid", { code: "CSRF_FAILED" })
    );
  }
  return next();
}

module.exports = { csrfProtection };
