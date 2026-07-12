"use client";

import { useEffect, useState } from "react";
import { useGetMeQuery } from "./api/authApi";
import { useAppDispatch } from "./hooks";
import { sessionExpired } from "./authSlice";
import { hasAuthHint } from "@/lib/auth-cookies";

export function AuthBootstrap() {
  const dispatch = useAppDispatch();
  // Lazy initializer runs once on mount — no setState-in-effect needed.
  const [hasHint] = useState(() => hasAuthHint());

  useGetMeQuery(undefined, { skip: !hasHint });

  useEffect(() => {
    if (!hasHint) dispatch(sessionExpired());
  }, [hasHint, dispatch]);

  return null;
}
