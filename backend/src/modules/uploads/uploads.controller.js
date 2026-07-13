"use strict";

const { asyncHandler } = require("../../utils/asyncHandler");
const { ApiError } = require("../../utils/ApiError");
const { env } = require("../../config/env");
const {
  uploadImageBuffer,
  uploadImageBufferLocal,
} = require("../../config/cloudinary");

const SAFE_FAILURE_CODES = new Set([
  "EACCES",
  "EDQUOT",
  "ENOSPC",
  "ETIMEDOUT",
  "ECONNRESET",
  "UPLOAD_TIMEOUT",
  "UPLOAD_INVALID_RESPONSE",
]);

function safeUploadDiagnostic(provider, error) {
  const rawStatus = Number(error && (error.http_code || error.statusCode));
  const providerStatus =
    Number.isInteger(rawStatus) && rawStatus >= 400 && rawStatus <= 599
      ? rawStatus
      : undefined;
  const rawCode = error && typeof error.code === "string" ? error.code : "";
  const reason = SAFE_FAILURE_CODES.has(rawCode)
    ? rawCode
    : providerStatus
      ? "PROVIDER_REJECTED"
      : "UNKNOWN";

  return { provider, reason, ...(providerStatus ? { providerStatus } : {}) };
}

function createUploadImageHandler(dependencies = {}) {
  const storage = dependencies.storage ?? env.uploadStorage;
  const cloudUpload = dependencies.cloudUpload ?? uploadImageBuffer;
  const localUpload = dependencies.localUpload ?? uploadImageBufferLocal;
  const logger = dependencies.logger ?? console;

  return async (req, res) => {
    if (!req.file) {
      logger.log("========== FILE ==========");
      logger.log({
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        bufferLength: req.file.buffer.length,
      });
      logger.log("==========================");

      throw ApiError.badRequest("No image file provided", { code: "NO_FILE" });
    }

    logger.log({
      mimetype: req.file.mimetype,
      size: req.file.size,
      originalname: req.file.originalname,
    });

    try {
      let url;

      if (storage === "cloudinary") {
        try {
          ({ url } = await cloudUpload(req.file.buffer, {
            folder: "appifylab/posts",
          }));
        } catch (error) {
          logger.warn(
            "[upload] Cloudinary upload failed. Falling back to local storage.",
            safeUploadDiagnostic("cloudinary", error)
          );

          ({ url } = await localUpload(
            req.file.buffer,
            req.file.mimetype
          ));
        }
      } else {
        ({ url } = await localUpload(
          req.file.buffer,
          req.file.mimetype
        ));
      }

      res.status(201).json({ url });

    } catch (error) {
      logger.error(
        "[upload] Image persistence failed",
        safeUploadDiagnostic(
          storage === "cloudinary" ? "local-fallback" : "local",
          error
        )
      );

      throw new ApiError(
        500,
        "Image upload could not be completed. Please try again.",
        { code: "UPLOAD_FAILED" }
      );
    }
  };
}

const uploadImage = asyncHandler(createUploadImageHandler());

module.exports = { uploadImage, createUploadImageHandler, safeUploadDiagnostic };
