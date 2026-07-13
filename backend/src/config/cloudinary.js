"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { v2: cloudinary } = require("cloudinary");
const { env } = require("./env");
const logger = require("../utils/logger");

// Local disk fallback: when Cloudinary is not configured, uploaded images are
// written here and served statically from the API at `/uploads/*` (see app.js).
// This keeps the "create post with image" feature working end-to-end without any
// external account. NOTE: local disk is ephemeral on PaaS hosts (Render/Railway),
// so configure Cloudinary before a real deploy for durable storage.
const UPLOADS_DIR = path.join(__dirname, "..", "..", "uploads");

const MIME_EXT = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function ensureUploadsDir() {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

if (env.cloudinaryConfigured) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}
logger.log({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret_length: env.CLOUDINARY_API_SECRET?.length,
  uploadStorage: env.uploadStorage,
  cloudinaryConfigured: env.cloudinaryConfigured,
});

/**
 * Upload an in-memory image buffer to Cloudinary.
 * @param {Buffer} buffer
 * @param {{ folder?: string, timeoutMs?: number }} [opts]
 * @returns {Promise<{ url: string, publicId: string }>}
 */
function uploadImageBuffer(buffer, opts = {}) {
  const folder = opts.folder || "appifylab/posts";
  return new Promise((resolve, reject) => {
    let stream;
    let timer;
    let settled = false;

    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      if (error) reject(error);
      else resolve(value);
    };

    try {
      stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: "image",
          // Store the validated original. Browser-dependent f_auto/q_auto are
          // delivery transformations and are added to rendered URLs instead.
        },
        (error, result) => {
          if (error) {
            logger.error("====== CLOUDINARY UPLOAD ERROR ======");
            logger.error(error);
            logger.error("=====================================");
            return finish(error);
          }

          if (!result || !result.secure_url || !result.public_id) {
            const invalidResponse = new Error(
              "Cloud image provider returned an invalid response"
            );
            invalidResponse.code = "UPLOAD_INVALID_RESPONSE";
            return finish(invalidResponse);
          }

          finish(null, {
            url: result.secure_url,
            publicId: result.public_id,
          });
        }
      );

      if (stream && typeof stream.once === "function") {
        stream.once("error", finish);
      }

      const timeoutMs = opts.timeoutMs ?? env.UPLOAD_TIMEOUT_MS;
      timer = setTimeout(() => {
        const timeoutError = new Error("Cloud image upload timed out");
        timeoutError.code = "UPLOAD_TIMEOUT";
        finish(timeoutError);
        if (stream && typeof stream.destroy === "function") stream.destroy();
      }, timeoutMs);

      logger.log("Uploading buffer:", {
        length: buffer.length,
        firstBytes: buffer.subarray(0, 16).toString("hex"),
      });

      stream.end(buffer);
    } catch (error) {
      finish(error);
    }
  });
}

/**
 * Persist an in-memory image buffer to the local uploads dir and return a URL
 * served by our own API. Used when Cloudinary is not configured. The filename is
 * a random UUID (unguessable) with an extension derived from the validated mime.
 * @param {Buffer} buffer
 * @param {string} mimetype
 * @returns {Promise<{ url: string, publicId: string }>}
 */
async function uploadImageBufferLocal(buffer, mimetype) {
  ensureUploadsDir();
  const ext = MIME_EXT[mimetype] || "jpg";
  const filename = `${crypto.randomUUID()}.${ext}`;
  await fs.promises.writeFile(path.join(UPLOADS_DIR, filename), buffer);
  return {
    url: `${env.PUBLIC_BACKEND_URL}/uploads/${filename}`,
    publicId: filename,
  };
}

module.exports = {
  cloudinary,
  uploadImageBuffer,
  uploadImageBufferLocal,
  ensureUploadsDir,
  UPLOADS_DIR,
};
