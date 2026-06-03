# Review — Rubric Walker (qualidade canônica do PRD)

**Verdict:** PRD com substância sólida e disciplina rigorosa em scope, compliance e risk register, mas sofre em strategic coherence (tese é timing-centric, não arquitetura) e done-ness clarity da análise multimodal core (FR-4 a FR-7 sem testable consequences precisas).

## Achados por severidade

### CRITICAL

**1. FR-7 testable consequences incomplete**
"Recomendação prescritiva é sempre concreta" é intento semanticamente testável mas não especifica **como é garantido** (validação pós-LLM? retry de rejeição? timeout?). Um engenheiro não consegue aceitar a FR como done.
*Fix sugerido:* Adicionar validation criteria explícita ou marcar como "validação aspiracional via prompt — monitorar via feedback 👎."

**2. SM-4 deferral path undefined**
Pré-requisito de credibilidade, mas não diz se pode ser deferido formalmente, que sinal envia ao produto, e quando o painel precisa estar contratado. Essa ambigüidade ameaça defensibilidade reputacional (§13.2 R-3) e comunicação de imprensa.
*Fix sugerido:* Adicionar decisão tree com owner, deadline, impacto em go-live.

**3. `analysis_log` best-effort granularidade ameaça TSE compliance**
"Versionamento de prompt, modelo e Personas é best-effort; cache TTL 5 min cria janela de inconsistência" (§6 addendum, §10.1) não define o que é "aceitável". Se fiscalização pede "qual versão exata de prompt usou análise XYZ?", resposta é "provavelmente v5, talvez não" — indefensável.
*Fix sugerido:* Snapshot de versões gravado **antes** de chamada LLM, ou declarado à opinion letter jurídica como limitação aceitável.

### HIGH

**4. Aggregate Engine não testável como FR**
É descrito como "padrão ouro, constraint arquitetural duro" (addendum §1, PRD §9.3) mas não aparece como consequence de nenhuma FR. Um engenheiro aceitando FR-5 não saberia que o design **deve** usar Aggregate Engine, não loop de 20k.
*Fix sugerido:* Promover Aggregate Engine a FR (ou subfeature dedicada) com testable consequences linkando a SM-2 (latência) e SM-5 (custo).

**5. Strategy coherence entre Visão e Aggregate Engine é fraca**
Visão (§1) fala em "20 mil personas, ~3 min, por segmento" mas não menciona como. Aggregate Engine é diferencial que viabiliza custo <$0,50 mas está enterrado em addendum.
*Fix sugerido:* Adicionar à Visão uma frase sobre Aggregate Engine como inovação arquitetural.

## Dimensões cobertas

- **Decision-readiness:** adequate
- **Substance over theater:** strong
- **Strategic coherence:** thin
- **Done-ness clarity:** thin
- **Scope honesty:** strong
- **Downstream usability:** adequate
- **Shape fit:** adequate
- **Mechanical (Glossário, IDs, Assumptions Index):** strong
