export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

// Google OAuth 2.0 Client ID (from the Google Cloud console). When unset, the
// "Sign in with Google" button renders as a disabled hint instead of the live
// Google button. Must match the backend's GOOGLE_CLIENT_ID.
export const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
