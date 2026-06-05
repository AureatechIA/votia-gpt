import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET() {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("conversations")
    .select("id, title, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ conversations: data ?? [] });
}

export async function POST(req: NextRequest) {
  const sb = supabaseServer();
  let title: string | null = null;
  try {
    const body = await req.json();
    if (typeof body?.title === "string" && body.title.trim()) {
      title = body.title.trim().slice(0, 120);
    }
  } catch {
    // body opcional
  }

  const { data, error } = await sb
    .from("conversations")
    .insert({ title })
    .select("id, title, created_at, updated_at")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "insert failed" },
      { status: 500 }
    );
  }
  return NextResponse.json(data);
}
