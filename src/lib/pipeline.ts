import { getAnthropic, MODEL } from "./anthropic";
import { getOpenAI } from "./openai";
import { supabaseServer } from "./supabase";
import {
  getClusterSummaries,
  sampleRepresentativePersonas,
} from "./personas";
import { buildSystemPrompt, buildUserMessage, PROMPT_VERSION } from "./prompt";
import type { AnalysisResult, AnalysisLog } from "./types";

const WHISPER_MODEL = "whisper-1";

export async function runAnalysisPipeline(analysisId: string): Promise<void> {
  const sb = supabaseServer();
  const t0 = Date.now();

  try {
    const { data: analysis, error: fetchErr } = await sb
      .from("analyses")
      .select("id, storage_path, user_context")
      .eq("id", analysisId)
      .single();

    if (fetchErr || !analysis) {
      throw new Error(`Analysis ${analysisId} not found`);
    }
    if (!analysis.storage_path) {
      throw new Error("No storage_path on analysis");
    }

    await sb
      .from("analyses")
      .update({ status: "transcribing" })
      .eq("id", analysisId);

    const { data: file, error: dlErr } = await sb.storage
      .from("videos")
      .download(analysis.storage_path);
    if (dlErr || !file) {
      throw new Error(`Storage download failed: ${dlErr?.message ?? "no file"}`);
    }

    const fileName = analysis.storage_path.split("/").pop() ?? "input.mp4";
    const buf = await file.arrayBuffer();
    const blob = new Blob([buf], { type: file.type || "video/mp4" });
    const fileForOpenAI = new File([blob], fileName, {
      type: blob.type,
    });

    const openai = getOpenAI();
    const transcription = await openai.audio.transcriptions.create({
      file: fileForOpenAI,
      model: WHISPER_MODEL,
      language: "pt",
    });
    const transcript = transcription.text;

    await sb
      .from("analyses")
      .update({ transcript, status: "analyzing" })
      .eq("id", analysisId);

    const [clusters, personas] = await Promise.all([
      getClusterSummaries(),
      sampleRepresentativePersonas(100),
    ]);

    const systemPrompt = buildSystemPrompt(clusters, personas);
    const userMessage = buildUserMessage(transcript, analysis.user_context ?? "");

    const anthropic = getAnthropic();
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const textBlock = response.content.find(
      (b): b is Extract<typeof b, { type: "text" }> => b.type === "text"
    );
    if (!textBlock) {
      throw new Error("No text response from Claude");
    }
    let raw = textBlock.text.trim();
    const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (fenceMatch) raw = fenceMatch[1];

    const result: AnalysisResult = JSON.parse(raw);

    const analysis_log: AnalysisLog = {
      prompt_version: PROMPT_VERSION,
      llm_model: MODEL,
      fallback_model: null,
      whisper_model: WHISPER_MODEL,
      personas_build: `${personas.length} samples + ${clusters.length} clusters`,
      sample_personas_ids: personas.map((p) => p.id),
    };

    await sb
      .from("analyses")
      .update({
        result,
        analysis_log,
        status: "done",
        duration_ms: Date.now() - t0,
        completed_at: new Date().toISOString(),
      })
      .eq("id", analysisId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await sb
      .from("analyses")
      .update({ status: "error", error_message: message })
      .eq("id", analysisId);
    throw err;
  }
}
