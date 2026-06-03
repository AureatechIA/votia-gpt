"use client";

import type { AnalysisResult } from "@/lib/types";

type Props = {
  result: AnalysisResult;
  onReset: () => void;
};

export function AnalysisResultView({ result, onReset }: Props) {
  return (
    <div className="w-full max-w-6xl space-y-10">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <section className="rounded-lg border border-gray-200 p-6">
          <h3 className="mb-5 text-xs uppercase tracking-widest text-gray-500">
            Reação por Região
          </h3>
          <ul className="space-y-4">
            {result.reacao_por_regiao.map((r) => (
              <li key={r.regiao} className="text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">{r.regiao}</span>
                  <span className="text-gray-500">
                    {r.rejeicao_pct}% rejeição
                  </span>
                </div>
                <div className="mt-2 flex h-1 gap-0.5">
                  <div
                    style={{ flex: r.aprovacao_pct }}
                    className="bg-emerald-500"
                  />
                  <div
                    style={{ flex: r.neutralidade_pct }}
                    className="bg-gray-300"
                  />
                  <div
                    style={{ flex: r.rejeicao_pct }}
                    className="bg-red-500"
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border border-gray-200 p-6">
          <h3 className="mb-5 text-xs uppercase tracking-widest text-gray-500">
            Frases Problemáticas
          </h3>
          <ul className="space-y-5">
            {result.top_frases_problematicas.map((f, i) => (
              <li key={i} className="text-sm">
                <p className="italic text-gray-900">&ldquo;{f.frase}&rdquo;</p>
                <p className="mt-1.5 text-xs leading-relaxed text-gray-600">
                  {f.motivo}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  → {f.cluster_alvo}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-lg border border-gray-200 p-6">
          <h3 className="mb-5 text-xs uppercase tracking-widest text-gray-500">
            Ajuste Sugerido
          </h3>
          {result.sugestao_ajuste ? (
            <>
              <p className="text-sm leading-relaxed text-gray-900">
                {result.sugestao_ajuste.descricao}
              </p>
              <p className="mt-4 text-xs text-gray-500">
                Impacto estimado:{" "}
                <span className="font-semibold text-gray-900">
                  +{result.sugestao_ajuste.impacto_estimado_pp}pp
                </span>
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-400">Sem ajuste sugerido</p>
          )}
        </section>
      </div>

      <div className="text-center">
        <button
          onClick={onReset}
          className="text-sm text-gray-500 underline transition-colors hover:text-gray-900"
        >
          Nova análise
        </button>
      </div>
    </div>
  );
}
