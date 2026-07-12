"use strict";

const express = require("express");
const ctrl = require("./auth.controller");
const { validate } = require("../../middlewares/validate");
const { registerSchema, loginSchema, googleSchema } = require("./auth.validation");
const {
  registerLimiter,
  loginLimiter,
  googleLimiter,
  refreshLimiter,
} = require("../../middlewares/rateLimiter");
const { csrfProtection } = require("../../middlewares/csrf");

const router = express.Router();

// Login/register/google are authenticated by body credentials (not an ambient
// cookie), so they are exempt from CSRF; they issue the csrf cookie for later
// requests.
router.post("/register", registerLimiter, validate(registerSchema), ctrl.register);
router.post("/login", loginLimiter, validate(loginSchema), ctrl.login);
router.post("/google", googleLimiter, validate(googleSchema), ctrl.google);

// refresh/logout act on the cookie session -> CSRF-protected.
router.post("/refresh", refreshLimiter, csrfProtection, ctrl.refresh);
router.post("/logout", csrfProtection, ctrl.logout);

module.exports = router;
