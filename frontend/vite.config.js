import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const LANDING_DIR = path.resolve(here, "landing");
const BACKEND = "http://localhost:8080";

const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml",
  ".ico": "image/x-icon", ".woff2": "font/woff2",
};

/**
 * Serves the static landing page (landing/index.html, landing/about.html, landing/assets/...) at the site root,
 * so the landing page and the app (/app/) share one origin in development.
 */
function landingPage() {
  const serve = (req, res, next) => {
    const url = decodeURIComponent((req.url || "/").split("?")[0]);
    let rel = null;
    if (url === "/") rel = "index.html";
    else if (/^\/[a-z0-9-]+\.html$/i.test(url)) rel = url.slice(1);
    else if (/^\/assets\/[a-z0-9/_.-]+$/i.test(url) && !url.includes("..")) rel = url.slice(1);
    if (!rel) return next();
    const file = path.resolve(LANDING_DIR, rel);
    if (!file.startsWith(LANDING_DIR + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return next();
    res.setHeader("Content-Type", TYPES[path.extname(file).toLowerCase()] || "application/octet-stream");
    fs.createReadStream(file).pipe(res);
  };
  return {
    name: "bryles-landing-page",
    configureServer: (server) => { server.middlewares.use(serve); },
    configurePreviewServer: (server) => { server.middlewares.use(serve); },
  };
}

export default defineConfig({
  base: "/app/",
  plugins: [react(), landingPage()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": { target: BACKEND, changeOrigin: false },
      "/ws": { target: BACKEND, ws: true, changeOrigin: false },
    },
  },
  preview: {
    port: 5173,
    proxy: {
      "/api": { target: BACKEND },
      "/ws": { target: BACKEND, ws: true },
    },
  },
  build: {
    outDir: "dist",
    chunkSizeWarningLimit: 900,
  },
});
