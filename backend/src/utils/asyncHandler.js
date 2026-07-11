"use strict";

/**
 * Wraps an async route handler so any thrown error / rejected promise is
 * forwarded to Express's error pipeline. (Express 5 forwards rejections from
 * async handlers on its own, but wrapping keeps intent explicit and portable.)
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { asyncHandler };
