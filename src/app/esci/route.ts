import { NextResponse } from "next/server";
import { supabaseSessione } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const sb = await supabaseSessione();
  await sb.auth.signOut();
  return NextResponse.redirect(new URL("/accedi", req.url), { status: 303 });
}
