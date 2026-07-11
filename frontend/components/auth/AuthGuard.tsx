"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/store/hooks";
import { selectAuthStatus, selectAuthInitialized } from "@/store/authSlice";
import { FullScreenLoader } from "@/components/ui/Spinner";

/**
 * Client-side gate for protected pages. Waits for the session check to resolve,
 * then redirects unauthenticated users to /login. Belt-and-suspenders with the
 * server-side middleware redirect.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const status = useAppSelector(selectAuthStatus);
  const initialized = useAppSelector(selectAuthInitialized);

  useEffect(() => {
    if (initialized && status === "unauthenticated") {
      router.replace("/login");
    }
  }, [initialized, status, router]);

  if (!initialized || status !== "authenticated") {
    return <FullScreenLoader />;
  }
  return <>{children}</>;
}
