// Push data/directory.json into Supabase.
//   npm run seed        (reads SUPABASE_URL and SUPABASE_SECRET_KEY from .env.local)
// Workflow: update the spreadsheet -> python3 tools/import_master.py "data/Master Coffee Data.xlsx" -> npm run seed
// Rows that are no longer in directory.json are deleted from Supabase.
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_SECRET_KEY in web/.env.local");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

const data = JSON.parse(fs.readFileSync(path.join(root, "data/directory.json"), "utf8"));

// Hand-checked fixes, e.g. a roaster's own shop URL (same as build.py did)
const ovFile = path.join(root, "data/roaster_overrides.json");
if (fs.existsSync(ovFile)) {
  const fixes = JSON.parse(fs.readFileSync(ovFile, "utf8"));
  for (const r of data.roasters) Object.assign(r, fixes[r.id] ?? {});
}

// Logos: any data/logos/<roaster-id>.<ext> is served from /logos/ (copied into public/ at build)
const logoDir = path.join(root, "data/logos");
const EXTS = ["png", "jpg", "jpeg", "gif", "webp", "svg"];
const logoOverrides = fs.existsSync(path.join(logoDir, "overrides.json"))
  ? JSON.parse(fs.readFileSync(path.join(logoDir, "overrides.json"), "utf8"))
  : {};
let logos = 0;
for (const r of data.roasters) {
  const ext = EXTS.find((e) => fs.existsSync(path.join(logoDir, `${r.id}.${e}`)));
  if (!r.logo && ext) r.logo = { url: null, note: "Supplied file", dark: false, check: false };
  if (!r.logo) continue;
  Object.assign(r.logo, logoOverrides[r.id] ?? {});
  if (ext) {
    r.logo.src = `/logos/${r.id}.${ext}`;
    logos++;
  } else delete r.logo.src;
}

const RENAME = { desc: "description" };
const snake = (k) => RENAME[k] ?? k.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());
const COLUMNS = {
  roasters: "id position name city region status shop links note sells_pods wholesale logo offers offers_meta lat lng geo sample",
  beans: "id position roaster name origin producer process process_full roast brew_roast roast_known roast_note notes listed_notes taste type decaf brew format url source in_stock added_days description bag_img link_type price price_basis price_from size_confirmed size per_unit unit",
  supermarket: "id position brand name format kind roast brand_scale notes taste price size price_note source blend system count roaster_id",
  guides: "id position method kind difficulty time kit dose water grind affinity taste_bonus why steps",
};
COLUMNS.pods = COLUMNS.beans + " system material count intensity";

function rows(table, list) {
  const allowed = new Set(COLUMNS[table].split(" "));
  return list.map((item, position) => {
    const row = { position, updated_at: new Date().toISOString() };
    for (const [k, v] of Object.entries(item)) {
      const col = snake(k);
      if (!allowed.has(col)) throw new Error(`${table}: field "${k}" has no column. Add it to supabase/migrations and COLUMNS in seed.mjs.`);
      row[col] = v;
    }
    return row;
  });
}

async function upsert(table, list, idKey = "id") {
  for (let i = 0; i < list.length; i += 500) {
    const { error } = await db.from(table).upsert(list.slice(i, i + 500), { onConflict: idKey });
    if (error) throw new Error(`${table}: ${error.message}`);
  }
  // delete rows that are no longer in the source
  const keep = new Set(list.map((r) => r[idKey]));
  const existing = [];
  for (let from = 0; ; from += 1000) {
    const { data: page, error } = await db.from(table).select(idKey).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    existing.push(...page.map((r) => r[idKey]));
    if (page.length < 1000) break;
  }
  const stale = existing.filter((id) => !keep.has(id));
  for (let i = 0; i < stale.length; i += 100) {
    const { error } = await db.from(table).delete().in(idKey, stale.slice(i, i + 100));
    if (error) throw new Error(`${table}: ${error.message}`);
  }
  console.log(`${table}: ${list.length} rows${stale.length ? `, ${stale.length} removed` : ""}`);
}

await upsert("roasters", rows("roasters", data.roasters));
await upsert("beans", rows("beans", data.beans));
await upsert("pods", rows("pods", data.pods ?? []));
await upsert("supermarket", rows("supermarket", data.supermarket ?? []));
await upsert("guides", rows("guides", data.guides ?? []));
await upsert(
  "pod_tips",
  Object.entries(data.podTips ?? {}).map(([system, tip]) => ({ system, tip, updated_at: new Date().toISOString() })),
  "system",
);
console.log(`Done. ${logos} roasters have a logo file.`);
