"use strict";

/**
 * Centralised, zod-validated environment configuration.
 * Loaded once at process start; the app fails fast with a readable error if any
 * required variable is missing or malformed. Nothing else in the codebase reads
 * process.env directly — everything imports from here.
 */

require("dotenv").config();
const { z } = require("zod");

const isProd = process.env.NODE_ENV === "production";

const schema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    PORT: z.coerce.number().int().positive().default(8000),

    // --- Datastores ---
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    // Unpooled connection used for Prisma migrations on Neon. Locally it can equal DATABASE_URL.
    DATABASE_URL: z.string().min(1).optional(),
    REDIS_URL: z.string().min(1, "REDIS_URL is required"),

    // --- Auth / crypto ---
    JWT_ACCESS_SECRET: z
      .string()
      .min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
    ACCESS_TOKEN_TTL: z.string().default("15m"), // jsonwebtoken expiresIn syntax
    ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
    BCRYPT_COST: z.coerce.number().int().min(10).max(15).default(12),

    // --- CORS / cookies ---
    CORS_ORIGIN: z.string().default("http://localhost:3000"),
    COOKIE_DOMAIN: z.string().optional(),
    COOKIE_SAMESITE: z.enum(["lax", "strict", "none"]).optional(),
    COOKIE_SECURE: z
      .enum(["true", "false"])
      .optional()
      .transform((v) => (v == null ? undefined : v === "true")),
    TRUST_PROXY: z.coerce.number().int().min(0).default(isProd ? 1 : 0),

    // --- Cloudinary (optional group — live image uploads disabled if absent) ---
    CLOUDINARY_CLOUD_NAME: z.string().optional(),
    CLOUDINARY_API_KEY: z.string().optional(),
    CLOUDINARY_API_SECRET: z.string().optional(),

    // --- Misc ---
    PUBLIC_BACKEND_URL: z.string().optional(), // used to build seed static image URLs
    FEED_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(30),
    FEED_PAGE_SIZE: z.coerce.number().int().min(1).max(50).default(10),
    MAX_IMAGE_BYTES: z.coerce.number().int().positive().default(5 * 1024 * 1024),
  })
  .transform((env) => {
    const cloudinaryConfigured = Boolean(
      env.CLOUDINARY_CLOUD_NAME &&
        env.CLOUDINARY_API_KEY &&
        env.CLOUDINARY_API_SECRET
    );
    // Cross-domain cookie defaults: prod deploys frontend/backend on different
    // sites, so cookies must be SameSite=None; Secure. Dev is same-site localhost -> lax.
    const sameSite = env.COOKIE_SAMESITE ?? (isProd ? "none" : "lax");
    const secure = env.COOKIE_SECURE ?? (isProd ? true : sameSite === "none");
    return {
      ...env,
      isProd,
      DATABASE_URL: env.DATABASE_URL ?? env.DATABASE_URL,
      PUBLIC_BACKEND_URL:
        env.PUBLIC_BACKEND_URL ?? `http://localhost:${env.PORT}`,
      cloudinaryConfigured,
      cookie: {
        sameSite,
        secure,
        domain: env.COOKIE_DOMAIN,
      },
    };
  });

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("\n");
  // eslint-disable-next-line no-console
  console.error(`\n[env] Invalid environment configuration:\n${issues}\n`);
  process.exit(1);
}

const env = Object.freeze(parsed.data);

module.exports = { env };
