"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useGoogleLoginMutation } from "@/store/api/authApi";
import { GOOGLE_CLIENT_ID } from "@/lib/config";
import { setAuthHint } from "@/lib/auth-cookies";
import { showToast } from "@/lib/toast";

const GSI_SRC = "https://accounts.google.com/gsi/client";

// Minimal shape of the Google Identity Services API we use.
interface GoogleIdApi {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string;
        callback: (resp: { credential?: string }) => void;
      }) => void;
      renderButton: (
        el: HTMLElement,
        options: Record<string, unknown>
      ) => void;
    };
  };
}
declare global {
  interface Window {
    google?: GoogleIdApi;
  }
}

let gsiPromise: Promise<void> | null = null;
function loadGsi(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.google?.accounts?.id) return Promise.resolve();
  if (gsiPromise) return gsiPromise;
  gsiPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GSI_SRC}"]`
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("gsi load error")));
      return;
    }
    const s = document.createElement("script");
    s.src = GSI_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("gsi load error"));
    document.head.appendChild(s);
  });
  return gsiPromise;
}

export function GoogleSignInButton({
  label,
  text = "signin_with",
  next,
}: {
  label: string;
  /** Google button copy: "signin_with" (login) | "signup_with" (register). */
  text?: "signin_with" | "signup_with" | "continue_with";
  next?: string;
}) {
  const router = useRouter();
  const [googleLogin] = useGoogleLoginMutation();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  const onCredential = useCallback(
    async (resp: { credential?: string }) => {
      if (!resp.credential) return;
      try {
        await googleLogin({ credential: resp.credential }).unwrap();
        setAuthHint();
        router.replace(next && next.startsWith("/") ? next : "/feed");
      } catch {
        showToast("Google sign-in failed. Please try again.");
      }
    },
    [googleLogin, router, next]
  );

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let cancelled = false;

    const render = () => {
      const g = window.google;
      const el = targetRef.current;
      if (!g || !el) return;
      const w = wrapperRef.current?.offsetWidth ?? 0;
      const width = Math.min(400, Math.max(240, Math.round(w) || 320));
      el.innerHTML = "";
      g.accounts.id.renderButton(el, {
        type: "standard",
        theme: "outline",
        size: "large",
        shape: "rectangular",
        text,
        logo_alignment: "center",
        width,
      });
    };

    loadGsi()
      .then(() => {
        if (cancelled || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: onCredential,
        });
        render();
        setReady(true);
      })
      .catch(() => {
        /* leave the fallback button visible */
      });

    // Re-render the Google button on width changes (render() no-ops until GSI is
    // loaded, so it's safe to call before `ready`).
    const ro =
      typeof ResizeObserver !== "undefined" && wrapperRef.current
        ? new ResizeObserver(() => render())
        : null;
    if (ro && wrapperRef.current) ro.observe(wrapperRef.current);

    return () => {
      cancelled = true;
      ro?.disconnect();
    };
  }, [onCredential, text]);

  const configured = Boolean(GOOGLE_CLIENT_ID);

  return (
    <div ref={wrapperRef} className="mb-5">
      {/* Google renders its official button here once GSI is ready. */}
      <div
        ref={targetRef}
        className={`${ready ? "flex justify-center" : "hidden"}`}
      />

      {!ready ? (
        <button
          type="button"
          className="_social_login_content_btn w-full"
          disabled={!configured}
          title={
            configured
              ? "Loading Google sign-in…"
              : "Set NEXT_PUBLIC_GOOGLE_CLIENT_ID to enable Google sign-in"
          }
        >
          <img src="/images/google.svg" alt="" className="_google_img" />{" "}
          <span>{label}</span>
        </button>
      ) : null}
    </div>
  );
}
