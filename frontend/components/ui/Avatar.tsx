"use client";

import { useState } from "react";

const DEFAULT_AVATAR = "/images/Avatar.png";

export function Avatar({
  src,
  alt = "",
  className,
}: {
  src?: string | null;
  alt?: string;
  className?: string;
}) {
  const [errored, setErrored] = useState(false);
  const finalSrc = !src || errored ? DEFAULT_AVATAR : src;
  return (
    <img
      src={finalSrc}
      alt={alt}
      className={className}
      onError={() => setErrored(true)}
    />
  );
}
