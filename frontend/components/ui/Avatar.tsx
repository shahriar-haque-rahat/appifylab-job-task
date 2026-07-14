"use client";

import { useState } from "react";

function initialsSvgDataUri(initials: string): string {
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">',
    '<rect width="100" height="100" rx="50" fill="#e4e7ec"/>',
    '<text x="50" y="50" text-anchor="middle" dy=".35em" fill="#6b7280" font-size="36" font-weight="600" font-family="-apple-system, BlinkMacSystemFont, sans-serif">',
    initials,
    "</text>",
    "</svg>",
  ].join("");
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function Avatar({
  src,
  alt = "",
  initials,
  className,
}: {
  src?: string | null;
  alt?: string;
  initials?: string;
  className?: string;
}) {
  const [errored, setErrored] = useState(false);

  if (!src || errored) {
    return (
      <img
        src={initialsSvgDataUri(initials ?? "")}
        alt={alt}
        className={className}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setErrored(true)}
    />
  );
}
