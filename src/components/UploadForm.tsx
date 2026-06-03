"use client";

import { useState } from "react";

type Props = {
  onSubmit: (file: File, context: string) => void;
  disabled?: boolean;
};

export function UploadForm({ onSubmit, disabled }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [context, setContext] = useState("");
  const [dragging, setDragging] = useState(false);

  function handleDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (file) onSubmit(file, context);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl space-y-6">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`block cursor-pointer rounded-lg border-2 border-dashed p-12 text-center transition-colors ${
          dragging
            ? "border-gray-900 bg-gray-50"
            : "border-gray-300 hover:border-gray-500"
        }`}
      >
        <input
          type="file"
          accept="video/*,audio/*"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        {file ? (
          <p className="font-light text-gray-900">{file.name}</p>
        ) : (
          <p className="font-light text-gray-400">
            Arraste o vídeo aqui ou clique para selecionar
          </p>
        )}
      </label>

      <input
        type="text"
        placeholder="Contexto em 1 frase (opcional)…"
        value={context}
        onChange={(e) => setContext(e.target.value)}
        className="w-full border-b border-gray-300 py-3 text-center text-sm transition-colors focus:border-gray-900 focus:outline-none"
      />

      <button
        type="submit"
        disabled={!file || disabled}
        className="w-full rounded bg-gray-900 py-3 text-sm tracking-wide text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Analisar
      </button>
    </form>
  );
}
