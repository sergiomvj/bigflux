# Sprint 5 — Fase 5: Funil e Jornada do Cliente

> **Épico:** Fase 5 do Big Flux Document. **Pilares:** P1, P2, P5.
> **Referências:** Parte 1 §3.2 (Fase 5).

A Fase 5 define o **mapa do funil** (anúncio → LP → checkout → pós-venda → upsell → fidelização), as **métricas-meta por etapa** (CTR, conversão LP/checkout, carrinho recuperado, upsell take rate, recompra 60d) e os **gatilhos/automações** entre etapas (e-mail, SMS, WhatsApp, retargeting).

---

### [S5.1] Prompt-contract da Fase 5 — funil + métricas-meta
- **Pilares:** P1, P5
- **Premium:** §10
- **User story:** Como Architect, quero gerar um funil com métricas-meta plausíveis por etapa, para dar ao tráfego alvos mensuráveis.
- **Contexto ampliado:** Parte 1 §3.2 Fase 5 (5.1 mapa textual do funil; 5.2 métricas-meta: CTR, conv. LP, conv. checkout, carrinho recuperado, upsell take rate, recompra 60d; 5.3 gatilhos/automações). As métricas-meta devem ser coerentes com a Fase 3 (CAC/ticket).
- **Critérios de aceitação:**
  1. Given ticket e CAC da Fase 3, When gera métricas-meta, Then conversões são plausíveis para fechar a economia.
  2. Given a saída, When parseada, Then `phase_5_funnel` traz `stages[]` e `target_metrics{}`.
  3. Given automações, When geradas, Then 5.3 especifica quando dispara cada canal.
- **Tarefas técnicas:** `prompts/big_flux_architect/fase5.partial`; parser; tipos de métricas-meta.
- **DoD:** funil + métricas tipadas; coerência com Fase 3.
- **Dependências:** S3.1, S4.1

---

### [S5.2] Validadores determinísticos da Fase 5
- **Pilares:** P2
- **Critérios de aceitação:**
  1. Given métrica fora de [0,100]%, When valida, Then issue `block`.
  2. Given funil sem etapa de checkout, When valida, Then issue `block`.
  3. Given conversões que tornam CAC impossível dado ticket, When valida (checagem aritmética leve), Then issue `warn`.
- **Tarefas técnicas:** `gate_fase5` com checagem de faixa e coerência econômica leve.
- **DoD:** cobertura ≥90%.
- **Dependências:** S0.7, S5.1

---

### [S5.3] UI de revisão da Fase 5 — diagrama de funil + tabela de metas
- **Pilares:** P3, P5
- **Design System:** diagrama vertical do funil (mobile), tabela de metas editável, `coach` (o que é upsell take rate), `caption`/badge por etapa.
- **User story:** Como Aprovador, quero ver o funil como diagrama e editar metas em tabela, para entender a jornada de ponta a ponta.
- **Critérios de aceitação:**
  1. Given o funil, When edito uma meta, Then registra `big_flux_revisions`.
  2. Given mobile, When visualizo, Then diagrama é vertical e legível.
  3. Given uma meta editada que quebra coerência, When salvo, Then aviso amigável.
- **Tarefas técnicas:** diagrama de funil; tabela editável; persistência.
- **DoD:** diagrama mobile; edição registrada; aviso de coerência.
- **Dependências:** S0.3, S5.2

---

## DoD da Sprint 5
- [ ] Funil + métricas-meta plausíveis e coerentes com Fase 3 (P1).
- [ ] Validadores de faixa/coerência ≥90% (P2).
- [ ] UI com diagrama vertical e metas editáveis (P3/P5).
