"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useRegisterMutation } from "@/store/api/authApi";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { FormError } from "@/components/ui/FormError";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { getErrorMessage, getFieldErrors } from "@/lib/apiError";
import { setAuthHint } from "@/lib/auth-cookies";

export default function RegisterPage() {
  const router = useRouter();
  const [register, { isLoading }] = useRegisterMutation();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    // Client-side checks for instant inline feedback (server re-validates too).
    const clientErrors: Record<string, string> = {};
    if (!form.firstName.trim()) clientErrors.firstName = "First name is required.";
    if (!form.lastName.trim()) clientErrors.lastName = "Last name is required.";
    if (!form.email.trim()) clientErrors.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      clientErrors.email = "Enter a valid email address.";
    if (!form.password) clientErrors.password = "Password is required.";
    if (form.password && form.password !== form.confirmPassword) {
      clientErrors.confirmPassword = "Passwords do not match.";
    }
    if (Object.keys(clientErrors).length) {
      setFieldErrors(clientErrors);
      return;
    }

    try {
      await register({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
      }).unwrap();
      setAuthHint();
      router.replace("/feed");
    } catch (err) {
      setFieldErrors(getFieldErrors(err));
      setError(getErrorMessage(err, "Unable to create your account."));
    }
  }

  return (
    <section className="_social_registration_wrapper _layout_main_wrapper flex min-h-screen flex-col justify-center py-8!">
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
      <div className="_social_registration_wrap">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-xl-8 col-lg-8 col-md-12 col-sm-12">
              <div className="_social_registration_right">
                <div className="_social_registration_right_image">
                  <img src="/images/registration.png" alt="Register" />
                </div>
              </div>
            </div>
            <div className="col-xl-4 col-lg-4 col-md-12 col-sm-12">
              <div className="_social_registration_content">
                <div className="_social_registration_right_logo _mar_b28">
                  <img
                    src="/images/logo.svg"
                    alt="Buddy Script"
                    className="_right_logo"
                  />
                </div>
                <p className="_social_registration_content_para _mar_b8">
                  Get Started Now
                </p>
                <h4 className="_social_registration_content_title _titl4 _mar_b50 mb-6!">
                  Registration
                </h4>
                <GoogleSignInButton
                  label="Register with google"
                  text="signup_with"
                />
                <div className="_social_registration_content_bottom_txt _mar_b40 mb-5!">
                  {" "}
                  <span>Or</span>
                </div>
                <form
                  className="_social_registration_form"
                  onSubmit={onSubmit}
                  noValidate
                >
                  <div className="row">
                    <div className="col-xl-6 col-lg-6 col-md-6 col-sm-12">
                      <Field
                        label="First Name"
                        autoComplete="given-name"
                        required
                        value={form.firstName}
                        onChange={set("firstName")}
                        error={fieldErrors.firstName}
                        wrapperClassName="_social_registration_form_input _mar_b14"
                        labelClassName="_social_registration_label _mar_b8"
                        className="form-control _social_registration_input"
                      />
                    </div>
                    <div className="col-xl-6 col-lg-6 col-md-6 col-sm-12">
                      <Field
                        label="Last Name"
                        autoComplete="family-name"
                        required
                        value={form.lastName}
                        onChange={set("lastName")}
                        error={fieldErrors.lastName}
                        wrapperClassName="_social_registration_form_input _mar_b14"
                        labelClassName="_social_registration_label _mar_b8"
                        className="form-control _social_registration_input"
                      />
                    </div>
                    <div className="col-xl-12 col-lg-12 col-md-12 col-sm-12">
                      <Field
                        label="Email"
                        type="email"
                        autoComplete="email"
                        required
                        value={form.email}
                        onChange={set("email")}
                        error={fieldErrors.email}
                        wrapperClassName="_social_registration_form_input _mar_b14"
                        labelClassName="_social_registration_label _mar_b8"
                        className="form-control _social_registration_input"
                      />
                    </div>
                    <div className="col-xl-12 col-lg-12 col-md-12 col-sm-12">
                      <Field
                        label="Password"
                        type="password"
                        autoComplete="new-password"
                        required
                        value={form.password}
                        onChange={set("password")}
                        error={fieldErrors.password}
                        wrapperClassName="_social_registration_form_input _mar_b14"
                        labelClassName="_social_registration_label _mar_b8"
                        className="form-control _social_registration_input"
                      />
                    </div>
                    <div className="col-xl-12 col-lg-12 col-md-12 col-sm-12">
                      <Field
                        label="Repeat Password"
                        type="password"
                        autoComplete="new-password"
                        required
                        value={form.confirmPassword}
                        onChange={set("confirmPassword")}
                        error={fieldErrors.confirmPassword}
                        wrapperClassName="_social_registration_form_input _mar_b14"
                        labelClassName="_social_registration_label _mar_b8"
                        className="form-control _social_registration_input"
                      />
                    </div>
                  </div>

                  {error ? <FormError>{error}</FormError> : null}

                  <div className="row">
                    <div className="col-lg-12 col-xl-12 col-md-12 col-sm-12">
                      <div className="form-check _social_registration_form_check">
                        <input
                          className="form-check-input _social_registration_form_check_input"
                          type="checkbox"
                          id="agreeTerms"
                          required
                          defaultChecked
                        />
                        <label
                          className="form-check-label _social_registration_form_check_label"
                          htmlFor="agreeTerms"
                        >
                          I agree to terms &amp; conditions
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-lg-12 col-md-12 col-xl-12 col-sm-12">
                      <div className="_social_registration_form_btn _mar_t40 _mar_b60 mt-6! mb-4!">
                        <Button
                          type="submit"
                          className="_social_registration_form_btn_link _btn1 inline-flex w-full items-center justify-center whitespace-nowrap px-6!"
                          loading={isLoading}
                          loadingText="Creating account…"
                        >
                          Register now
                        </Button>
                      </div>
                    </div>
                  </div>
                </form>
                <div className="row">
                  <div className="col-xl-12 col-lg-12 col-md-12 col-sm-12">
                    <div className="_social_registration_bottom_txt">
                      <p className="_social_registration_bottom_txt_para">
                        Already have an account? <Link href="/login">Login</Link>
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
