import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const noStore = { "Cache-Control": "no-store" };

function bad(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400, headers: noStore });
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  if (!UUID.test(token)) return bad("bad token");
  const { data, error } = await supabase().rpc("get_profile", { p_token: token });
  if (error) return NextResponse.json({ error: "failed" }, { status: 500, headers: noStore });
  return NextResponse.json({ doc: data ?? null }, { headers: noStore });
}

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || !UUID.test(body.token ?? "")) return bad("bad token");
  if (!body.doc || typeof body.doc !== "object" || Array.isArray(body.doc)) return bad("bad profile");
  if (JSON.stringify(body.doc).length > 100_000) return bad("profile too large");
  const { error } = await supabase().rpc("save_profile", { p_token: body.token, p_doc: body.doc });
  if (error) return NextResponse.json({ error: "failed" }, { status: 500, headers: noStore });
  return NextResponse.json({ ok: true }, { headers: noStore });
}

export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || !UUID.test(body.token ?? "")) return bad("bad token");
  const { error } = await supabase().rpc("delete_profile", { p_token: body.token });
  if (error) return NextResponse.json({ error: "failed" }, { status: 500, headers: noStore });
  return NextResponse.json({ ok: true }, { headers: noStore });
}
