import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sb = supabaseServer();

  const { data: conversation, error: convErr } = await sb
    .from("conversations")
    .select("id, title, user_id, created_at, updated_at")
    .eq("id", id)
    .single();

  if (convErr || !conversation) {
    return NextResponse.json(
      { error: convErr?.message ?? "not found" },
      { status: 404 }
    );
  }

  const { data: turns, error: turnsErr } = await sb
    .from("analyses")
    .select(
      "id, conversation_id, turn_index, input_type, input_meta, user_message, user_context, status, error_message, transcript, result, created_at"
    )
    .eq("conversation_id", id)
    .order("turn_index", { ascending: true });

  if (turnsErr) {
    return NextResponse.json({ error: turnsErr.message }, { status: 500 });
  }

  return NextResponse.json({ conversation, messages: turns ?? [] });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sb = supabaseServer();
  let title: string | null = null;
  try {
    const body = await req.json();
    if (typeof body?.title === "string") {
      title = body.title.trim().slice(0, 120) || null;
    }
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const { data, error } = await sb
    .from("conversations")
    .update({ title, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, title, user_id, created_at, updated_at")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "update failed" },
      { status: 500 }
    );
  }
  return NextResponse.json(data);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sb = supabaseServer();
  const { error } = await sb.from("conversations").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
