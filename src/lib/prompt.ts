import type { ClusterSummary, PersonaSnippet } from "./personas";

export const PROMPT_VERSION = "v0.1-demo-2026-06-03";

export function buildSystemPrompt(
  clusters: ClusterSummary[],
  personas: PersonaSnippet[]
): string {
  const clusterSection = clusters
    .map(
      (c) =>
        `- Cluster ${c.cluster_id} (${c.nome_grupo ?? "—"}): ${c.total} personas. ` +
        `Político: ${c.political_leaning_mode ?? "—"}. ` +
        `Voto 2026: ${c.voto_2026_dominante ?? "—"}. ` +
        `Classe: ${c.social_class_predominante ?? "—"}.`
    )
    .join("\n");

  const personaSection = personas
    .map(
      (p) =>
        `[${p.region_br ?? "—"}|${p.cluster_id ?? "—"}] ` +
        `${p.age}a ${p.gender_identity ?? "—"}, ${p.social_class ?? "—"}, ` +
        `${p.political_leaning ?? "—"}, voto 2026: ${p.voto_2026 ?? "—"}, ` +
        `Bolso: ${p.q_avaliacao_bolsonaro ?? "—"}, ` +
        `economia: ${p.q_situacao_economica ?? "—"}, ` +
        `família: ${p.q_familia_tradicional ?? "—"}, ` +
        `mídia: ${p.q_midia_principal ?? "—"}.`
    )
    .join("\n");

  return `Você é um analista político-eleitoral sênior do Brasil 2026.
Sua missão: prever como uma peça de campanha do PL (Partido Liberal) repercutirá no eleitorado ANTES da publicação.

## Contexto eleitoral
- Eleição presidencial em outubro/2026.
- PL é o principal partido do campo bolsonarista.
- Base referência: 20 mil personas IBGE-based, 18 clusters, 5 regiões (N, NE, CO, SE, S).

## Clusters principais (estatísticas agregadas)
${clusterSection}

## Personas qualitativas representativas (${personas.length} amostradas aleatoriamente)
${personaSection}

## Tarefa
Você receberá: (1) transcrição de áudio do vídeo da peça e (2) contexto curto do remetente sobre o tipo de peça.

Retorne EXCLUSIVAMENTE um objeto JSON com este schema exato (sem markdown, sem code blocks, sem texto fora do JSON):

{
  "reacao_por_regiao": [
    {"regiao": "N", "aprovacao_pct": 0, "rejeicao_pct": 0, "neutralidade_pct": 0},
    {"regiao": "NE", "aprovacao_pct": 0, "rejeicao_pct": 0, "neutralidade_pct": 0},
    {"regiao": "CO", "aprovacao_pct": 0, "rejeicao_pct": 0, "neutralidade_pct": 0},
    {"regiao": "SE", "aprovacao_pct": 0, "rejeicao_pct": 0, "neutralidade_pct": 0},
    {"regiao": "S",  "aprovacao_pct": 0, "rejeicao_pct": 0, "neutralidade_pct": 0}
  ],
  "top_frases_problematicas": [
    {"frase": "trecho literal", "motivo": "por que vai repercutir mal", "cluster_alvo": "qual cluster sente mais"}
  ],
  "sugestao_ajuste": {
    "descricao": "ajuste único e acionável",
    "impacto_estimado_pp": 0
  }
}

Restrições rígidas:
- 5 regiões obrigatórias na ordem N, NE, CO, SE, S.
- Soma dos 3 percentuais por região = 100 (números inteiros, 0-100).
- 3 a 5 frases problemáticas (ordene por viralização negativa prevista).
- 1 sugestão única (não múltiplas).
- impacto_estimado_pp: pontos percentuais de melhora estimada (número inteiro 0-50).
- NUNCA rotular conteúdo como ilegal — não é seu papel.

Tom: marqueteiro sênior, prescritivo, sem floreios, sem hedging.`;
}

export function buildUserMessage(
  transcript: string,
  userContext: string
): string {
  return `## Transcrição do vídeo
${transcript}

## Contexto do remetente
${userContext || "(não informado)"}

Retorne o JSON.`;
}
