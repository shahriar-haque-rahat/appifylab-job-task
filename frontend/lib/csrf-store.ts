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
