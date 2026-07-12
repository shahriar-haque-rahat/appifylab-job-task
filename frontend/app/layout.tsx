// Single stylesheet: the tree-shaken template rules (merged under an `@layer
// template`), Tailwind's theme + utilities, and the app-specific global rules —
// all consolidated into globals.css. The four legacy stylesheets were removed.
import "./globals.css";

import type { Metadata } from "next";
import { ReduxProvider } from "@/store/ReduxProvider";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

export const metadata: Metadata = {
  title: "Buddy Script",
  description: "Appifylab social feed — full stack job task",
  icons: { icon: "/images/logo-copy.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        {/* Poppins is loaded from Google Fonts exactly as the original template does,
            so the literal font-family name "Poppins" referenced throughout the vendor
            CSS resolves correctly. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@100;300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ReduxProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}
