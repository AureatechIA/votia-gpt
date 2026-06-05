"use client";

import { useEffect, useRef, useState } from "react";
import type { InputType } from "@/lib/types";
import { classifyUrlClient } from "@/lib/clientHelpers";

export type SubmitPayload = {
  inputType: InputType;
  file: File | null;
  url: string | null;
  text: string | null;
};

type Props = {
  onSubmit: (p: SubmitPayload) => void;
  disabled?: boolean;
};

const URL_REGEX = /https?:\/\/\S+/i;

function detectFileType(file: File): InputType {
  const t = file.type.toLowerCase();
  if (t.startsWith("image/")) return "image";
  if (t.startsWith("audio/")) return "audio";
  return "video";
}

function extractUrl(text: string): { url: string; rest: string } | null {
  const m = text.match(URL_REGEX);
  if (!m) return null;
  const url = m[0].replace(/[.,;!?)\]}>"']+$/, "");
  const rest = text.replace(url, "").trim();
  return { url, rest };
}

export function ChatInput({ onSubmit, disabled }: Props) {
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }, [text]);

  function pickFile() {
    inputRef.current?.click();
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setFile(f);
    e.target.value = "";
  }

  function detectedExtraction(): { url: string; rest: string } | null {
    return extractUrl(text);
  }

  function submit() {
    if (disabled) return;
    const trimmed = text.trim();
    if (file) {
      onSubmit({
        inputType: detectFileType(file),
        file,
        url: null,
        text: trimmed || null,
      });
      setFile(null);
      setText("");
      return;
    }
    const extracted = detectedExtraction();
    if (extracted) {
      onSubmit({
        inputType: classifyUrlClient(extracted.url),
        file: null,
        url: extracted.url,
        text: extracted.rest || null,
      });
      setText("");
      return;
    }
    if (trimmed) {
      onSubmit({ inputType: "text", file: null, url: null, text: trimmed });
      setText("");
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  const extracted = detectedExtraction();
  const url = extracted?.url ?? null;
  const hasContent = Boolean(file || url || text.trim());

  return (
    <div className="border-t border-gray-200 bg-white px-4 py-3">
      <div className="mx-auto max-w-3xl">
        {(file || url) && (
          <div className="mb-2 flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs">
            <span className="font-medium uppercase tracking-widest text-gray-500">
              {file
                ? detectFileType(file).toUpperCase()
                : url
                ? classifyUrlClient(url).replace("url_", "").toUpperCase()
                : ""}
            </span>
            <span className="flex-1 truncate text-gray-700">
              {file ? file.name : url}
            </span>
            <button
              type="button"
              onClick={() => {
                setFile(null);
                if (url) setText("");
              }}
              className="text-gray-400 hover:text-gray-900"
            >
              ×
            </button>
          </div>
        )}

        <div className="flex items-end gap-2 rounded-2xl border border-gray-300 bg-white px-3 py-2 focus-within:border-gray-900">
          <button
            type="button"
            onClick={pickFile}
            disabled={disabled}
            className="mb-1 text-gray-400 transition-colors hover:text-gray-900 disabled:opacity-40"
            title="Anexar arquivo (vídeo, áudio ou imagem)"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="video/*,audio/*,image/*"
            className="hidden"
            onChange={handleFile}
          />

          <textarea
            ref={taRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={disabled}
            rows={1}
            placeholder="Cole um link (YouTube, Instagram, X), anexe um arquivo, ou descreva a peça em texto…"
            className="flex-1 resize-none bg-transparent py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none disabled:opacity-50"
          />

          <button
            type="button"
            onClick={submit}
            disabled={disabled || !hasContent}
            className="mb-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            title="Analisar"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 19V5M5 12l7-7 7 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <p className="mt-1.5 text-center text-[10px] text-gray-400">
          Enter envia · Shift+Enter quebra linha · IG e X podem falhar sem login
        </p>
      </div>
    </div>
  );
}
