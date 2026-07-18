// Regenerates public/samples/index.json — the manifest "Load samples" reads.
// A static site can't list a directory at runtime, so we snapshot it here.
// Runs automatically via predev/prebuild; also run manually: npm run samples
import { readdirSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "public", "samples");

if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

const files = readdirSync(dir)
  .filter((f) => f.endsWith(".json") && f !== "index.json")
  .sort();

writeFileSync(join(dir, "index.json"), JSON.stringify(files, null, 2) + "\n");
console.log(`samples manifest: ${files.length} file(s) -> public/samples/index.json`);
