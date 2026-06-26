# Sprint 12 — Fase 12: Expansão

> **Épico:** Fase 12 do Big Flux Document. **Pilares:** P1, P5.
> **Referências:** Parte 1 §3.2 (Fase 12). Fecha o documento e prepara o ciclo seguinte.

A Fase 12 define **novos canais** (roadmap TikTok/YouTube/afiliados), **cross-sell para a base**, **novos mercados/segmentos** e **novos formatos de oferta** (assinatura, recorrência, ticket maior). É o que conecta o Big Flux atual à próxima geração (continuidade evolutiva).

---

### [S12.1] Prompt-contract da Fase 12 — roadmap de expansão
- **Pilares:** P1, P5
- **Premium:** §10
- **User story:** Como Architect, quero gerar um roadmap de expansão coerente com o que já existe, para que a próxima versão do Big Flux evolua em vez de resetar.
- **Contexto ampliado:** Parte 1 §3.2 Fase 12 + §2.2 (histórico estratégico permite continuidade). A expansão respeita restrições (`forbidden_platforms`) e a maturidade do tenant.
- **Critérios de aceitação:**
  1. Given plataforma vetada, When gera 12.1, Then não a inclui no roadmap.
  2. Given a saída, When parseada, Then `phase_12_expansion` traz `new_channels[]`, `cross_sell[]`, `new_markets[]`, `new_offer_formats[]`.
  3. Given base existente (Fase 5/11), When gera cross-sell, Then referencia produtos complementares plausíveis.
- **Tarefas técnicas:** `prompts/big_flux_architect/fase12.partial`; parser.
- **DoD:** roadmap coerente; restrições respeitadas; MD+JSON.
- **Dependências:** S5.1, S11.1

---

### [S12.2] Validadores determinísticos da Fase 12
- **Pilares:** P2
- **Critérios de aceitação:**
  1. Given canal vetado no roadmap, When valida, Then issue `block`.
  2. Given Fase 12 vazia, When valida, Then issue `warn` (expansão é recomendável, não obrigatória num MVP).
- **Tarefas técnicas:** `gate_fase12`; testes.
- **DoD:** cobertura ≥90%.
- **Dependências:** S0.7, S12.1

---

### [S12.3] Fechamento do documento — montagem final, glossário, histórico de versões
- **Pilares:** P5
- **User story:** Como sistema, quero montar o Big Flux completo com sumário executivo, glossário e histórico de versões, para entregar um artefato profissional.
- **Contexto ampliado:** Parte 1 §3.2 (cabeçalho, sumário executivo, glossário, histórico de versões) + §7.2 (uma versão `approved` por projeto; ao aprovar nova, a anterior vira `archived`).
- **Critérios de aceitação:**
  1. Given as 12 fases válidas, When monta o doc, Then gera `markdown_content` + `structured_data` + `executive_summary` completos.
  2. Given nova versão aprovada, When confirmada, Then a anterior vira `archived` automaticamente.
  3. Given o doc, When exportado, Then gera **PDF** formatado (artefato Premium).
- **Tarefas técnicas:** montador do documento; sumário executivo (Architect); glossário; versionamento; exportador PDF.
- **Schema:** `big_flux_documents` (Parte 1 §6.1), `big_flux_current` view (§6.2).
- **DoD:** doc completo + PDF; versionamento `approved→archived` testado.
- **Dependências:** S0.6, S12.2, (todas as fases S1-S11)

---

### [S12.4] UI de revisão da Fase 12 + exportação e diff de versões
- **Pilares:** P3, P5
- **Design System:** `celebrate` na aprovação ("Big Flux aprovado!"), botão `btn-grad` "Exportar PDF", diff visual entre versões.
- **User story:** Como Aprovador, quero exportar o Big Flux e comparar versões, para fechar o documento com confiança.
- **Contexto ampliado:** Parte 1 §7.3 — diff a nível de seção, destaque de campos numéricos críticos, alerta se mudança impacta campanhas ativas.
- **Critérios de aceitação:**
  1. Given duas versões, When comparo, Then vejo diff por seção com destaque em CAC/LTV/budget.
  2. Given aprovação, When confirmo, Then tela de `celebrate` + evento `big_flux.approved` + PDF disponível.
  3. Given nova versão que reduz CAC alvo, When aprovada, Then lista campanhas potencialmente impactadas (Parte 1 §10.2).
- **Tarefas técnicas:** diff visual; export PDF; emissão de evento; alerta de impacto.
- **DoD:** diff funcional; export PDF; celebrate; impacto sinalizado.
- **Dependências:** S0.3, S12.3

---

## DoD da Sprint 12
- [ ] Roadmap de expansão coerente e sem canais vetados (P1).
- [ ] Documento montado com sumário/glossário/histórico + PDF (P5).
- [ ] Versionamento `approved→archived` + evento `big_flux.approved` (P5).
- [ ] UI com diff de versões, celebrate e alerta de impacto (P3/P5).
