# Sprint 11 — Fase 11: Otimização Cíclica

> **Épico:** Fase 11 do Big Flux Document. **Pilares:** P2, P5.
> **Alimenta tráfego:** cadência de revisão, roadmap de A/B e thresholds que o Analista/Otimizador usam (Parte 2 §12).
> **Referências:** Parte 1 §3.2 (Fase 11), Parte 2 §12.

A Fase 11 define a **cadência de revisão** (daily/weekly/monthly), o **A/B testing roadmap** (ordem: oferta → landing → criativo → audiência), a **análise de coorte** e a estratégia de **retenção e CRM**.

---

### [S11.1] Prompt-contract da Fase 11 — cadência e roadmap de testes
- **Pilares:** P1, P5
- **Premium:** §10
- **User story:** Como Architect, quero gerar a cadência de otimização e o roadmap de A/B, para que o Analista saiba o que olhar e o que testar em ordem.
- **Contexto ampliado:** Parte 1 §3.2 Fase 11 (11.1 cadência; 11.2 A/B roadmap; 11.3 coorte; 11.4 retenção/CRM). Os thresholds estatísticos (Parte 2 §12.2) são ancorados aqui.
- **Critérios de aceitação:**
  1. Given a saída, When parseada, Then `phase_11_optimization` traz `cadence{daily,weekly,monthly}`, `ab_roadmap[]`, `cohort_strategy`, `retention`.
  2. Given roadmap, When gerado, Then segue ordem oferta→landing→criativo→audiência.
  3. Given thresholds, When gerados, Then são plausíveis e ajustáveis.
- **Tarefas técnicas:** `prompts/big_flux_architect/fase11.partial`; parser.
- **DoD:** cadência + roadmap tipados; MD+JSON.
- **Dependências:** S5.1, S10.1

---

### [S11.2] Validadores determinísticos + thresholds de decisão
- **Pilares:** P2
- **User story:** Como sistema, quero materializar os thresholds estatísticos por código, para o Otimizador decidir com critério de volume mínimo.
- **Contexto ampliado:** Parte 2 §12.2 — pausar criativo (≥1000 impressões + janela 3d OU gasto>1x ticket sem conversão); escalar (ROAS>meta sustentado 5+ dias); diminuir budget (CAC>1.5x meta 48h).
- **Critérios de aceitação:**
  1. Given thresholds da Fase 11, When compilados, Then viram constantes/funções de decisão usadas pelo Otimizador (S13).
  2. Given cadência inválida (ex.: weekly sem daily), When valida, Then issue `warn`.
- **Tarefas técnicas:** `gate_fase11`; materialização de thresholds; testes.
- **DoD:** thresholds materializados; cobertura ≥90%.
- **Dependências:** S0.7, S11.1

---

### [S11.3] UI de revisão da Fase 11 — roadmap visual e cadência
- **Pilares:** P3, P5
- **Design System:** timeline de cadência, lista ordenada do A/B roadmap, `coach` (o que é coorte/threshold), `tpl`.
- **User story:** Como Aprovador, quero ver a cadência e o roadmap de testes de forma visual, para entender o ciclo de melhoria.
- **Critérios de aceitação:**
  1. Given roadmap, When reordeno/edito, Then registra revisão.
  2. Given mobile, When visualizo, Then timeline vertical.
- **Tarefas técnicas:** timeline; roadmap editável; persistência.
- **DoD:** visual mobile; edição registrada.
- **Dependências:** S0.3, S11.2

---

## DoD da Sprint 11
- [ ] Cadência + A/B roadmap (ordem correta) gerados (P1).
- [ ] Thresholds materializados para o Otimizador (P2).
- [ ] UI com timeline e roadmap editável (P3/P5).
