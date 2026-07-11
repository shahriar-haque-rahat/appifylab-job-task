// Helpers to read our backend's `{ error: { message, code, details } }` shape
// out of RTK Query error objects.

export function getErrorMessage(
  err: unknown,
  fallback = "Something went wrong. Please try again."
): string {
  if (err && typeof err === "object") {
    const anyErr = err as {
      data?: { error?: { message?: string } };
      error?: string;
    };
    if (anyErr.data?.error?.message) return anyErr.data.error.message;
    if (typeof anyErr.error === "string") return anyErr.error;
  }
  return fallback;
}

export function getFieldErrors(err: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (err && typeof err === "object") {
    const details = (
      err as { data?: { error?: { details?: Array<{ path?: string; message?: string }> } } }
    ).data?.error?.details;
    if (Array.isArray(details)) {
      for (const d of details) {
        if (d?.path && d?.message && !out[d.path]) out[d.path] = d.message;
      }
    }
  }
  return out;
}
