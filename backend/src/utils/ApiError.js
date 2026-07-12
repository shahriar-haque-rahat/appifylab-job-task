"use strict";

class ApiError extends Error {
  constructor(statusCode, message, options = {}) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = options.code;
    this.details = options.details;
    this.expose = options.expose !== false;
    if (Error.captureStackTrace) Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = "Bad request", options) {
    return new ApiError(400, message, { code: "BAD_REQUEST", ...options });
  }
  static unauthorized(message = "Unauthorized", options) {
    return new ApiError(401, message, { code: "UNAUTHORIZED", ...options });
  }
  static forbidden(message = "Forbidden", options) {
    return new ApiError(403, message, { code: "FORBIDDEN", ...options });
  }
  static notFound(message = "Not found", options) {
    return new ApiError(404, message, { code: "NOT_FOUND", ...options });
  }
  static conflict(message = "Conflict", options) {
    return new ApiError(409, message, { code: "CONFLICT", ...options });
  }
  static tooManyRequests(message = "Too many requests", options) {
    return new ApiError(429, message, { code: "RATE_LIMITED", ...options });
  }
  static internal(message = "Internal server error", options) {
    return new ApiError(500, message, { code: "INTERNAL", expose: false, ...options });
  }
}

module.exports = { ApiError };
