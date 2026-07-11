import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from "@reduxjs/toolkit/query/react";
import { API_URL } from "@/lib/config";
import { getCsrfToken, clearAuthHint } from "@/lib/auth-cookies";
import { getStoredCsrf, setStoredCsrf } from "@/lib/csrf-store";

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_URL,
  credentials: "include", // send/receive the httpOnly auth cookies
  prepareHeaders: (headers) => {
    // Double-submit CSRF. Prefer the token delivered via the auth response body
    // (works cross-site); fall back to the readable cookie (same-site dev).
    const csrf = getStoredCsrf() || getCsrfToken();
    if (csrf) headers.set("x-csrf-token", csrf);
    return headers;
  },
});

// Single-flight refresh: if several requests 401 at once, only ONE hits
// /auth/refresh; the rest await the same result, then all retry.
let refreshPromise: Promise<boolean> | null = null;

const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  const url = typeof args === "string" ? args : args.url;
  const isAuthCall = url.startsWith("/auth/");

  if (result.error?.status === 401 && !isAuthCall) {
    if (!refreshPromise) {
      refreshPromise = (async () => {
        const refresh = await rawBaseQuery(
          { url: "/auth/refresh", method: "POST" },
          api,
          extraOptions
        );
        // Rotation issues a NEW csrf token; keep the stored one in sync.
        if (!refresh.error && refresh.data) {
          const token = (refresh.data as { csrfToken?: string }).csrfToken;
          if (token) setStoredCsrf(token);
        }
        return !refresh.error;
      })();
      refreshPromise.finally(() => {
        refreshPromise = null;
      });
    }

    const refreshed = await refreshPromise;
    if (refreshed) {
      result = await rawBaseQuery(args, api, extraOptions);
    } else {
      // Session is truly gone — clear the hint and reset auth state.
      clearAuthHint();
      api.dispatch({ type: "auth/sessionExpired" });
    }
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Post", "Comment", "CurrentUser", "Likers"],
  endpoints: () => ({}),
});
