import { createClient } from "@supabase/supabase-js";

/** Server-side Supabase client using the publishable (public) key. Reads are open; writes go through SQL functions. */
export function supabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY must be set");
  return createClient(url, key, { auth: { persistSession: false } });
}

// Column names that don't follow the plain camelCase <-> snake_case rule.
const RENAME: Record<string, string> = { description: "desc" };
const DROP = new Set(["position", "updated_at"]);

/** Turn a database row back into the shape the page script expects: camelCase keys, no nulls. */
export function toRecord(row: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (v === null || DROP.has(k)) continue;
    out[RENAME[k] ?? k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())] = v;
  }
  return out;
}
