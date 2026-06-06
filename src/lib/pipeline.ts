import { getAnthropic, MODEL } from "./anthropic";
import { getOpenAI } from "./openai";
import { supabaseServer } from "./supabase";
import {
  getClusterSummaries,
  sampleRepresentativePersonas,
} from "./personas";
import {
  buildSystemPrompt,
  buildTextUserMessage,
  buildHistoryBlock,
  sourceLabel,
  ANALYSIS_TOOL,
  PROMPT_VERSION,
} from "./prompt";
import { ingestUrl } from "./ingest";
import type { AnalysisResult, AnalysisLog, InputType, InputMeta } from "./types";

const WHISPER_MODEL = "whisper-1";

type AnalysisRow = {
  id: string;
  conversation_id: string | null;
  turn_index: number | null;
  input_type: InputType | null;
  input_meta: InputMeta | null;
  user_message: string | null;
  user_context: string | null;
  storage_path: string | null;
};

async function fetchPriorTurns(
  conversationId: string,
  currentTurnIndex: number,
  limit = 5
) {
  const sb = supabaseServer();
  const { data } = await sb
    .from("analyses")
    .select(
      "turn_index, input_type, user_message, user_context, transcript, result"
    )
    .eq("conversation_id", conversationId)
    .lt("turn_index", currentTurnIndex)
    .eq("status", "done")
    .order("turn_index", { ascending: false })
    .limit(limit);
  const ordered = (data ?? []).reverse();
  return ordered.map((t) => ({
    user_message: t.user_message as string | null,
    user_context: t.user_context as string | null,
    input_type: t.input_type as InputType | null,
    transcript: t.transcript as string | null,
    result: t.result as AnalysisResult | null,
  }));
}

async function transcribeBuffer(
  buffer: ArrayBuffer | Buffer,
  contentType: string,
  filename: string
): Promise<string> {
  const bytes =
    buffer instanceof Buffer
      ? new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
      : new Uint8Array(buffer);
  const ab = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer;
  const blob = new Blob([ab], { type: contentType });
  const fileForOpenAI = new File([blob], filename, { type: contentType });
  const openai = getOpenAI();
  const t = await openai.audio.transcriptions.create({
    file: fileForOpenAI,
    model: WHISPER_MODEL,
    language: "pt",
  });
  return t.text;
}

async function transcribeFromStorage(storagePath: string): Promise<string> {
  const sb = supabaseServer();
  const { data: file, error: dlErr } = await sb.storage
    .from("videos")
    .download(storagePath);
  if (dlErr || !file) {
    throw new Error(`Storage download failed: ${dlErr?.message ?? "no file"}`);
  }
  const fileName = storagePath.split("/").pop() ?? "input.mp4";
  const buf = await file.arrayBuffer();
  return transcribeBuffer(buf, file.type || "video/mp4", fileName);
}

async function downloadImageAsBase64(storagePath: string): Promise<{
  base64: string;
  mediaType: string;
}> {
  const sb = supabaseServer();
  const { data: file, error: dlErr } = await sb.storage
    .from("videos")
    .download(storagePath);
  if (dlErr || !file) {
    throw new Error(`Storage download failed: ${dlErr?.message ?? "no file"}`);
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const base64 = buf.toString("base64");
  const mediaType = file.type || "image/png";
  return { base64, mediaType };
}

export async function runAnalysisPipeline(analysisId: string): Promise<void> {
  const sb = supabaseServer();
  const t0 = Date.now();

  try {
    const { data: analysis, error: fetchErr } = await sb
      .from("analyses")
      .select(
        "id, conversation_id, turn_index, input_type, input_meta, user_message, user_context, storage_path"
      )
      .eq("id", analysisId)
      .single<AnalysisRow>();

    if (fetchErr || !analysis) {
      throw new Error(`Analysis ${analysisId} not found`);
    }

    const inputType: InputType = analysis.input_type ?? "video";
    const inputMeta: InputMeta = analysis.input_meta ?? {};

    const priorTurns =
      analysis.conversation_id && typeof analysis.turn_index === "number"
        ? await fetchPriorTurns(analysis.conversation_id, analysis.turn_index)
        : [];

    let transcript = "";
    let visionImage: { base64: string; mediaType: string } | null = null;

    if (inputType === "video" || inputType === "audio") {
      if (!analysis.storage_path) {
        throw new Error("storage_path ausente para vídeo/áudio");
      }
      await sb
        .from("analyses")
        .update({ status: "transcribing" })
        .eq("id", analysisId);
      transcript = await transcribeFromStorage(analysis.storage_path);
    } else if (inputType === "image") {
      if (!analysis.storage_path) {
        throw new Error("storage_path ausente para imagem");
      }
      await sb
        .from("analyses")
        .update({ status: "ingesting" })
        .eq("id", analysisId);
      visionImage = await downloadImageAsBase64(analysis.storage_path);
      transcript = "(imagem — análise visual no prompt)";
    } else if (inputType === "text") {
      transcript = (analysis.user_message ?? "").trim();
      if (!transcript) {
        throw new Error("Texto vazio.");
      }
    } else {
      const url = inputMeta.url ?? analysis.user_message ?? "";
      if (!url) throw new Error("URL ausente.");
      await sb
        .from("analyses")
        .update({ status: "ingesting" })
        .eq("id", analysisId);
      const ingested = await ingestUrl(url, inputType);
      if (ingested.kind === "image") {
        visionImage = { base64: ingested.base64, mediaType: ingested.mediaType };
        transcript = "(imagem ingerida da URL)";
      } else if (ingested.kind === "audio") {
        await sb
          .from("analyses")
          .update({ status: "transcribing" })
          .eq("id", analysisId);
        const audioText = await transcribeBuffer(
          ingested.buffer,
          ingested.contentType,
          ingested.filename
        );
        const titleLine = ingested.meta.title ? `Título: ${ingested.meta.title}\n\n` : "";
        transcript = `${titleLine}Transcrição (Whisper, áudio baixado do YouTube): ${audioText}`;
      } else {
        transcript = ingested.text;
      }
    }

    await sb
      .from("analyses")
      .update({ transcript, status: "analyzing" })
      .eq("id", analysisId);

    const [clusters, personas] = await Promise.all([
      getClusterSummaries(),
      sampleRepresentativePersonas(100),
    ]);
    const systemPrompt = buildSystemPrompt(clusters, personas);

    const anthropic = getAnthropic();

    let response;
    if (visionImage) {
      const userCtx = (analysis.user_context ?? analysis.user_message ?? "").trim();
      const historyBlock = buildHistoryBlock(priorTurns);
      const textBlock = `${historyBlock}

## Nova peça (fonte: ${sourceLabel("image")})
(análise visual da imagem anexada — descreva elementos textuais e visuais problemáticos)

## Pergunta/contexto do usuário neste turno
${userCtx || "(não informado — apenas analisar a peça)"}

Use a tool submit_analysis pra responder.`;
      response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 8000,
        system: systemPrompt,
        tools: [ANALYSIS_TOOL],
        tool_choice: { type: "tool", name: ANALYSIS_TOOL.name },
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: visionImage.mediaType as
                    | "image/jpeg"
                    | "image/png"
                    | "image/gif"
                    | "image/webp",
                  data: visionImage.base64,
                },
              },
              { type: "text", text: textBlock },
            ],
          },
        ],
      });
    } else {
      const userMessage = buildTextUserMessage({
        inputType,
        transcript,
        userMessage: analysis.user_message,
        userContext: analysis.user_context,
        history: priorTurns,
      });
      response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 8000,
        system: systemPrompt,
        tools: [ANALYSIS_TOOL],
        tool_choice: { type: "tool", name: ANALYSIS_TOOL.name },
        messages: [{ role: "user", content: userMessage }],
      });
    }

    const toolBlock = response.content.find(
      (b): b is Extract<typeof b, { type: "tool_use" }> => b.type === "tool_use"
    );
    if (!toolBlock) {
      throw new Error(
        `Claude não usou a tool submit_analysis. stop_reason=${response.stop_reason}`
      );
    }
    const result = toolBlock.input as AnalysisResult;

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
