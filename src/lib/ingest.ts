import { YoutubeTranscript } from "youtube-transcript";
import ytdl from "@distube/ytdl-core";
import type { InputType } from "./types";

type RemotePayload = {
  kind: "audio" | "text" | "image" | "video";
  source?: string;
  audio_b64?: string;
  content_type?: string;
  filename?: string;
  title?: string;
  description?: string;
  caption?: string;
  owner?: string;
  uploader?: string;
  duration_s?: number;
  text?: string;
  image_b64?: string;
  media_url?: string;
  audio_error?: string;
  image_error?: string;
};

async function callMediaIngest(
  endpoint: "youtube" | "instagram" | "x",
  url: string
): Promise<RemotePayload | null> {
  const base = process.env.MEDIA_INGEST_URL?.replace(/\/$/, "");
  if (!base) return null;
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (process.env.MEDIA_INGEST_KEY) {
    headers["x-api-key"] = process.env.MEDIA_INGEST_KEY;
  }
  const t0 = Date.now();
  try {
    const r = await fetch(`${base}/ingest/${endpoint}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(120_000),
    });
    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      const level = r.status === 503 ? "log" : "warn";
      console[level](
        `[ingest] REMOTE ${endpoint} HTTP ${r.status} (${Date.now() - t0}ms): ${detail.slice(0, 200)} → fallback local`
      );
      return null;
    }
    console.log(`[ingest] REMOTE ${endpoint} OK em ${Date.now() - t0}ms`);
    return (await r.json()) as RemotePayload;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(
      `[ingest] REMOTE ${endpoint} ERRO (${Date.now() - t0}ms): ${msg} → caindo pro fallback local`
    );
    return null;
  }
}

function remoteToIngest(payload: RemotePayload, source: string): IngestResult | null {
  if (payload.kind === "audio" && payload.audio_b64) {
    return {
      kind: "audio",
      buffer: Buffer.from(payload.audio_b64, "base64"),
      contentType: payload.content_type ?? "audio/mpeg",
      filename: payload.filename ?? `remote-${Date.now()}.mp3`,
      source,
      meta: {
        title: payload.title ?? payload.caption,
        description:
          payload.description ?? (payload.owner ? `Autor: @${payload.owner}` : undefined),
      },
    };
  }
  if (payload.kind === "image" && payload.image_b64) {
    return {
      kind: "image",
      mediaType: payload.content_type ?? "image/jpeg",
      base64: payload.image_b64,
      source,
    };
  }
  if (payload.kind === "text" || payload.kind === "video") {
    const parts = [
      payload.title ? `Título: ${payload.title}` : "",
      payload.caption ? `Legenda: ${payload.caption}` : "",
      payload.owner ? `Autor: @${payload.owner}` : "",
      payload.description ? `Descrição: ${payload.description}` : "",
      payload.text ?? "",
      payload.media_url && payload.kind === "video"
        ? `(post contém vídeo sem áudio extraído: ${payload.media_url})`
        : "",
    ].filter(Boolean);
    if (parts.length === 0) return null;
    return { kind: "text", text: parts.join("\n\n"), source };
  }
  return null;
}

export type IngestResult =
  | { kind: "text"; text: string; source: string }
  | { kind: "image"; mediaType: string; base64: string; source: string }
  | {
      kind: "audio";
      buffer: Buffer;
      contentType: string;
      filename: string;
      source: string;
      meta: { title?: string; description?: string };
    };

export function classifyUrl(url: string): InputType {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    if (
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "youtu.be" ||
      host.endsWith(".youtube.com")
    ) {
      return "url_youtube";
    }
    if (host === "instagram.com" || host.endsWith(".instagram.com")) {
      return "url_instagram";
    }
    if (
      host === "x.com" ||
      host === "twitter.com" ||
      host === "mobile.twitter.com" ||
      host.endsWith(".x.com") ||
      host.endsWith(".twitter.com")
    ) {
      return "url_x";
    }
    return "url_generic";
  } catch {
    return "url_generic";
  }
}

function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "youtu.be") {
      return u.pathname.slice(1) || null;
    }
    if (host.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;
      const m = u.pathname.match(/\/(shorts|embed)\/([^/?]+)/);
      if (m) return m[2];
    }
  } catch {
    // ignore
  }
  return null;
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      accept: "text/html,application/xhtml+xml",
      "accept-language": "pt-BR,pt;q=0.9,en;q=0.8",
    },
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ao buscar ${url}`);
  }
  return await res.text();
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function extractMeta(html: string, prop: string): string | null {
  const patterns = [
    new RegExp(
      `<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["']`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+name=["']${prop}["'][^>]+content=["']([^"']+)["']`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${prop}["']`,
      "i"
    ),
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m) return decodeHtmlEntities(m[1]);
  }
  return null;
}

function extractText(html: string, tag: string): string | null {
  const m = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  if (!m) return null;
  return decodeHtmlEntities(m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")).trim();
}

async function downloadYouTubeAudio(url: string): Promise<{
  buffer: Buffer;
  contentType: string;
  filename: string;
  meta: { title?: string; description?: string };
}> {
  const info = await ytdl.getInfo(url);
  const title = info.videoDetails?.title;
  const description = info.videoDetails?.description ?? undefined;

  const stream = ytdl.downloadFromInfo(info, {
    quality: "highestaudio",
    filter: "audioonly",
  });

  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    stream.on("data", (c: Buffer) => chunks.push(c));
    stream.on("end", () => resolve());
    stream.on("error", (e: Error) => reject(e));
  });
  const buffer = Buffer.concat(chunks);

  if (buffer.byteLength === 0) {
    throw new Error("Stream de áudio do YouTube veio vazio.");
  }
  if (buffer.byteLength > 24 * 1024 * 1024) {
    throw new Error(
      `Áudio do YouTube tem ${(buffer.byteLength / 1024 / 1024).toFixed(1)}MB — acima do limite do Whisper (25MB). Tente um vídeo mais curto.`
    );
  }

  return {
    buffer,
    contentType: "audio/webm",
    filename: `yt-${Date.now()}.webm`,
    meta: { title, description },
  };
}

async function ingestYouTube(url: string): Promise<IngestResult> {
  const videoId = extractYouTubeId(url);
  if (!videoId) {
    throw new Error("Não consegui extrair o ID do vídeo do YouTube.");
  }

  const remote = await callMediaIngest("youtube", url);
  if (remote) {
    const r = remoteToIngest(remote, url);
    if (r) return r;
  }

  try {
    const audio = await downloadYouTubeAudio(url);
    return {
      kind: "audio",
      buffer: audio.buffer,
      contentType: audio.contentType,
      filename: audio.filename,
      source: url,
      meta: audio.meta,
    };
  } catch (ytdlErr) {
    const ytdlMsg = ytdlErr instanceof Error ? ytdlErr.message : String(ytdlErr);
    console.warn(`ytdl falhou (${ytdlMsg}), tentando legenda+metadados.`);
  }

  let html = "";
  try {
    html = await fetchHtml(url);
  } catch {
    // segue sem html
  }
  const title =
    extractMeta(html, "og:title") ?? extractText(html, "title") ?? "(sem título)";
  const description = extractMeta(html, "og:description") ?? "";

  let transcript = "";
  try {
    const parts = await YoutubeTranscript.fetchTranscript(videoId, {
      lang: "pt",
    });
    transcript = parts.map((p) => p.text).join(" ");
  } catch {
    try {
      const parts = await YoutubeTranscript.fetchTranscript(videoId);
      transcript = parts.map((p) => p.text).join(" ");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!description && !title) {
        throw new Error(
          `Não consegui baixar áudio nem legenda do YouTube: ${msg}. Baixe o vídeo manualmente e envie como arquivo.`
        );
      }
    }
  }

  const text = [
    `Título: ${title}`,
    description ? `Descrição: ${description}` : "",
    transcript
      ? `Transcrição (legenda): ${transcript}`
      : "(sem transcrição automática disponível — análise feita só com título/descrição)",
  ]
    .filter(Boolean)
    .join("\n\n");

  return { kind: "text", text, source: url };
}

async function ingestSocialPost(
  url: string,
  endpoint: "instagram" | "x"
): Promise<IngestResult> {
  const remote = await callMediaIngest(endpoint, url);
  if (remote) {
    const r = remoteToIngest(remote, url);
    if (r) return r;
  }

  const html = await fetchHtml(url);
  const title = extractMeta(html, "og:title");
  const description = extractMeta(html, "og:description");
  const ogImage = extractMeta(html, "og:image");
  const ogVideo = extractMeta(html, "og:video") ?? extractMeta(html, "og:video:url");

  if (!title && !description && !ogImage) {
    throw new Error(
      "Não consegui extrair conteúdo da página. A rede pode estar bloqueando scraping anônimo — recomendo baixar a peça e enviar como arquivo."
    );
  }

  const parts: string[] = [];
  if (title) parts.push(`Título: ${title}`);
  if (description) parts.push(`Texto: ${description}`);
  if (ogVideo) parts.push(`(Post contém vídeo: ${ogVideo} — sem transcrição disponível)`);
  if (ogImage && !ogVideo) parts.push(`(Post contém imagem: ${ogImage})`);

  return { kind: "text", text: parts.join("\n\n"), source: url };
}

async function ingestGeneric(url: string): Promise<IngestResult> {
  const html = await fetchHtml(url);
  const title =
    extractMeta(html, "og:title") ?? extractText(html, "title") ?? "(sem título)";
  const description = extractMeta(html, "og:description") ?? "";
  const bodyText = extractText(html, "body") ?? "";
  const snippet = bodyText.slice(0, 4000);
  return {
    kind: "text",
    text: [`Título: ${title}`, description, snippet].filter(Boolean).join("\n\n"),
    source: url,
  };
}

export async function ingestUrl(
  url: string,
  inputType: InputType
): Promise<IngestResult> {
  switch (inputType) {
    case "url_youtube":
      return ingestYouTube(url);
    case "url_instagram":
      return ingestSocialPost(url, "instagram");
    case "url_x":
      return ingestSocialPost(url, "x");
    default:
      return ingestGeneric(url);
  }
}
