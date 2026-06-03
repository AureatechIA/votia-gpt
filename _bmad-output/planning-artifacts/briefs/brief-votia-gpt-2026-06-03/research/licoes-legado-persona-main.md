# Pesquisa — Lições do legado `C:\PL\persona-main` (jun/2026)

> Digest do agente de pesquisa, executado em 2026-06-03. Apenas docs markdown foram lidos, não código TS/Python. Diretoria autorizou reaproveitamento de aprendizado (não de código/arquitetura).

## 1. O que o legado tentava fazer

"Synthetic Person / Arena Analysis v3" simulava como 20k personas brasileiras (distribuições IBGE) reagiriam a conteúdo político (post, imagem, vídeo, áudio), produzindo dashboard com scores 0-10 por segmento, comentários simulados e recomendações. Tinha também features auxiliares: DM em massa Instagram (via Apify) e chat 1:1 "encarne a persona".

## 2. Arquitetura declarada

Pipeline distribuído: Next.js (Vercel) + Python (Digital Ocean) + Supabase. Comunicação por SSE e HTTP fire-and-forget. Workers:

- **arena-worker (FastAPI)** — orquestra pipeline principal, pre-classifier semântico, classifier por batch, eventos SSE.
- **specialist-worker (FastAPI, :3011)** — 5 especialistas Claude Sonnet em paralelo (`asyncio.gather`): Comunicação Política, Religioso, Marketing Digital, Psicologia Social, Compliance Legal. Prompts vivem no Supabase (`arena_prompts`, cache 5 min, editáveis sem redeploy). Devolve consensus + divergences + 5 pareceres.
- **selfie-worker** — gera texto de resposta política para vídeo, com Quality Inspector (GPT-4o) validando regras (nome do eleitor, cidade, gênero gramatical, ausência de "PL"/"P.L.").
- **redistribuicao-worker / arena-worker electoral** — simulação de voto entre 2 candidatos, extração de críticas categorizadas, propostas para o candidato perdedor "roubar" eleitores.

Estado partilhado: Supabase (`personas`, `arena_sentiment_profile`, `arena_prompts`, `instagram_sessions`, `message_logs`).

## 3. Pipeline de análise

Conteúdo entra → Query Analyzer → Tavily Web Research (se precisar) → Context Builder (Claude Haiku, ficha factual 3-5 frases) → Ideological Frame (esquerda/direita) → Context Validator → Pre-Classifier (GPT-4o-mini, desambigua negações/ironia/figuras) → **Aggregate Engine: 1 chamada GPT-4o com perfil estatístico pré-computado (`arena_sentiment_profile`) que deriva logicamente scores por 24 clusters** — substituiu loop de 20k chamadas ($5,46 → $0,12, **economia de 98%**) → Duda Marqueteira (Claude Opus, voz prescritiva 2ª pessoa) gera headline, platformSummaries, recommendations, projectedScore. Frontend "finge" progress de 60s pra parecer que processa 20k.

## 4. Abordagem de prompting

Multi-agente em cascata, prompts longos (~190 linhas de system). Estratégias:

- **Chain-of-thought guiado** (Pre-Classifier força raciocínio sobre stance/negação antes de classificar).
- **Few-shot exaustivo** (exemplos por estado/escolaridade/geração derrotam regras abstratas).
- **Dual-frame de safety** ("dados sintéticos para pesquisa acadêmica" no início E no final).
- **Checklist obrigatório com □** no user prompt.
- **Listas PROIBIDO** (vocabulário acadêmico banido).
- **JSON enforcement duplo** (system + user).

Modelos: GPT-4o (motor agregado + comentários), GPT-4o-mini (classificadores), Claude Haiku 4.5 (context), Claude Sonnet (5 especialistas), Claude Opus (Duda + electoral). Sem RAG vetorial — "contexto" é Tavily + perfil estatístico injetado.

## 5. Dores e limitações documentadas

- **Custo explosivo:** v2 fazia 20k chamadas/análise — insustentável.
- **Safety refusal:** GPT-4o "sanitiza" perfis extremos; precisou AVISO FINAL + FALHAS COMUNS + framing acadêmico para ~40% mais compliance.
- **Homogenização:** batches grandes produzem comentários iguais; remediado com batch menor + `frequency_penalty` 0.3-0.4.
- **"Polished academic":** modelo reverte ao estilo correto mesmo para personas de Fundamental incompleto; combatido com listas PROIBIDO + checklist.
- **Inversão de sentimento** em negações/ironia → Pre-Classifier dedicado.
- **Threshold bugado** em `extractHighlights` ("100% dos evangélicos" com n=12) — corrigido para `max(30, 2%)`.
- **DM Instagram (Apify):** sessões expiram silenciosamente; cookies em formato errado; precisa fire-and-forget porque actor leva 30-90s e Vercel mata em 10-30s.
- **"Fingir progresso"** (60s de animação pra 1 chamada) admite que UX está descolada do trabalho real.

## 6. Lições para o votia

**EVITAR:**
- Loop por persona em LLM. Pré-computar perfil agregado e fazer 1 chamada que deriva scores é o padrão correto (já validado pelo legado).
- Progress bar fake de 60 s. Se a chamada é rápida, mostre rápido; se é cara, faça streaming real.
- Prompts monolíticos de 190 linhas com 15 regras numeradas — manuteníveis no curto, frágeis no longo. Modularizar (system base + plug-ins por persona type).
- Orquestrar 4+ workers em hosts diferentes (Vercel + 2 DOs + Supabase) sem trace distribuído — debug vira pesadelo.

**REAPROVEITAR:**
- **Pipeline Pre-Classifier → Context Builder → Ideological Frame.** Resolve inversão de sentimento, ambiguidade de figura pública, framing ideológico. **Vale ouro.**
- **Aggregate Engine pattern** (perfil estatístico cached + 1 chamada inferencial). Núcleo da economia de custo.
- **Voz "Duda" prescritiva em 2ª pessoa** em vez de CMO genérico — engaja muito mais usuário político.
- **Prompts no Supabase editáveis sem redeploy** (cache TTL 5 min, fallback stale) — iteração rápida sem CI.

---

**Fonte:** subagente de pesquisa interna, leitura apenas dos docs markdown do legado. Não substitui análise de código. Decisões finais de reaproveitamento devem ser feitas com revisão técnica das partes que serão herdadas.
