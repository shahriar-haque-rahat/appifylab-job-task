"use strict";

/**
 * Cloudinary configuration + a small server-side upload helper.
 *
 * Uploads are performed server-side (the client sends the raw file to our API;
 * we stream it to Cloudinary). This keeps the API secret on the server and lets
 * us validate mime/size before anything leaves our infrastructure — the client
 * never talks to Cloudinary directly and never supplies a final image URL.
 *
 * If Cloudinary env vars are absent the whole app still runs; only live image
 * uploads are disabled (the upload route returns 503). Seed images are served
 * locally and do not require Cloudinary (see prisma/seed.js and README).
 */

const { v2: cloudinary } = require("cloudinary");
const { env } = require("./env");

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

module.exports = { cloudinary, uploadImageBuffer };
