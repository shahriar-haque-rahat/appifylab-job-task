"use strict";

const { z } = require("zod");
const { zUuid, idParams } = require("../../utils/schemas");

const text = z
  .string()
  .trim()
  .min(1, "Comment cannot be empty")
  .max(2000, "Comment is too long");

const createCommentSchema = {
  body: z.object({
    postId: zUuid,
    text,
    parentId: zUuid.optional(), // present => reply to a top-level comment
  }),
};

const updateCommentSchema = {
  params: idParams.params,
  body: z.object({ text }),
};

const listCommentsSchema = {
  query: z.object({
    postId: zUuid,
    cursor: z.string().max(400).optional(),
    limit: z.coerce.number().int().min(1).max(50).default(10),
  }),
};

const repliesSchema = {
  params: idParams.params,
  query: z.object({
    cursor: z.string().max(400).optional(),
    limit: z.coerce.number().int().min(1).max(50).default(10),
  }),
};

module.exports = {
  createCommentSchema,
  updateCommentSchema,
  listCommentsSchema,
  repliesSchema,
};
