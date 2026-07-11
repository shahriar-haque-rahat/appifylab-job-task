// CSRF token store for the double-submit pattern.
//
// In a cross-SITE production deploy (frontend and backend on different domains)
// the csrf_token cookie the API sets is NOT readable from the frontend origin.
// So we deliver the token in the login/register/refresh response BODY, keep it
// here (memory + localStorage so it survives reloads), and echo it in the
// x-csrf-token header. The browser still sends the matching csrf_token cookie to
// the API (SameSite=None), so the backend's cookie-vs-header comparison passes.
//
// In same-site dev the cookie is also readable, so baseApi falls back to it.

const STORAGE_KEY = "bs_csrf";
let inMemory: string | null = null;

export function getStoredCsrf(): string | null {
  if (inMemory) return inMemory;
  if (typeof window !== "undefined") {
    inMemory = window.localStorage.getItem(STORAGE_KEY);
  }
  return inMemory;
}

export function setStoredCsrf(token: string | null): void {
  inMemory = token;
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(STORAGE_KEY, token);
  else window.localStorage.removeItem(STORAGE_KEY);
}
