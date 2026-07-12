"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLoginMutation } from "@/store/api/authApi";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { getErrorMessage, getFieldErrors } from "@/lib/apiError";
import { setAuthHint } from "@/lib/auth-cookies";

export default function LoginPage() {
  const router = useRouter();
  const [login, { isLoading }] = useLoginMutation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [next] = useState(() =>
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("next") ?? undefined
      : undefined
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    // Client-side checks for instant inline feedback (server re-validates too).
    const clientErrors: Record<string, string> = {};
    if (!email.trim()) clientErrors.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      clientErrors.email = "Enter a valid email address.";
    if (!password) clientErrors.password = "Password is required.";
    if (Object.keys(clientErrors).length) {
      setFieldErrors(clientErrors);
      return;
    }

    try {
      await login({ email, password }).unwrap();
      // Ensure the route-protection hint cookie exists BEFORE we navigate, so the
      // proxy doesn't bounce us straight back to /login.
      setAuthHint();
      const next =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("next")
          : null;
      router.replace(next && next.startsWith("/") ? next : "/feed");
    } catch (err) {
      setFieldErrors(getFieldErrors(err));
      setError(getErrorMessage(err, "Unable to sign in. Check your credentials."));
    }
  }

  return (
    <section className="_social_login_wrapper _layout_main_wrapper flex min-h-screen flex-col justify-center py-8!">
      <div className="_shape_one">
        <img src="/images/shape1.svg" alt="" className="_shape_img" />
        <img src="/images/dark_shape.svg" alt="" className="_dark_shape" />
      </div>
      <div className="_shape_two">
        <img src="/images/shape2.svg" alt="" className="_shape_img" />
        <img
          src="/images/dark_shape1.svg"
          alt=""
          className="_dark_shape _dark_shape_opacity"
        />
      </div>
      <div className="_shape_three">
        <img src="/images/shape3.svg" alt="" className="_shape_img" />
        <img
          src="/images/dark_shape2.svg"
          alt=""
          className="_dark_shape _dark_shape_opacity"
        />
      </div>
      <div className="_social_login_wrap">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-xl-8 col-lg-8 col-md-12 col-sm-12">
              <div className="_social_login_left">
                <div className="_social_login_left_image">
                  <img src="/images/login.png" alt="Login" className="_left_img" />
                </div>
              </div>
            </div>
            <div className="col-xl-4 col-lg-4 col-md-12 col-sm-12">
              <div className="_social_login_content">
                <div className="_social_login_left_logo _mar_b28">
                  <img src="/images/logo.svg" alt="Buddy Script" className="_left_logo" />
                </div>
                <p className="_social_login_content_para _mar_b8">Welcome back</p>
                <h4 className="_social_login_content_title _titl4 _mar_b50 mb-6!">
                  Login to your account
                </h4>
                <GoogleSignInButton
                  label="Or sign-in with google"
                  text="signin_with"
                  next={next}
                />
                <div className="_social_login_content_bottom_txt _mar_b40 mb-5!">
                  {" "}
                  <span>Or</span>
                </div>
                <form className="_social_login_form" onSubmit={onSubmit} noValidate>
                  <div className="row">
                    <div className="col-xl-12 col-lg-12 col-md-12 col-sm-12">
                      <Field
                        label="Email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        error={fieldErrors.email}
                        wrapperClassName="_social_login_form_input _mar_b14"
                        labelClassName="_social_login_label _mar_b8"
                        className="form-control _social_login_input"
                      />
                    </div>
                    <div className="col-xl-12 col-lg-12 col-md-12 col-sm-12">
                      <Field
                        label="Password"
                        type="password"
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        error={fieldErrors.password}
                        wrapperClassName="_social_login_form_input _mar_b14"
                        labelClassName="_social_login_label _mar_b8"
                        className="form-control _social_login_input"
                      />
                    </div>
                  </div>

                  {error ? <FormError>{error}</FormError> : null}

                  <div className="row">
                    <div className="col-lg-6 col-xl-6 col-md-6 col-sm-12">
                      <div className="form-check _social_login_form_check">
                        <input
                          className="form-check-input _social_login_form_check_input"
                          type="checkbox"
                          id="rememberMe"
                          defaultChecked
                        />
                        <label
                          className="form-check-label _social_login_form_check_label"
                          htmlFor="rememberMe"
                        >
                          Remember me
                        </label>
                      </div>
                    </div>
                    <div className="col-lg-6 col-xl-6 col-md-6 col-sm-12">
                      <div className="_social_login_form_left">
                        <p className="_social_login_form_left_para">Forgot password?</p>
                      </div>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-lg-12 col-md-12 col-xl-12 col-sm-12">
                      <div className="_social_login_form_btn _mar_t40 _mar_b60 mt-7! mb-4!">
                        <Button
                          type="submit"
                          className="_social_login_form_btn_link _btn1 inline-flex w-full items-center justify-center whitespace-nowrap px-6!"
                          loading={isLoading}
                          loadingText="Signing in…"
                        >
                          Login now
                        </Button>
                      </div>
                    </div>
                  </div>
                </form>
                <div className="row">
                  <div className="col-xl-12 col-lg-12 col-md-12 col-sm-12">
                    <div className="_social_login_bottom_txt">
                      <p className="_social_login_bottom_txt_para">
                        Don&apos;t have an account?{" "}
                        <Link href="/register">Create New Account</Link>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
