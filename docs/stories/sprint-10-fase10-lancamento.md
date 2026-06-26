# Sprint 10 — Fase 10: Lançamento e Tráfego Pago

> **Épico:** Fase 10 do Big Flux Document. **Pilares:** P1, P3, P6.
> **Alimenta tráfego:** `budget_validacao`, `periodo_validacao_dias`, `estrutura_inicial`, `criterios_escala`, `criterios_kill` → `TrafficConstraints`. É a fase que o sub-módulo da Parte 2 **consome diretamente** para montar a primeira campanha.
> **Referências:** Parte 1 §3.2 (Fase 10), Parte 2 §3.1/§6.

A Fase 10 define a **estratégia de validação inicial** (budget, período, critério de sucesso), a **estrutura inicial de campanha** (plataformas, tipos, conjuntos, audiências), os **critérios de escala** e os **critérios de kill**.

---

### [S10.1] Prompt-contract da Fase 10 — estrutura inicial executável
- **Pilares:** P1, P5
- **Premium:** §10
- **User story:** Como Architect, quero gerar uma estrutura inicial de campanha acionável, para que o Estrategista do tráfego comece "sabendo exatamente como" (Parte 1 §5 princípio 4).
- **Contexto ampliado:** Parte 1 §3.2 Fase 10 (10.1 validação: budget/período/critério; 10.2 estrutura inicial: plataforma(s), tipo(s), nº de conjuntos, audiências; 10.3 critérios de escala; 10.4 critérios de kill). Coerência: budget de validação ≤ budgets da Fase 9; plataformas respeitam `forbidden_platforms`.
- **Critérios de aceitação:**
  1. Given Fase 9 (budgets) e restrições, When gera 10.1, Then `budget_validacao` ≤ `budget_semanal_max` e plataforma não está vetada.
  2. Given a saída, When parseada, Then `phase_10_launch` traz `budget_validacao`, `periodo_validacao_dias`, `estrutura_inicial`, `criterios_escala`, `criterios_kill`.
  3. Given critérios de sucesso, When gerados, Then referenciam CAC/ROAS da Fase 3/5.
- **Tarefas técnicas:** `prompts/big_flux_architect/fase10.partial`; parser; tipos `CampaignStructure/ScaleCriteria/KillCriteria`.
- **DoD:** estrutura executável; coerência com Fase 3/5/9; MD+JSON.
- **Dependências:** S3.1, S5.1, S9.1

---

### [S10.2] Validadores determinísticos da Fase 10
- **Pilares:** P2
- **Critérios de aceitação:**
  1. Given `budget_validacao > budget_semanal_max`, When valida, Then issue `block`.
  2. Given plataforma em `forbidden_platforms`, When valida, Then issue `block`.
  3. Given critérios de kill ausentes, When valida, Then issue `warn`.
- **Tarefas técnicas:** `gate_fase10`; testes de coerência cruzada com Fase 9.
- **DoD:** cobertura ≥90%.
- **Dependências:** S0.7, S10.1

---

### [S10.3] Extração para TrafficConstraints (lançamento)
- **Pilares:** P1, P6
- **User story:** Como Estrategista, quero a estrutura inicial e critérios de escala/kill do Big Flux, para propor a primeira campanha alinhada.
- **Contexto ampliado:** Parte 2 §6 Passo 2 — o Estrategista recebe `TrafficConstraints` (incl. `estrutura_inicial`, `criterios_escala`, `criterios_kill`).
- **Critérios de aceitação:**
  1. Given Big Flux aprovado, When extrai, Then `TrafficConstraints` recebe os 5 campos da Fase 10.
  2. Given uma nova campanha, When o Estrategista propõe, Then parte da `estrutura_inicial`.
- **Tarefas técnicas:** extractor; ligação com Estrategista (S13).
- **DoD:** extração testada; consumida pelo Estrategista.
- **Dependências:** S3.3, S10.2

---

### [S10.4] UI de revisão da Fase 10 — preview da estrutura inicial
- **Pilares:** P3, P5
- **Design System:** árvore de campanha (campanha→conjuntos→anúncios), `coach` (CBO vs ABO, lookalike), badges de critério de escala/kill.
- **User story:** Como Aprovador, quero ver a estrutura inicial como árvore e os critérios de escala/kill, para aprovar o plano de lançamento.
- **Critérios de aceitação:**
  1. Given a estrutura, When edito budget/conjuntos, Then registra revisão e revalida contra Fase 9.
  2. Given mobile, When visualizo a árvore, Then é vertical e legível.
- **Tarefas técnicas:** árvore de campanha; edição; revalidação.
- **DoD:** árvore mobile; edição registrada; revalidação.
- **Dependências:** S0.3, S10.2

---

## DoD da Sprint 10
- [ ] Estrutura inicial executável e coerente com Fase 3/5/9 (P1).
- [ ] Validadores de coerência cruzada ≥90% (P2).
- [ ] Extração consumida pelo Estrategista do tráfego (P1/P6).
- [ ] UI com árvore de campanha (P3/P5).
