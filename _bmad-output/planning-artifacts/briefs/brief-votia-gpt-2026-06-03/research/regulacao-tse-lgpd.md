# Pesquisa — Regulação TSE/LGPD para IA em campanha eleitoral (jun/2026)

> Digest do agente de pesquisa, executado em 2026-06-03. Foco: o que afeta o desenho do produto votia-gpt.

## 1. TSE — Resolução 23.732/2024 e atualizações

Núcleo da Res. 23.732/2024 (altera Res. 23.610/2019, propaganda eleitoral):

- **Art. 9º-B** — proíbe deepfakes (conteúdo sintético que altere fala/imagem de pessoa real para difamar ou favorecer candidatura). Vedação absoluta, sem rotulagem que "salve".
- **Art. 9º-C** — exige rotulagem explícita de qualquer conteúdo gerado/manipulado por IA usado em propaganda (áudio, vídeo, imagem, texto sintético).
- **Art. 9º-E** — responsabilização solidária de plataformas por não remoção tempestiva.
- Jurisprudência 2024-2025 (AIJEs, Cons. TSE Floriano de Azevedo Marques) consolidou: **rotulagem deve ser ostensiva, não em rodapé.**

### Aplicação à ferramenta interna votia-gpt

A Res. 23.732 regula propaganda eleitoral (conteúdo difundido). Ferramenta interna de análise de mídia própria e previsão de reação **não publica conteúdo**, portanto fora do escopo dos arts. 9º-B/C. **Mas**, se a ferramenta gerar variações de criativo destinadas a publicação, a saída entra no escopo — rotulagem obrigatória no momento da veiculação.

**Decisão de design:** separar nitidamente módulo "análise" (livre) de módulo "geração para publicação" (regulado).

## 2. LGPD e dados eleitorais

- **IBGE agregado / sintético:** dados anonimizados (art. 12 LGPD) ficam fora do escopo desde que reanonimização não seja razoavelmente possível. Perfis sintéticos baseados em estatísticas agregadas são livres.
- **Conexão com CRM eleitoral:** muda tudo. Dados de filiação/preferência política são sensíveis (art. 5º, II LGPD). Tratamento exige consentimento específico e destacado (art. 11, I) ou hipótese legal estrita. Res. TSE 23.610/2019 art. 28 também limita uso de cadastros.
- **Decisão de design:** arquitetura deve manter isolamento lógico entre módulo sintético e qualquer CRM. Integração futura exige base legal documentada e RIPD (Relatório de Impacto à Proteção de Dados).

## 3. Microtargeting

TSE e MPF (PGR/CNMP) monitoram desde 2022:

- Vedado uso de dados pessoais para envio dirigido sem consentimento (Res. 23.610 art. 28-A, incluído em 2024).
- Caso Cambridge Analytica deixou como precedente: ANPD aplica multa retroativa por enriquecimento de base via scraping/data brokers. Operação "Spoofing" e inquéritos da PF sobre disparos em massa reforçam vedação a listas compradas.
- **Segmentação por clusters sintéticos agregados (não indivíduos identificáveis) permanece permitida.**

## 4. Transparência e auditoria

- Res. 23.732 art. 9º-D exige que campanhas mantenham registro de uso de IA disponível à Justiça Eleitoral por 180 dias após pleito.
- Não há exigência atual de watermarking técnico (C2PA), mas Portaria TSE 415/2025 recomenda.
- Disclosure público só obrigatório para conteúdo veiculado.

## 5. Risco específico PL

- PL está sob escrutínio reforçado pós-2022 (PP 2023-AIJE sobre minutas golpistas, inquéritos STF).
- Associação pública de "IA + segmentação" ao PL atrai escrutínio amplificado de TSE/MPE/imprensa, mesmo em uso lícito.
- **Risco reputacional > risco regulatório puro.**
- **Mitigação:** contrato com cláusula de uso ético, opinion letter prévia, zero acoplamento a bases externas não-auditáveis.

---

**Fonte:** subagente de pesquisa interna. Não substitui parecer jurídico. Validar com advogado eleitoral antes de qualquer entrega ao cliente.
