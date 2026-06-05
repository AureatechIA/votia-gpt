import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("analyses")
    .select(
      "id, conversation_id, turn_index, input_type, input_meta, user_message, user_context, status, error_message, transcript, result, created_at, completed_at, duration_ms"
    )
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  return NextResponse.json(data);
}
