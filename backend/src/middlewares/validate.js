"use strict";

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
