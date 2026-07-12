"use strict";

const { z } = require("zod");

const email = z.string().trim().toLowerCase().email("A valid email is required").max(254);
const strongPassword = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long");
const name = z
  .string()
  .trim()
  .min(1, "Required")
  .max(60, "Too long")
  .regex(/^[\p{L}][\p{L} .'-]*$/u, "Contains invalid characters");

// Objects strip unknown keys by default — so client-supplied fields we don't
// list (id, role, createdAt, …) are silently dropped, never persisted.
const registerSchema = {
  body: z.object({
    firstName: name,
    lastName: name,
    email,
    password: strongPassword,
  }),
};

const loginSchema = {
  body: z.object({
    email,
    // Presence only — never reveal the password policy on the login path.
    password: z.string().min(1, "Password is required").max(128),
  }),
};

// The `credential` is the Google ID token (a JWT) returned by Google Identity
// Services. Bounded length; fully verified (signature + audience) in the service.
const googleSchema = {
  body: z.object({
    credential: z
      .string()
      .min(1, "A Google credential is required")
      .max(4096, "Invalid Google credential"),
  }),
};

module.exports = { registerSchema, loginSchema, googleSchema };
