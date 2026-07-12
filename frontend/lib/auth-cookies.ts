const AUTH_HINT = "bs_auth";
const WEEK = 60 * 60 * 24 * 7;

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(
    new RegExp("(?:^|;\\s*)" + name + "=([^;]+)")
  );
  return match ? decodeURIComponent(match[1]) : undefined;
}

export function getCsrfToken(): string | undefined {
  return readCookie("csrf_token");
}

export function hasAuthHint(): boolean {
  return readCookie(AUTH_HINT) === "1";
}

export function setAuthHint(): void {
  if (typeof document === "undefined") return;
  const secure = location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${AUTH_HINT}=1; path=/; max-age=${WEEK}; samesite=lax${secure}`;
}

export function clearAuthHint(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${AUTH_HINT}=; path=/; max-age=0; samesite=lax`;
}
