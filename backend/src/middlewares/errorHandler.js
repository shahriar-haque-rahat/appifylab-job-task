"use strict";

const { Prisma } = require("@prisma/client");
const { ApiError } = require("../utils/ApiError");
const { env } = require("../config/env");
const logger = require("../utils/logger");

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
    const tooLarge = err.code === "LIMIT_FILE_SIZE";
    status = tooLarge ? 413 : 400;
    code = tooLarge ? "IMAGE_TOO_LARGE" : "INVALID_UPLOAD";
    message = tooLarge
      ? "Image exceeds the maximum allowed size"
      : err.code === "LIMIT_UNEXPECTED_FILE"
        ? "Upload exactly one image using the image field"
        : "Invalid image upload request";
  } else if (err && err.type === "entity.too.large") {
    status = 413;
    code = "PAYLOAD_TOO_LARGE";
    message = "Request payload too large";
  }

  if (status >= 500) {
    // eslint-disable-next-line no-console
    logger.error("[error]", err);
  }

  const body = { error: { message, code } };
  if (details) body.error.details = details;
  if (!env.isProd && status >= 500 && err && err.stack) {
    body.error.stack = err.stack;
  }

  res.status(status).json(body);
}

module.exports = { errorHandler };
