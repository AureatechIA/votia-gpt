import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import type { InputType, InputMeta } from "@/lib/types";

export const runtime = "nodejs";

const VALID_INPUT_TYPES: InputType[] = [
  "video",
  "audio",
  "image",
  "text",
  "url_youtube",
  "url_instagram",
  "url_x",
  "url_generic",
];

const STORAGE_INPUT_TYPES: InputType[] = ["video", "audio", "image"];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const conversationId: string | undefined = body?.conversationId;
    const inputType: InputType = body?.inputType;
    const inputMeta: InputMeta = body?.inputMeta ?? {};
    const userMessage: string | null =
      typeof body?.userMessage === "string" ? body.userMessage : null;
    const userContext: string | null =
      typeof body?.userContext === "string" ? body.userContext : null;

    if (!conversationId) {
      return NextResponse.json(
        { error: "conversationId required" },
        { status: 400 }
      );
    }
    if (!VALID_INPUT_TYPES.includes(inputType)) {
      return NextResponse.json(
        { error: `invalid inputType: ${inputType}` },
        { status: 400 }
      );
    }

    const sb = supabaseServer();

    const { data: conv, error: convErr } = await sb
      .from("conversations")
      .select("id")
      .eq("id", conversationId)
      .single();
    if (convErr || !conv) {
      return NextResponse.json(
        { error: "conversation not found" },
        { status: 404 }
      );
    }

    const { data: last } = await sb
      .from("analyses")
      .select("turn_index")
      .eq("conversation_id", conversationId)
      .order("turn_index", { ascending: false })
      .limit(1)
      .maybeSingle();

    const turnIndex = ((last?.turn_index as number | null) ?? -1) + 1;

    const needsUpload = STORAGE_INPUT_TYPES.includes(inputType);
    let storagePath: string | null = null;

    if (needsUpload) {
      const filename = inputMeta.filename ?? "input.bin";
      const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
      storagePath = `${conversationId}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
    }

    const { data: analysis, error: insertErr } = await sb
      .from("analyses")
      .insert({
        conversation_id: conversationId,
        turn_index: turnIndex,
        input_type: inputType,
        input_meta: inputMeta,
        user_message: userMessage,
        user_context: userContext,
        storage_path: storagePath,
        status: needsUpload ? "uploading" : "pending",
      })
      .select("id")
      .single();

    if (insertErr || !analysis) {
      return NextResponse.json(
        { error: insertErr?.message ?? "insert failed" },
        { status: 500 }
      );
    }

    await sb
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);

    let signedUpload: { url: string; token: string; storagePath: string } | null = null;
    if (needsUpload && storagePath) {
      const { data: signed, error: signErr } = await sb.storage
        .from("videos")
        .createSignedUploadUrl(storagePath);
      if (signErr || !signed) {
        return NextResponse.json(
          { error: signErr?.message ?? "sign failed" },
          { status: 500 }
        );
      }
      signedUpload = {
        url: signed.signedUrl,
        token: signed.token,
        storagePath,
      };
    }

    return NextResponse.json({
      analysisId: analysis.id,
      turnIndex,
      signedUpload,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
