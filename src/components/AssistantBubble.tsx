"use client";

import { useState } from "react";
import type {
  AnalysisResult,
  SegmentoReacao,
  ReacaoPorSegmento,
} from "@/lib/types";

type Props = {
  result: AnalysisResult;
};

const SEGMENTO_LABELS: Array<{ key: keyof ReacaoPorSegmento; title: string }> = [
  { key: "genero", title: "Gênero" },
  { key: "faixa_etaria", title: "Faixa etária" },
  { key: "classe_social", title: "Classe social" },
  { key: "religiao", title: "Religião" },
  { key: "escolaridade", title: "Escolaridade" },
];

function SegmentoBars({ items }: { items: SegmentoReacao[] }) {
  return (
    <ul className="space-y-2">
      {items.map((s) => (
        <li key={s.rotulo} className="text-sm">
          <div className="flex justify-between text-xs">
            <span className="font-medium text-gray-900">{s.rotulo}</span>
            <span className="text-gray-500">
              {s.rejeicao_pct}% rejeição · {s.aprovacao_pct}% aprovação
            </span>
          </div>
          <div className="mt-1 flex h-1.5 gap-0.5">
            <div style={{ flex: s.aprovacao_pct }} className="bg-emerald-500" />
            <div style={{ flex: s.neutralidade_pct }} className="bg-gray-300" />
            <div style={{ flex: s.rejeicao_pct }} className="bg-red-500" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function notaColor(valor: number): string {
  if (valor >= 8) return "bg-emerald-50 text-emerald-700";
  if (valor >= 5) return "bg-amber-50 text-amber-700";
  return "bg-red-50 text-red-700";
}

export function AssistantBubble({ result }: Props) {
  const [copied, setCopied] = useState(false);
  const [openFortes, setOpenFortes] = useState(false);
  const [openFrases, setOpenFrases] = useState(false);
  const [openDemo, setOpenDemo] = useState(false);

  const ajuste = result.sugestao_ajuste;
  const nota = result.nota;
  const pontos = result.pontos_fortes ?? [];
  const segmento = result.reacao_por_segmento;
  const segmentosDisponiveis = SEGMENTO_LABELS.filter(
    (s) => segmento?.[s.key] && (segmento[s.key]?.length ?? 0) > 0
  );

  async function copy() {
    if (!ajuste) return;
    try {
      await navigator.clipboard.writeText(ajuste.descricao);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  return (
    <div className="max-w-2xl space-y-2">
      <div className="rounded-2xl rounded-tl-sm bg-white p-4 shadow-sm ring-1 ring-gray-200">
        {ajuste ? (
          <>
            <div className="flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-widest text-gray-400">
                Ajuste sugerido
              </div>
              {nota ? (
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${notaColor(nota.valor)}`}
                  title="Nota atual da peça"
                >
                  Nota {nota.valor}/{nota.max}
                </span>
              ) : null}
            </div>
            <p className="mt-1.5 text-[15px] leading-relaxed text-gray-900">
              {ajuste.descricao}
            </p>
            <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                +{ajuste.impacto_estimado_pp}pp estimado
              </span>
              <button
                onClick={copy}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900"
                title="Copiar sugestão"
              >
                {copied ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M20 6L9 17l-5-5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Copiado
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <rect
                        x="9"
                        y="9"
                        width="13"
                        height="13"
                        rx="2"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      <path
                        d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                    </svg>
                    Copiar
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-400">
            Não foi possível gerar um ajuste para esta peça.
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        {pontos.length > 0 ? (
          <details
            open={openFortes}
            onToggle={(e) =>
              setOpenFortes((e.target as HTMLDetailsElement).open)
            }
            className="rounded-lg border border-emerald-200 bg-emerald-50/40"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-xs font-medium text-emerald-800 hover:text-emerald-900">
              <span>Pontos fortes ({pontos.length})</span>
              <span className="text-emerald-500">{openFortes ? "−" : "+"}</span>
            </summary>
            <ul className="space-y-3 border-t border-emerald-100 px-3 py-3">
              {pontos.map((p, i) => (
                <li key={i} className="text-sm">
                  <p className="font-medium text-gray-900">{p.ponto}</p>
                  <p className="mt-1 text-xs leading-relaxed text-gray-700">
                    {p.motivo}
                  </p>
                  <p className="mt-0.5 text-xs text-emerald-700">
                    → {p.cluster_alvo}
                  </p>
                </li>
              ))}
            </ul>
          </details>
        ) : null}

        <details
          open={openFrases}
          onToggle={(e) => setOpenFrases((e.target as HTMLDetailsElement).open)}
          className="rounded-lg border border-gray-200 bg-white"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-xs font-medium text-gray-700 hover:text-gray-900">
            <span>
              Frases problemáticas ({result.top_frases_problematicas.length})
            </span>
            <span className="text-gray-400">{openFrases ? "−" : "+"}</span>
          </summary>
          <ul className="space-y-3 border-t border-gray-100 px-3 py-3">
            {result.top_frases_problematicas.map((f, i) => (
              <li key={i} className="text-sm">
                <p className="italic text-gray-900">&ldquo;{f.frase}&rdquo;</p>
                <p className="mt-1 text-xs leading-relaxed text-gray-600">
                  {f.motivo}
                </p>
                <p className="mt-0.5 text-xs text-gray-400">
                  → {f.cluster_alvo}
                </p>
              </li>
            ))}
          </ul>
        </details>

        <details
          open={openDemo}
          onToggle={(e) => setOpenDemo((e.target as HTMLDetailsElement).open)}
          className="rounded-lg border border-gray-200 bg-white"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-xs font-medium text-gray-700 hover:text-gray-900">
            <span>Análise demográfica</span>
            <span className="text-gray-400">{openDemo ? "−" : "+"}</span>
          </summary>
          <div className="space-y-5 border-t border-gray-100 px-3 py-3">
            <div>
              <h4 className="mb-2 text-[10px] uppercase tracking-widest text-gray-500">
                Região
              </h4>
              <ul className="space-y-2">
                {result.reacao_por_regiao.map((r) => (
                  <li key={r.regiao} className="text-sm">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-gray-900">
                        {r.regiao}
                      </span>
                      <span className="text-gray-500">
                        {r.rejeicao_pct}% rejeição · {r.aprovacao_pct}% aprovação
                      </span>
                    </div>
                    <div className="mt-1 flex h-1.5 gap-0.5">
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
            </div>

            {segmentosDisponiveis.map(({ key, title }) => {
              const items = segmento?.[key] ?? [];
              if (items.length === 0) return null;
              return (
                <div key={key}>
                  <h4 className="mb-2 text-[10px] uppercase tracking-widest text-gray-500">
                    {title}
                  </h4>
                  <SegmentoBars items={items} />
                </div>
              );
            })}

            <div className="flex items-center gap-4 border-t border-gray-100 pt-3 text-[10px] text-gray-500">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-sm bg-emerald-500" /> aprovação
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-sm bg-gray-300" /> neutro
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-sm bg-red-500" /> rejeição
              </span>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}
