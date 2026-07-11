"use strict";

const { asyncHandler } = require("../../utils/asyncHandler");
const { ApiError } = require("../../utils/ApiError");
const { env } = require("../../config/env");
const { uploadImageBuffer } = require("../../config/cloudinary");

const uploadImage = asyncHandler(async (req, res) => {
  if (!env.cloudinaryConfigured) {
    throw new ApiError(503, "Image uploads are not configured on this server", {
      code: "UPLOADS_DISABLED",
    });
  }
  if (!req.file) {
    throw ApiError.badRequest("No image file provided", { code: "NO_FILE" });
  }
  const { url } = await uploadImageBuffer(req.file.buffer, {
    folder: "appifylab/posts",
  });
  res.status(201).json({ url });
});

module.exports = { uploadImage };
