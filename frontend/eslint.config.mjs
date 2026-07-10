import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // We intentionally reuse the provided template's plain <img> markup and
      // load user/seed images from arbitrary hosts (Cloudinary, backend), so the
      // next/image lint rule does not apply here.
      "@next/next/no-img-element": "off",
      // Poppins is loaded via a Google Fonts <link> in the App Router root layout
      // to preserve the literal "Poppins" family name the template CSS relies on.
      "@next/next/no-page-custom-font": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
