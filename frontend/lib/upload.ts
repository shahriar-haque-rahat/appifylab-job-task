import { API_URL } from "./config";
import { getStoredCsrf, setStoredCsrf } from "./csrf-store";
import { getCsrfToken } from "./auth-cookies";

function csrf(): string {
  return getStoredCsrf() || getCsrfToken() || "";
}

interface XhrResult {
  status: number;
  url: string;
  message?: string;
}

async function refreshSession(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { "x-csrf-token": csrf() },
    });
    if (!res.ok) return false;
    const data = (await res.json().catch(() => null)) as {
      csrfToken?: string;
    } | null;
    if (data?.csrfToken) setStoredCsrf(data.csrfToken);
    return true;
  } catch {
    return false;
  }
}

function xhrUpload(
  file: File,
  onProgress?: (percent: number) => void
): Promise<XhrResult> {
  return new Promise((resolve) => {
    const form = new FormData();
    form.append("image", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_URL}/uploads/image`);
    xhr.withCredentials = true;
    xhr.setRequestHeader("x-csrf-token", csrf());

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      let body: { url?: string; error?: { message?: string } } | null = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        /* non-JSON response */
      }
      resolve({
        status: xhr.status,
        url: body?.url ?? "",
        message: body?.error?.message,
      });
    };
    xhr.onerror = () => resolve({ status: 0, url: "" });
    xhr.send(form);
  });
}

export async function uploadImageWithProgress(
  file: File,
  onProgress?: (percent: number) => void
): Promise<string> {
  let res = await xhrUpload(file, onProgress);
  if (res.status === 401 && (await refreshSession())) {
    res = await xhrUpload(file, onProgress);
  }
  if (res.status >= 200 && res.status < 300 && res.url) return res.url;
  throw new Error(
    res.message ||
      (res.status === 0
        ? "Network error during upload. Please try again."
        : "Image upload failed. Please try a different image.")
  );
}
