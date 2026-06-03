import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const filename: string = body?.filename ?? "video.mp4";

    const sb = supabaseServer();

    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${Date.now()}-${crypto.randomUUID()}-${safeName}`;

    const { data: analysis, error: insertErr } = await sb
      .from("analyses")
      .insert({ storage_path: storagePath, status: "pending" })
      .select("id")
      .single();

    if (insertErr || !analysis) {
      return NextResponse.json(
        { error: insertErr?.message ?? "insert failed" },
        { status: 500 }
      );
    }

    const { data: signed, error: signErr } = await sb.storage
      .from("videos")
      .createSignedUploadUrl(storagePath);

    if (signErr || !signed) {
      return NextResponse.json(
        { error: signErr?.message ?? "sign failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      analysisId: analysis.id,
      storagePath,
      signedUrl: signed.signedUrl,
      token: signed.token,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
