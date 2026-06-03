# Pesquisa — Estado da arte de simulação de personas via LLM (jun/2026)

> Digest do agente de pesquisa, executado em 2026-06-03. **Limitação:** o agente teve WebSearch bloqueado — conteúdo é do conhecimento interno até janeiro/2026, não verificação ao vivo. Re-rodar com web habilitada se for entrar em decisões críticas.

## 1. Papers e produtos — consenso

- **Out of One, Many (Argyle et al., 2023, *Political Analysis*)** — seminal. GPT-3 condicionado em backstories ANES reproduziu distribuições de respostas de eleitores americanos surpreendentemente bem. Cunhou o termo "silicon samples". (arxiv.org/abs/2209.06899)
- **Language Models Trained on Media Diets Can Predict Public Opinion (Chu et al., MIT, 2023)** — fine-tuning em notícias regionais prevê opinião de subgrupo melhor que modelo off-the-shelf.
- **Predicting Results of Social Science Experiments Using LLMs (Hewitt et al., Stanford, 2024)** — GPT-4 previu efeitos de tratamento em 70 RCTs com r~0.85. Frequentemente citado como o ápice otimista.
- **Synthetic Replacements for Human Survey Data? (Bisbee et al., 2024, *Political Analysis*)** — contraponto: respostas do ChatGPT tinham variância menor que humanos e eram instáveis entre runs e perturbações de prompt. **Paper cético mais citado.**
- **Whose Opinions Do LLMs Reflect? (Santurkar et al., Stanford, 2023)** — LLMs base agrupam perto de visões liberais e universitárias dos EUA. Direcionamento demográfico só fecha o gap parcialmente.
- **Generative Agent Simulations of 1,000 People (Park et al., Stanford, 2024)** — agentes ancorados em entrevista replicaram respostas GSS em ~85% da confiabilidade teste-reteste humana. Melhor evidência recente para simulação rica em contexto.
- **Constitutional Polling / AI21 / Anthropic (2025)** — write-ups internos defendem que polls com LLM funcionam para *enquadramento de mensagem*, não para *horse-race numbers*.

**Consenso informal (meados de 2026):**
- LLMs são **decentes em ranking relativo** (qual mensagem cai melhor com segmento A vs B).
- LLMs são **ruins em calibração absoluta** (vote share, % de aprovação).
- LLMs são **não-confiáveis em populações não-WEIRD**, a menos que se faça fine-tune em dados locais.
- O campo migrou de "substituir pesquisas" para "complementar pesquisa qualitativa / pré-screenar mensagens".

## 2. Limites conhecidos

- **Mode collapse / baixa variância** — respondentes sintéticos são consistentes demais. Perde-se as caudas que importam politicamente.
- **Viés do training data** — Nordeste brasileiro, evangélicos, baixa escolaridade são massivamente sub-representados. O modelo default soa como "paulistano de classe média".
- **Sensibilidade a prompt** — pequenas mudanças no enunciado mudam distribuições em 10 a 30 pontos percentuais (Dominguez-Olmedo et al., 2024).
- **Coerência alucinada** — personas respondem consistentes demais entre tópicos; eleitores reais são bagunçados e contraditórios.
- **Deriva temporal** — modelos pré-2024 não conhecem dinâmica pós-Lula 3 nem o realinhamento PT-PL recente.
- **Sycophancy + flatten do RLHF** — safety tuning suprime respostas extremas/edgy que importam para testar mensagens PL.

## 3. Comparáveis comerciais

- **Synthetic Users (syntheticusers.com)** — generalista UX/marketing, sem vertical político anunciado.
- **Yabble, Outset.ai, Quester, Listen Labs, Strella** — pesquisa qualitativa / "AI moderator". Nenhum específico de política publicamente.
- **Aaru** (YC) — vende explicitamente "prever eleições com agentes de IA". Teve imprensa no ciclo US 2024 com acurácia mista.
- **Verasight, Aurora Insights, GoodLogic** — painéis híbridos sintético+real para clientes políticos (US).
- **Brasil:** sem player dominante até o cutoff. Quaest, AtlasIntel, Genial/Quaest publicam pesquisas tradicionais. **Nenhum vende painéis LLM-simulados comercialmente — espaço aberto.**

## 4. Análise de vídeo + previsão de reação

- **Frameworks:** Google VideoPrism, Meta V-JEPA-2, pipelines de avaliação Sora — embeddings multimodais de transcrição + visual + prosódia.
- **Affectiva (Smart Eye), Realeyes, Entropik** — facial-coding via webcam para teste de anúncios, segmentado demograficamente. Maduros, usados por Globo e Kantar no Brasil.
- **Pesquisa:** MERLOT Reserve (AI2), AudioGPT, Video-LLaVA — stacks multimodais open para combinar com persona LLMs.
- **Previsão de reação por segmento:** sem produto shrink-wrapped. Pipeline custom = Whisper (transcrição) + CLIP/SigLIP (frames) + áudio sentiment → persona LLM com condicionamento demográfico → eliciar reação. **É construível, não comprável.**

## 5. Brasil 2026 e PL — armadilhas práticas

- **Mismatch de distribuição** — GPT/Claude subamostram evangélicos, agro, periferia. Você ganha "paulistano de classe média" pra toda persona se não fizer fine-tune local.
- **Safety filters bloqueiam o core do conteúdo** — modelos de fronteira recusam roleplay de reação a mensagens anti-aborto, anti-STF, pró-armas, ou Bolsonaro-coded. Planeje open-weights (Llama, Qwen, Mistral) + SFT próprio.
- **LGPD + TSE** — personas sintéticas treinadas em microdados eleitorais reais = exposição jurídica. Res. 23.732/2024 exige disclosure de conteúdo sintético; checar se cobre pesquisa interna (cobre como registro auditável por 180 dias).
- **Calibração sem ground truth** — sem painel real paralelo (contrato Quaest/IPEC), não dá pra validar. Orçar pelo menos duas ondas reais como âncora.
- **Falha-tipo de echo chamber** — produto diz à campanha o que ela quer ouvir. Falha comum no ciclo US 2024 (Aaru e similares erraram o swing latino).
- **Ponto-cego de influencer / short-form** — reações a TikTok/Kwai/Reels não transferem de elicitação tipo survey. Precisa sinal comportamental, não preferência declarada.
- **Reprodutibilidade pra imprensa** — se a Folha ou a Piauí perguntar como o painel funciona, "GPT-4 com prompt" não sobrevive a uma auditoria metodológica.

## TL;DR pra brief

- **Use personas sintéticas para screening de mensagem e iteração criativa** (alto sinal, barato).
- **Nunca use para prever vote share** (baixo sinal, embaraçoso).
- **Combine com painel real** (mesmo que pequeno) pra ancoragem.
- **Construa em open weights** pra liberdade de conteúdo e auditabilidade.
- **O stack de reação a vídeo por segmento é greenfield** — moat competitivo se for o primeiro a entregar.

---

**Fonte:** subagente de pesquisa interna, conhecimento até janeiro/2026, WebSearch indisponível na sessão. Validar números e estado dos players antes de citar em pitch externo.
