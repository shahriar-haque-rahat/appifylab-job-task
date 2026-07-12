"use strict";

const path = require("path");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const { env } = require("./config/env");
const { generalLimiter } = require("./middlewares/rateLimiter");
const { notFound } = require("./middlewares/notFound");
const { errorHandler } = require("./middlewares/errorHandler");
const { UPLOADS_DIR, ensureUploadsDir } = require("./config/cloudinary");
const apiRouter = require("./routes");

const app = express();

// Behind a proxy (Render/most PaaS) req.ip must come from X-Forwarded-For.
app.set("trust proxy", env.TRUST_PROXY);
app.disable("x-powered-by");

app.use(
  helmet({
    // Seed images are served from this API and loaded cross-origin by the
    // frontend <img> tags, so allow cross-origin resource loads.
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "x-csrf-token"],
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));
app.use(cookieParser());

// Seed images (option (b): served locally, not uploaded to Cloudinary). See README.
app.use(
  "/seed-assets",
  express.static(path.join(__dirname, "..", "seed-assets"), {
    maxAge: "7d",
    immutable: true,
    fallthrough: true,
  })
);

// User-uploaded images when Cloudinary is not configured (local-disk fallback).
// The dir is created at startup so the static mount and the writer agree on it.
ensureUploadsDir();
app.use(
  "/uploads",
  express.static(UPLOADS_DIR, { maxAge: "7d", fallthrough: true })
);

// General per-IP rate limit across the whole API.
app.use("/api", generalLimiter, apiRouter);

app.use(notFound);
app.use(errorHandler);

module.exports = { app };
