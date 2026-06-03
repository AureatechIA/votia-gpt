---
title: votia-gpt — PRD Addendum (technical depth)
created: 2026-06-03
updated: 2026-06-03
---

# Addendum — Profundidade técnica e decisões deferidas a Sprint 0

Este documento complementa o `prd.md` com detalhes que pertencem ao downstream (arquitetura, solution design, Sprint 0) e não ao corpo do PRD. Ordem segue referências do PRD.

---

## §1. Herança consciente do `persona-main` v1

### 1.1 Patterns a reaproveitar

**Aggregate Engine.** Em vez de iterar uma chamada LLM por Persona (loop de 20 mil = inviável em custo e latência), pré-computa-se um **perfil estatístico agregado** por Cluster (distribuição interna por idade, gênero, ideologia auto-declarada, religiosidade, classe socioeconômica, região, indicadores comportamentais) e a chamada LLM recebe o perfil agregado de cada Cluster como input estruturado. **Uma chamada LLM por Análise** deriva scores e justificativas por Cluster.

- Validação operacional v1: custo por análise caiu de **$5,46 → $0,12** (98% de economia).
- Padrão ouro a reaproveitar; é constraint arquitetural duro do MVP (§9.3 do PRD).

**Pipeline Pre-Classifier → Context Builder → Ideological Frame.** Sequência de Especialistas resolvendo:
- Inversão de sentimento (ex: "não vou tolerar" em peça pró-armas é positivo no cluster pró-armas).
- Ambiguidade de figura pública (mencionar Bolsonaro com tom neutro lê diferente em cluster bolsonarista vs antibolsonarista).
- Framing ideológico (mesma palavra carrega valência inversa entre clusters opostos).

Validado como "vale ouro" no v1; mantido integralmente.

**Voz Prescritiva em 2ª pessoa.** Tom de "marqueteira sênior orientando" engaja substancialmente mais do que "CMO genérico relatando" — observação empírica do v1. Mantido como Voz Prescritiva no MVP.

**Prompts no Supabase com cache TTL 5 min.** Permite admin iterar sem redeploy. Pattern simples e provado.

### 1.2 Patterns a descartar

- **Arquitetura distribuída em 4 workers / 3 hosts.** No volume do MVP (≤50/dia no pico), introduz mais débito operacional (orquestração, trace cross-host, deploy 3x) do que valor. Reescrita autorizada pela diretoria. App único modular com módulos internos isolados (não fronteira de rede) substitui.
- **Loop por persona em LLM.** Substituído pelo Aggregate Engine acima.
- **Progress bar fake de 60s.** Streaming token-a-token + mensagens intermediárias reais cobrem o feedback ao usuário sem fingir progresso.
- **Prompts monolíticos de 190 linhas.** Cada Especialista tem prompt focado e versionado individualmente.

---

## §3. Trade-offs de stack LLM por Especialista (Sprint 0)

### 3.1 Motor agregado (single-call Aggregate Engine)
- **Opção A — Claude Sonnet 4.6**: forte em raciocínio estruturado e saída em formato pedido; safety filter pode bloquear conteúdo PL extremo.
- **Opção B — GPT-4o**: bom em multimodal nativo (vídeo+áudio); custo competitivo; safety filter similar.
- **Critério de decisão:** rodar 20 Análises canônicas em ambos (mesma Peça, mesmo contexto) e comparar (a) frequência de refusal, (b) qualidade da justificativa por Cluster, (c) custo total, (d) latência E2E.

### 3.2 Simulação sensível (quando motor agregado faz refusal)
- **Opção A — Llama-3.3-70B via OpenRouter**: open-weights, sem safety filter agressivo, custo médio.
- **Opção B — Qwen-2.5-72B via OpenRouter**: open-weights, multilinguagem forte, possivelmente melhor em PT-BR.
- **Opção C — Mistral Large via OpenRouter**: fallback secundário.
- **Critério:** mesmo experimento canônico que 3.1, filtrado para Peças com mensagens PL extremas onde 3.1 falha em refusal.

### 3.3 Pré-Classificador, Context Builder, Ideological Framer
Esses Especialistas operam em texto estruturado e não exigem multimodal nem tolerância a conteúdo sensível como o motor agregado. Modelos menores e mais baratos podem servir (Sonnet 4.0 Haiku, GPT-4o-mini, Llama-3.1-8B). Critério: latência baixa + custo baixo + saída JSON confiável.

### 3.4 Voz Prescritiva final
Especialista de formatação final, recebe o output do motor agregado e re-formata em 2ª pessoa marqueteira. Pode ser o mesmo modelo do motor agregado em uma segunda chamada, ou um modelo separado especializado em PT-BR coloquial-profissional.

---

## §4. API Gateway / Edge runtime (Sprint 0)

### 4.1 Cloudflare Workers
- **Pró:** latência baixa global; integração nativa com R2 (storage de vídeo); pricing previsível.
- **Contra:** runtime restrito (sem todas as libs Node); upload de vídeo grande exige proxy a R2.

### 4.2 Vercel Edge
- **Pró:** ergonomia de dev (Next.js nativo); integração simples com Supabase.
- **Contra:** custo mais alto sob volume; bandwidth limits no plano default.

**Critério de decisão:** Sprint 0 testa upload de vídeo de 100 MB em ambos, mede latência E2E + custo + ergonomia operacional.

---

## §6. Granularidade de auditoria (TSE 180d — snapshot mandatório)

> **Atualizado no Finalize (2026-06-03, T1 do triage):** o que era originalmente "best-effort" passou a ser **mandatório**, conforme PRD §10.1 e §5.5 FR-14. Razão: convergência de R1/R2/R3/R5 no reviewer gate, indefensabilidade de "talvez não temos a versão exata" em auditoria TSE formal.

### 6.1 Snapshot mandatório (sempre persistido, capturado antes da chamada LLM)
- `analysis_id`, timestamp, `user_id`, hash da Peça, contexto digitado, saída completa renderizada.
- **`prompt_versions`:** objeto com versão semver de cada Especialista (pre_classifier, context_builder, ideological_framer, aggregate_engine, voz_prescritiva) no momento exato da chamada.
- **`llm_model`:** identificador provider/nome/versão (ex: `openrouter/anthropic/claude-sonnet-4.6`).
- **`fallback_model`:** preenchido se houve roteamento por refusal.
- **`personas_build`:** id versionado da build em uso (ex: `personas-v1.0-2026-06-15`). Tabela `personas_build_inventory` mantém data de deploy, checksum e descrição de mudança de cada build.

### 6.2 Implementação
- Snapshot capturado via `BEGIN TRANSACTION` antes da chamada LLM; `analysis_log` lê do registro estático, não do cache TTL 5 min do FR-13.
- Ausência de qualquer campo no snapshot é falha de pipeline e dispara alerta no painel admin (FR-15).

### 6.3 O que fica de fora no MVP
- Reprodutibilidade bit-exato de uma Análise. LLMs com temperature>0 não permitem isso, e a TSE não exige.

### 6.4 Trigger para upgrade
- Se TSE publicar evolução da Res. 23.732 exigindo granularidade maior antes de set/2026, revisitar com jurídico. Snapshot atual já é defensável em audição formal.

---

## §7. Sprint 0 — Lista canônica de experimentos

Lista derivada de §15 do PRD, ordenada por dependência:

1. **Experimento de stack LLM (motor agregado).** 20 Análises canônicas em Claude Sonnet 4.6 e GPT-4o. Decidir vencedor.
2. **Experimento de fallback (simulação sensível).** Mesma bateria, filtrada por Peças que disparam refusal em §1. Decidir Llama vs Qwen vs Mistral.
3. **Experimento de gateway.** Upload de vídeo 100 MB em CF Workers e Vercel Edge. Decidir.
4. **Experimento de áudio.** Resemble Detect vs ElevenLabs vs Whisper-large-v3 self-hosted. Critério: qualidade de transcrição PT-BR + detecção de prosódia + custo.
5. **Spike de fine-tune LoRA local.** Avaliar viabilidade de fine-tune sobre Llama-3.3-70B com ~10k exemplos BR (notícias + transcrições políticas). Decidir se entra no MVP ou roadmap.
6. **Spike de painel real paralelo.** Decisão binária Sprint 0: (a) Quaest/Atlas/IPEC contratado; (b) partnership universitária pro-bono (UFRJ/USP/FGV); (c) sem ancoragem externa com bloqueio de comunicação externa. Default = (c). Ver PRD §14.2 SM-4.

7. **Spike de validação de Aggregate Engine em contexto político PT-BR.** v1 validou em contexto genérico; replicar 5-10 Análises canônicas comparando saída agregada vs. saída por persona-amostra de 100 Personas para detectar viés sistemático. Inputa decisões de calibração nos Especialistas.

---

## §8. Personas — pipeline offline

### 8.1 Fonte
- Microdados IBGE: Censo Demográfico (módulo de pessoas) + PNAD Contínua (módulo de renda + religião quando disponível).
- Pesos amostrais aplicados.

### 8.2 Geração
- Amostragem estratificada por (região × idade × classe × religião × ideologia auto-declarada via proxies).
- 20 mil Personas distribuídas; cada uma é um vetor de atributos + perfil sintetizado em texto curto (1–2 parágrafos).
- Pré-classificação em ~24 Clusters via clustering hierárquico sobre o vetor.

### 8.3 Atualização
- Build versionado (`personas-vMAJOR.MINOR-YYYY-MM-DD`). MVP arranca com `personas-v1.0-2026-06-15` (estimado).
- Rebuilds programados a cada release (mensal a partir do MVP).
- Pós-MVP: expansão para 50+ Clusters com features adicionais (consumo de mídia, hábito digital, peso religioso).

---

## §9. UX detalhada — referências e padrões

### 9.1 Inspirações primárias
- ChatGPT (web, desktop e mobile).
- Claude.ai (sidebar de Conversas, composer fixo).
- Gemini (toggle de tema).

### 9.2 Padrões herdados
- **Composer fixo embaixo**, com upload via botão à esquerda e botão de submit à direita.
- **Sidebar de Conversas à esquerda**, navegável por data; busca no topo.
- **Mensagens intermediárias do pipeline em "balões de sistema"** com ícones (🔍 📊 🎬 ✏️) para diferenciar de saída do usuário e saída final do produto.
- **Saída final em um único balão grande**, com seções renderizadas em markdown (negrito para palavras-chave, listas para recomendações).
- **Botões 👍/👎 em "ação footer"** abaixo da saída final, com tooltip explicando que alimentam calibração.

### 9.3 Padrões específicos do votia-gpt
- **Disclaimer permanente no rodapé do balão de Deslocamento Relativo:** "estimativa direcional — não é vote share absoluto". Em caixa de tom muted, mas sempre visível.
- **Tag de Peça analisada no topo do balão final:** thumbnail (vídeo/imagem) ou primeiras 80 chars (texto) + nome do arquivo + duração.

---

## §10. Anti-patterns explícitos (não fazer)

- Loop por Persona em LLM (volta o problema de custo do v1 pré-Aggregate Engine).
- Progress bar fake (substitui-se por mensagens intermediárias reais + streaming).
- Prompts monolíticos de >100 linhas (cada Especialista em prompt focado).
- Orquestração distribuída sem trace (causa do débito do v1).
- Esconder o disclaimer "não é vote share" para parecer mais confiante (compromete SM-C3 e abre risco regulatório/reputacional).
- Otimizar volume de Análises (SM-C1 counter-metric).
- Recomendações abstratas ("seja mais empático") — toda recomendação prescritiva tem que ser concreta.

---

*Fim do addendum. Material aqui é base para Solution Design / Architecture downstream e para Sprint 0 do roadmap.*
