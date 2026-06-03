# Review — Compliance Reviewer (TSE + LGPD + defensibilidade)

**Verdict:** O votia-gpt está juridicamente indefensável como descrito no PRD atual: faltam snapshot obrigatório de auditoria, documentação de bases legais LGPD, validação externa de calibração, e parecer jurídico credível de terceira parte. Risco regulatório TSE, violação LGPD em auditoria fiscal, e narrativa hostil em mídia crítica.

## Top 5 achados críticos

### 1. [CRÍTICA] Versionamento de Prompts/Modelos em `analysis_log` é "Best-Effort"
**Vetor:** TSE Res. 23.732/2024 art. 9º-D.
**Localização:** §10.1, Addendum §6.2–6.3.
**Impacto:** Se TSE requisita auditoria de análise de julho/2026, resposta é "talvez não temos o prompt e o modelo exatos". Indefensável em auditoria formal. Risco: multa, bloqueio, acusação de obstrução.
**Mitigação:** Implementar snapshot obrigatório no momento exato de cada análise — JSON estruturado com analysis_id, prompt_versions, llm_model, fallback_model, personas_build, timestamp. <50 LOC, zero impacto performance.

### 2. [CRÍTICA] Bases Legais LGPD Pressupõem Contrato Não Mencionado
**Vetor:** LGPD arts. 7–8, 10.
**Localização:** §10.2.
**Impacto:** PRD assume contrato com usuário, mas nenhum ToS existe. "Execução de contrato com o usuário" é alegação falsa. Legítimo interesse em ferramenta política é frágil e contestável. ANPD vai questionar ausência de consentimento explícito.
**Mitigação:** (A) ToS claro no primeiro login com dados coletados, bases legais, direitos LGPD, retenção 180d; ou (B) reframing para "obrigação estatutária" se lei eleitoral exigir logs.

### 3. [CRÍTICA] Opinion Letter Jurídica Sem Especificação de Estatura/Cobertura
**Vetor:** Defensibilidade reputacional.
**Localização:** §10.3.
**Impacto:** PRD marca como obrigatória mas não diz quem escreve. Advogado interno PL não tem credibilidade externa. Escopo não-detalhado deixa brechas (TSE? LGPD? Código Eleitoral? microtargeting? voz prescritiva?).
**Mitigação Sprint 0:**
- Definir escritório (Machado Meyer, Vivant, GVlaw, FGV-Direito) com CNPJ e estatura.
- Prazo: assinada antes de 15 set 2026 (janela de 30 dias para remediation).
- Escopo de 8–10 pontos testáveis: LGPD arts. 7-10, 40-46; TSE 23.732 art. 9º-D; Código Eleitoral; isolamento de Personas; voz prescritiva (não recomenda fraude/calúnia); isenção do PL; segurança de dados (criptografia, certificação, localização); direitos LGPD do titular.

### 4. [CRÍTICA] Snapshot de Personas no `analysis_log` é "Best-Effort"
**Vetor:** TSE Res. 23.732/2024 art. 9º-D (reproducibility).
**Localização:** A-10, Addendum §6.2-6.3.
**Impacto:** TSE não exige bit-exato (correto), mas exige rastreabilidade. "A gente tinha personas-v1.0 mas talvez tenha sido upgraded" é indefensável. Personas build é parametrização do modelo; mudar versão muda scores.
**Mitigação:** Referenciar versão de Personas build em cada analysis_id. Manter tabela "Personas build inventory" com data de deploy, checksum, descrição. <10 LOC + 1 tabela.

### 5. [ALTA] Disclaimers Públicos Não Existem ("Internos")
**Vetor:** Defensibilidade reputacional, mitigação de R-3.
**Localização:** §10.3.
**Impacto:** "Página sobre interna" é inútil. Imprensa: "Vocês não explicam o que essa ferramenta faz? Que coisa suja é essa?" Sem página pública / white paper / press kit, narrativa "IA secreta da campanha PL" gruda.
**Mitigação:** Antes de qualquer comunicação externa:
- Página pública no site PL (<500 palavras).
- White paper técnico (3–5 páginas) com explicação de Personas, pipeline, limitações, conformidade.
- Press kit para assessoria com talking points e disclaimers.

## Riscos secundários (alta severidade)

**R-S1.** Storage de vídeos — localização geográfica e certificação não especificadas (LGPD art. 46, art. 44 transferência internacional). Especificar storage provider e certificação (ISO 27001, SOC 2).

**R-S2.** Policy de delete-on-request de vídeo com hold regulatório não mencionada (LGPD art. 17). ToS deve explicar retenção 180d como obrigação legal TSE; política de hold se TSE inicia auditoria.

**R-S3.** SM-4 (validação contra pesquisa real) formalmente deferível compromete credibilidade. Tornar pré-condição de comunicação externa; partnership com universidade (UFRJ, USP, FGV) como alternativa pro-bono.

**R-S4.** Feedback de Usuário pode expor intenção política interna (microtargeting aparente em vazamento). Anonimizar feedback (remover user_id) ou instruir usuários a não mencionar público-alvo.

## Acertos do PRD (validação positiva)

- ✅ Isolamento de Personas (agregadas IBGE).
- ✅ Exclusão explícita de geração de criativo (evita rotulagem TSE art. 9º-B).
- ✅ Aggregate Engine como constraint arquitetural.
- ✅ Tenant único MVP reduz superfície de isolamento LGPD.
- ✅ `analysis_log` com estrutura de base sólida.
- ✅ Streaming + mensagens intermediárias.
- ✅ Voz Prescritiva (defensável desde que recomendações sejam concretas).

## Recomendações prioritárias

**Críticas (bloqueiam go-live):**
- Snapshot obrigatório (prompt_version, modelo, Personas version, timestamp) em cada analysis_id.
- Contratar opinion letter jurídica de terceira parte reconhecida, escopo detalhado, antes 15 set 2026.
- Implementar ToS no primeiro login (dados, bases legais, direitos, retenção).
- Publicar disclaimers públicos (site PL ou white paper).

**Altos (defensibilidade):**
- Detalhar retenção de vídeos (provider, certificação, hold regulatório).
- Operacionalizar direitos LGPD (acesso, correção, exclusão, prazo 30 dias).
- Validar SM-4 como pré-condição de comunicação externa.
- Anonimizar/instruir feedback.
- Definir clock de retenção 180d (02 out 2026 vs 27 out).

## Conclusão

PRD sólido em visão, features e scope; deficiente em compliance e defensibilidade. Três lacunas fatais: auditoria (best-effort indefensável), bases legais (sem ToS), posicionamento (sem comunicação pública nem opinion letter terceira parte). Produto implementável e defensável — mas **não no estado descrito**.
