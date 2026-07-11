"use strict";

const { z } = require("zod");
const { zUuid } = require("../../utils/schemas");

// Public API uses lowercase target types; mapped to the Prisma enum in the service.
const targetParams = z.object({
  targetType: z.enum(["post", "comment"]),
  targetId: zUuid,
});

const likeParams = { params: targetParams };

const likersSchema = {
  params: targetParams,
  query: z.object({
    cursor: z.string().max(400).optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  }),
};

module.exports = { likeParams, likersSchema };
