"use strict";

const { asyncHandler } = require("../../utils/asyncHandler");
const { ApiError } = require("../../utils/ApiError");
const { env } = require("../../config/env");
const {
  uploadImageBuffer,
  uploadImageBufferLocal,
} = require("../../config/cloudinary");

const uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw ApiError.badRequest("No image file provided", { code: "NO_FILE" });
  }
  // Prefer Cloudinary when configured (durable, CDN-delivered); otherwise fall
  // back to local disk so the feature still works with zero external setup.
  const { url } = env.cloudinaryConfigured
    ? await uploadImageBuffer(req.file.buffer, { folder: "appifylab/posts" })
    : await uploadImageBufferLocal(req.file.buffer, req.file.mimetype);
  res.status(201).json({ url });
});

module.exports = { uploadImage };
