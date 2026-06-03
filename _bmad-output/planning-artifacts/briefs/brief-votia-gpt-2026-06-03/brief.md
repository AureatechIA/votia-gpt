---
title: votia — Product Brief
status: final
created: 2026-06-03
updated: 2026-06-03
owner: Dimitri (tech lead)
audience: Coordenação de Campanha — Partido Liberal (digital + assessoria de imprensa)
language: pt-BR
---

# votia

> **Assistente de IA que prevê como o eleitorado vai reagir a um vídeo de campanha — antes da publicação.**

---

## 1. Sumário executivo

O **votia** é a ferramenta interna que **antecipa a recepção do eleitorado a uma peça de mídia antes da publicação**. A coordenação sobe um vídeo; o sistema analisa imagem, fala e mensagem, consulta uma base de **20 mil personas reais derivadas de pesquisa pública IBGE com instrumentação política expandida**, e devolve um diagnóstico: onde a peça cai bem, onde cai mal, o que vira voto, e o que ajustar na comunicação.

É a **versão 2** do trabalho que a empresa já vem fazendo no `persona-main` — reconstruída do zero para suportar vídeo de forma nativa, simplificar a operação e entregar respostas mais precisas em vez do output genérico que a versão atual produz.

---

## 2. Por que agora

- **Pré-campanha em curso.** Eleição presidencial em outubro/2026; restam ~4 meses até o 1º turno. A janela de utilidade do votia abre **agora**.
- **Vídeo é o terreno principal da disputa.** Reels, TikTok, Kwai e YouTube Shorts movem a aceitação do candidato em horas, não semanas. Hoje a coordenação testa peças por instinto e por leitura de engajamento *depois* da publicação — quando o estrago ou o benefício já estão dados.
- **A v1 (`persona-main`) entrega análises genéricas.** Ela acumulou aprendizado valioso em prompts e arquitetura, mas a estrutura distribuída em quatro serviços com prompts monolíticos não acompanha o ritmo de uma campanha. **Reconstruir é o caminho mais rápido para chegar onde a v1 não chegou.**

---

## 3. O que o votia entrega (MVP — presidencial)

**Fluxo único e direto, em formato de chat:**

1. A coordenação faz upload de um vídeo (ou texto, ou imagem) numa interface tipo GPT.
2. Em poucos minutos, recebe uma análise estruturada cobrindo:

| Pergunta da coordenação | O que o votia responde |
|---|---|
| Quem vai gostar disso? | Aceitação por segmento (cluster IBGE + ideologia + região) |
| Quem vai rejeitar? | Mapa de atrito: onde a peça custa voto e por quê |
| Por quê? | Justificativa em linguagem natural, segmento a segmento |
| Vira voto? | Estimativa de **deslocamento relativo** de intenção por segmento (não vote share absoluto — veja seção 4) |
| Como melhoro? | Recomendações: corte, refilme, troque palavra X por Y, ajuste enquadramento, mude o gancho de abertura |

**Output v1:** análise textual estruturada na própria conversa, em voz prescritiva ("você deve…"), no tom de uma marqueteira sênior. **Sem dashboard, sem PDF, sem comparador A/B no MVP** — esses entram no roadmap.

---

## 4. O que o votia NÃO entrega (limites declarados)

Declarar limites cedo protege a credibilidade do produto e da coordenação:

- **Não substitui pesquisa Quaest / Atlas / IPEC.** O votia entrega **ranking relativo entre segmentos** ("essa peça cai melhor com evangélicos do Nordeste do que com universitários do Sul"). **Não prevê vote share absoluto.** Pesquisa tradicional segue sendo o instrumento certo para horse-race.
- **Não gera criativo para publicação direta.** O votia analisa material existente. Geração de conteúdo para publicação fica fora do MVP — entra na v2 com rotulagem ostensiva, conforme Resolução TSE 23.732/2024.
- **Não conecta a CRM eleitoral no MVP.** Mantém isolamento jurídico claro: trabalha sobre personas baseadas em dado público, não sobre eleitor identificável.
- **Não é oráculo.** Resultados são probabilísticos, calibrados sobre a base de personas. Decisão final é sempre da coordenação.

---

## 5. Diferenciais frente à v1

| | persona-main (v1) | votia (v2) |
|---|---|---|
| Base de personas | 20 mil sintéticas | **20 mil reais** (derivadas de microdados IBGE) — com plano de expansão pós-MVP |
| Suporte a vídeo | Fraco (foco em texto/imagem) | **Multimodal nativo** (transcrição + frames + áudio) |
| Arquitetura | 4 workers, 3 hosts | **App único modular** |
| Voz do output | Em evolução | **Marqueteira prescritiva em 2ª pessoa** (herdado da v1) |
| Custo por análise | $0,12 (Aggregate Engine) | **Igual ou menor** (mesmo padrão, mais enxuto) |
| Manutenibilidade | Prompts monolíticos de 190 linhas | **Prompts modulares editáveis sem deploy** |

**No mercado brasileiro, não há player conhecido oferecendo painel de IA simulado para análise política.** Soluções internacionais (Affectiva, Realeyes) fazem facial-coding genérico, sem segmentação eleitoral nem cobertura BR.

**Patterns reaproveitados da v1 (decisão consciente):** Aggregate Engine (uma chamada inferencial em vez de 20 mil), pipeline de contextualização ideológica, conselho de cinco especialistas simulados, voz prescritiva, prompts versionados em base de dados editáveis sem deploy. *Detalhamento técnico no addendum.*

---

## 6. Como funciona (alto nível)

```
[ vídeo ] → [ extração ] → [ contextualizador ] → [ motor de inferência ] → [ análise pronta ]
            transcrição    pesquisa web rápida    1 chamada agregada       texto estruturado
            frames-chave   frame ideológico       sobre 20k personas       no chat
            áudio/tom      negação/ironia         perfil estatístico
```

1. **Extração** — Whisper para transcrição, embeddings visuais para frames-chave, análise de prosódia para tom.
2. **Contextualização** — pesquisa web leve para entender referências, identificação de figuras políticas, framing esquerda/direita.
3. **Motor de inferência** — uma única chamada de IA sobre um perfil estatístico pré-computado das 20 mil personas (padrão já validado em produção na v1: economia de 98% versus loop por persona).
4. **Conselho de especialistas** — cinco analistas simulados (política, religião, marketing digital, psicologia social, compliance) opinam em paralelo; sistema agrega consenso + divergências.
5. **Síntese** — output em linguagem direta, sem jargão técnico: o que está bom, o que está ruim, o que mudar.

---

## 7. Roadmap até outubro/2026

| Fase | Janela | Entrega |
|---|---|---|
| **Sprint 0** | Semanas 1–2 (início jun/26) | Validação técnica do reaproveitamento da v1 (conversa pontual com time anterior), prova de Aggregate Engine sobre dados reais, decisão final de stack |
| **Sprint 1–2 (MVP)** | Semanas 3–6 (julho) | Chat funcional: upload de vídeo → análise → resposta em texto. Apresentável à coordenação |
| **Sprint 3–4** | Semanas 7–10 (agosto) | Refino com feedback real da coordenação. Dashboard básico. Exportação de relatório PDF |
| **Sprint 5–6** | Semanas 11–16 (setembro–outubro) | Comparador A/B (sobe dois vídeos, compara aceitação). Início do roadmap regional (governador, deputado federal) |
| **Pós-eleição** | nov+ | Auditoria de uso (Res. TSE 23.732 exige registro por 180d). Reentrenamento. v3 |

---

## 8. Riscos e mitigações

| Risco | Probabilidade | Mitigação |
|---|---|---|
| Modelo de IA "sanitiza" perfis ideologicamente extremos (filtros de moderação dos modelos comerciais como GPT/Claude/Gemini) | Alta | Avaliar modelos alternativos de código aberto (Llama, Qwen, Mistral) via plataformas que agregam múltiplos provedores. *Validar em Sprint 0.* |
| Coordenação interpretar "ranking relativo" como "vote share absoluto" e tomar decisão errada | Média | Disclaimer no output, treino curto da coordenação, e calibração contra pesquisa tradicional periódica |
| Resolução TSE 23.732/2024 evoluir para incluir ferramentas internas | Baixa | Arquitetura já separa análise de geração-para-publicação; log auditável de 180 dias por padrão |
| Reputacional (imprensa crítica enquadra como "IA orienta campanha do PL") | Média | Posicionamento defensável: dado IBGE público, sem microtargeting de pessoa identificável, sem geração de conteúdo na v1. Cláusula de uso ético em contrato. *Recomendado opinion letter jurídica antes do go-live.* |
| Solo dev + 4 meses não fecha o escopo | Alta | Escopo do MVP travado em chat + análise. Tudo o mais vai para roadmap. Herança de patterns da v1 acelera substancialmente |

---

## 9. O que precisa para começar

- **Aprovação do brief** pela coordenação.
- **Conversa de 30–60 min com 1 membro do time `persona-main`** para validar herança técnica em Sprint 0.
- **Acesso aos modelos** (chaves de API Anthropic / OpenAI; conta em plataforma que agrega múltiplos provedores para avaliação de modelos de código aberto).

**Decisão de produto pendente:** o "candidato presidencial" deste MVP é **um candidato específico** ou suporte multi-candidato dentro do PL? `[ASSUMPTION: candidato único — confirmar]`

---

## 10. Equipe

- **Tech lead / solo developer:** Dimitri
- **AI pair:** Claude (Anthropic)
- **Acesso tira-dúvida:** time anterior do `persona-main`
- **Aprovação:** Coordenação de Campanha + Assessoria de Imprensa do PL

---

*Documentação técnica complementar (arquitetura, patterns herdados, regulação, posicionamento competitivo) está em `addendum.md`.*
