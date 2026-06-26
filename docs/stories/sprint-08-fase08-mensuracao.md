# Sprint 8 — Fase 8: Infraestrutura de Mensuração

> **Épico:** Fase 8 do Big Flux Document. **Pilares:** P2, P5, P6.
> **Alimenta tráfego:** `modelo_atribuicao`, `janelas_atribuicao`, `utm_pattern` → `TrafficConstraints`; o `utm_pattern` é usado pelo gate da Etapa 6 (Parte 2 §4.3).
> **Referências:** Parte 1 §3.2 (Fase 8), Parte 2 §4.3/§8.2.

A Fase 8 define **Pixel e CAPI** (eventos, server-side, EMQ alvo), **atribuição** (modelo, janelas, cruzamento com GA4/pós-venda), **UTMs padronizadas** (padrão obrigatório) e **dashboard consolidado** (KPIs).

---

### [S8.1] Prompt-contract da Fase 8 — tracking, atribuição e UTM pattern
- **Pilares:** P5, P6
- **Premium:** §10
- **User story:** Como Architect, quero definir eventos, modelo de atribuição e um padrão de UTM rígido, para que o tráfego rastreie corretamente e o Auditor valide.
- **Contexto ampliado:** Parte 1 §3.2 Fase 8 (8.1 pixel/CAPI + EMQ; 8.2 atribuição: last click | data-driven | MMM | misto + janelas; 8.3 UTMs `utm_source/medium/campaign/content/term`; 8.4 dashboard/KPIs).
- **Critérios de aceitação:**
  1. Given oferta e funil, When gera 8.1, Then lista eventos coerentes (Purchase/Lead/AddToCart…) e EMQ alvo.
  2. Given a saída, When parseada, Then `phase_8_measurement` traz `modelo_atribuicao`, `janelas_atribuicao{clique,visualizacao}`, `utm_pattern`.
  3. Given o `utm_pattern`, When gerado, Then é uma regra validável por regex.
- **Tarefas técnicas:** `prompts/big_flux_architect/fase8.partial`; parser; geração de `utm_pattern` como regex.
- **DoD:** eventos+atribuição+UTM regex; MD+JSON.
- **Dependências:** S5.1, S6.1

---

### [S8.2] Validadores determinísticos da Fase 8 (UTM pattern compilável)
- **Pilares:** P2
- **User story:** Como sistema, quero garantir que o `utm_pattern` compila e que eventos essenciais existem, para o gate do tráfego usar com segurança.
- **Critérios de aceitação:**
  1. Given `utm_pattern` inválido (regex não compila), When valida, Then issue `block`.
  2. Given objetivo de venda sem evento Purchase, When valida, Then issue `block`.
  3. Given janelas de atribuição fora de faixa plausível, When valida, Then issue `warn`.
- **Tarefas técnicas:** `gate_fase8`; compilador/validador de regex; teste de eventos por objetivo.
- **DoD:** cobertura ≥90%; regex testado.
- **Dependências:** S0.7, S8.1

---

### [S8.3] Extração para TrafficConstraints (mensuração) + integração com gate da Etapa 6
- **Pilares:** P2, P6
- **User story:** Como Auditor, quero o `utm_pattern` e modelo de atribuição do Big Flux, para validar campanhas na pré-publicação.
- **Contexto ampliado:** Parte 2 §4.3 — gate da Etapa 6 checa `campaign.utm_matches_pattern(constraints.utm_pattern)`.
- **Critérios de aceitação:**
  1. Given Big Flux aprovado, When extrai, Then `TrafficConstraints.utm_pattern/modelo_atribuicao/janelas` populados.
  2. Given uma campanha com UTM fora do padrão, When gate Etapa 6 roda, Then issue `block`.
- **Tarefas técnicas:** extractor; função `utm_matches_pattern`; integração com S13.
- **DoD:** extração + gate de UTM testados juntos.
- **Dependências:** S3.3, S8.2

---

### [S8.4] UI de revisão da Fase 8 — eventos, atribuição e teste de UTM
- **Pilares:** P3, P5
- **Design System:** `field` para UTM, `coach` (o que é EMQ/CAPI/atribuição), validador de UTM ao vivo, `friendly-error`.
- **User story:** Como Aprovador, quero testar um exemplo de UTM contra o padrão e entender atribuição, para aprovar a mensuração mesmo sendo leigo.
- **Critérios de aceitação:**
  1. Given um exemplo de URL, When testo contra o `utm_pattern`, Then vejo pass/fail ao vivo.
  2. Given termo técnico, When toco no `coach`, Then explicação simples (ORACULO educa).
  3. Given edição, When salva, Then registra `big_flux_revisions`.
- **Tarefas técnicas:** testador de UTM; coach por conceito; persistência.
- **DoD:** teste de UTM ao vivo; edição registrada; mobile.
- **Dependências:** S0.3, S8.2

---

## DoD da Sprint 8
- [ ] Eventos/atribuição/UTM gerados; UTM como regex (P5/P6).
- [ ] Validadores compilam UTM e checam eventos ≥90% (P2).
- [ ] Extração + gate de UTM na Etapa 6 integrados (P2/P6).
- [ ] UI com testador de UTM ao vivo (P3/P5).
