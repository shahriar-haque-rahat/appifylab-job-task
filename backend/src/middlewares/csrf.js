"use strict";

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
