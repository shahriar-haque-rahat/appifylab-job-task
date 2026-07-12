"use strict";

const { env } = require("../config/env");
const { refreshTtlSeconds } = require("./tokens");

const ACCESS_COOKIE = "access_token";
const REFRESH_COOKIE = "refresh_token";
const CSRF_COOKIE = "csrf_token";
const REFRESH_PATH = "/api/auth";

function baseOptions() {
  return {
    secure: env.cookie.secure,
    sameSite: env.cookie.sameSite,
    ...(env.cookie.domain ? { domain: env.cookie.domain } : {}),
  };
}

function setAccessCookie(res, token) {
  res.cookie(ACCESS_COOKIE, token, {
    ...baseOptions(),
    httpOnly: true,
    path: "/",
    maxAge: env.ACCESS_TOKEN_TTL_SECONDS * 1000,
  });
}

function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE, token, {
    ...baseOptions(),
    httpOnly: true,
    path: REFRESH_PATH,
    maxAge: refreshTtlSeconds() * 1000,
  });
}

function setCsrfCookie(res, token) {
  res.cookie(CSRF_COOKIE, token, {
    ...baseOptions(),
    httpOnly: false, // must be readable by client JS for the double-submit pattern
    path: "/",
    maxAge: refreshTtlSeconds() * 1000,
  });
}

function clearAuthCookies(res) {
  const opts = baseOptions();
  res.clearCookie(ACCESS_COOKIE, { ...opts, httpOnly: true, path: "/" });
  res.clearCookie(REFRESH_COOKIE, { ...opts, httpOnly: true, path: REFRESH_PATH });
  res.clearCookie(CSRF_COOKIE, { ...opts, httpOnly: false, path: "/" });
}

module.exports = {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  CSRF_COOKIE,
  setAccessCookie,
  setRefreshCookie,
  setCsrfCookie,
  clearAuthCookies,
};
