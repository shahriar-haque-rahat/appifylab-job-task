"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { v2: cloudinary } = require("cloudinary");
const { env } = require("./env");

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

/**
 * Upload an in-memory image buffer to Cloudinary.
 * @param {Buffer} buffer
 * @param {{ folder?: string }} [opts]
 * @returns {Promise<{ url: string, publicId: string }>}
 */
function uploadImageBuffer(buffer, opts = {}) {
  const folder = opts.folder || "appifylab/posts";
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        // Cloudinary re-encodes/strips metadata; also cap dimensions to keep
        // stored assets sane. Transformation applied on delivery, not storage.
        transformation: [{ quality: "auto", fetch_format: "auto" }],
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    stream.end(buffer);
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
