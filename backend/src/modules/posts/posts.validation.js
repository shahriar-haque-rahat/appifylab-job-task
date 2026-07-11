"use strict";

const { z } = require("zod");
const { idParams } = require("../../utils/schemas");

const visibility = z.enum(["PUBLIC", "PRIVATE"]);
const text = z.string().trim().max(5000, "Post is too long");
// Only http(s) URLs; the service further restricts image URLs to our Cloudinary cloud.
const imageUrl = z.string().url("Invalid image URL").max(2048);

const createPostSchema = {
  body: z
    .object({
      text: text.optional().default(""),
      visibility: visibility.default("PUBLIC"),
      imageUrl: imageUrl.optional(),
    })
    .refine((d) => (d.text && d.text.length > 0) || d.imageUrl, {
      message: "A post must have text or an image",
      path: ["text"],
    }),
};

const updatePostSchema = {
  params: idParams.params,
  body: z
    .object({
      text: text.optional(),
      visibility: visibility.optional(),
      imageUrl: imageUrl.nullable().optional(), // null => remove image
    })
    .refine((d) => Object.keys(d).length > 0, {
      message: "Provide at least one field to update",
    }),
};

const listPostsSchema = {
  query: z.object({
    cursor: z.string().max(400).optional(),
    limit: z.coerce.number().int().min(1).max(50).default(10),
  }),
};

module.exports = { createPostSchema, updatePostSchema, listPostsSchema };
