export function cloudinaryVariant(
  url: string | null | undefined,
  width: number
): string | undefined {
  if (!url) return undefined;
  if (!url.includes("res.cloudinary.com")) return url;
  const marker = "/image/upload/";
  const idx = url.indexOf(marker);
  if (idx === -1) return url;
  const transform = `f_auto,q_auto:good,c_limit,w_${width},dpr_2.0`;
  const head = url.slice(0, idx + marker.length);
  const tail = url.slice(idx + marker.length);
  // Don't double-apply if a transform is already present.
  if (/^[a-z]{1,3}_/.test(tail)) return url;
  return `${head}${transform}/${tail}`;
}
