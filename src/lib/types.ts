export type AnalysisStatus =
  | "pending"
  | "uploading"
  | "ingesting"
  | "transcribing"
  | "analyzing"
  | "done"
  | "error";

export type InputType =
  | "video"
  | "audio"
  | "image"
  | "text"
  | "url_youtube"
  | "url_instagram"
  | "url_x"
  | "url_generic";

export type InputMeta = {
  url?: string;
  filename?: string;
  contentType?: string;
  imagePath?: string;
  source?: string;
};

export type ReacaoRegiao = {
  regiao: string;
  aprovacao_pct: number;
  rejeicao_pct: number;
  neutralidade_pct: number;
};

export type SegmentoReacao = {
  rotulo: string;
  aprovacao_pct: number;
  neutralidade_pct: number;
  rejeicao_pct: number;
};

export type ReacaoPorSegmento = {
  genero?: SegmentoReacao[];
  religiao?: SegmentoReacao[];
  escolaridade?: SegmentoReacao[];
  faixa_etaria?: SegmentoReacao[];
  classe_social?: SegmentoReacao[];
};

export type FraseProblematica = {
  frase: string;
  motivo: string;
  cluster_alvo: string;
};

export type PontoForte = {
  ponto: string;
  motivo: string;
  cluster_alvo: string;
};

export type AnalysisResult = {
  nota?: { valor: number; max: number } | null;
  reacao_por_regiao: ReacaoRegiao[];
  reacao_por_segmento?: ReacaoPorSegmento;
  pontos_fortes?: PontoForte[];
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
  conversation_id: string | null;
  turn_index: number | null;
  input_type: InputType | null;
  input_meta: InputMeta | null;
  user_message: string | null;
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

export type User = {
  id: string;
  nome: string;
  telefone: string;
  role: "user" | "admin";
};

export type Conversation = {
  id: string;
  title: string | null;
  user_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ChatMessage = {
  id: string;
  conversation_id: string;
  turn_index: number;
  input_type: InputType | null;
  input_meta: InputMeta | null;
  user_message: string | null;
  user_context: string | null;
  status: AnalysisStatus;
  error_message: string | null;
  transcript: string | null;
  result: AnalysisResult | null;
  created_at: string;
};
