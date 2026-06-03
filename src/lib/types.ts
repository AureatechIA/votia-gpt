export type AnalysisStatus =
  | "pending"
  | "transcribing"
  | "analyzing"
  | "done"
  | "error";

export type ReacaoRegiao = {
  regiao: string;
  aprovacao_pct: number;
  rejeicao_pct: number;
  neutralidade_pct: number;
};

export type FraseProblematica = {
  frase: string;
  motivo: string;
  cluster_alvo: string;
};

export type AnalysisResult = {
  reacao_por_regiao: ReacaoRegiao[];
  top_frases_problematicas: FraseProblematica[];
  sugestao_ajuste: {
    descricao: string;
    impacto_estimado_pp: number;
  } | null;
};

export type AnalysisLog = {
  prompt_version: string;
  llm_model: string;
  fallback_model: string | null;
  whisper_model: string;
  personas_build: string;
  sample_personas_ids: string[];
};

export type Analysis = {
  id: string;
  storage_path: string | null;
  user_context: string | null;
  status: AnalysisStatus;
  error_message: string | null;
  transcript: string | null;
  result: AnalysisResult | null;
  analysis_log: AnalysisLog | null;
  duration_ms: number | null;
  cost_estimate_cents: number | null;
  created_at: string;
  completed_at: string | null;
};
