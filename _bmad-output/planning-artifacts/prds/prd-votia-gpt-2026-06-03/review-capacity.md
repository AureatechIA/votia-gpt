# Review — Solo-Dev Capacity Reviewer (4 meses)

**Verdict:** MVP é viável para 1 dev em ~16 semanas **se Sprint 0 não for responsabilidade de Dimitri e codebase `persona-main` v1 estiver disponível**; caso contrário, faltam 2–4 semanas.

## Estimativas de esforço (semanas, P50, incluindo testes e docs)

| Área | Semanas | Caminho crítico? | Risco |
|---|---|---|---|
| Sprint 0 (LLM, gateway, áudio) | 2–3 | ✅ BLOQUEIA tudo | 🔴 |
| Auth (FR-1–3) | 1.5–2 | Paralelo a Sprint 0 | 🟢 |
| Análise Core (FR-4–7) | 5–6 | ✅ CRÍTICO | 🟠 |
| Histórico (FR-8–10) | 2–2.5 | Depois de core | 🟢 |
| Feedback (FR-11–12) | 1–1.5 | Depois de core | 🟢 |
| Admin (FR-13–15) | 2.5–3 | Depois de core | 🟡 |
| Tema + Mobile (FR-16–18) | 1–1.5 | Paralelo com admin | 🟢 |
| Testes E2E + polish | 2–3 | Final | 🟠 |
| Buffer + mitigação | 1–2 | Contingência | — |
| **Total path crítico** | **16–18 sem** | | |
| **Disponível** | **16 sem** | | ⚠️ |

## Top 5 achados

### 1. [CRÍTICO] Sprint 0 é gargalo invisível (1–3 semanas)
PRD devolve 6 open questions técnicas para Sprint 0 mas não diz quem executa experimentos. Se Dimitri fica com isso, perde 2 semanas de dev imediatamente.
**Mitigação:** alocar research/analytics eng externo para rodar 20 análises canônicas Claude vs GPT + Llama vs Qwen + gateways + áudio; entregar spec para Dimitri em semana 2.

### 2. [CRÍTICO] Pipeline multi-Especialista (5 em sequência) é risco técnico não-linear
Arquitetura com fallback de refusal tem complexidade oculta: serialização de estado entre Especialistas, tratamento de erro cascata, logging auditável.
**Mitigação:** 3–4 dias de spike de design robusto antes de impl; considerar simplificar para 3 Especialistas no MVP (defer Context Builder + Ideological Framer para Sprint 2).

### 3. [ALTO] Latência SLA (P50 ≤ 3 min) é apertado sem margem
Breakdown: transcrição 30–60s + Pre-Classifier 15–25s + Context Builder 15–25s + Ideological Framer 15–25s + Aggregate Engine 30–40s + Voz Prescritiva 10–20s + overhead 10–15s = **2:25–3:30 min**. Fallback Llama mais lento explode SLA.
**Mitigação:** load test na semana 4–5, não semana 12. Considerar paralelizar onde possível.

### 4. [ALTO] Personas + Aggregate Engine — conhecimento implícito em v1
Herança assume que geração de 20k Personas + pré-clustering + perfil agregado está documentado e reutilizável. Se v1 não está em forma produtiva, recriar = +2–3 semanas.
**Mitigação:** auditar codebase v1 imediatamente.

### 5. [ALTO] Admin panel + auditoria TSE podem virar debt se deixados para final
FR-14/15 são "low-adoption-impact" mas se ficam para semanas 12–14, bugs em compliance não têm tempo de arrumar.
**Mitigação:** implementar em paralelo com core; testar cedo.

## Pontos de quebra

- **Quebra 1:** Sprint 0 atrasa + core não-paralelizável → -2-3 semanas, total 18–20 sem (4 além da janela).
- **Quebra 2:** Pipeline LLM instável na semana 4–5, rewrite → -1-2 semanas + cascata.
- **Quebra 3:** Latência falha em teste, re-arquitetura → -1 semana ou redução de features.
- **Quebra 4:** Admin + auditoria descobre bugs na semana 12–14, sem tempo de arrumar.

## Scope cuts obrigatórios se janela apertar

| Feature | Impacto | Esforço salvo | Ordem |
|---|---|---|---|
| FR-15 (Painel de custo real-time) | Baixo | 1 sem | Cut primeiro |
| FR-14 (Export CSV `analysis_log`) | Médio | 1 sem | Cut se apertar |
| FR-10 (Busca em histórico) | Médio | 0.5 sem | Cut se apertar |
| Fine-tune LoRA Sprint 0 Q4 | Médio | 2 sem | Defer Sprint 2 |
| FR-17 (Mobile responsivo completo) | Médio | 0.5–1 sem | Cut parcial |
| Painel Quaest Sprint 0 Q5 | Alto | N/A externo | Defer pós-go-live |

**Piso inegociável:** FR-1–3 (auth), FR-4–7 (core), FR-8/9 (histórico), FR-11 (feedback), FR-13 (editar prompts), FR-16/18 (tema/PT-BR).

## Timeline realista

| Sem | Atividade | Owner |
|---|---|---|
| 1 | Sprint 0 | Externo (CRÍTICO) |
| 1–2 | Auth | Dimitri (paralelo) |
| 2–3 | Arquitetura + design pipeline | Dimitri |
| 3–5 | FR-4–7 Core | Dimitri |
| 5–7 | FR-8–10 Histórico | Dimitri |
| 6–7 | FR-11/12 Feedback | Dimitri |
| 6–7 | FR-13/14/15 Admin | Dimitri |
| 7 | FR-16/17/18 | Dimitri |
| 8 | Testes E2E | Dimitri |
| 9–10 | Polish + perf | Dimitri |
| 11–16 | Buffer contingência | Dimitri |

## Questões críticas pré-semana 2

1. Sprint 0 não é de Dimitri?
2. Codebase `persona-main` v1 existe e está documentado?
3. Fine-tune LoRA é pré-condição de MVP?
4. Painel Quaest é pré-condição?
5. Admin panel é drop-dead obrigatório? Ou MVP-lite sem FR-14/15?

## Recomendações

**Faz agora:** tirar Sprint 0 de Dimitri; usar codebase v1 agressivamente; congelar scope em 18 FRs; spike de pipeline 3-4 dias antes de impl.

**Faz com cuidado:** load tests cedo; admin paralelo com core; check-in semanal.

**Não faz:** fine-tune LoRA no MVP; painel Quaest antes de go-live; comparador A/B; i18n; app nativo; multi-tenant.
