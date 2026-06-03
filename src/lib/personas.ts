import { supabaseServer } from "./supabase";

export type PersonaSnippet = {
  id: string;
  cluster_id: string | null;
  nome_grupo: string | null;
  region_br: string | null;
  age: number;
  gender_identity: string | null;
  social_class: string | null;
  political_leaning: string | null;
  archetype_primary: string | null;
  voto_2026: string | null;
  q_avaliacao_bolsonaro: string | null;
  q_situacao_economica: string | null;
  q_familia_tradicional: string | null;
  q_midia_principal: string | null;
};

export type ClusterSummary = {
  cluster_id: string;
  nome_grupo: string | null;
  total: number;
  political_leaning_mode: string | null;
  voto_2026_dominante: string | null;
  social_class_predominante: string | null;
};

export async function getClusterSummaries(): Promise<ClusterSummary[]> {
  const sb = supabaseServer();
  const { data, error } = await sb.rpc("cluster_summaries");
  if (error) throw new Error(`cluster_summaries: ${error.message}`);
  return (data as ClusterSummary[]) ?? [];
}

export async function sampleRepresentativePersonas(
  count: number = 100
): Promise<PersonaSnippet[]> {
  const sb = supabaseServer();
  const { data, error } = await sb.rpc("sample_personas", {
    sample_count: count,
  });
  if (error) throw new Error(`sample_personas: ${error.message}`);

  const rows = (data as Record<string, unknown>[]) ?? [];
  return rows.map((r) => ({
    id: r.id as string,
    cluster_id: (r.cluster_id as string) ?? null,
    nome_grupo: (r.nome_grupo as string) ?? null,
    region_br: (r.region_br as string) ?? null,
    age: (r.age as number) ?? 0,
    gender_identity: (r.gender_identity as string) ?? null,
    social_class: (r.social_class as string) ?? null,
    political_leaning: (r.political_leaning as string) ?? null,
    archetype_primary: (r.archetype_primary as string) ?? null,
    voto_2026: (r.voto_2026 as string) ?? null,
    q_avaliacao_bolsonaro: (r.q_avaliacao_bolsonaro as string) ?? null,
    q_situacao_economica: (r.q_situacao_economica as string) ?? null,
    q_familia_tradicional: (r.q_familia_tradicional as string) ?? null,
    q_midia_principal: (r.q_midia_principal as string) ?? null,
  }));
}
