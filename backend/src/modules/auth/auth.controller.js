"use strict";

const { asyncHandler } = require("../../utils/asyncHandler");
const service = require("./auth.service");
const {
  setAccessCookie,
  setRefreshCookie,
  setCsrfCookie,
  clearAuthCookies,
  REFRESH_COOKIE,
} = require("../../utils/cookies");

function applySession(res, session) {
  setAccessCookie(res, session.accessToken);
  setRefreshCookie(res, session.refreshToken);
  setCsrfCookie(res, session.csrfToken);
}

const register = asyncHandler(async (req, res) => {
  const { user, ...session } = await service.register(req.valid.body);
  applySession(res, session);
  // csrfToken also returned in the body so the SPA can use it immediately.
  res.status(201).json({ user, csrfToken: session.csrfToken });
});

const login = asyncHandler(async (req, res) => {
  const { user, ...session } = await service.login(req.valid.body);
  applySession(res, session);
  res.status(200).json({ user, csrfToken: session.csrfToken });
});

const google = asyncHandler(async (req, res) => {
  const { user, ...session } = await service.loginWithGoogle(
    req.valid.body.credential
  );
  applySession(res, session);
  res.status(200).json({ user, csrfToken: session.csrfToken });
});

const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  const { user, ...session } = await service.refresh(token);
  applySession(res, session);
  res.status(200).json({ user, csrfToken: session.csrfToken });
});

const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  await service.logout(token);
  clearAuthCookies(res);
  res.status(204).end();
});

module.exports = { register, login, google, refresh, logout };
