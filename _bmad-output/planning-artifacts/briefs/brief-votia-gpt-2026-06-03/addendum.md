---
title: votia — Addendum técnico
status: final
created: 2026-06-03
updated: 2026-06-03
audience: Dimitri (tech lead) — insumo para PRD e arquitetura
language: pt-BR
---

# votia — Addendum técnico

> Anexo do `brief.md`. Detalhamento técnico: arquitetura, patterns herdados, regulação, posicionamento, riscos.

---

## 1. Patterns herdados do `persona-main` (v1)

Decisão consciente: herdar **conceito e pipeline** do `persona-main`, descartar **arquitetura distribuída e código monolítico**. Reescrita autorizada pela diretoria.

### 1.1 Aggregate Engine (núcleo da economia)

**Problema resolvido na v1:** loop por persona em LLM = 20.000 chamadas por análise, custo de ~$5,46, latência inaceitável.

**Solução validada:** pré-computar um **perfil estatístico agregado** das 20k personas (distribuição por cluster, ideologia, geração, escolaridade, raça/cor, região etc.) e persistir no Supabase (tabela `arena_sentiment_profile` na v1). Em seguida, fazer **uma única chamada de LLM** que recebe o conteúdo + o perfil agregado e *deriva logicamente* scores por 24 clusters.

**Economia comprovada:** $5,46 → $0,12 (98% de redução).

**Implicação para votia:** mesmo padrão, possivelmente refinado para incluir embeddings vetoriais dos clusters (pgvector). Avaliar aumento de 24 → ~50 clusters para ganhar **granularidade regional** sem inflar custo. (Sprint 0.)

### 1.2 Pipeline Pre-Classifier → Context Builder → Ideological Frame

**Problema:** LLMs em single-pass invertem o sentido quando há **negação** ("Bolsonaro NÃO disse X"), **ironia** ou **figura política polarizada** (mencionar Lula ≠ apoiar Lula).

**Solução validada:**
- Pre-Classifier (GPT-4o-mini): força chain-of-thought sobre stance/negação antes de classificar.
- Context Builder (Claude Haiku): ficha factual curta sobre referências mencionadas (Tavily web search se necessário).
- Ideological Frame: classifica esquerda/direita explicitamente.

**Implicação para votia:** manter o pipeline. Avaliar substituição de Claude Haiku por modelo mais novo, mas o conceito é sólido.

### 1.3 Council of Specialists

**Conceito:** cinco "especialistas" (Comunicação Política, Religioso, Marketing Digital, Psicologia Social, Compliance Legal) rodam em paralelo com prompts diferentes sobre o mesmo conteúdo. O orquestrador agrega consenso e expõe divergências. (Implementação v1: `asyncio.gather`.)

**Por que funciona:** força perspectivas que um LLM single-pass mistura ou ignora. Especialmente útil em conteúdo polarizado.

**Implicação para votia:** manter. Considerar adicionar um sexto especialista de **análise visual** (frame, enquadramento, cor, expressão) que a v1 não tinha — diferencial natural do upgrade para vídeo nativo.

### 1.4 Voz prescritiva em 2ª pessoa

**Diferença empírica observada na v1:** output em voz "marqueteira sênior em 2ª pessoa" (*"você deve cortar os primeiros 4 segundos"*) engaja muito mais o coordenador do que voz de "consultor genérico em 3ª" (*"recomenda-se reduzir o tempo inicial"*).

Na v1 o output adotava uma persona nomeada ("Duda") em voz marqueteira sênior, 2ª pessoa.

**Implicação para votia:** manter o padrão de voz prescritiva. Personalidade pode ser nomeada (não necessariamente "Duda" — coordenação pode preferir outro nome).

### 1.5 Prompts editáveis no Supabase com cache TTL

**Conceito:** prompts vivem em tabela do Supabase (`arena_prompts` na v1), com cache TTL de 5 minutos e fallback stale.

**Por que importa:** durante campanha, ajustar prompt sem deploy é diferença entre "ajusto à noite" e "espero o próximo sprint".

**Implicação para votia:** manter. Tabela `votia_prompts` com versionamento — cruza com a exigência TSE de 180d (ver §5.1).

---

## 2. Patterns descartados do `persona-main`

| Padrão da v1 | Por que descartar | Substituição |
|---|---|---|
| Arquitetura em 4 workers (arena, specialist, selfie, redistribuicao) em 3 hosts (Vercel, 2 Digital Ocean, Supabase) | Solo dev não opera arquitetura distribuída sem trace distribuído. Debug vira pesadelo | **Um app único** com módulos internos bem isolados. Mesma separação lógica, sem fronteira de rede |
| Prompts monolíticos de ~190 linhas com 15 regras numeradas | Frágeis quando precisa ajustar uma regra; quebra cobertura das outras | **Prompts modulares:** system base + plug-ins por persona type / por especialista |
| Progress bar fake de 60 s "fingindo" processar 20k | UX descolada do trabalho real. Quebra confiança quando o usuário percebe | **Streaming real** dos estágios: "extraindo transcrição… contextualizando… simulando reação… consolidando" |
| Safety hack: framing "dados sintéticos para pesquisa acadêmica" para destravar frontier LLMs | Com dados reais, o framing é literalmente falso. E não sustentável | Avaliar **open-weights via OpenRouter** para etapa de simulação. API só onde safety filters não atrapalham |
| Apify para DM Instagram em massa | Fora do escopo. Tem outros problemas (sessões expiram, formato cookie errado) | **Fora do escopo.** Apify Instagram não entra na v2 |

---

## 3. Arquitetura macro proposta

```
┌─────────────────────────────────────────────────────────────────┐
│                    Cloudflare Pages (Next.js)                    │
│                  Front-end + chat UI + upload                    │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Edge Functions (Vercel ou CF Workers)            │
│                       API gateway + auth                         │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Orquestrador (app único)                     │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Extração    │→ │ Contexto +   │→ │  Aggregate Engine    │  │
│  │  multimodal  │  │ Pre-Class.   │  │  (1 LLM call)        │  │
│  │  (Whisper +  │  │              │  │                      │  │
│  │   frames)    │  │              │  └──────────┬───────────┘  │
│  └──────────────┘  └──────────────┘             │              │
│                                                  ▼              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │          Council of Specialists (paralelo)                │  │
│  │  político · religião · marketing · psico · compliance ·   │  │
│  │  visual (NOVO no votia)                                  │  │
│  └──────────────────────┬───────────────────────────────────┘  │
│                          ▼                                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │          Síntese final (voz prescritiva)                  │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                          Supabase                                │
│  • Auth                                                          │
│  • personas (20k+ — base IBGE expandida)                         │
│  • votia_sentiment_profile (perfil agregado pré-computado)       │
│  • votia_prompts (editáveis, versionados, com cache TTL)        │
│  • pgvector (embeddings de personas + clusters)                 │
│  • analysis_log (auditoria — exigência TSE 180d pós-eleição)    │
└─────────────────────────────────────────────────────────────────┘
```

**Princípios:**
- **Um app só.** Módulos internos bem isolados; sem fronteira de rede entre eles.
- **Stateless onde possível.** Estado em Supabase.
- **Streaming end-to-end.** SSE do orquestrador até o chat — sem progress bar fake.

---

## 4. Stack proposta

| Camada | Escolha | Por quê |
|---|---|---|
| Front-end | **Cloudflare Pages + Next.js** | Empresa já usa. Rápido, simples, monitoramento bom |
| API gateway | **Edge Functions (CF ou Vercel)** | Auth + rate limit + roteamento. `[ASSUMPTION: CF Workers vs Vercel Edge — decisão em Sprint 0]` |
| Auth + Data + Vector | **Supabase** | Empresa já usa. Auth pronta, pgvector nativo, RLS pra multi-tenant |
| LLM principal (Aggregate + análise) | **Claude Sonnet 4.6** ou **GPT-4o** | Acesso por API, qualidade alta para raciocínio agregado `[ASSUMPTION: validar custo vs qualidade em Sprint 0]` |
| LLM para simulação sensível | **Llama-3.3-70B ou Qwen-2.5-72B via OpenRouter** | Open-weights sem safety filters bloqueando conteúdo PL-coded. *Avaliar em Sprint 0* |
| LLM lightweight (classifiers) | **GPT-4o-mini ou Claude Haiku 4.5** | Custo baixo, latência baixa |
| Transcrição de vídeo | **Whisper (via API ou local)** | Padrão de fato. Versão large-v3 lida bem com português BR |
| Embeddings visuais | **CLIP ou SigLIP** | Frames-chave para análise de enquadramento e contexto visual |
| Análise de áudio (prosódia) | **A definir em Sprint 0.** Candidatos: Resemble Detect, ElevenLabs API, solução open-source. `[ASSUMPTION: validar em Sprint 0]` | — |
| Storage de mídia | **Cloudflare R2 ou Supabase Storage** | Custo previsível, sem egress fees no CF R2 |

---

## 5. Análise regulatória detalhada

Resumo dos achados em `research/regulacao-tse-lgpd.md`. Pontos críticos para arquitetura:

### 5.1 Resolução TSE 23.732/2024

- **Art. 9º-B:** deepfakes proibidos (não se aplica ao votia — não gera).
- **Art. 9º-C:** rotulagem ostensiva exigida para conteúdo de IA usado em propaganda (não se aplica ao votia v1 — não publica).
- **Art. 9º-D:** campanhas devem manter registro de uso de IA por 180 dias após pleito (**aplicável**).

**Decisão arquitetural:** tabela `analysis_log` no Supabase persiste cada análise (input, output, modelo usado, prompts versionados) por **no mínimo 180 dias pós-eleição**. RLS restringe acesso à campanha e a auditores autorizados.

### 5.2 LGPD

- Dados IBGE públicos: livres.
- Conexão futura com CRM eleitoral: exige **RIPD** e base legal documentada. **Manter módulo CRM isolado por design** — banco separado do módulo principal e gated por feature flag.

### 5.3 Risco reputacional PL

O PL opera sob escrutínio reforçado no ciclo atual (TSE + imprensa + STF). Mitigações operacionais:
- **Opinion letter jurídica** antes do go-live (sugerido).
- **Cláusula de uso ético** no contrato.
- **Zero acoplamento a bases externas não-auditáveis.**

---

## 6. Posicionamento competitivo

Resumo dos achados em `research/state-of-the-art-persona-sim.md`:

- **Não há player BR dominante** em "painel LLM-simulado para política". Quaest, Atlas, IPEC fazem pesquisa tradicional. Aaru (US) tenta, com acurácia mista.
- **Literatura mostra:** LLMs decentes em ranking relativo, ruins em vote share absoluto. **votia está alinhado com isso** — o posicionamento explícito do produto é "sinal direcional, não placar absoluto".
- **Sub-representação BR em LLMs frontier:** Nordeste, evangélico, periferia, baixa escolaridade. Mitigação: ancorar em dados reais IBGE expandidos (já temos) + considerar fine-tune leve (LoRA) sobre **outputs validados contra pesquisa real**.
- **Stack de vídeo + reação por segmento é greenfield** — moat real se votia for o primeiro a entregar.

---

## 7. Métricas de sucesso (proposta)

| Métrica | Alvo MVP | Como medir |
|---|---|---|
| Tempo de análise por vídeo | < 3 min para vídeo de até 2 min | Telemetria |
| Custo por análise | < $0,50 (com vídeo) | Soma de tokens + Whisper + storage |
| Concordância qualitativa com coordenação | ≥70% das análises marcadas como "acertou o tom" em survey pós-uso (escala 3 estrelas + comentário livre) | Survey curta pós-análise |
| Concordância com pesquisa real | Direção do sentimento bate em ≥80% dos clusters quando há pesquisa paralela | Auditoria mensal contra pesquisa do PL |
| Adoção | ≥5 análises/semana até ago/2026 | Telemetria |
| Disponibilidade | 99% durante semanas de campanha | Uptime monitor |

---

## 8. Open questions e `[ASSUMPTION]` a resolver em Sprint 0

Lista canônica das tags `[ASSUMPTION]` no brief e neste addendum, mais perguntas abertas que precisam decisão antes do PRD final:

1. **Candidato presidencial:** apoiamos um único candidato do PL ou múltiplos pré-candidatos em paralelo? Afeta UX de seleção e isolamento de dados.
2. **Volume esperado de análises:** ~5/semana (uso piloto) ou ~50/dia (uso pleno)? Afeta arquitetura de fila e custo.
3. **Stack de modelos LLM específica:** Claude Sonnet 4.6 vs GPT-4o para o motor principal; Llama-3.3-70B vs Qwen-2.5-72B para simulação sensível. Validar custo vs qualidade.
4. **API gateway:** CF Workers vs Vercel Edge — decisão em Sprint 0.
5. **Análise de áudio (prosódia):** Resemble Detect, ElevenLabs API ou solução open-source — bench em Sprint 0.
6. **Fine-tune local:** vale treinar LoRA sobre Llama/Qwen com saídas calibradas, ou prompting + dados ricos é suficiente?
7. **Validação metodológica:** vamos contratar 1 onda de pesquisa Quaest paralela ao MVP para ancorar resultados, ou aceitamos calibração só interna?
8. **Apresentação ao cliente:** deck + demo ao vivo? Documento? Vídeo gravado? Combina com aprovação do brief.
9. **Multi-tenant:** se o roadmap regional decolar, vamos isolar campanhas (governador A vs governador B) em tenants separados ou tudo no mesmo? Decisão de RLS Supabase.
