"use strict";

/**
 * Reusable zod fragments shared across module validation schemas.
 */

const { z } = require("zod");

const zUuid = z.string().uuid("Invalid id");

// Route params `:id`
const idParams = { params: z.object({ id: zUuid }) };

// Cursor pagination query: ?cursor=<uuid>&limit=<n>
function paginationQuery(defaultLimit = 10, maxLimit = 50) {
  return z.object({
    cursor: zUuid.optional(),
    limit: z.coerce.number().int().min(1).max(maxLimit).default(defaultLimit),
  });
}

module.exports = { zUuid, idParams, paginationQuery };
