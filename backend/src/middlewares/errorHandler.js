"use strict";

/**
 * Central error handler. Translates ApiError, Prisma errors, multer errors and
 * unexpected throwables into a consistent `{ error: { message, code, details } }`
 * JSON shape. Server errors (5xx) are logged; their messages are never leaked.
 */

const { Prisma } = require("@prisma/client");
const { ApiError } = require("../utils/ApiError");
const { env } = require("../config/env");

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let status = 500;
  let code = "INTERNAL";
  let message = "Internal server error";
  let details;

  if (err instanceof ApiError) {
    status = err.statusCode;
    code = err.code || code;
    message = err.expose ? err.message : "Internal server error";
    details = err.details;
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      status = 409;
      code = "CONFLICT";
      message = "A record with these details already exists";
    } else if (err.code === "P2025") {
      status = 404;
      code = "NOT_FOUND";
      message = "Not found";
    } else {
      status = 400;
      code = "DB_ERROR";
      message = "Database request could not be completed";
    }
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    status = 400;
    code = "DB_VALIDATION";
    message = "Invalid database request";
  } else if (err && err.name === "MulterError") {
    status = 400;
    code = "UPLOAD_ERROR";
    message =
      err.code === "LIMIT_FILE_SIZE"
        ? "Image exceeds the maximum allowed size"
        : "File upload error";
  } else if (err && err.type === "entity.too.large") {
    status = 413;
    code = "PAYLOAD_TOO_LARGE";
    message = "Request payload too large";
  }

  if (status >= 500) {
    // eslint-disable-next-line no-console
    console.error("[error]", err);
  }

  const body = { error: { message, code } };
  if (details) body.error.details = details;
  if (!env.isProd && status >= 500 && err && err.stack) {
    body.error.stack = err.stack;
  }

  res.status(status).json(body);
}

module.exports = { errorHandler };
