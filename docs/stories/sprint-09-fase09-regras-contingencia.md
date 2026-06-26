# Sprint 9 — Fase 9: Regras de Operação e Contingência

> **Épico:** Fase 9 do Big Flux Document. **Pilares:** P2, P3, P5.
> **Alimenta tráfego:** `budget_diario_max`, `budget_semanal_max`, `max_increase_pct`, `triggers_contingencia[]` → `TrafficConstraints`; os triggers viram as `TriggerRule[]` do Sentinela (Parte 2 §11.2, Parte 3 §4.9).
> **Referências:** Parte 1 §3.2 (Fase 9), Parte 2 §9-11.

A Fase 9 define **limites de gasto**, **gatilhos automáticos** (condição → ação → aprovação), **plano de contingência** (conta cai, estoque acaba, política violada, CAC explode) e **SAC/operação**. É a fonte das regras de blast radius e dos playbooks do Sentinela.

---

### [S9.1] Prompt-contract da Fase 9 — limites, triggers e playbooks
- **Pilares:** P2, P5
- **Premium:** §10
- **User story:** Como Architect, quero gerar limites de gasto e regras de gatilho estruturadas, para que o Sentinela e os gates executem contingência por código.
- **Contexto ampliado:** Parte 1 §3.2 Fase 9 (9.1 budgets diário/semanal + limite de aumento; 9.2 tabela de gatilhos `condição|ação|aprovação`; 9.3 plano de contingência por cenário; 9.4 SAC). Os triggers precisam ser **expressões avaliáveis em código** (ex.: `cac > cac_teto * 1.5 sustained_for 48h`).
- **Critérios de aceitação:**
  1. Given Fase 3 (CAC/teto), When gera 9.2, Then triggers referenciam os números da Fase 3 coerentemente.
  2. Given a saída, When parseada, Then `phase_9_rules_contingency` traz `budget_diario_max`, `budget_semanal_max`, `max_increase_pct` e `triggers[]` com `condition`, `severity`, `action`, `notify`.
  3. Given cada cenário de contingência, When gerado, Then aponta um playbook nomeado (account_blocked, cac_explosion…).
- **Tarefas técnicas:** `prompts/big_flux_architect/fase9.partial`; parser; tipos `TriggerRule`.
- **Schema:** ver Parte 1 §3.3 (`phase_9_rules_contingency`) e Parte 3 §4.9 (`TriggerRule`).
- **DoD:** budgets + triggers estruturados + playbooks nomeados.
- **Dependências:** S3.1, S8.1

---

### [S9.2] Compilador determinístico de TriggerRule (condition → avaliável)
- **Pilares:** P2
- **User story:** Como sistema, quero compilar a `condition` textual em uma expressão avaliável, para o Sentinela detectar por código sem LLM.
- **Contexto ampliado:** Parte 2 §11.2 — `condition: ConditionExpression`. Detecção é código puro; LLM (Haiku) só classifica casos ambíguos (webhook de política).
- **Critérios de aceitação:**
  1. Given `cac > cac_teto * 1.5 sustained_for 48h`, When compilada, Then vira função avaliável sobre `campaign_metrics_snapshots`.
  2. Given condição malformada, When compila, Then issue `block` na validação da Fase 9.
  3. Given anti-flapping, When a condição segue verdadeira, Then não dispara repetido dentro da dedup window (Parte 2 §11.3).
- **Tarefas técnicas:** parser/compiler de `ConditionExpression`; avaliador sobre métricas; dedup window.
- **DoD:** compilador testado; anti-flapping; cobertura ≥90%.
- **Dependências:** S0.7, S9.1

---

### [S9.3] Validadores determinísticos da Fase 9
- **Pilares:** P2
- **Critérios de aceitação:**
  1. Given `budget_semanal_max < budget_diario_max`, When valida, Then issue `block`.
  2. Given `max_increase_pct` fora de faixa razoável (ex.: >100%), When valida, Then issue `warn`.
  3. Given trigger sem playbook/ação, When valida, Then issue `block`.
- **Tarefas técnicas:** `gate_fase9`; testes.
- **DoD:** cobertura ≥90%.
- **Dependências:** S0.7, S9.1

---

### [S9.4] Extração para TrafficConstraints + config de blast radius default
- **Pilares:** P1, P3
- **User story:** Como Otimizador/Sentinela, quero budgets, triggers e blast radius do Big Flux, para agir dentro dos limites aprovados.
- **Contexto ampliado:** Parte 2 §10.2 — defaults de blast radius por ação (pausar criativo ✓, pausar campanha ✗, aumentar budget ≤20%…), configuráveis por tenant.
- **Critérios de aceitação:**
  1. Given Big Flux aprovado, When extrai, Then `TrafficConstraints` recebe budgets, `max_increase_pct` e `triggers_contingencia[]`.
  2. Given config de tenant, When não customizada, Then aplica `BlastRadiusConfig` default conservador.
- **Tarefas técnicas:** extractor; `BlastRadiusConfig` default + override por tenant.
- **DoD:** extração + blast radius default testados.
- **Dependências:** S3.3, S9.3

---

### [S9.5] UI de revisão da Fase 9 — tabela de triggers e simulação
- **Pilares:** P3, P5
- **Design System:** tabela de triggers editável, `coach` (o que é kill switch/blast radius), `friendly-error`, toggle de severidade.
- **User story:** Como Aprovador, quero ver/editar os gatilhos como tabela e simular um cenário, para entender o que o sistema fará sozinho.
- **Contexto ampliado:** Parte 2 §9 (Tela de Playbooks com modo de teste simulado).
- **Critérios de aceitação:**
  1. Given um trigger, When edito condição/ação, Then registra `big_flux_revisions` e revalida compilação.
  2. Given um cenário simulado (CAC=2x teto por 48h), When executo em modo teste, Then vejo qual playbook dispararia (sem efeito real).
  3. Given mobile, When reviso, Then tabela rolável e toque ≥48px.
- **Tarefas técnicas:** editor de triggers; simulador em modo dry-run; persistência.
- **DoD:** simulação dry-run; edição registrada; compilação revalidada.
- **Dependências:** S0.3, S9.2

---

## DoD da Sprint 9
- [ ] Budgets + triggers + playbooks estruturados e coerentes com Fase 3 (P2).
- [ ] Compilador de `ConditionExpression` + anti-flapping (P2).
- [ ] Extração + blast radius default conservador (P1/P3).
- [ ] UI com tabela de triggers e simulação dry-run (P3/P5).
