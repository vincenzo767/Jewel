// Vercel build: puts the static landing site (landing/*.html + landing/assets) at the root of dist/,
// next to the React app in dist/app/, matching how the Spring Boot jar serves them.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const landing = path.resolve(here, "../landing");
const dist = path.resolve(here, "../dist");

for (const name of fs.readdirSync(landing)) {
  if (name.endsWith(".html") || name === "assets") {
    fs.cpSync(path.join(landing, name), path.join(dist, name), { recursive: true });
  }
}
console.log("Copied the landing site into dist/");
