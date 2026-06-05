"use client";

import type { ChatMessage } from "@/lib/types";
import { AssistantBubble } from "./AssistantBubble";
import { inputTypeLabel } from "@/lib/clientHelpers";

type Props = {
  message: ChatMessage;
};

function UserBubble({ message }: { message: ChatMessage }) {
  const label = message.input_type ? inputTypeLabel(message.input_type) : "Peça";
  const meta = message.input_meta;
  const isFile = ["video", "audio", "image"].includes(message.input_type ?? "");
  const isUrl = (message.input_type ?? "").startsWith("url_");
  const display = isFile
    ? meta?.filename ?? "Arquivo enviado"
    : isUrl
    ? meta?.url ?? "URL"
    : message.user_message ?? "(texto)";

  const userText = message.user_message;
  const userCtx = message.user_context;

  return (
    <div className="flex justify-end">
      <div className="max-w-2xl space-y-1.5">
        <div className="rounded-2xl rounded-tr-sm bg-gray-900 px-4 py-3 text-sm text-white">
          <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-widest opacity-60">
            <span>{label}</span>
          </div>
          <p className="break-words font-medium">{display}</p>
          {(userText || userCtx) && isFile ? (
            <p className="mt-1.5 text-xs opacity-80">
              {userCtx ?? userText}
            </p>
          ) : null}
          {userCtx && isUrl ? (
            <p className="mt-1.5 text-xs opacity-80">{userCtx}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function StatusBubble({ message }: { message: ChatMessage }) {
  const label =
    message.status === "uploading"
      ? "Enviando arquivo…"
      : message.status === "ingesting"
      ? "Lendo conteúdo…"
      : message.status === "transcribing"
      ? "Transcrevendo áudio…"
      : message.status === "analyzing"
      ? "Analisando reação…"
      : "Processando…";

  return (
    <div className="flex justify-start">
      <div className="max-w-2xl rounded-2xl rounded-tl-sm bg-gray-100 px-4 py-3 text-sm text-gray-600">
        <span className="inline-flex items-center gap-2">
          <span className="inline-flex gap-1">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-500 [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-500 [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-500" />
          </span>
          {label}
        </span>
      </div>
    </div>
  );
}

function ErrorBubble({ message }: { message: ChatMessage }) {
  return (
    <div className="flex justify-start">
      <div className="max-w-2xl rounded-2xl rounded-tl-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        <div className="text-[10px] uppercase tracking-widest text-red-500">
          Erro
        </div>
        <p className="mt-1">{message.error_message ?? "Falha na análise"}</p>
      </div>
    </div>
  );
}

export function ChatTurn({ message }: Props) {
  return (
    <div className="space-y-3">
      <UserBubble message={message} />
      {message.status === "done" && message.result ? (
        <div className="flex justify-start">
          <AssistantBubble result={message.result} />
        </div>
      ) : message.status === "error" ? (
        <ErrorBubble message={message} />
      ) : (
        <StatusBubble message={message} />
      )}
    </div>
  );
}
