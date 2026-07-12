import { baseApi } from "./baseApi";
import type { CurrentUser } from "@/lib/types";
import { setAuthHint, clearAuthHint } from "@/lib/auth-cookies";
import { setStoredCsrf } from "@/lib/csrf-store";

interface AuthResponse {
  user: CurrentUser;
  csrfToken: string;
}
interface RegisterBody {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}
interface LoginBody {
  email: string;
  password: string;
}

export const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    register: build.mutation<AuthResponse, RegisterBody>({
      query: (body) => ({ url: "/auth/register", method: "POST", body }),
      async onQueryStarted(_arg, { queryFulfilled, dispatch }) {
        try {
          const { data } = await queryFulfilled;
          // Drop any previous user's cached (possibly private) data, then arm
          // the session for this user.
          dispatch(baseApi.util.resetApiState());
          setStoredCsrf(data.csrfToken);
          setAuthHint();
        } catch {
          /* handled by the caller */
        }
      },
    }),
    login: build.mutation<AuthResponse, LoginBody>({
      query: (body) => ({ url: "/auth/login", method: "POST", body }),
      async onQueryStarted(_arg, { queryFulfilled, dispatch }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(baseApi.util.resetApiState());
          setStoredCsrf(data.csrfToken);
          setAuthHint();
        } catch {
          /* handled by the caller */
        }
      },
    }),
    // Google sign-in: exchange the Google ID token for OUR session. Same
    // post-login bookkeeping as email/password (reset caches, store csrf, arm the
    // route-protection hint) so it integrates with the existing auth flow.
    googleLogin: build.mutation<AuthResponse, { credential: string }>({
      query: (body) => ({ url: "/auth/google", method: "POST", body }),
      async onQueryStarted(_arg, { queryFulfilled, dispatch }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(baseApi.util.resetApiState());
          setStoredCsrf(data.csrfToken);
          setAuthHint();
        } catch {
          /* handled by the caller */
        }
      },
    }),
    logout: build.mutation<void, void>({
      query: () => ({ url: "/auth/logout", method: "POST" }),
      async onQueryStarted(_arg, { queryFulfilled, dispatch }) {
        try {
          await queryFulfilled;
        } finally {
          clearAuthHint();
          setStoredCsrf(null);
          // Drop all cached (potentially private) data on logout.
          dispatch(baseApi.util.resetApiState());
        }
      },
    }),
    getMe: build.query<{ user: CurrentUser }, void>({
      query: () => ({ url: "/users/me" }),
      providesTags: ["CurrentUser"],
    }),
  }),
});

export const {
  useRegisterMutation,
  useLoginMutation,
  useGoogleLoginMutation,
  useLogoutMutation,
  useGetMeQuery,
} = authApi;
