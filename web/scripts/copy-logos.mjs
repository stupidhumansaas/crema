// Copy roaster logos from data/logos/ (where tools/fetch_logos.py saves them) into public/logos/.
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const src = path.join(root, "data/logos");
const dest = path.join(root, "public/logos");
fs.rmSync(dest, { recursive: true, force: true });
fs.mkdirSync(dest, { recursive: true });
let n = 0;
if (fs.existsSync(src)) {
  for (const f of fs.readdirSync(src)) {
    if (!/\.(png|jpe?g|gif|webp|svg)$/i.test(f)) continue;
    fs.copyFileSync(path.join(src, f), path.join(dest, f));
    n++;
  }
}
console.log(`Copied ${n} logos to public/logos`);
