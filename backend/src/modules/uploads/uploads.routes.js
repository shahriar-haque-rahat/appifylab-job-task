"use strict";

const express = require("express");
const multer = require("multer");
const { env } = require("../../config/env");
const { ApiError } = require("../../utils/ApiError");
const { authenticate } = require("../../middlewares/authenticate");
const { csrfProtection } = require("../../middlewares/csrf");
const { contentCreateLimiter } = require("../../middlewares/rateLimiter");
const ctrl = require("./uploads.controller");

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_IMAGE_BYTES, files: 1 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) return cb(null, true);
    cb(
      ApiError.badRequest("Unsupported image type. Use JPEG, PNG, WEBP or GIF.", {
        code: "UNSUPPORTED_TYPE",
      })
    );
  },
});

const parseSingleImage = upload.single("image");

function parseImageUpload(req, res, next) {
  parseSingleImage(req, res, (error) => {
    if (!error) return next();
    if (error instanceof ApiError || error instanceof multer.MulterError) {
      return next(error);
    }

    // Multer/busboy can surface malformed multipart bodies as plain Errors.
    // Normalize them rather than exposing an unrelated generic 500 response.
    return next(
      ApiError.badRequest("Invalid image upload request", {
        code: "INVALID_UPLOAD",
      })
    );
  });
}

const router = express.Router();

router.post(
  "/image",
  authenticate,
  csrfProtection,
  contentCreateLimiter,
  parseImageUpload,
  ctrl.uploadImage
);

module.exports = router;
