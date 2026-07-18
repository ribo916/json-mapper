// Copies Monaco's runtime (`min/vs`) into public/monaco/vs so the editor is
// self-hosted (no CDN dependency, same-origin web workers). Runs via
// predev/prebuild. Safe to run repeatedly.
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "node_modules", "monaco-editor", "min", "vs");
const destDir = join(root, "public", "monaco");
const dest = join(destDir, "vs");

if (!existsSync(src)) {
  console.warn("monaco-editor not installed yet; skipping asset copy.");
  process.exit(0);
}

mkdirSync(destDir, { recursive: true });
cpSync(src, dest, { recursive: true, force: true });
console.log("monaco assets -> public/monaco/vs");
