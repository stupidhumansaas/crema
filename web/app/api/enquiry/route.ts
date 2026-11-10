import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Wholesale enquiry from the Wholesale page. Stored in Supabase; the SQL function re-checks everything. */
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => null);
  const ok =
    b &&
    typeof b.business === "string" && b.business.trim().length > 0 && b.business.length <= 120 &&
    typeof b.email === "string" && EMAIL.test(b.email) && b.email.length <= 120 &&
    Array.isArray(b.roasterIds) && b.roasterIds.length >= 1 && b.roasterIds.length <= 5 &&
    b.roasterIds.every((id: unknown) => typeof id === "string");
  if (!ok) return NextResponse.json({ error: "Please check the form" }, { status: 400 });

  const { error } = await supabase().rpc("submit_enquiry", {
    p: {
      business: b.business.trim(),
      businessType: String(b.businessType ?? ""),
      email: b.email.trim(),
      cupsPerDay: Number.isFinite(b.cupsPerDay) ? Math.round(b.cupsPerDay) : null,
      message: String(b.message ?? ""),
      supply: String(b.supply ?? ""),
      needsMachine: !!b.needsMachine,
      location: String(b.location ?? ""),
      roasterIds: b.roasterIds,
    },
  });
  if (error) {
    console.error("enquiry", error.message);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
