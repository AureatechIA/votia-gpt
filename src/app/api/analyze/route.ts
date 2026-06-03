import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { runAnalysisPipeline } from "@/lib/pipeline";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const { analysisId, userContext } = await req.json();
    if (!analysisId) {
      return NextResponse.json(
        { error: "analysisId required" },
        { status: 400 }
      );
    }

    const sb = supabaseServer();
    if (typeof userContext === "string" && userContext.trim()) {
      await sb
        .from("analyses")
        .update({ user_context: userContext.trim() })
        .eq("id", analysisId);
    }

    await runAnalysisPipeline(analysisId);

    return NextResponse.json({ analysisId, status: "done" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
