import type { InputType } from "./types";

export function classifyUrlClient(url: string): InputType {
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

export function inputTypeLabel(t: InputType): string {
  switch (t) {
    case "video":
      return "Vídeo";
    case "audio":
      return "Áudio";
    case "image":
      return "Imagem";
    case "text":
      return "Texto";
    case "url_youtube":
      return "YouTube";
    case "url_instagram":
      return "Instagram";
    case "url_x":
      return "X / Twitter";
    case "url_generic":
      return "Link";
    default:
      return "Peça";
  }
}
