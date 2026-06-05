import type { ClusterSummary, PersonaSnippet } from "./personas";
import type { AnalysisResult, InputType } from "./types";

export const PROMPT_VERSION = "v0.2-chat-multimodal-2026-06-05";

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
Você receberá UMA peça de campanha (pode ser: transcrição de vídeo/áudio, imagem com texto/arte, post de rede social, texto bruto ou trecho de URL) e contexto opcional do remetente. Em conversas com vários turnos, você verá o histórico de análises anteriores — quando o usuário pedir "e se eu mudar X por Y", refaça a análise considerando o ajuste.

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
    {"frase": "trecho literal ou descrição da imagem", "motivo": "por que vai repercutir mal", "cluster_alvo": "qual cluster sente mais"}
  ],
  "sugestao_ajuste": {
    "descricao": "ajuste único e acionável, em 1-2 frases curtas e diretas (como resposta de chat)",
    "impacto_estimado_pp": 0
  }
}

Restrições rígidas:
- 5 regiões obrigatórias na ordem N, NE, CO, SE, S.
- Soma dos 3 percentuais por região = 100 (números inteiros, 0-100).
- 3 a 5 frases problemáticas (ordene por viralização negativa prevista). Em imagem, descreva o elemento visual problemático.
- 1 sugestão única (não múltiplas).
- impacto_estimado_pp: pontos percentuais de melhora estimada (número inteiro 0-50).
- NUNCA rotular conteúdo como ilegal — não é seu papel.

Tom da sugestão: marqueteiro sênior, prescritivo, direto, sem floreios, sem hedging — formato chat curto.`;
}

const SOURCE_LABEL: Record<InputType, string> = {
  video: "vídeo (transcrição de áudio)",
  audio: "áudio (transcrição)",
  image: "imagem da peça",
  text: "texto bruto da peça",
  url_youtube: "vídeo do YouTube (legenda + metadados)",
  url_instagram: "post do Instagram (metadados públicos)",
  url_x: "post do X/Twitter (metadados públicos)",
  url_generic: "conteúdo da URL",
};

export function sourceLabel(t: InputType): string {
  return SOURCE_LABEL[t] ?? "peça";
}

type PriorTurn = {
  user_message: string | null;
  user_context: string | null;
  input_type: InputType | null;
  transcript: string | null;
  result: AnalysisResult | null;
};

export function buildHistoryBlock(prior: PriorTurn[]): string {
  if (prior.length === 0) return "";
  const lines = prior.map((t, i) => {
    const src = t.input_type ? sourceLabel(t.input_type) : "—";
    const ajuste = t.result?.sugestao_ajuste
      ? `${t.result.sugestao_ajuste.descricao} (+${t.result.sugestao_ajuste.impacto_estimado_pp}pp)`
      : "—";
    const userTxt = t.user_message ?? t.user_context ?? "(sem pergunta)";
    const trans = t.transcript ? t.transcript.slice(0, 400) : "—";
    return `Turno ${i + 1} (${src})
Pergunta/contexto: ${userTxt}
Conteúdo: ${trans}
Ajuste sugerido na época: ${ajuste}`;
  });
  return `\n\n## Histórico desta conversa\n${lines.join("\n---\n")}`;
}

export function buildTextUserMessage(args: {
  inputType: InputType;
  transcript: string;
  userMessage: string | null;
  userContext: string | null;
  history: PriorTurn[];
}): string {
  const { inputType, transcript, userMessage, userContext, history } = args;
  const src = sourceLabel(inputType);
  const ctx = (userContext ?? userMessage ?? "").trim();
  return `${buildHistoryBlock(history)}

## Nova peça (fonte: ${src})
${transcript}

## Pergunta/contexto do usuário neste turno
${ctx || "(não informado — apenas analisar a peça)"}

Retorne o JSON.`;
}
