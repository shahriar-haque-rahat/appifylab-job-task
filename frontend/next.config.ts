import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide the floating dev-tools indicator (the black circle at the bottom-left in
  // `next dev`). It never renders in a production build; this removes it in dev too.
  devIndicators: false,
};

export default nextConfig;
