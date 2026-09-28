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

/*
 * The hosted API sleeps when idle and takes up to a minute to wake. Reads are retried through
 * that window; writes (sign-in, orders) first wait for the API to answer, so they are never sent
 * into a waking server where a timeout would leave us unsure whether they went through.
 */
const WAKE_BUDGET_MS = 120000;
const IDLE_MS = 5 * 60 * 1000;
const SAFE = new Set(["get", "head", "options"]);
let lastAnswer = 0;
let waking = null;

const isColdStart = (err) =>
  err?.code === "ECONNABORTED" || !err?.response || [502, 503, 504].includes(err.response.status);
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

export function wakeApi() {
  if (Date.now() - lastAnswer < IDLE_MS) return Promise.resolve();
  if (!waking) {
    waking = (async () => {
      const start = Date.now();
      while (Date.now() - start < WAKE_BUDGET_MS) {
        try {
          await api.get("/auth/session", { timeout: 60000, _noRetry: true });
          return;
        } catch (e) {
          if (!isColdStart(e)) return;
          await pause(3000);
        }
      }
    })().finally(() => { waking = null; });
  }
  return waking;
}

api.interceptors.request.use(async (cfg) => {
  if (!SAFE.has((cfg.method || "get").toLowerCase())) await wakeApi();
  return cfg;
});

api.interceptors.response.use(
  (res) => { lastAnswer = Date.now(); return res; },
  async (err) => {
    const cfg = err.config || {};
    const res = err.response;
    if (res && ![502, 503, 504].includes(res.status)) lastAnswer = Date.now();
    // Cold start: keep retrying reads until the API is up.
    if (isColdStart(err) && !cfg._noRetry && SAFE.has((cfg.method || "get").toLowerCase())) {
      cfg._wakeStart ??= Date.now();
      if (Date.now() - cfg._wakeStart < WAKE_BUDGET_MS) {
        await pause(3000);
        return api({ ...cfg, timeout: 60000 });
      }
    }
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
