import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge route protection (server-side redirect). Next 16 renamed the
 * `middleware` convention to `proxy`. Uses the frontend-domain `bs_auth` hint
 * cookie — the real security boundary is the API, which enforces auth on every
 * request. <AuthGuard> additionally verifies the live session client-side, so a
 * forged hint still shows no protected data.
 */
const AUTH_PAGES = new Set(["/login", "/register"]);

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isAuthed = req.cookies.get("bs_auth")?.value === "1";
  const isProtected = pathname === "/feed" || pathname.startsWith("/feed/");

  if (isProtected && !isAuthed) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  if (AUTH_PAGES.has(pathname) && isAuthed) {
    const url = req.nextUrl.clone();
    url.pathname = "/feed";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/feed", "/feed/:path*", "/login", "/register"],
};
