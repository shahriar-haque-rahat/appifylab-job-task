"use strict";

/**
 * Zod validation middleware. Validates body/query/params against the supplied
 * schemas and exposes the PARSED (whitelisted) values on `req.valid`. Because
 * zod object schemas strip unknown keys, any client-supplied fields we don't
 * explicitly accept (e.g. id, authorId, likesCount) are dropped here — this is
 * the first line of the "server-generated only" guarantee.
 */

const { z } = require("zod");
const { ApiError } = require("../utils/ApiError");

function validate(schemas = {}) {
  return (req, res, next) => {
    try {
      const valid = {};
      if (schemas.params) valid.params = schemas.params.parse(req.params ?? {});
      if (schemas.query) valid.query = schemas.query.parse(req.query ?? {});
      if (schemas.body) valid.body = schemas.body.parse(req.body ?? {});
      req.valid = valid;
      // req.body is a plain writable property (unlike req.query in Express 5).
      if (valid.body !== undefined) req.body = valid.body;
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        return next(
          ApiError.badRequest("Validation failed", {
            code: "VALIDATION_ERROR",
            details: err.issues.map((i) => ({
              path: i.path.join("."),
              message: i.message,
            })),
          })
        );
      }
      next(err);
    }
  };
}

module.exports = { validate };
