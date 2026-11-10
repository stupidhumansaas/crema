import { NextResponse } from "next/server";
import { supabase, toRecord } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const PAGE = 1000; // Supabase's default max rows per request

async function all(table: string, order = "position") {
  const db = supabase();
  const { count, error } = await db.from(table).select("*", { count: "exact", head: true });
  if (error) throw error;
  const pages = Math.ceil((count ?? 0) / PAGE);
  const results = await Promise.all(
    Array.from({ length: pages }, (_, i) =>
      db.from(table).select("*").order(order).range(i * PAGE, (i + 1) * PAGE - 1),
    ),
  );
  return results.flatMap(({ data, error }) => {
    if (error) throw error;
    return (data ?? []) as Record<string, unknown>[];
  });
}

/** The whole directory in the shape the page script was built around. Cached at the edge for 10 minutes. */
export async function GET() {
  try {
    const [roasters, beans, pods, supermarket, guides, tips] = await Promise.all([
      all("roasters"), all("beans"), all("pods"), all("supermarket"), all("guides"), all("pod_tips", "system"),
    ]);
    const latest = [...roasters, ...beans]
      .map((r) => String(r.updated_at))
      .reduce((a, b) => (a > b ? a : b), "");
    const body = {
      roasters: roasters.map(toRecord),
      beans: beans.map(toRecord),
      pods: pods.map(toRecord),
      supermarket: supermarket.map(toRecord),
      guides: guides.map(toRecord),
      podTips: Object.fromEntries(tips.map((t) => [t.system, t.tip])),
      built: latest
        ? new Date(latest).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
        : null,
    };
    return NextResponse.json(body, {
      headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=86400" },
    });
  } catch (e) {
    console.error("directory", e);
    return NextResponse.json({ error: "Couldn't load the directory" }, { status: 500 });
  }
}
