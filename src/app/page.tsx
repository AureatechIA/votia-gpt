"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { ChatInput, type SubmitPayload } from "@/components/ChatInput";
import { ChatTurn } from "@/components/ChatTurn";
import type { ChatMessage, Conversation } from "@/lib/types";
import {
  createConversation,
  createMessage,
  getAnalysis,
  getConversation,
  patchConversation,
  triggerAnalyze,
  uploadToSignedUrl,
} from "@/lib/client";

export default function Home() {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [sidebarKey, setSidebarKey] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    return () => {
      pollingRef.current.forEach((i) => clearInterval(i));
      pollingRef.current.clear();
    };
  }, []);

  function startNew() {
    pollingRef.current.forEach((i) => clearInterval(i));
    pollingRef.current.clear();
    setConversation(null);
    setMessages([]);
    setBusy(false);
  }

  async function openConversation(id: string) {
    pollingRef.current.forEach((i) => clearInterval(i));
    pollingRef.current.clear();
    try {
      const { conversation: c, messages: m } = await getConversation(id);
      setConversation(c);
      setMessages(m);
      setBusy(false);
    } catch (err) {
      console.error(err);
    }
  }

  function pollAnalysis(analysisId: string) {
    if (pollingRef.current.has(analysisId)) return;
    const interval = setInterval(async () => {
      try {
        const fresh = await getAnalysis(analysisId);
        setMessages((prev) =>
          prev.map((m) => (m.id === analysisId ? { ...m, ...fresh } : m))
        );
        if (fresh.status === "done" || fresh.status === "error") {
          clearInterval(interval);
          pollingRef.current.delete(analysisId);
          setBusy(false);
          setSidebarKey((k) => k + 1);
        }
      } catch {
        // retry next tick
      }
    }, 1500);
    pollingRef.current.set(analysisId, interval);
  }

  async function handleSubmit(payload: SubmitPayload) {
    if (busy) return;
    setBusy(true);
    try {
      let conv = conversation;
      const isFirst = !conv;
      if (!conv) {
        conv = await createConversation();
        setConversation(conv);
      }

      const inputMeta: Record<string, string> = {};
      if (payload.file) {
        inputMeta.filename = payload.file.name;
        inputMeta.contentType = payload.file.type;
      }
      if (payload.url) {
        inputMeta.url = payload.url;
      }

      const userMessage =
        payload.text ?? (payload.url ?? null);

      const userContext = payload.file && payload.text ? payload.text : null;

      const { analysisId, signedUpload } = await createMessage({
        conversationId: conv.id,
        inputType: payload.inputType,
        inputMeta,
        userMessage,
        userContext,
      });

      const newTurn: ChatMessage = {
        id: analysisId,
        conversation_id: conv.id,
        turn_index: messages.length,
        input_type: payload.inputType,
        input_meta: inputMeta,
        user_message: userMessage,
        user_context: userContext,
        status: signedUpload ? "uploading" : "pending",
        error_message: null,
        transcript: null,
        result: null,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, newTurn]);

      if (isFirst) {
        const title =
          (payload.text ?? payload.url ?? payload.file?.name ?? "Análise")
            .slice(0, 80);
        try {
          const updated = await patchConversation(conv.id, title);
          setConversation(updated);
          setSidebarKey((k) => k + 1);
        } catch {
          // título não-crítico
        }
      }

      if (signedUpload && payload.file) {
        try {
          await uploadToSignedUrl(payload.file, signedUpload.url);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === analysisId ? { ...m, status: "pending" } : m
            )
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === analysisId
                ? { ...m, status: "error", error_message: msg }
                : m
            )
          );
          setBusy(false);
          return;
        }
      }

      pollAnalysis(analysisId);
      triggerAnalyze(analysisId).catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === analysisId
              ? { ...m, status: "error", error_message: msg }
              : m
          )
        );
        const i = pollingRef.current.get(analysisId);
        if (i) clearInterval(i);
        pollingRef.current.delete(analysisId);
        setBusy(false);
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(msg);
      setBusy(false);
    }
  }

  return (
    <div className="flex h-screen bg-white">
      <Sidebar
        activeId={conversation?.id ?? null}
        onSelect={openConversation}
        onNew={startNew}
        refreshKey={sidebarKey}
      />

      <main className="flex flex-1 flex-col">
        <header className="border-b border-gray-200 px-6 py-3">
          <h2 className="text-sm font-medium text-gray-900">
            {conversation?.title ?? "Nova análise"}
          </h2>
          {conversation && (
            <p className="text-[10px] uppercase tracking-widest text-gray-400">
              {messages.length} turno{messages.length === 1 ? "" : "s"}
            </p>
          )}
        </header>

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto bg-gray-50 px-6 py-6"
        >
          <div className="mx-auto max-w-3xl space-y-6">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center pt-24 text-center">
                <h1 className="text-2xl font-light tracking-wide text-gray-900">
                  Insira a peça que vai ao ar.
                </h1>
                <p className="mt-3 max-w-md text-sm text-gray-500">
                  Arquivo (vídeo, áudio, imagem), link do YouTube, Instagram, X,
                  ou texto bruto. Você pode iterar — diga &ldquo;e se eu trocar
                  X por Y?&rdquo; e a análise refaz com o contexto.
                </p>
              </div>
            ) : (
              messages.map((m) => <ChatTurn key={m.id} message={m} />)
            )}
          </div>
        </div>

        <ChatInput onSubmit={handleSubmit} disabled={busy} />
      </main>
    </div>
  );
}
