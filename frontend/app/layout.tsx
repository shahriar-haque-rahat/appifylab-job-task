// Provided template stylesheets, imported globally and untouched, in the
// original <head> order (bootstrap → common → main → responsive). globals.css
// loads last so project-specific additions layer on top without editing vendor CSS.
import "./styles/bootstrap.min.css";
import "./styles/common.css";
import "./styles/main.css";
import "./styles/responsive.css";
import "./globals.css";

import type { Metadata } from "next";
import { ReduxProvider } from "@/store/ReduxProvider";

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
        <ReduxProvider>{children}</ReduxProvider>
      </body>
    </html>
  );
}
