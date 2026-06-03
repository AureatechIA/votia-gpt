# Review — Edge Case Hunter

**Verdict:** PRD cobre happy path e edge cases óbvios, mas deixa **45+ cenários não tratados ou ambíguos** em 10 áreas. Gaps mais severos: (1) validação multimodal de Peça; (2) cascata de refusal LLM; (3) estabilidade de streaming; (4) conflito legal LGPD vs TSE; (5) sanitização de feedback XSS.

**Distribuição:**
- 🔴 P1 (Blockers MVP): 11 casos
- 🟠 P2 (Debt técnico pós-Sprint 1): 24 casos
- 🟢 P3 (Nice-to-have): 10 casos

## Top 5 edge cases críticos (P1–P2)

**1. [P1] Refusal cascade total** — Todos os 3 fallbacks LLM recusam. FR-5/6 não especifica resposta ao usuário. Bloqueia análise legítima de ~30–40% das peças PL extremas.

**2. [P1] Codec/áudio inválido em arquivo .mp4 com header válido** — FR-4 valida extensão/tamanho mas não integridade ou compatibility. Análise inicia, transcriptor falha, erro genérico.

**3. [P2] Conflito legal LGPD vs TSE 180d retention** — §10.1 e §10.2 não resolvem quem vence se usuário pede exclusão. Opinion letter (§10.3) precisa cobrir.

**4. [P2] Streaming interrompido mid-análise (4G mobile cai)** — UI parcial (30%), estado não persistido, ao reabrir não há nada. FR-6 não cobre.

**5. [P2] Admin salva prompt vazio ou syntax-inválido** — FR-13 não valida antes de cache TTL ativar. Próximas análises falham em cascata.

## Gaps por área (resumo)

### 1. Upload e Validação de Peça (FR-4) — 9 cenários
- Codec inválido com header correto (P1)
- Vídeo exato 2:00 vs 2:01 — limite ambíguo (P2)
- Áudio só / vídeo só / sem áudio (P1)
- EXIF GPS em imagem — privacidade (P2)
- Texto em outro idioma — choque com FR-18 PT-BR (P2)
- Arquivo zero-byte (P2)
- Upload interrompido por refresh do browser (P2)
- Arquivo corrompido (P1)
- Legenda embutida (SRT) (P3)

### 2. Pipeline de Análise (FR-5/6/7) — 11 cenários
- Refusal cascade total (P1)
- Streaming interrompido (P2)
- Timeout em mensagem intermediária (P2)
- P95 > 5 min sem circuit-breaker (P2)
- Áudio vazio / silencioso (P2)
- Conteúdo ilegal embarcado (P1)
- Fato verificável falso — votia valida? (P2)
- Análise cancelada / browser fechado mid-stream (P2)
- Rollback de prompt mid-análise (P2)
- Provider offline mid-streaming (P1)
- Modelo deprecated pelo provider (P2)

### 3. Histórico e Multi-thread (FR-8/9/10) — 6 cenários
- Fila >3 análises — ETA não comunicado (P2)
- 100k mensagens em conversa — escalabilidade (P3)
- Busca query em outro idioma (P2)
- Usuário deletado — analysis_log órfão? (P2)
- Conversa >1 ano — limpeza automática? (P3)
- Análise individual deletada (P2)

### 4. Auth e Roles (FR-1/2/3) — 6 cenários
- Último admin rebaixa por engano (P2)
- Email duplicado em reset (P2)
- Usuário deletado tenta reset (P2)
- Sessão expirada mid-análise (P2)
- 2 abas do mesmo usuário (P2)
- Rate-limit em reset — valores não especificados (P2)

### 5. Feedback (FR-11/12) — 5 cenários
- Spam 👍/👎 rápido — debounce não mencionado (P2)
- XSS no comentário (P1) — sanitização não descrita
- Feedback antes do streaming terminar (P3)
- Feedback em análise com erro parcial (P2)
- Reverter feedback — histórico onde? (P3)

### 6. Admin (FR-13/14/15) — 7 cenários
- Prompt vazio salvo (P1)
- Prompt com syntax erro — validação? (P1)
- Export CSV > 10k linhas — paginação? (P2)
- Painel de custo sem dados de provider (P2)
- Diff de revert recursivo (P3)
- Alarme de custo — auto-silence ou ação? (P2)
- Análise pré-MVP — visível na auditoria? (P3)

### 7. Tema, Mobile, Idioma (FR-16/17/18) — 7 cenários
- Toggle tema mid-streaming — CSS quebra? (P2)
- Mobile 4G intermitente em upload (P2)
- Vídeo em inglês — análise PT-BR (P2)
- Copy-paste formatado (P2)
- Dark theme OLED — #000 vs #111? (P3)
- Acessibilidade mobile WCAG (P3)
- Tipografia fallback (P3)

### 8. Auditoria TSE (analysis_log) — 4 cenários
- Rotação de prompt mid-análise — qual versão loga? (P2)
- Deleção acidental do DB (P1)
- Modelo deprecated pelo provider (P2)
- Snapshot de Personas deletado (P2)

### 9. Capacidade — 4 cenários
- Fila >50 análises/dia (P2)
- Provider rate-limit no pico (P1)
- Custo estoura alarme — cap automático? (P2)
- Bottleneck de transcrição (P2)

### 10. Privacidade — 3 cenários
- LGPD vs TSE conflict (P1)
- Rosto identificável (candidato/figura) (P2)
- Cache de embeddings vaza entre Usuários (P1)

## Recomendações imediatas (Sprint 0)

1. Especificar validação multimodal (codec, áudio/vídeo, integridade, rejeição com mensagem concreta).
2. Design de fallback LLM: refusal total → resposta partial + disclaimer ou erro?
3. Resolver LGPD vs TSE — opinion letter deve cobrir.
4. Streaming recovery: persistir estado parcial, permitir resume.
5. Input sanitization: escape XSS em feedback, validar prompt syntax antes de ativar.
6. Rate-limit e backoff: definir retry strategy, comunicar posição em fila + ETA.
