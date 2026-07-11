import { createSlice } from "@reduxjs/toolkit";
import type { CurrentUser } from "@/lib/types";
import { authApi } from "./api/authApi";

type AuthStatus = "idle" | "authenticated" | "unauthenticated";

interface AuthState {
  user: CurrentUser | null;
  status: AuthStatus;
  initialized: boolean; // has the initial session check resolved?
}

const initialState: AuthState = {
  user: null,
  status: "idle",
  initialized: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    // Dispatched by the base query when a refresh attempt fails.
    sessionExpired(state) {
      state.user = null;
      state.status = "unauthenticated";
      state.initialized = true;
    },
  },
  extraReducers: (builder) => {
    builder
      .addMatcher(authApi.endpoints.getMe.matchFulfilled, (state, action) => {
        state.user = action.payload.user;
        state.status = "authenticated";
        state.initialized = true;
      })
      .addMatcher(authApi.endpoints.getMe.matchRejected, (state) => {
        state.user = null;
        state.status = "unauthenticated";
        state.initialized = true;
      })
      .addMatcher(authApi.endpoints.login.matchFulfilled, (state, action) => {
        state.user = action.payload.user;
        state.status = "authenticated";
        state.initialized = true;
      })
      .addMatcher(authApi.endpoints.register.matchFulfilled, (state, action) => {
        state.user = action.payload.user;
        state.status = "authenticated";
        state.initialized = true;
      })
      .addMatcher(authApi.endpoints.logout.matchFulfilled, (state) => {
        state.user = null;
        state.status = "unauthenticated";
        state.initialized = true;
      });
  },
});

export const { sessionExpired } = authSlice.actions;
export default authSlice.reducer;

export const selectAuthUser = (s: { auth: AuthState }) => s.auth.user;
export const selectAuthStatus = (s: { auth: AuthState }) => s.auth.status;
export const selectAuthInitialized = (s: { auth: AuthState }) =>
  s.auth.initialized;
