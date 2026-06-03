---
title: Reconciliação Brief ↔ PRD | votia-gpt
created: 2026-06-03
status: final
---

# Reconciliação: Brief Votia-GPT vs PRD Redigido

**Objetivo:** identificar gaps, silenciamentos e ideias qualitativas perdidas na transição do brief para o PRD formal.

---

## Resumo Executivo

**Verdict:** PRD bem alinhado ao brief em escopo funcional. Porém, **gaps ALTOS em qualitativo** — tom de risco/defesa reputacional do brief não respira no PRD formal. Três fugas críticas de semântica.

**Impacto:** se não forem recuperadas, executores podem deixar de lado: (a) defesa ativa contra risco reputacional PL; (b) calibração do tom prescritivo como "voz de vanguardista"; (c) urgência de validação ética antes de go-live; (d) sensibilidade ao mismatch demográfico BR como differentiator competitivo, não bug técnico.

---

## Tabela de Gaps Identificados

| # | Categoria | Descrição | Evidência Brief | Atenuação PRD | Severidade |
|---|-----------|-----------|-----------------|---------------|-----------|
| G-1 | Risco Reputacional | Brief explícito: risco reputacional PL > regulatório; exigida mitigação agressiva (opinion letter, cláusula ética) | Brief §8, Addendum §5 | PRD §10.3 marca como [NOTE FOR PM]; reduz a "validar" | CRÍTICO |
| G-2 | Urgência de Defesa | Brief: "janela fecha / imprensa ataca se houver brecha" | Brief §2, Research Reg §5 | PRD §2 neutraliza para "time-critical" técnico | ALTO |
| G-3 | Tom Prescritivo | Brief: "voz Duda engaja substancialmente mais" é moat adoção | Addendum §1.4, Research legado §6 | PRD §11.2 reduz a "herdado"; SM não captura diferencial | ALTO |
| G-4 | Mismatch Demográfico BR | Brief/Research: "LLMs subamostram evangélicos/agro — armadilha PL específica" | Research §5, Brief §4 | PRD §13.3 lista risco; SM-4 deferido; sem compensação ativa | CRÍTICO |
| G-5 | Safety Refusal | Brief: "planeje open-weights OBRIGATORIAMENTE" | Research §5, Addendum §1.1 | PRD §9.1 reduz a "fallback se ocorrer" | ALTO |
| G-10 | Research Quaest | Brief/Research: painel real é pré-requisito credibilidade | Research §TL;DR, §5 | PRD §14.2 SM-4 deferível (= postergável) | ALTO |

---

## Gaps Críticos

### G-1: Opinion Letter não é Follow-Up, é PRÉ-CONDIÇÃO

**Brief:** "Recomendado opinion letter jurídica antes do go-live" + "Risco reputacional > regulatório puro"

**PRD:** [NOTE FOR PM] = sinaliza como postergável

**Impacto:** Descobrir em setembro que opinião jurídica não cobre isolamento CRM = refatoração 4 semanas antes eleição.

**Recomendação:** Elevar a Constraint Obrigatório, bloqueador Sprint 0.

### G-4: Mismatch BR é Armadilha Tática, não Genérica

**Brief:** "GPT/Claude default = paulistano classe média. Evangélicos/agro/periferia subamostrados. Armadilha PL específica."

**PRD:** Listado como risco genérico; fine-tune LoRA é [NOTE PM] postergável

**Impacto:** Lançar com GPT-4o default, descobrir análises enviesadas contra clusters votantes críticos.

**Recomendação:** Fine-tune LoRA = parte do Aggregate Engine, não roadmap. SM-4 obrigatório.

### G-5: Safety Refusal Acontece ~30-40% Peças PL

**Brief:** "Modelos comerciais sanitizam core conteúdo PL… ~40% refusal em tópicos anti-STF/pró-armas/evangélico-extremo"

**PRD:** "Fallback obrigatório se detectada refusal" = suaviza urgência

**Impacto:** Não provisionar roteamento automático + custo open-weights = sistema quebra em production.

**Recomendação:** Clarificar que 30-40% das peças caem em fallback; roteamento é mandatory, não optional.

---

## Recomendações Pontuais de Edição

### E1: Opinion Letter a Constraint de Sprint 0

PRD §10.3:
```
Opinion letter jurídica é PRÉ-CONDIÇÃO Sprint 1.
Assessoria jurídica valida em Sprint 0:
  - Isolamento CRM (design + código)
  - Plano auditoria TSE 180 dias
  - Framing "dados IBGE" em contrato + comunicação
  
Atestado jurídico é OBRIGATÓRIO para go-live.
```

### E2: Safety Refusal é Mandatory Fallback

PRD §9.1:
```
Assume ~30-40% Peças (conteúdo PL extremo) geram refusal em GPT/Claude.
Arquitetura EXIGE:
  - Detecção refusal automática
  - Roteamento a open-weights (Llama/Qwen) via OpenRouter
  - Logging cada fallback
  
Sem failover, análise conteúdo PL real NÃO é viável.
Sprint 0 provisiona latência + custo.
```

### E3: Painel Quaest é Obrigatório, não Deferível

PRD §14.2 SM-4:
```
Pré-requisito: 1 onda pesquisa Quaest (500 respondentes,
clusters críticos) rodando até ago/2026.
Sem âncora real, comunicação interna fica especulativa.
Orçamento campanha DEVE incluir. Decidir Sprint 0.
```

### E4: Mismatch BR como Diferenciador Tático

PRD §13.3 R-6 (expandir):
```
Mismatch demográfico = DIFERENCIADOR TÁTICO, não bug genérico.
GPT/Claude default = paulistano classe média.
Evangélicos/agro/periferia subamostrados = risco real análises perderem credibilidade.

Mitigações obrigatórias:
  - Ideological Framer forte
  - Fine-tune LoRA ~10k exemplos BR (MVP, não roadmap)
  - Validação output vs. intuição coordenação
```

---

## O Que Executor Pode Perder (Lendo Apenas PRD)

- Opinion letter não é pré-condição → acha em setembro que não é defensável
- Mismatch é "risco genérico LLM" não "tático evangélico/agro PL"
- Safety refusal é "pode acontecer" não "acontece 30-40%"
- Painel Quaest é "seria bom" não "necessário credibilidade"
- Tom prescritivo é "padrão voz" não "moat adoção"

**Brief carrega sentimento defensivo ativo que PRD neutraliza estruturalmente.**

---

## Conclusão

**PRD funcionalmente alinhado, qualitativamente incompleto.**

Fazer edições E1-E4 antes de compartilhar com Dimitri, ou anexar este documento como "notas contextuais brief" para tom defensivo/urgência não se perder em implementação.
