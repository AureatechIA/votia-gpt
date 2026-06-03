# Review — Adversarial Cynical Reviewer

**Verdict adversarial:** Este PRD é otimismo regulatório + técnico mascarado de disciplina; confunde a existência de um documento de constraints com a existência de mecanismos de enforcement, e aposta que o LLM não vai falhar de jeitos que o PRD não contempla.

## Top 5 achados mais incômodos

### 1. [CRÍTICA] Painel de feedback interno ≠ validação metodológica
SM-4 (concordância com pesquisa real ≥80%) é deferível. votia-gpt pode chegar a set/2026 sistematicamente errado em 2–3 clusters e ninguém saberá até tarde. Disclaimer "estimativa direcional" cobre risco legal, não risco de adoção.

### 2. [CRÍTICA] Voz prescritiva forte é inconciliável com limite metodológico
"Você deve cortar 0:42–0:58" foi marcado como "não revisitar". Mas essa voz é inconciliável com "ranking relativo, não vote share". Usuário ouve "IA sabia que seria melhor". Abre flanco regulatório TSE ("IA orientou refilmagem") e reputacional (imprensa: "IA calibrou campanha PL").

### 3. [CRÍTICA] Fallback automático = custo variável
"~60% comercial + ~40% fallback" é assunção sem validação. Se em produção for 60% fallback (refusal em ambos), SM-5 estoura. Descoberta tarde. **Sem plano B.**

### 4. [CRÍTICA] Peça mista legal/ilegal sem fluxo de revisão
PRD não cobre cenário: vídeo com parte legítima + frame "Lula comunista" (questionável). Sistema analisa tudo, recomendação prescreve corte da parte suspeita. Parece que votia-gpt está "calibrando conteúdo para evitar rejeição legal". Risco regulatório material.

### 5. [CRÍTICA] Opinion letter desatualiza enquanto produto evolui
Pré-condição assinada agora (jun/2026), produto evolui em Sprint 0–2, versão em prod é v2+. Se opinião vira desatualizada, plano B é nenhum.

## Vetor 1 — Suposições silenciosas

- **Aggregate Engine não validado em contexto político PT-BR.** v1 era genérico. Política é 100x mais sensível. Output plausível ≠ output calibrado.
- **Disclaimer "não é vote share" é visual no rodapé.** Usuário ouve "voto sobe". SM-C3 é não-testável operacionalmente.
- **"Marqueteira sênior" trata como pacífico um tom que pode soar "IA guiando campanha" para crítico externo.**
- **Compliance jurídica como pré-condição assinada agora, sem cobertura para evolução pós-letter.**

## Vetor 2 — Stakeholder ignorado

- Jurídico não-PL (Marco Civil, ABRJ, OIEA): coalizão civic tech pode soltar carta condenando "IA para manipular eleitor". PRD não tem resposta.
- Assessoria jurídica do candidato: PL não é monolítico; candidato pode vetar 2 semanas antes do launch.
- Pesquisadores de linguística PT-BR: LLMs open-weights são fracos em PT-BR coloquial; sprint 0 (20 análises canônicas) é insuficiente para validar mismatch BR rural vs urbano.
- Opositores políticos: produto será conhecido em eleição polarizada; nenhuma resposta planejada.

## Vetor 3 — Modos de falha não-cobertos

- **Peça mista legal/ilegal**: análise prescreve corte; aparenta otimização de conteúdo suspeito.
- **Uploader não-autorizado interno**: estagiário roda 100 análises de variantes, sistema vira gerenciador de criativo.
- **Vazamento via funcionário autenticado**: análise sensível vira manchete; logout não revoga acesso a análises já vistas.
- **Pesquisa Quaest diverge violentamente**: credibilidade evapora; SM-4 deferível não cobre o risco.
- **SM-3 gameable sem alarme**: 85% 👍 sem melhora real; SM-C2 é observacional, não detectável.

## Vetor 4 — Otimismo sobre tecnologia

- **Detecção de refusal frágil**: como distingue "não posso analisar" de "qualidade ruim"? Heurística não especificada.
- **Open-weights também recusam** com menos frequência mas recusam; PL extremo pode disparar.
- **Custo do fallback subestimado**: 60% fallback (não 40%) faz SM-5 estourar 3x.
- **Ideological Framer prompting away divergência demográfica PT-BR**: tarefa NLP de dificuldade máxima; 4 linhas de prompt não resolvem.
- **Streaming mascara latência upstream**: usuário em rede ruim vê "carregando" por 2 min reais.
- **LLM "sempre concreto" por prompt**: degradação silenciosa para abstrato é falha de qualidade, não falha de sistema.

## Vetor 5 — Métricas gameable

- **SM-1 (volume)**: spam de variantes mínimas conta. SM-C1 não detecta automaticamente.
- **SM-3 (acertou o tom)**: complacência sem threshold de alarme.
- **SM-5 (custo)**: vulnerável a mudança de mix; sem trigger de replan.
- **SM-2 (latência)**: vulnerável a congestionamento externo OpenRouter.
- **SM-4 (concordância)**: deferível; produto pode ir a prod sem validação de calibração real.

## Tabela consolidada de severidade

| Vetor | Achado | Severidade |
|---|---|---|
| Suposição | Aggregate Engine não-validado político PT-BR | 🔴 CRÍTICA |
| Suposição | Disclaimer "não vote share" é cosmético | 🔴 CRÍTICA |
| Suposição | Compliance sem plano B se jurídico disser não | 🔴 CRÍTICA |
| Stakeholder | Sem envolvimento jurídico não-PL/civic tech | 🟠 ALTA |
| Falha | Peça mista legal/ilegal não modelada | 🔴 CRÍTICA |
| Falha | Pesquisa Quaest diverge | 🔴 CRÍTICA |
| Falha | Vazamento via funcionário | 🔴 CRÍTICA |
| Otimismo LLM | Refusal fallback + custo explode SM-5 | 🔴 CRÍTICA |
| Otimismo LLM | Ideological Framer prompting away NLP máximo | 🔴 CRÍTICA |
| Otimismo LLM | Latência P50 ≤ 3 min otimista | 🟠 ALTA |
| Gameable | SM-1 volume spam variantes | 🟠 MÉDIA |
| Gameable | SM-5 mix mudança sem replan | 🔴 CRÍTICA |
| Gameable | SM-4 deferível abre flanco metodológico | 🔴 CRÍTICA |
