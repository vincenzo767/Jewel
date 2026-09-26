import axios from "axios";

/**
 * All requests go to the same origin (/api is proxied to Spring Boot in development).
 * The session lives in an HttpOnly cookie; axios echoes the XSRF-TOKEN cookie back as the
 * X-XSRF-TOKEN header on every unsafe request (double-submit CSRF protection).
 */
export const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
  timeout: 20000,
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const cfg = err.config || {};
    const res = err.response;
    // CSRF token missing or rotated: fetch a fresh one and retry once.
    if (res?.status === 403 && res.data?.message === "CSRF" && !cfg._csrfRetry) {
      cfg._csrfRetry = true;
      await api.get("/auth/session");
      return api(cfg);
    }
    if (res?.status === 401 && !String(cfg.url || "").startsWith("/auth/")) {
      window.dispatchEvent(new CustomEvent("bd:unauthorized"));
    }
    return Promise.reject(err);
  }
);

export const errorMessage = (e, fallback = "Something went wrong. Please try again.") => {
  const m = e?.response?.data?.message;
  if (m && m !== "CSRF") return m;
  if (e?.code === "ECONNABORTED" || !e?.response) return "We couldn't reach the shop. Check your connection and try again.";
  return fallback;
};

export const fieldErrors = (e) => e?.response?.data?.fields || {};

export async function uploadImage(path, file, onProgress) {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post(path, form, {
    onUploadProgress: (ev) => ev.total && onProgress?.(Math.round((ev.loaded / ev.total) * 100)),
  });
  return data;
}
