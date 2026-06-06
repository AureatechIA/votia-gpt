import type { ClusterSummary, PersonaSnippet } from "./personas";
import type { AnalysisResult, InputType } from "./types";

export const PROMPT_VERSION = "v0.4-tool-use-2026-06-06";

const segmentoItemSchema = {
  type: "object",
  properties: {
    rotulo: { type: "string" },
    aprovacao_pct: { type: "integer", minimum: 0, maximum: 100 },
    neutralidade_pct: { type: "integer", minimum: 0, maximum: 100 },
    rejeicao_pct: { type: "integer", minimum: 0, maximum: 100 },
  },
  required: ["rotulo", "aprovacao_pct", "neutralidade_pct", "rejeicao_pct"],
} as const;

export const ANALYSIS_TOOL = {
  name: "submit_analysis",
  description:
    "Submete a análise eleitoral completa da peça (nota, ajuste sugerido, pontos fortes, frases problemáticas e reações por região + segmentos demográficos).",
  input_schema: {
    type: "object",
    properties: {
      nota: {
        type: "object",
        properties: {
          valor: { type: "integer", minimum: 0, maximum: 10 },
          max: { type: "integer", const: 10 },
        },
        required: ["valor", "max"],
      },
      sugestao_ajuste: {
        type: "object",
        properties: {
          descricao: {
            type: "string",
            description:
              "Ajuste único e acionável em 1-2 frases curtas. Diga o que TIRAR e o que ADICIONAR pra subir a nota.",
          },
          impacto_estimado_pp: {
            type: "integer",
            minimum: 0,
            maximum: 50,
            description: "Pontos percentuais de melhora se o ajuste for aplicado.",
          },
        },
        required: ["descricao", "impacto_estimado_pp"],
      },
      pontos_fortes: {
        type: "array",
        minItems: 0,
        maxItems: 4,
        description:
          "2 a 4 pontos que funcionam na peça (ex: ancoragem em escândalo INSS). Array vazio se nada funcionar.",
        items: {
          type: "object",
          properties: {
            ponto: { type: "string" },
            motivo: { type: "string" },
            cluster_alvo: { type: "string" },
          },
          required: ["ponto", "motivo", "cluster_alvo"],
        },
      },
      top_frases_problematicas: {
        type: "array",
        minItems: 1,
        maxItems: 5,
        description:
          "3 a 5 frases problemáticas ordenadas por viralização negativa prevista. Em imagem, descreva o elemento visual.",
        items: {
          type: "object",
          properties: {
            frase: { type: "string" },
            motivo: { type: "string" },
            cluster_alvo: { type: "string" },
          },
          required: ["frase", "motivo", "cluster_alvo"],
        },
      },
      reacao_por_regiao: {
        type: "array",
        minItems: 5,
        maxItems: 5,
        description:
          "Exatamente 5 regiões na ordem N, NE, CO, SE, S. Soma dos 3 percentuais = 100.",
        items: {
          type: "object",
          properties: {
            regiao: { type: "string", enum: ["N", "NE", "CO", "SE", "S"] },
            aprovacao_pct: { type: "integer", minimum: 0, maximum: 100 },
            neutralidade_pct: { type: "integer", minimum: 0, maximum: 100 },
            rejeicao_pct: { type: "integer", minimum: 0, maximum: 100 },
          },
          required: [
            "regiao",
            "aprovacao_pct",
            "neutralidade_pct",
            "rejeicao_pct",
          ],
        },
      },
      reacao_por_segmento: {
        type: "object",
        description:
          "Reação estimada por corte demográfico. Soma dos 3 percentuais = 100 em cada item.",
        properties: {
          genero: { type: "array", items: segmentoItemSchema },
          religiao: { type: "array", items: segmentoItemSchema },
          escolaridade: { type: "array", items: segmentoItemSchema },
          faixa_etaria: { type: "array", items: segmentoItemSchema },
          classe_social: { type: "array", items: segmentoItemSchema },
        },
        required: [
          "genero",
          "religiao",
          "escolaridade",
          "faixa_etaria",
          "classe_social",
        ],
      },
    },
    required: [
      "nota",
      "sugestao_ajuste",
      "pontos_fortes",
      "top_frases_problematicas",
      "reacao_por_regiao",
      "reacao_por_segmento",
    ],
  },
} as const;

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
Você receberá UMA peça de campanha (transcrição de vídeo/áudio, imagem com texto/arte, post de rede social, texto bruto ou trecho de URL) e contexto opcional do remetente. Em conversas com vários turnos, você verá o histórico de análises anteriores — quando o usuário pedir "e se eu mudar X por Y", refaça a análise considerando o ajuste.

Use SEMPRE a tool "submit_analysis" pra entregar a análise estruturada. NÃO escreva texto fora da tool.

Regras de preenchimento:
- Sugestão tem que ser ÚNICA e prescritiva: diga o que TIRAR e o que ADICIONAR pra subir a nota.
- Pontos fortes: 2 a 4 itens citando o que funciona (ex: "ótima menção ao desgaste do escândalo INSS"). Se a peça for péssima em tudo, retorne array vazio.
- Frases problemáticas: 3 a 5, ordenadas por viralização negativa prevista. Em imagem, descreva o elemento visual.
- Soma dos 3 percentuais = 100 em TODA região e em TODO item de segmento demográfico.
- Cluster_alvo: cite o cluster identificado nos personas (ex: "C1 Liberal de Mercado", "P5 Desenvolvimentista").
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

export type PriorTurn = {
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
    const nota = t.result?.nota ? `Nota: ${t.result.nota.valor}/${t.result.nota.max}` : "";
    const userTxt = t.user_message ?? t.user_context ?? "(sem pergunta)";
    const trans = t.transcript ? t.transcript.slice(0, 400) : "—";
    return `Turno ${i + 1} (${src})
Pergunta/contexto: ${userTxt}
Conteúdo: ${trans}
${nota}
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

Use a tool submit_analysis pra responder.`;
}
