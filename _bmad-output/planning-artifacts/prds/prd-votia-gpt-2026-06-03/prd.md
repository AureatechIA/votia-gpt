---
title: votia-gpt
status: final
created: 2026-06-03
updated: 2026-06-03
---

# PRD: votia-gpt
*Working title — confirmar.*

## 0. Propósito do Documento

Este PRD é dirigido primariamente a **Dimitri (tech lead / solo dev)** como contrato de implementação para o ciclo eleitoral de outubro/2026. É lido também pela **Coordenação de Campanha** e **Assessoria de Imprensa do PL** (usuários finais que validam comportamento) e pode ser revisto por **assessoria jurídica eleitoral** antes da implantação em produção.

O documento se estrutura assim: vocabulário ancorado no Glossário (§4); features agrupadas com Functional Requirements (FRs) numerados globalmente; cross-cutting NFRs, Constraints, Compliance e Riscos em seções dedicadas; assunções marcadas inline com `[ASSUMPTION]` e indexadas em §16. Questões deferidas a **Sprint 0** ou ao cliente aparecem como `[NOTE FOR PM]`.

**Insumos prévios** (este PRD constrói sobre, não duplica):
- Product Brief votia-gpt (2026-06-03) — `_bmad-output/planning-artifacts/briefs/brief-votia-gpt-2026-06-03/brief.md` + `addendum.md` + `research/`.
- Patterns herdados do projeto `persona-main` v1 — referenciados em §13 e detalhados no `addendum.md` deste PRD.

Detalhes técnicos profundos (Sprint 0 trade-offs, opções de stack LLM, fine-tune LoRA, comparativos de gateway) ficam em **`addendum.md`** ao lado deste documento, não no corpo do PRD.

---

## 1. Visão

O **votia-gpt** é um assistente de IA que prevê como o eleitorado brasileiro reagirá a uma peça de campanha — vídeo, imagem ou texto — **antes** da publicação, segmentado por aproximadamente 20 mil personas reais derivadas de microdados públicos do IBGE. A coordenação de campanha sobe a peça no chat, descreve o contexto, e em ~3 minutos recebe um mapa estruturado de aceitação por segmento eleitoral, justificativa em linguagem natural por faixa demográfica, estimativa de **deslocamento relativo** de intenção e recomendação prescritiva ("refilme o trecho 0:42", "troque a palavra X"). A viabilidade econômica do produto (~$0,50 por análise em vez de ~$5+ no estado da arte) repousa no **Aggregate Engine** herdado do `persona-main` v1: uma única chamada LLM por análise deriva scores por Cluster a partir de perfil estatístico agregado, em vez de iterar 20 mil chamadas.

Hoje a coordenação testa peças por instinto e mede engajamento **depois** da publicação — quando o estrago ou o benefício já estão dados, e o ciclo de iteração custa horas em redes que movem aceitação em minutos. O votia-gpt fecha esse loop: a peça é testada antes, recebe leitura por segmento, é refinada até "cair bem", e só então vai ao ar.

O produto importa **agora** porque a eleição presidencial é em outubro/2026 e a janela de utilidade abre na pré-campanha (junho–julho/2026), com pico operacional nas seis semanas finais antes do primeiro turno. Vídeo curto em Reels, TikTok, Kwai e YouTube Shorts é hoje o vetor principal de movimentação de aceitação e atrito — e nenhum player no mercado brasileiro oferece, em 2026, painel LLM-simulado calibrado para política. Se o votia-gpt entrega valor neste ciclo, estabelece moat metodológico antes que o mercado feche.

---

## 2. Why Now

Três janelas se sobrepõem em 2026 e tornam o votia-gpt time-critical:

**(1) Janela eleitoral.** Eleição presidencial brasileira em outubro/2026; primeira utilidade real do produto começa em junho/2026 (pré-campanha) e pico operacional bate em setembro/2026. Janela de **~4 meses do início deste PRD à reta final**.

**(2) Janela tecnológica.** LLMs multimodais (vídeo+áudio+texto) com latência e custo viáveis para análise em ~3 min por <$0,50 só se consolidam a partir de 2025. Modelos open-weights (Llama-3.3, Qwen-2.5, Mistral) servíveis via OpenRouter contornam, pela primeira vez, o problema de safety refusal que bloqueia teste de mensagens politicamente carregadas em modelos comerciais "sanitizados". Personas IBGE-based em escala (20 mil) só são economicamente viáveis com o pattern de Aggregate Engine validado em `persona-main` v1 (redução de 98% do custo por análise vs. loop por persona).

**(3) Janela competitiva.** Pesquisa tradicional brasileira (Quaest, AtlasIntel, IPEC, Genial) não cobre simulação de reação por peça pré-publicação. Tentativas internacionais (Affectiva, Realeyes) fazem facial-coding genérico sem segmentação eleitoral BR. Aaru (YC) tenta painel sintético genérico com acurácia mista. **Stack de reação a vídeo por segmento eleitoral brasileiro é greenfield em 2026** — se votia-gpt entrega primeiro, vantagem dura no ciclo.

Adiar este PRD em três meses anula a janela. Adiar seis meses entrega o produto pós-eleição.

---

## 3. Target User

### 3.1 Jobs To Be Done

**Coordenação de Campanha (usuário primário):**
- *Funcional:* Testar peças de vídeo antes da publicação para escolher entre variantes e decidir cortes/refilmagens.
- *Funcional:* Obter mapa de aceitação por segmento eleitoral (idade, região, classe, religiosidade, ideologia auto-declarada) sem precisar de pesquisa quantitativa paga por peça.
- *Emocional:* Reduzir ansiedade pré-publicação ("vai pegar bem?") e reduzir custo emocional de erros publicados.
- *Social:* Defender escolhas criativas perante candidato e diretoria com evidência estruturada, não só intuição.
- *Contextual:* Iterar criativo em ciclos de horas, não dias, sobretudo na reta final.

**Assessoria de Imprensa do PL (usuário secundário):**
- *Funcional:* Consultar leitura por segmento antes de validar virada de mensagem em release.
- *Contextual:* Acessar histórico de análises de peças que viraram pauta.

**Dimitri / equipe técnica (admin):**
- *Funcional:* Auditar prompts em uso, ajustar voz prescritiva sem redeploy, monitorar custo e fila, atender pedidos de log retroativo (TSE 180 dias pós-2º turno).

### 3.2 Non-Users (v1)

O votia-gpt no MVP **não é para**:
- Candidatos de outros partidos ou outras campanhas (tenant único PL).
- Análise de discurso ao vivo, entrevistas, debates em tempo real (apenas peças finalizadas pré-publicação).
- Geração de criativo para publicação direta (a saída é diagnóstico + recomendação, não peça pronta).
- Microtargeting de eleitor identificável (personas são agregadas IBGE, não pessoa real).
- Substituto de pesquisa quantitativa tradicional (Quaest, Atlas, IPEC seguem instrumento certo para horse-race absoluto).

### 3.3 Key User Journeys

**UJ-1. Mariana sobe um vídeo de 90 segundos na quinta às 22h, decide até a manhã seguinte.**
Mariana, coordenadora de campanha, recebe da equipe criativa às 22h um vídeo de 90s da candidatura para publicação na sexta de manhã. Já está autenticada no votia-gpt no notebook. Abre uma nova conversa, faz upload do arquivo, digita "público alvo evangélico + classe C, peça pra Reels e TikTok, contexto de pauta econômica". O chat mostra mensagens intermediárias em streaming ("🔍 carregando 20 mil personas… 🎬 transcrevendo e analisando vídeo… 📊 simulando reação por cluster…"). Em ~3 minutos, recebe um diagnóstico estruturado em texto natural: aceitação por segmento, atritos previstos com 3 clusters específicos, justificativa por faixa, e recomendação prescritiva — "corte o trecho 0:42 a 0:58, refilme o close final com fundo neutro, troque 'sistema' por 'lobby'". Mariana copia trechos da resposta para o grupo de WhatsApp da equipe criativa. Marca 👍 na análise. Realiza UJ-5 (feedback). **Edge case:** Upload falha por timeout de rede. O chat preserva a mensagem digitada e oferece retry com um clique; não exige redigitar contexto.

**UJ-2. Rafael (assessor de imprensa) consulta histórico antes de soltar release.**
Rafael, assessor de imprensa do PL, precisa decidir se um release sobre pauta de segurança pública casa com o tom das peças que rodaram nas últimas duas semanas. Já autenticado, abre a aba de histórico, filtra por palavra-chave "segurança", lê três análises anteriores e identifica que mensagens "polícia armada" tiveram atrito alto com cluster jovem-urbano-classe-média e tração com cluster interior-classe-D-evangélico. Decide o enquadramento do release com base nisso. Realiza UJ-2 (histórico).

**UJ-3. Dimitri (admin) edita o prompt de voz prescritiva às 14h, vê efeito imediato às 14h05.**
Dimitri, admin do votia-gpt, percebe pelo feedback (👍/👎) que análises da última semana estão soando técnicas demais para a coordenação. Acessa a área administrativa, edita o prompt mestre da camada "marqueteira sênior" no Supabase (sem redeploy), salva. O cache TTL de 5 min expira; a próxima análise (14h05) já roda com a nova voz.

**UJ-4. Mariana abre o votia-gpt no celular durante o intervalo de uma reunião.**
Mariana sai de uma reunião às 11h e tem 12 minutos antes da próxima. Abre o votia-gpt no Safari do iPhone, no escuro do corredor (modo escuro ativo). Faz upload de uma imagem (peça estática para feed) pelo botão de upload nativo do navegador, digita contexto curto, recebe a análise em ~2 minutos. Encerra o app, vai pra próxima reunião. Realiza UJ-1 em surface mobile.

**UJ-5. Coordenação avalia análise e gera sinal de calibração contínua.**
Após qualquer análise, qualquer usuário pode marcar 👍 ou 👎 no botão inline da resposta. O sinal entra na tabela de feedback junto com o `analysis_id`, autor, timestamp e (opcional) comentário curto livre. Dimitri consulta esses sinais para calibrar prompts e seleção de modelo. Abastece SM-3 ("acertou o tom").

---

## 4. Glossário

*Toda seção a partir daqui deve usar estes termos verbatim. Introduzir sinônimo é violação de disciplina.*

- **Peça** — Conteúdo enviado para análise: vídeo (≤2 min), imagem (formato livre) ou texto. Inclui contexto descritivo opcional digitado pelo usuário.
- **Análise** — Saída completa do votia-gpt para uma Peça: mapa de aceitação por Cluster, justificativa textual, deslocamento relativo estimado de intenção, recomendação prescritiva. Persistida em `analysis_log`.
- **Cluster** — Grupo agregado de Personas com perfil estatístico comum (idade × região × classe × religiosidade × ideologia × outras dimensões IBGE). MVP comporta tipicamente 24 Clusters; expansível a 50+ pós-MVP.
- **Persona** — Indivíduo sintético derivado de microdados IBGE. Não é eleitor identificável. 20 mil Personas no MVP, pré-classificadas em Clusters.
- **Aggregate Engine** — Pattern arquitetural herdado de `persona-main` v1: pré-computa o perfil estatístico agregado de cada Cluster e deriva scores por Cluster em **uma única chamada LLM** por Análise, evitando loop por Persona.
- **Especialista** — Camada lógica do pipeline que aplica uma lente específica (ex: pre-classificador, context builder, ideological framer, voz prescritiva final). Cada Especialista é um prompt versionado armazenado no Supabase, editável sem redeploy.
- **Voz Prescritiva** — Tom da resposta final ao usuário: 2ª pessoa, marqueteira sênior, instruções diretas ("você deve refilmar…"). Herdado de `persona-main` v1.
- **Deslocamento Relativo** — Estimativa direcional (↑ / → / ↓) e ordinal (ranking entre variantes/clusters) da movimentação de intenção de voto na Análise. **Não é vote share absoluto.** Limite metodológico declarado.
- **analysis_log** — Tabela Supabase que persiste cada Análise para auditoria TSE Res. 23.732/2024 (mínimo 180 dias após o 2º turno; snapshot mandatório com prompt + modelo + personas_build — ver §10.1).
- **Sinal de Feedback** — Marca 👍 ou 👎 do usuário sobre uma Análise, com comentário opcional. Abastece SM-3 e calibração contínua.
- **Tenant** — Organização cliente do votia-gpt. MVP: **tenant único** (PL). Multi-tenant entra no roadmap pós-MVP (etapa 2).
- **Usuário** — Pessoa autenticada no votia-gpt. Cada Usuário tem login próprio (modelo ChatGPT). MVP: roles `user` e `admin`.
- **Conversa** — Sessão de chat persistida, contendo zero ou mais Análises e mensagens livres do Usuário. Histórico navegável por Usuário.

---

## 5. Features

### 5.1 Autenticação e Acesso por Usuário

**Description:** Cada pessoa autorizada na campanha tem um login próprio no votia-gpt, modelo de produtos do tipo ChatGPT: email + senha (ou link mágico/SSO Google a confirmar em Sprint 0). Histórico de Conversas e Análises é por Usuário; admins veem tudo. Suporta dois roles no MVP: `user` (usa o chat, vê só o próprio histórico) e `admin` (vê todos os históricos, edita prompts, consulta auditoria). Realiza UJ-1, UJ-2, UJ-3, UJ-4.

**Functional Requirements:**

#### FR-1: Cadastro, login e aceitação de ToS

Admin pode criar contas de Usuário com email, nome e role inicial; Usuário recebe convite por email e define senha no primeiro acesso. **No primeiro login, o Usuário deve aceitar explicitamente o Termo de Uso (ToS)** que detalha bases legais LGPD, dados coletados, direitos do titular e política de retenção (ver §10.2). Sessão persiste em cookie seguro com expiração configurável (default 30 dias).

**Consequências (testable):**
- Tentativa de login com credenciais inválidas exibe mensagem genérica ("email ou senha inválidos") sem revelar qual campo falhou.
- Usuário não pode acessar nenhuma funcionalidade até aceitar ToS na primeira sessão; aceite é gravado com timestamp e versão do documento em `user_consents`.
- Usuário inativo por 90 dias `[ASSUMPTION: prazo a confirmar]` recebe lembrete de senha; após 180 dias a conta é desabilitada por admin manualmente.
- Logout encerra a sessão imediatamente em todos os dispositivos do mesmo Usuário.

**Out of Scope:** SSO corporativo PL no MVP (`[NOTE FOR PM]` revisitar se PL fornece identidade central).

#### FR-2: Role-based access (`user` vs `admin`)

Admin pode promover/rebaixar Usuários entre os roles `user` e `admin`. Endpoints administrativos (gerenciar prompts, ver auditoria global, consultar custo) só respondem para Usuários com role `admin`.

**Consequências (testable):**
- Usuário com role `user` requisitando endpoint admin recebe HTTP 403.
- Admin pode listar todos os Usuários e seus roles em uma tela administrativa.
- Existe ao menos 1 admin a qualquer momento; sistema bloqueia rebaixamento do último admin.

#### FR-3: Recuperação de senha

Usuário pode solicitar reset de senha por email; link expira em 30 minutos.

**Consequências (testable):**
- Email é enviado mesmo quando o endereço não existe (anti-enumeração), com conteúdo neutro.
- Link de reset usado ou expirado mostra "link inválido ou expirado".

---

### 5.2 Análise Multimodal de Peças (Core)

**Description:** Coração do produto. Usuário sobe uma Peça (vídeo, imagem ou texto) no chat, digita contexto descritivo opcional, e recebe uma Análise completa em ~3 minutos. Streaming token-a-token entrega resposta progressiva; mensagens intermediárias informam o estágio do pipeline ("🔍 carregando Personas…"). O pipeline aplica em sequência: pré-classificador (resolve ambiguidade, inversão de sentimento, figura pública), context builder (enriquece com pauta política do momento), ideological framer (calibra leitura por Cluster), Aggregate Engine (1 chamada LLM derivando scores por Cluster), e Voz Prescritiva (formata em 2ª pessoa marqueteira sênior). Realiza UJ-1, UJ-4.

**Functional Requirements:**

#### FR-4: Upload e validação de Peça

Usuário pode submeter uma Peça via interface de chat: vídeo até 2 minutos e 100 MB `[ASSUMPTION: limite a confirmar pelo tipo de provider de áudio escolhido]`, imagem até 20 MB (PNG/JPG/WEBP), ou texto puro. Upload via drag-and-drop, botão dedicado ou colar no campo de texto. Realiza UJ-1.

**Consequências (testable):**
- Arquivo acima do limite mostra mensagem clara antes do upload ("vídeo deve ter no máximo 2 min — este tem 3:14") e não inicia o envio.
- Formato não suportado mostra "formato não suportado — envie MP4/MOV para vídeo".
- Falha de rede durante upload preserva o texto de contexto digitado e oferece retry com um clique.

**Out of Scope:** Múltiplas Peças por Análise (ex: A/B inline em uma única chamada) — fica para roadmap.

#### FR-5: Submeter Análise

Usuário pode disparar uma Análise sobre uma Peça enviada, com contexto descritivo opcional em texto livre (público-alvo, canal pretendido, momento de campanha, restrições). Realiza UJ-1.

**Consequências (testable):**
- Análise inicia imediatamente após submit; estado "processando" persiste mesmo se Usuário fecha o navegador (volta a ver progresso ao reabrir a Conversa).
- Cada Análise gera um `analysis_id` único e linha em `analysis_log`.
- Em caso de falha do pipeline, a mensagem de erro ao Usuário é específica o suficiente para acionar retry ou contato com admin ("não conseguimos processar o áudio — tente novamente ou avise o admin"), e a falha é logada com stack para diagnóstico.

#### FR-5b: Tratamento de refusal e falha total do pipeline

Sistema detecta refusal de modelo LLM (texto de recusa por safety filter) e roteia automaticamente para modelo fallback open-weights via OpenRouter (Llama-3.3, Qwen-2.5, Mistral, em cascata). Se **todos os fallbacks também recusam**, o sistema retorna ao Usuário uma mensagem específica e não bloqueante, e a Análise fica marcada como `analysis_status: refused_all` no `analysis_log` para revisão do admin. Realiza UJ-1.

**Consequências (testable):**
- Refusal de primeiro modelo (comercial) dispara fallback automático em ≤2s, sem intervenção do Usuário.
- Mensagem ao Usuário em caso de refusal-all: "Não conseguimos analisar esta peça no momento. O conteúdo pode ter características que nosso modelo evitou; pode tentar outra Peça ou reescrever o contexto. O admin foi notificado." — **nunca expor termo técnico "refusal" nem detalhes do modelo**.
- Linha em `analysis_log` é criada mesmo em refusal-all, com `prompt_versions`, `llm_model` da última tentativa, e `fallback_chain` listando todos os modelos tentados.
- Admin recebe notificação visual no painel (FR-15) ao acumular ≥5 refusal-all na rolling 24h (sinal de prompt ou Peça problemática).

#### FR-6: Streaming de resposta com indicadores de estágio

Sistema entrega a Análise em streaming token-a-token na UI. Antes/durante a saída final, mensagens intermediárias mostram o estágio do pipeline (carregando Personas, transcrevendo vídeo, simulando por Cluster, formatando recomendação). Realiza UJ-1.

**Consequências (testable):**
- Primeira mensagem intermediária aparece em <2 segundos após submit.
- Streaming token-a-token é visível na UI (não é "tudo de uma vez no final").
- Se uma etapa demora mais que o esperado (>60s sem token novo), o sistema mostra "ainda processando…" e não trava o usuário.

#### FR-7: Estrutura da Análise entregue ao Usuário

A Análise renderizada na UI contém, na voz prescritiva (2ª pessoa, marqueteira sênior):
1. Leitura curta de abertura (1–2 frases sobre como a peça caiu no geral).
2. Mapa de aceitação por Cluster — texto narrativo destacando 3–5 Clusters com leitura forte (positiva ou negativa).
3. Mapa de atrito — pontos específicos da peça (timestamps em vídeo, frase em texto, elemento em imagem) que geram reação adversa.
4. Estimativa de Deslocamento Relativo — direcional (↑/→/↓) por Cluster, com aviso explícito de "não é vote share".
5. Recomendação prescritiva — 2 a 5 instruções acionáveis ("refilme 0:42", "troque palavra X por Y", "amplie close final em 800ms").

Realiza UJ-1.

**Consequências (testable):**
- Toda Análise contém os 5 blocos acima quando bem-sucedida; ausência de um bloco é falha do pipeline e é logada.
- O bloco de Deslocamento Relativo inclui o disclaimer "estimativa direcional — não é vote share absoluto" em toda Análise.
- **Concretude da recomendação** (timestamp / palavra / elemento, nunca abstrata) é objetivo aspiracional via prompt da Voz Prescritiva; sistema não rejeita programaticamente saídas abstratas. Degradação é monitorada via SM-3 (👎 com comentário) e prompt do admin é reajustável sem redeploy (FR-13).

**Feature-specific NFRs:**
- Tempo total da Análise: P50 ≤ 3 min para Peça de vídeo ≤ 2 min; P95 ≤ 5 min.
- Custo médio por Análise: ≤ $0,50 (vídeo) e ≤ $0,10 (texto/imagem).

**Notes:**
- `[NOTE FOR PM]` Stack LLM específica (Claude Sonnet 4.6 vs GPT-4o no motor agregado; Llama-3.3-70B vs Qwen-2.5-72B na simulação sensível), provider de áudio (Resemble Detect vs ElevenLabs vs open-source) e decisão sobre fine-tune LoRA local — todos resolvidos em **Sprint 0**. Ver `addendum.md` §3.
- `[NOTE FOR PM]` API gateway (CF Workers vs Vercel Edge) — resolvido em **Sprint 0**. Ver `addendum.md` §4.

---

### 5.3 Histórico e Multi-thread

**Description:** Toda Análise é persistida em uma Conversa, e cada Usuário pode ter múltiplas Conversas em paralelo. Sidebar à esquerda lista Conversas por data, com busca por palavra-chave em mensagens e contexto. Análises podem ser reabertas sem recomputar. Realiza UJ-2.

**Functional Requirements:**

#### FR-8: Persistir Conversas por Usuário

Toda mensagem enviada e toda Análise gerada em uma Conversa é persistida vinculada ao `user_id` e a um `conversation_id`. Usuário só vê suas próprias Conversas; admin pode buscar todas. Realiza UJ-2.

**Consequências (testable):**
- Usuário fecha o navegador e reabre — vê a mesma lista de Conversas e pode retomar qualquer uma.
- `user` requisitando Conversa de outro `user_id` recebe HTTP 404 (não 403 — evita enumeração).
- Análise reaberta carrega da base; **não dispara nova execução do pipeline**.

#### FR-9: Múltiplas Conversas simultâneas

Usuário pode iniciar nova Conversa enquanto outra está com Análise processando. Análises rodam em paralelo até o limite de capacidade definido em §8.

**Consequências (testable):**
- Iniciar nova Conversa não interrompe Análise em curso em outra Conversa.
- Limite de Análises simultâneas por Usuário é definido em §8 (NFR de capacidade); ao bater limite, nova Análise entra em fila com aviso ao Usuário ("sua análise entrou em fila — posição N").

#### FR-10: Busca em histórico

Usuário pode buscar dentro do próprio histórico por texto livre (mensagens + contexto). Admin pode buscar globalmente. Realiza UJ-2.

**Consequências (testable):**
- Busca retorna resultados em <2s para histórico até 10 mil mensagens.
- Termos comuns (artigos, preposições) são ignorados (stop-words PT-BR).

---

### 5.4 Feedback Inline (👍/👎)

**Description:** Botão inline em cada Análise para Usuário marcar 👍 ou 👎, com comentário opcional. Sinais alimentam SM-3 ("acertou o tom") e calibração de prompts pelo admin. Realiza UJ-5.

**Functional Requirements:**

#### FR-11: Registrar Sinal de Feedback

Usuário pode marcar 👍 ou 👎 em qualquer Análise visível na sua UI, com campo opcional de texto livre (até 500 caracteres). Realiza UJ-5.

**Consequências (testable):**
- Cada Análise aceita um Sinal por Usuário (último vence). Sinal anterior é sobrescrito; histórico de mudanças não é exposto na UI mas é mantido para auditoria interna `[ASSUMPTION: a confirmar com Dimitri]`.
- Sinal é registrado com `analysis_id`, `user_id`, valor (👍/👎), comentário opcional, timestamp.
- UI dá feedback visual imediato (botão muda de estado) sem aguardar round-trip.
- **Comentário é sanitizado** (escape de HTML/script tags, limite 500 chars) antes de persistir; render no painel admin usa renderização segura (sem `dangerouslySetInnerHTML` ou equivalente).
- Cliques rápidos sucessivos no botão são debounced (100ms) — não geram múltiplas entradas.
- Usuários **não devem incluir referência identificável a público-alvo específico** no comentário (orientação explícita no placeholder e no ToS); admin pode ocultar comentários inadequados sem deletá-los.

#### FR-12: Painel de Sinais para admin

Admin pode visualizar agregados de Sinais por período: total 👍 / 👎, % "acertou o tom", lista de Análises com 👎 + comentário (para revisão qualitativa). Realiza UJ-3.

**Consequências (testable):**
- Painel mostra ao menos: contagem absoluta, %, gráfico simples por semana, e lista paginada de 👎 + comentário.
- Filtro por período (últimos 7 dias, 30 dias, custom).

**Notes:**
- `[NOTE FOR PM]` Survey separado e entrevistas qualitativas — **revisitar com o cliente** para implementação adiante (pós-MVP ou em ciclo de calibração próprio). Não bloqueia MVP.

---

### 5.5 Administração de Prompts e Auditoria

**Description:** Admin acessa uma área administrativa para editar prompts dos Especialistas (sem redeploy, com cache TTL 5 min), inspecionar `analysis_log` (auditoria TSE), e monitorar custo agregado. Mantém a posse técnica do produto na coordenação técnica sem precisar de deploy a cada ajuste de tom. Realiza UJ-3.

**Functional Requirements:**

#### FR-13: Editar prompts de Especialista sem redeploy

Admin pode editar o conteúdo do prompt de cada Especialista (pre-classificador, context builder, ideological framer, Voz Prescritiva, prompt do Aggregate Engine) via interface administrativa. Prompts são armazenados no Supabase, com versionamento simples (cada save cria uma nova versão; admin pode reverter para versão anterior). Realiza UJ-3.

**Consequências (testable):**
- Cache TTL 5 min — alterações entram em vigor automaticamente em ≤5 min sem deploy.
- Admin vê a versão atualmente ativa, com diff para a anterior.
- Reverter para versão anterior é um clique.

#### FR-14: Consultar e gerir `analysis_log`

Admin pode buscar e exportar entradas do `analysis_log` por intervalo de datas, `user_id`, ou texto. Cada entrada exibe o snapshot mandatório completo definido em §10.1 (analysis_id, timestamp, user_id, hash da Peça, prompt_versions, llm_model, fallback_model, personas_build, saída renderizada). Admin pode **marcar uma Análise como "sob revisão jurídica"** (estado `under_legal_review`), o que oculta a Análise da UI do Usuário original sem deletar o registro do log — útil em caso de vazamento, pedido de TSE/MP ou suspeita de mau uso. Linha permanece imutável no log para auditoria.

**Consequências (testable):**
- Cada Análise concluída cria exatamente uma linha em `analysis_log` com todos os campos do snapshot preenchidos. Ausência de qualquer campo é falha de pipeline e dispara alerta para admin.
- Exportação em CSV ou JSON, com paginação automática acima de 10 mil linhas.
- Entradas são retidas no mínimo 180 dias após o 2º turno (até abril/2027) `[CONSTRAINT: TSE Res. 23.732/2024 art. 9º-D]`. Solicitação de exclusão LGPD durante a janela regulatória é deferida com explicação no ToS (ver §10.2).

#### FR-15: Painel de custo e capacidade

Admin pode visualizar agregados: custo total no período, custo médio por Análise, número de Análises por dia, P50/P95 de latência, contagem de falhas. Realiza UJ-3.

**Consequências (testable):**
- Painel atualiza a cada Análise concluída (não em batch noturno).
- Alarme visual quando custo médio por Análise excede $0,50 no rolling 7d.

**Notes:**
- Granularidade de versionamento de prompts, modelo e snapshot de Personas é **mandatória** (definida em §10.1 e em FR-14 acima). A decisão anterior de "best-effort" foi revertida no Finalize após reviewer gate (R1, R2, R3, R5 convergentes).

---

### 5.6 Tema, Responsividade Mobile, Idioma

**Description:** Interface inspirada visualmente em produtos da família ChatGPT — chat principal centrado, sidebar de Conversas à esquerda, composer fixo embaixo, mensagens em balões. Suporta **modo claro e modo escuro**, com toggle no header e respeito à preferência do sistema (`prefers-color-scheme`). Layout **responsivo mobile** (browser mobile via Safari/Chrome iOS/Android, não app nativo no MVP). Idioma fixo PT-BR. Realiza UJ-4.

**Functional Requirements:**

#### FR-16: Tema claro/escuro

Usuário pode alternar entre tema claro e tema escuro a qualquer momento via toggle no header; preferência persiste no `user_id`. Default = preferência do sistema operacional. Realiza UJ-4.

**Consequências (testable):**
- Toggle é acessível em ≤1 clique em qualquer tela.
- Preferência é restaurada após logout/login.
- Todos os componentes da UI (chat, sidebar, painéis admin, modais) respeitam o tema selecionado.

#### FR-17: Layout responsivo mobile

UI funciona em browsers mobile modernos (Safari iOS 16+, Chrome Android 100+). Em viewport <768px: sidebar de Conversas vira drawer/hamburger; composer expande para tela cheia ao focar; upload de arquivo usa input nativo do navegador. Realiza UJ-4.

**Consequências (testable):**
- Streaming de resposta funciona em mobile sem travar scroll.
- Upload de vídeo de até 100 MB completa em mobile em 4G (≤5 min) — `[ASSUMPTION: a validar em Sprint 0]`.

**Out of Scope:** App nativo iOS/Android no MVP.

#### FR-18: Idioma fixo PT-BR

Toda a interface, mensagens de sistema e Análises são em PT-BR no MVP.

**Out of Scope:** Internacionalização (i18n) ou suporte a outras línguas no MVP.

---

## 6. Non-Goals (Explícitos)

O votia-gpt **não fará**, **não será**, e **não tem ambição de**:

- **Não substitui pesquisa quantitativa tradicional** (Quaest, Atlas, IPEC). Entrega ranking relativo e leitura por segmento; não horse-race absoluto de intenção de voto.
- **Não gera criativo para publicação direta** no MVP. Saída é diagnóstico + recomendação. Geração com rotulagem TSE entra eventualmente como feature v2, se virar prioridade.
- **Não conecta CRM eleitoral** (TSE, base de eleitores filiados, dados de filiação partidária identificáveis). Isolamento jurídico: Personas vêm de microdados IBGE públicos agregados, não de eleitor identificável.
- **Não faz microtargeting de eleitor identificável.** Personas são agregadas IBGE. Qualquer feature que faça matching de Persona-a-eleitor real está fora de escopo permanente.
- **Não é multi-tenant no MVP.** Tenant único PL; isolamento entre campanhas (multi-candidato, multi-partido) é etapa 2 do roadmap.
- **Não atende clientes externos ao PL** no MVP. Sem ambição SaaS imediata.
- **Não tem app nativo iOS/Android.** Apenas web (desktop + mobile responsivo).
- **Não internacionaliza** (sem i18n) no MVP.
- **Não faz análise de discurso/debate ao vivo.** Apenas peças finalizadas pré-publicação.
- **Não substitui assessoria jurídica eleitoral.** O sistema documenta `analysis_log`; interpretação de compliance e disclaimers de risco eleitoral seguem com escritório jurídico do PL.
- **Não detecta nem rotula conteúdo potencialmente ilegal** na Peça (fake news, fraude, deepfake, perseguição, conteúdo proibido). Recomendações do votia-gpt de corte/refilme são **sempre editoriais por cluster-fit**, nunca por preocupação legal. Triagem legal de conteúdo é responsabilidade humana e jurídica, fora do escopo do produto.
- **Não permite recuperação retroativa de Análises por usuário desligado.** Após logout/desabilitação, o Usuário perde acesso ao histórico; admins mantêm visibilidade via FR-14 para auditoria interna.

---

## 7. MVP Scope

### 7.1 In Scope (MVP)

- Auth: email+senha, 2 roles (`user`/`admin`), recuperação de senha (FR-1 a FR-3).
- Análise multimodal core: vídeo ≤2 min / imagem / texto, pipeline com Aggregate Engine, streaming, voz prescritiva (FR-4 a FR-7).
- Histórico de Conversas por Usuário, multi-thread simultâneo, busca (FR-8 a FR-10).
- Feedback inline 👍/👎 com comentário opcional, painel admin de sinais (FR-11, FR-12).
- Administração de prompts sem redeploy (cache TTL 5 min), consulta a `analysis_log`, painel de custo (FR-13 a FR-15).
- Tema claro/escuro, layout responsivo mobile, PT-BR fixo (FR-16 a FR-18).
- 20 mil Personas IBGE pré-classificadas em ~24 Clusters.
- `analysis_log` persistido 180+ dias (TSE Res. 23.732/2024).
- Tenant único PL.

### 7.2 Out of Scope for MVP

- **Comparador A/B inline de duas Peças** — roadmap (sprints 3–6).
- **Exportação em PDF da Análise** — roadmap; usuários copiam texto enquanto isso. `[NOTE FOR PM]` revisitar se coordenação pedir explicitamente.
- **Dashboard de leitura agregada inter-Análises** — roadmap.
- **Extensão regional** (governador, deputado federal, vereador) — etapa 2 do roadmap, ligada a multi-tenant.
- **SSO corporativo PL** — `[NOTE FOR PM]` se PL fornecer identidade central, revisitar.
- **App nativo mobile** — sem prazo.
- **Survey separado e entrevistas qualitativas para calibração** — revisitar com cliente.
- **Multi-tenant / isolamento entre campanhas** — etapa 2.
- **Geração de criativo** com rotulagem TSE — eventual v2.
- **Fine-tune LoRA local sobre Llama/Qwen** — `[NOTE FOR PM]` decidir em Sprint 0 se entra no MVP ou pós-MVP; impacto direto em mismatch demográfico BR.
- **Painel real paralelo (Quaest/universitário/sem ancoragem)** — decisão binária Sprint 0; ver §14.2 SM-4.
- **Integração nativa com Slack / WhatsApp / email** — Usuário copia/cola por enquanto.
- **Análise de discurso ao vivo / debates** — não está no horizonte.

---

## 8. Cross-Cutting NFRs

### 8.1 Performance
- **Latência de Análise**: P50 ≤ 3 min para Peça de vídeo ≤2 min; P95 ≤ 5 min.
- **Primeira mensagem intermediária**: ≤ 2s após submit.
- **Streaming**: token-a-token visível, não "tudo de uma vez no final".
- **Busca em histórico**: <2s para até 10 mil mensagens.

### 8.2 Disponibilidade e Capacidade
- **Disponibilidade durante semanas de campanha** (mid-set/2026 a out/2026): 99%.
- **Disponibilidade fora dessa janela**: 95%.
- **Capacidade MVP**: suportar ramp de ~5 análises/sem (piloto, junho/2026) → 20–50/sem (operacional, jul–ago/2026) → 50+/dia (reta final, set/out/2026).
- **Concorrência por Usuário**: até 3 Análises simultâneas; acima disso, fila com aviso de posição.
- **Concorrência global no sistema**: configurável por admin; default 10 Análises em paralelo.

### 8.3 Custo
- **Custo médio por Análise**: ≤ $0,50 (vídeo), ≤ $0,10 (texto/imagem).
- **Alarme**: custo médio rolling 7d acima do orçamento dispara alerta visual no painel admin.

### 8.4 Segurança
- Cookies de sessão `httpOnly`, `secure`, `SameSite=Lax`.
- Senhas com hash forte (Argon2 ou bcrypt cost adequado).
- HTTPS obrigatório em produção.
- Rate limiting em endpoints de auth (login, reset, signup-by-invite). Valores default: 5 tentativas por 15 min por IP em login; 3 por hora por email em reset.
- Mensagens de erro de auth não vazam existência de email.
- Endpoints admin protegidos por role check no servidor (não só no cliente).
- **Inputs do Usuário sanitizados** em todos os campos persistidos e renderizados (contexto da Análise, comentário de feedback, prompt admin); render seguro sempre.
- **Isolamento de cache de embeddings/Personas:** caches em memória/Redis são namespaced por `personas_build_id` e nunca contêm dados pessoais de Usuário; queries de cache não cruzam fronteira de Usuário.

### 8.5 Observabilidade
- Logs estruturados para cada Análise (entrada anonimizada, etapa, latência, custo, falha).
- Métricas: contagem de Análises, latência P50/P95, custo, taxa de falha, sinais de feedback agregados.
- Traços do pipeline disponíveis ao admin para diagnóstico de falhas individuais.

### 8.6 Acessibilidade
- Contraste WCAG AA mínimo em tema claro e tema escuro.
- Navegação por teclado em fluxos críticos (login, novo chat, submit, feedback).
- `[NOTE FOR PM]` Conformidade WCAG 2.1 AA completa não é obrigatória no MVP, mas evitar regressões óbvias.

### 8.7 Browser support
- Chrome / Edge / Safari / Firefox últimas 2 versões major.
- Safari iOS 16+, Chrome Android 100+.

---

## 9. Constraints and Guardrails

### 9.1 Safety
- Modelos LLM utilizados devem suportar análise de conteúdo politicamente carregado (mensagens anti-aborto, anti-STF, pró-armas, pautas religiosas-conservadoras, posições Bolsonaro-coded) **sem refusal por safety filter**. Modelos comerciais (GPT/Claude) sanitizam: estimativa do brief é que **~30–40% das Peças PL extremas podem disparar refusal** em modelo comercial. **Roteamento automático para open-weights via OpenRouter (Llama-3.3, Qwen-2.5, Mistral) é mandatory**, não opcional: ao detectar refusal, o sistema retransmite a chamada ao modelo fallback **sem intervenção do Usuário**.
- **Impacto em custo:** open-weights via OpenRouter têm custo unitário diferente do comercial; a estimativa de §8.3 (SM-5) é calculada considerando blend ~60% comercial + ~40% fallback. Se a incidência real subir, SM-5 e o budget se ajustam.
- Saída prescritiva nunca recomenda **fraude, calúnia ou afirmação factual falsa**. Recomendações devem ficar em recorte de mensagem, tom e enquadramento.
- Saída inclui sempre o disclaimer "estimativa direcional — não é vote share absoluto" no bloco de Deslocamento Relativo.

### 9.2 Privacidade
- **Personas são derivadas de microdados IBGE públicos agregados.** Nenhuma Persona é eleitor identificável.
- **Sem conexão a CRM eleitoral** no MVP.
- Vídeos enviados pelo Usuário são armazenados criptografados; política de retenção: **enquanto o `analysis_log` estiver no prazo regulatório** (≥180 dias TSE) `[ASSUMPTION: validar política exata com jurídico]`.
- Dados pessoais de Usuários (email, nome) são tratados conforme LGPD; admin pode remover Usuário a pedido.

### 9.3 Custo
- Modelo de custo deve permitir operação dentro de orçamento limitado de campanha (`[ASSUMPTION: valor exato a confirmar com Dimitri]`).
- Aggregate Engine é **constraint arquitetural**: pipeline não pode degenerar para loop por Persona (que invalidaria o orçamento).
- Vídeos longos (>2 min) são rejeitados no MVP por custo e latência.

---

## 10. Compliance e Regulatório

### 10.1 TSE — Resolução 23.732/2024

- **Art. 9º-D — Auditoria de uso de IA em campanha:** tabela `analysis_log` persiste todas as Análises por **mínimo 180 dias** após o segundo turno (até abril/2027).
- **Entrada do `analysis_log` (snapshot MANDATÓRIO, capturado antes da chamada LLM):**
  - `analysis_id` (uuid), `timestamp` (ISO8601 UTC), `user_id`
  - `hash_peca` (sha256 do binário), `contexto_digitado` (texto livre)
  - `prompt_versions` (objeto: `{pre_classifier, context_builder, ideological_framer, aggregate_engine, voz_prescritiva}` → versão semver de cada Especialista no momento exato da chamada)
  - `llm_model` (provider + nome + versão; ex: `openrouter/anthropic/claude-sonnet-4.6`)
  - `fallback_model` (preenchido se houve roteamento por refusal)
  - `personas_build` (id versionado da build em uso; ex: `personas-v1.0-2026-06-15`)
  - `saida_renderizada` (texto integral entregue ao Usuário)
- **Implementação:** snapshot capturado **antes** da chamada LLM via `BEGIN TRANSACTION`; o cache TTL 5 min do FR-13 não impacta auditoria — `analysis_log` lê do registro estático, não do cache.
- **Recomendações de corte/refilme** em saídas do votia-gpt são sempre editoriais (cluster-fit), nunca derivadas de preocupação legal sobre o conteúdo da Peça. O sistema **não detecta nem rotula conteúdo potencialmente ilegal** (ver §6 Non-Goals).
- **Geração de criativo para publicação direta** está explicitamente fora de escopo (§6); se virar feature v2, rotulagem TSE art. 9º-B obrigatória.

### 10.2 LGPD
- **Base legal para dados pessoais de Usuários:** execução de contrato (ToS aceito no primeiro login, FR-1) + legítimo interesse de auditoria operacional + cumprimento de obrigação legal eleitoral (retenção 180d TSE).
- **ToS obrigatório no primeiro login** detalha: (i) dados coletados (email, nome, role, histórico de Conversas, sinais de feedback); (ii) bases legais; (iii) direitos do titular LGPD (acesso, correção, exclusão, portabilidade); (iv) política de retenção (`analysis_log` mínimo 180d pós-2º turno por TSE Res. 23.732/2024 art. 9º-D); (v) política de hold regulatório (retenção estende se TSE inicia auditoria); (vi) localização geográfica de storage (`[NOTE FOR PM]` Sprint 0 — definir provider + região).
- **Direitos do titular:** acesso, correção, exclusão e portabilidade atendidos via admin em até 30 dias após pedido. **Exclusão durante a janela TSE (180d pós-pleito):** entrada do `analysis_log` é mantida com `user_id` substituído por hash não-reversível; identidade pessoal é removida, trilha de auditoria preservada. ToS explica essa exceção legal claramente.
- **Vídeos enviados:** armazenamento criptografado at rest; tratamento isolado; sem cessão a terceiros além do provider de LLM/áudio sob NDA do contrato comercial. Localização geográfica do storage: brasileira preferencial (`[NOTE FOR PM]` Sprint 0 — Supabase BR ou AWS sa-east-1).

### 10.3 Defensibilidade reputacional

**Opinion letter jurídica é pré-condição obrigatória para go-live** (não follow-up). Detalhes mínimos:
- **Escritório:** terceira parte reconhecida em direito digital/eleitoral (candidatos: Machado Meyer, Vivant, GVlaw, FGV-Direito). Definido em Sprint 0 com CNPJ registrado em `.decision-log.md`.
- **Prazo:** assinada antes de **15/09/2026** (janela mínima de 30 dias pré-eleição para eventual remediation).
- **Escopo testável (8 pontos):**
  1. Conformidade com LGPD arts. 7–10 (bases legais), 17 (apagamento) e 40–46 (segurança).
  2. Conformidade com TSE Res. 23.732/2024 art. 9º-D (auditoria + retenção 180d).
  3. Não-violação do Código Eleitoral (Lei 4.737/65 e atualizações) — ausência de fraude, calúnia, microtargeting de eleitor identificável.
  4. Isolamento e natureza agregada das Personas (IBGE público, não identificáveis).
  5. Voz Prescritiva — recomendações ficam em recorte de mensagem/tom, sem orientação a conduta ilegal.
  6. Isenção do PL no que tange a decisão criativa final (votia-gpt é diagnóstico, decisão humana é última instância).
  7. Segurança de dados (criptografia, localização geográfica, certificação do provider).
  8. Operacionalização de direitos LGPD do titular (prazo, processo, exceções regulatórias).

**Sem essa carta com escopo cumprido, o produto não vai a produção.** Atestado vira artefato anexo ao deploy e fica disponível para resposta à imprensa.

**Disclaimers públicos (pré-go-live, externos):**
- **Página pública** no site PL (ou subdomínio) — <500 palavras, em PT-BR — explicando o que o votia-gpt **faz** (diagnóstico de peças por segmento agregado IBGE) e o que **não faz** (não substitui pesquisa, não gera criativo, não conecta CRM, não microtargets). Acessível a qualquer jornalista.
- **White paper técnico** (3–5 páginas) — explicação de Personas agregadas, pipeline (Aggregate Engine, Especialistas), limitações declaradas (ranking relativo vs vote share), conformidade (LGPD + TSE).
- **Press kit interno** — talking points e disclaimers prontos para a assessoria de imprensa responder consulta.

---

## 11. Aesthetic and Tone

### 11.1 Visual
- Inspiração direta em produtos da família ChatGPT (Claude.ai, ChatGPT, Gemini): chat centrado, sidebar à esquerda, composer fixo embaixo, balões de mensagem com tipografia limpa.
- **Tema claro** e **tema escuro**, com toggle no header e respeito a `prefers-color-scheme` do sistema operacional.
- Paleta minimalista, sem identidade partidária explícita na UI do produto (mantém defensibilidade — produto é ferramenta, não material de campanha).
- Tipografia sans-serif neutra.

### 11.2 Voz e tom da resposta gerada
- **Voz Prescritiva — marqueteira sênior, 2ª pessoa, direta.** **Diferencial de adoção empiricamente validado em `persona-main` v1** — engajamento substancialmente maior versus voz neutra "CMO genérico relatando". **Decisão tomada, não revisitar no MVP.** Implementação que simplificar para voz genérica/passiva é anti-pattern (ver `addendum.md` §10) e regressão de produto.
- Exemplos do tom desejado:
  - ✅ "Você deve cortar o trecho 0:42 a 0:58 — o cluster jovem-urbano-classe-C lê isso como condescendência."
  - ❌ "A mensagem pode ser percebida de forma negativa por alguns grupos demográficos."
- Recomendações **sempre concretas**: timestamp em vídeo, palavra a trocar em texto, elemento em imagem.
- Linguagem direta sem hedging excessivo; tom de profissional sênior orientando, não pesquisador acadêmico relatando.
- **Guardrail mandatório no prompt do Especialista Voz Prescritiva:** toda Análise abre com a frase **"Esta é uma estimativa de ranking relativo por cluster, não previsão de vote share"** ou variante semanticamente equivalente. Saída sem essa frase é falha de pipeline e dispara correção. Mitigação direta do risco (R-4 reputacional + interpretação leiga "IA sabia melhor").

### 11.3 Tom da UI (não-gerada)
- Mensagens de sistema curtas e diretas ("vídeo acima do limite — máximo 2 min").
- Mensagens intermediárias de pipeline em tom levemente lúdico mas profissional ("🔍 carregando 20 mil personas…").
- Sem gamificação, sem badges, sem celebração.

---

## 12. Integration and Dependencies

### 12.1 Stack base
- **Backend / DB**: Supabase (Postgres + Auth + Storage + Realtime). Decisão herdada de `persona-main` v1, validada operacionalmente.
- **Frontend**: framework web a confirmar em Sprint 0 (Next.js / SvelteKit / outro) `[NOTE FOR PM]`.
- **API gateway / edge**: Cloudflare Workers vs Vercel Edge — `[NOTE FOR PM]` decidir em Sprint 0; ver `addendum.md` §4.
- **LLM providers**: OpenRouter como camada de roteamento, com acesso a Claude, GPT, Llama, Qwen, Mistral. Modelo específico por Especialista — `[NOTE FOR PM]` Sprint 0.
- **Provider de áudio/transcrição**: Resemble Detect vs ElevenLabs vs open-source — `[NOTE FOR PM]` Sprint 0.

### 12.2 Personas e dados base
- **Microdados IBGE (Censo + PNAD)** usados para construir 20 mil Personas distribuídas em ~24 Clusters. Atualizações pós-MVP podem expandir para 50+ Clusters.
- Pipeline de geração de Personas é offline (precomputado, não roda a cada Análise).

### 12.3 Herança do `persona-main` v1
- **Reaproveitar:** pattern Aggregate Engine; pipeline Pre-Classifier → Context Builder → Ideological Frame; voz "marqueteira sênior"; prompts no Supabase com cache TTL 5 min.
- **Descartar:** arquitetura distribuída em 4 workers / 3 hosts (causa de débito operacional não justificado para a escala MVP). Reescrita autorizada pela diretoria.
- Detalhe completo da herança no `addendum.md` §1.

### 12.4 Externos
- Nenhuma integração com CRM eleitoral, TSE, base de filiação partidária ou rede social no MVP.
- Sem ingestão de redes sociais (Twitter/X, Instagram, TikTok) no MVP.

---

## 13. Risk Register and Mitigations

### 13.1 Riscos regulatórios
- **R-1. TSE evolui Res. 23.732 para cobrir ferramentas internas.** Mitigação: arquitetura já separa análise de geração; `analysis_log` persiste por padrão. Monitoramento mensal da pauta TSE.
- **R-2. LGPD — fiscalização questiona retenção de vídeos.** Mitigação: política de retenção declarada, vídeos criptografados em repouso, base legal documentada.

### 13.2 Riscos reputacionais
- **R-3. Imprensa crítica enquadra produto como "IA orienta campanha do PL".** Mitigação: posicionamento público com disclaimers (não substitui pesquisa, não gera criativo, não microtargets), opinion letter jurídica disponível.
- **R-4. Vazamento de Análise específica (peça interna que vira pública).** Mitigação: segurança de auth e acesso por Usuário; admin pode marcar Análise como `under_legal_review` via FR-14 (oculta da UI sem deletar o log); orientação no ToS para usuários não mencionarem público-alvo específico em comentários de feedback (FR-11).

### 13.3 Riscos metodológicos
- **R-5. Echo chamber — produto diz à campanha o que ela quer ouvir.** Mitigação: prompts dos Especialistas explicitamente calibrados para contrarian framing; revisão periódica de prompts pelo admin com base nos sinais de feedback (👎 + comentário); painel Quaest paralelo (`[NOTE FOR PM]` Sprint 0).
- **R-6. Mismatch demográfico — LLMs subamostram evangélicos, agro, periferia.** Mitigação: pipeline expandido com Ideological Framer; fine-tune LoRA local sobre dados BR (`[NOTE FOR PM]` Sprint 0); validação amostral com painel real.
- **R-7. Safety refusal de modelo comercial em mensagem PL extrema.** Mitigação: roteamento automático para open-weights via OpenRouter (FR-5b); refusal-all cai em estado `analysis_status: refused_all` com notificação ao admin (≥5/24h dispara alerta visual em FR-15).
- **R-8. Calibração absoluta ruim** — limite metodológico declarado: produto entrega ranking relativo, não vote share. Mitigação: disclaimer explícito em toda Análise.

### 13.4 Riscos operacionais
- **R-9. Solo dev + 4 meses — escopo escapa.** Mitigação: PRD trava MVP em chat + análise + auth + histórico + feedback + admin de prompts; tudo o mais é roadmap.
- **R-10. Custo por Análise estoura orçamento.** Mitigação: Aggregate Engine como constraint; alarme de custo médio rolling 7d; cap de vídeo em 2 min; trigger de replan em SM-5 se mix fallback >50%.
- **R-11. Provider de áudio degrada na janela crítica.** Mitigação: fallback secundário definido em Sprint 0; monitoramento.
- **R-12. Sprint 0 consome capacidade de implementação.** Decisão de stack (LLM, gateway, áudio, fine-tune, painel real, framework) demanda 1-3 semanas de experimentos. Se Dimitri executa sozinho, perde 2 semanas do MVP, total ~18-20 sem (extrapola janela). Mitigação: **alocar research/analytics eng externo para Sprint 0**, com entrega de spec a Dimitri até semana 2; OU aceitar timeline 18-20 sem com escopo reduzido. Decisão antes da semana 1 do MVP.
- **R-13. Pipeline LLM multi-Especialista instável na primeira impl.** Risco de rewrite na semana 4-5. Mitigação: spike de design robusto de 3-4 dias antes de impl; opção de MVP com 3 Especialistas (defer Context Builder + Ideological Framer) se complexidade explodir.
- **R-14. Latência SLA (P50 ≤ 3 min) sem margem.** Load test obrigatório na semana 4-5 (não 12). Mitigação: paralelizar Especialistas, reduzir Clusters de 24 para 12, ou renegociar SM-2 conforme resultado do load test.

### 13.5 Riscos de adoção
- **R-15. Coordenação adota inicialmente e abandona após 2 semanas.** Mitigação: SM-1 (≥5 análises/semana até ago/2026) é early signal; iteração de prompts via admin sem redeploy permite reagir em horas.

---

## 14. Success Metrics

*Cada SM cross-referencia FR(s) que valida. Counter-metrics em §14.4.*

### 14.1 Primary
- **SM-1: Adoção.** ≥ 5 Análises completas por semana, sustentadas, até ago/2026; ramp para ≥ 20/sem em set/2026. Valida FR-5, FR-6, FR-7 (core).
- **SM-2: Latência.** P50 ≤ 3 min por Análise de vídeo ≤2 min; P95 ≤ 5 min. **Validação obrigatória em load test na semana 4-5 do MVP** (não na semana 12). Se P50 falha em load test cedo, gatilhos de ajuste: (i) paralelizar Especialistas onde possível; (ii) reduzir Clusters de 24 para 12 no MVP; (iii) renegociar SM-2 com coord. Valida FR-5, FR-6, NFR §8.1.
- **SM-3: Acertou o tom.** ≥ 70% das Análises com Sinal de Feedback (👍 ou 👎) tenham 👍. Valida FR-7, FR-11.

### 14.2 Secondary
- **SM-4: Concordância direcional com pesquisa real.** Quando houver pesquisa quantitativa paralela (Quaest/Atlas/IPEC) no período, a direção de sentimento estimada pelo votia-gpt bate em ≥ 80% dos Clusters analisados. **Pré-requisito de credibilidade metodológica externa.** Decisão go/no-go em **Sprint 0** com três opções binárias mutuamente exclusivas:
  - **(a) Painel contratado** — Quaest/Atlas/IPEC pago (~R$10-50k por onda); SM-4 vira métrica primária ativa.
  - **(b) Partnership universitária pro-bono** — UFRJ/USP/FGV-CPDOC; ondas reduzidas em frequência mas com peso acadêmico; SM-4 ativa.
  - **(c) Sem ancoragem externa** — votia-gpt declara formalmente "uso interno, sem ancoragem amostral"; SM-4 deferido; **comunicação externa fica vedada** até que ancoragem exista; disclaimer adicional "estimativa direcional não ancorada em pesquisa real" passa a constar em **toda Análise**.
  
  Sem decisão Sprint 0, default = (c). Valida FR-7.
- **SM-5: Custo unitário.** Custo médio por Análise ≤ $0,50 (vídeo) e ≤ $0,10 (texto/imagem). **Trigger de replan automático:** se em rolling 7d o mix de fallback open-weights exceder 50% (vs estimativa baseline 40%, ver §9.1), painel admin emite alerta para revisão de stack/budget; SM-5 é renegociado com Dimitri+coord se mix se estabilizar acima de 50%. Valida NFR §8.3.
- **SM-6: Disponibilidade.** 99% nas semanas de campanha (mid-set/2026 a out/2026), 95% fora. Valida NFR §8.2.

### 14.3 Operational
- **SM-7: Tempo de iteração de prompt.** Admin edita prompt e vê efeito em produção em ≤ 5 min (cache TTL). Valida FR-13.

### 14.4 Counter-metrics (não otimizar)
- **SM-C1: Volume de Análises por hora.** Não é meta. Otimizar por volume incentiva spam de uploads sem reflexão e degrada qualidade da iteração. Counterbalances SM-1.
- **SM-C2: % de 👍 sem 👎.** 100% de 👍 indica viés de complacência ou usuários não estão usando o sinal honestamente. Counterbalances SM-3.
- **SM-C3: Confiança subjetiva da Análise.** Análises não devem soar mais confiantes do que a metodologia permite ("estimativa direcional, não vote share" obrigatório). Counterbalances voz prescritiva (§11.2).

---

## 15. Open Questions

*Numeradas. Cada uma vira ticket de Sprint 0 ou follow-up com cliente.*

> ⚠️ **Pré-condição de timeline (decidir antes da semana 1 do MVP):** Quem executa o Sprint 0 (LLM stack, gateway, áudio, fine-tune, painel real, framework)? Se for Dimitri solo, perde 1-3 semanas do MVP. Recomendação: alocar research/analytics eng externo. Ver R-12.


1. **Sprint 0 — Stack LLM específica por Especialista.** Claude Sonnet 4.6 vs GPT-4o para motor agregado; Llama-3.3-70B vs Qwen-2.5-72B para simulação sensível. Ver `addendum.md` §3.
2. **Sprint 0 — API gateway.** Cloudflare Workers vs Vercel Edge. Ver `addendum.md` §4.
3. **Sprint 0 — Provider de áudio/transcrição.** Resemble Detect vs ElevenLabs vs solução open-source.
4. **Sprint 0 — Fine-tune LoRA local.** Treinar sobre Llama/Qwen com dados ricos BR, ou prompting + Ideological Framer é suficiente? Impacto direto em R-6 (mismatch).
5. **Sprint 0 — Painel real paralelo (deadline: antes da primeira comunicação externa).** Decisão binária entre (a) Quaest/Atlas/IPEC contratado, (b) partnership universitária pro-bono (UFRJ/USP/FGV), ou (c) sem ancoragem externa (com bloqueio de comunicação externa). Ver §14.2 SM-4 para tree completo. Sem decisão, default = (c).
6. **Sprint 0 — Framework frontend.** Next.js / SvelteKit / outro.
7. **Sprint 0 — Volume real esperado MVP.** Confirmar com a coordenação se o ramp esperado é 5 → 20 → 50/dia ou outra curva.
8. **Sprint 0 — Limite exato de tamanho de vídeo.** 100 MB / 2 min é o teto; provider de áudio escolhido pode forçar revisão.
9. **Cliente — Política de retenção exata de vídeos enviados** (mínimo 180d TSE; valor exato a definir).
10. **Cliente — Orçamento total estimado de campanha para custo do votia-gpt.** Necessário para calibrar SM-5 e dimensionar alertas.
11. **Cliente — Survey separado e entrevistas qualitativas** para calibração — quando entram no programa?
12. **Cliente — Opinion letter jurídica (pré-condição obrigatória de go-live).** Quem escreve, quando, e o que cobre exatamente? Encaminhamento em Sprint 0; entrega antes de set/2026. **Sem ela, produto não vai a produção** (ver §10.3).
13. **Etapa 2 — Estrutura de multi-tenant** quando suporte multi-candidato entrar: tenants separados ou tudo no mesmo com RLS Supabase?
14. **Pós-MVP — Comparador A/B inline, exportação em PDF, dashboard agregado**: priorização no roadmap.
15. ~~Validar com Dimitri: "user único" = tenant único (single-org, multi-usuário)?~~ **CONFIRMADO** em 2026-06-03 — tenant único PL com múltiplos usuários internos. A-8 resolvida.

---

## 16. Assumptions Index

Todos os `[ASSUMPTION]` do documento, surfaceados para confirmação explícita por Dimitri em review:

- **A-1** (§5.1 FR-1) — Usuário inativo por 90 dias recebe lembrete; 180 dias desabilita. Prazos a confirmar.
- **A-2** (§5.2 FR-4) — Limite de vídeo: 2 min e 100 MB. Depende de provider de áudio em Sprint 0.
- **A-3** (§5.4 FR-11) — Histórico de mudança de Sinal de Feedback é mantido em auditoria interna. Confirmar.
- **A-4** (§5.6 FR-17) — Upload de vídeo até 100 MB em 4G mobile completa em ≤5 min. Validar em Sprint 0.
- **A-5** (§8.6) — Conformidade WCAG 2.1 AA completa não é obrigatória no MVP; evitar regressões óbvias.
- **A-6** (§9.2) — Política de retenção de vídeos = enquanto `analysis_log` estiver no prazo regulatório (≥180d TSE). Validar com jurídico.
- **A-7** (§9.3) — Orçamento exato de campanha para custo do votia-gpt a confirmar com Dimitri.
- ~~**A-8** (§15 Q15) — "User único" entende-se como tenant único / single-org, com múltiplos usuários internos.~~ **CONFIRMADA em 2026-06-03.**
- **A-9** (Auditoria do PRD) — Coordenação de Campanha PL é validador funcional do produto; assessoria jurídica eleitoral é validador de compliance. Audiência primária do PRD é Dimitri, mas o produto exige esses dois validadores em ciclo de revisão.
- ~~**A-10** (§5.5 FR-14) — Snapshot de Personas no `analysis_log` é best-effort no MVP.~~ **REVERTIDO em 2026-06-03 (Finalize T1):** snapshot é mandatório, ver §10.1.

---

*Fim do PRD. Detalhes técnicos profundos no `addendum.md` ao lado.*
