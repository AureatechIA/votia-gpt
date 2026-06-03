"use client";

import { useEffect, useRef, useState } from "react";
import { UploadForm } from "@/components/UploadForm";
import { AnalysisResultView } from "@/components/AnalysisResult";
import { LoadingWave } from "@/components/LoadingWave";
import type { AnalysisResult, AnalysisStatus } from "@/lib/types";

type State =
  | { stage: "idle" }
  | { stage: "uploading" }
  | { stage: "processing"; analysisId: string; status: AnalysisStatus }
  | { stage: "done"; result: AnalysisResult }
  | { stage: "error"; message: string };

export default function Home() {
  const [state, setState] = useState<State>({ stage: "idle" });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function handleUpload(file: File, userContext: string) {
    try {
      setState({ stage: "uploading" });

      const urlRes = await fetch("/api/upload-url", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
        }),
      });
      if (!urlRes.ok) {
        const err = await urlRes.json().catch(() => ({}));
        throw new Error(err.error ?? "Falha ao obter URL de upload");
      }
      const { analysisId, signedUrl } = await urlRes.json();

      const upRes = await fetch(signedUrl, {
        method: "PUT",
        headers: { "content-type": file.type || "video/mp4" },
        body: file,
      });
      if (!upRes.ok) {
        throw new Error(`Falha no upload (HTTP ${upRes.status})`);
      }

      setState({ stage: "processing", analysisId, status: "pending" });

      pollRef.current = setInterval(async () => {
        try {
          const r = await fetch(`/api/analyses/${analysisId}`);
          if (!r.ok) return;
          const a = await r.json();
          setState((s) =>
            s.stage === "processing"
              ? { ...s, status: a.status as AnalysisStatus }
              : s
          );
        } catch {
          // silently retry next tick
        }
      }, 2000);

      const analyzeRes = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ analysisId, userContext }),
      });

      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }

      if (!analyzeRes.ok) {
        const err = await analyzeRes.json().catch(() => ({}));
        throw new Error(err.error ?? "Falha na análise");
      }

      const finalRes = await fetch(`/api/analyses/${analysisId}`);
      const finalData = await finalRes.json();

      if (finalData.status !== "done" || !finalData.result) {
        throw new Error(
          finalData.error_message ?? "Análise não concluída"
        );
      }

      setState({ stage: "done", result: finalData.result });
    } catch (err) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      const message = err instanceof Error ? err.message : String(err);
      setState({ stage: "error", message });
    }
  }

  function reset() {
    setState({ stage: "idle" });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-white p-8">
      {state.stage === "idle" && (
        <div className="w-full max-w-xl space-y-10">
          <h1 className="text-center text-2xl font-light tracking-wide text-gray-900">
            Insira a peça que vai ao ar.
          </h1>
          <UploadForm onSubmit={handleUpload} />
        </div>
      )}

      {state.stage === "uploading" && <LoadingWave status="uploading" />}

      {state.stage === "processing" && (
        <LoadingWave status={state.status} />
      )}

      {state.stage === "done" && (
        <AnalysisResultView result={state.result} onReset={reset} />
      )}

      {state.stage === "error" && (
        <div className="space-y-4 text-center">
          <p className="text-sm text-red-600">{state.message}</p>
          <button
            onClick={reset}
            className="text-sm text-gray-500 underline hover:text-gray-900"
          >
            Tentar novamente
          </button>
        </div>
      )}
    </main>
  );
}
