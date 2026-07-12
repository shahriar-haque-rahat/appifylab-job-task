"use strict";

const { verifyAccessToken } = require("../utils/tokens");
const { ACCESS_COOKIE } = require("../utils/cookies");
const { ApiError } = require("../utils/ApiError");

function authenticate(req, res, next) {
  const token = req.cookies?.[ACCESS_COOKIE];
  if (!token) {
    return next(ApiError.unauthorized("Authentication required"));
  }
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub };
    return next();
  } catch {
    // Expired or tampered — client should hit /api/auth/refresh and retry.
    return next(
      ApiError.unauthorized("Session expired", { code: "TOKEN_EXPIRED" })
    );
  }
}

module.exports = { authenticate };
