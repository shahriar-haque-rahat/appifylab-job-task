"use strict";

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
