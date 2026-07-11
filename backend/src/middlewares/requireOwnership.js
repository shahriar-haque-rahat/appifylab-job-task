"use strict";

/**
 * Ownership guard factory. Given a loader that resolves the target resource
 * (must expose `authorId`), it 404s if missing and 403s unless
 * `resource.authorId === req.user.id`. The loaded resource is cached on
 * `req.resource` so the controller need not re-fetch it.
 *
 * This runs BEFORE the controller on every edit/delete route — ownership is
 * enforced server-side, never trusted from the client.
 */

const { asyncHandler } = require("../utils/asyncHandler");
const { ApiError } = require("../utils/ApiError");

function requireOwnership(loadResource, { resourceName = "resource" } = {}) {
  return asyncHandler(async (req, res, next) => {
    const resource = await loadResource(req);
    if (!resource) {
      return next(ApiError.notFound(`${resourceName} not found`));
    }
    if (resource.authorId !== req.user.id) {
      return next(
        ApiError.forbidden(`You do not have permission to modify this ${resourceName}`)
      );
    }
    req.resource = resource;
    return next();
  });
}

module.exports = { requireOwnership };
