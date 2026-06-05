import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { runAnalysisPipeline } from "@/lib/pipeline";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const { analysisId } = await req.json();
    if (!analysisId) {
      return NextResponse.json(
        { error: "analysisId required" },
        { status: 400 }
      );
    }

    await runAnalysisPipeline(analysisId);

    const sb = supabaseServer();
    const { data: a } = await sb
      .from("analyses")
      .select("conversation_id")
      .eq("id", analysisId)
      .single();
    if (a?.conversation_id) {
      await sb
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", a.conversation_id);
    }

    return NextResponse.json({ analysisId, status: "done" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
