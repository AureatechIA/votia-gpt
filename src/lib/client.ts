import type {
  ChatMessage,
  Conversation,
  InputMeta,
  InputType,
} from "./types";

export async function listConversations(): Promise<Conversation[]> {
  const r = await fetch("/api/conversations", { cache: "no-store" });
  if (!r.ok) throw new Error("Falha ao listar conversas");
  const j = await r.json();
  return j.conversations ?? [];
}

export async function createConversation(title?: string): Promise<Conversation> {
  const r = await fetch("/api/conversations", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(title ? { title } : {}),
  });
  if (!r.ok) throw new Error("Falha ao criar conversa");
  return r.json();
}

export async function getConversation(
  id: string
): Promise<{ conversation: Conversation; messages: ChatMessage[] }> {
  const r = await fetch(`/api/conversations/${id}`, { cache: "no-store" });
  if (!r.ok) throw new Error("Falha ao carregar conversa");
  return r.json();
}

export async function deleteConversation(id: string): Promise<void> {
  const r = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
  if (!r.ok) throw new Error("Falha ao apagar conversa");
}

export async function patchConversation(
  id: string,
  title: string
): Promise<Conversation> {
  const r = await fetch(`/api/conversations/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title }),
  });
  if (!r.ok) throw new Error("Falha ao atualizar conversa");
  return r.json();
}

export async function createMessage(args: {
  conversationId: string;
  inputType: InputType;
  inputMeta?: InputMeta;
  userMessage?: string | null;
  userContext?: string | null;
}): Promise<{
  analysisId: string;
  turnIndex: number;
  signedUpload: { url: string; token: string; storagePath: string } | null;
}> {
  const r = await fetch("/api/messages", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.error ?? "Falha ao criar mensagem");
  }
  return r.json();
}

export async function uploadToSignedUrl(file: File, url: string): Promise<void> {
  const r = await fetch(url, {
    method: "PUT",
    headers: { "content-type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!r.ok) {
    throw new Error(`Falha no upload (HTTP ${r.status})`);
  }
}

export async function triggerAnalyze(analysisId: string): Promise<void> {
  const r = await fetch("/api/analyze", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ analysisId }),
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.error ?? "Falha na análise");
  }
}

export async function getAnalysis(analysisId: string): Promise<ChatMessage> {
  const r = await fetch(`/api/analyses/${analysisId}`, { cache: "no-store" });
  if (!r.ok) throw new Error("Falha ao consultar análise");
  return r.json();
}
