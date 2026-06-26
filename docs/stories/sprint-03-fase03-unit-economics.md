# Sprint 3 — Fase 3: Precificação e Unit Economics

> **Épico:** Fase 3 do Big Flux Document. **Pilares:** P1, P2, P5.
> **CRÍTICA:** alimenta `TrafficConstraints` numéricos consumidos por toda a pipeline de tráfego (Parte 2 §3.1). É pré-requisito da Sprint 13.
> **Referências:** Parte 1 §3.2 (Fase 3), §3.3 (JSON), §4 Passo 4 (coerência numérica).

A Fase 3 define **preço de venda**, **COGS**, **margem**, **CAC máximo aceitável (alvo + teto/kill switch)**, **LTV e payback** e a **razão LTV/CAC**. São os números que governam a operação inteira.

---

### [S3.1] Prompt-contract da Fase 3 com quantificação obrigatória
- **Pilares:** P1, P5
- **Premium:** §10 (prompt), §10.3 (JSON), §7 (Opus quality_first)
- **User story:** Como Architect, quero um contrato que force números plausíveis por segmento, para que CAC/LTV/ticket sejam realistas — não "CAC baixo".
- **Contexto ampliado:** Parte 1 §3.2 Fase 3 (3.1 preço+estratégia de pricing; 3.2 COGS; 3.3 margens bruta/após-CAC/após-CAC+retenção; 3.4 CAC alvo + CAC teto/kill switch + justificativa; 3.5 LTV + payback + razão LTV/CAC ≥3) + §5 princípios 2 (quantificar) e 3 (realismo: não prometer LTV/CAC=10 para e-commerce físico ticket baixo).
- **Critérios de aceitação:**
  1. Given segmento e-commerce físico ticket baixo, When gera Fase 3, Then razão LTV/CAC fica plausível (não infla para 10).
  2. Given ausência de COGS no report, When gera, Then marca `[Pendente Board]` e **não** inventa custo.
  3. Given a saída, When parseada, Then `phase_3_unit_economics` traz os campos numéricos exatos: `ticket_medio_alvo, cac_alvo, cac_teto, ltv_estimado, payback_dias, ltv_cac_ratio`.
- **Tarefas técnicas:** `prompts/big_flux_architect/fase3.partial`; parser numérico; tabela de benchmarks por segmento para guiar realismo (KB global).
- **Schema:** ver Parte 1 §3.3 (`phase_3_unit_economics`).
- **DoD:** números tipados; realismo por segmento; pendências sinalizadas.
- **Dependências:** S1.3

---

### [S3.2] Validadores determinísticos de coerência numérica (CRÍTICO)
- **Pilares:** P2
- **User story:** Como sistema, quero validar a aritmética da Fase 3 por código, para impedir Big Flux com economia impossível (LTV<CAC, margem negativa).
- **Contexto ampliado:** Parte 1 §4 Passo 4 — coerência numérica é checada por código: LTV > CAC, margem positiva, payback razoável, `ltv_cac_ratio` consistente com LTV/CAC. Falha após 2 retries ⇒ `needs human review`.
- **Critérios de aceitação:**
  1. Given `ltv_estimado <= cac_alvo`, When valida, Then issue `block` "LTV não supera CAC".
  2. Given `cac_teto < cac_alvo`, When valida, Then issue `block` "teto abaixo do alvo".
  3. Given margem após CAC negativa, When valida, Then issue `block`.
  4. Given `ltv_cac_ratio` divergente de `ltv/cac` (tolerância), When valida, Then issue `warn`.
  5. Given Fase 3 coerente, When valida, Then `passed=true`.
- **Tarefas técnicas:** `gate_fase3(structured): GateResult` com checagens aritméticas; testes exaustivos de borda.
- **DoD:** cobertura ≥95% (fase crítica); integrado ao retry do Architect.
- **Dependências:** S0.7, S3.1

---

### [S3.3] Extração para TrafficConstraints (Unit Economics → tráfego)
- **Pilares:** P1, P6
- **User story:** Como Sub-módulo de Tráfego, quero os números da Fase 3 num objeto `TrafficConstraints`, para que toda campanha respeite CAC/teto/LTV.
- **Contexto ampliado:** Parte 2 §3.1 — ao aprovar Big Flux, extrai `ticket_medio_alvo, cac_alvo, cac_teto, ltv_estimado, payback_dias`. Esses valores viram snapshot em `campaigns` (`cac_alvo, cac_teto, roas_alvo`) e governam gates do tráfego.
- **Critérios de aceitação:**
  1. Given Big Flux aprovado, When emite `big_flux.approved`, Then o `TrafficConstraints` do cache recebe os campos da Fase 3.
  2. Given uma campanha nova, When criada, Then herda snapshot de CAC/teto da versão aprovada.
- **Tarefas técnicas:** `TrafficConstraintsExtractor.fromPhase3()`; cache invalidation por evento.
- **DoD:** extração testada; snapshot em campanha; consumido por gate de budget (S13).
- **Dependências:** S0.10, S3.2

---

### [S3.4] UI de revisão da Fase 3 com calculadora e alertas de benchmark
- **Pilares:** P3, P5
- **Design System:** campos numéricos `field`, badge de razão LTV/CAC, `coach` (o que é payback/LTV), `friendly-error` para incoerência.
- **User story:** Como Aprovador, quero editar os números e ver na hora se a economia fecha, para aprovar com confiança.
- **Contexto ampliado:** Parte 1 §9.1 — a Fase 3 aparece com ⚠ quando há divergência. ORACULO sugere "LTV/CAC acima do benchmark do segmento, vale revisar?".
- **Critérios de aceitação:**
  1. Given edito CAC alvo, When salvo, Then recalcula razão LTV/CAC ao vivo e mostra se ≥3.
  2. Given valor fora do benchmark do segmento, When detectado, Then exibe aviso (não bloqueia).
  3. Given incoerência (LTV<CAC), When tento aprovar, Then bloqueio com mensagem amigável.
  4. Given edição, When salva, Then registra `big_flux_revisions` em campos numéricos críticos.
- **Tarefas técnicas:** calculadora reativa; comparação com benchmarks (KB global); destaque de campos críticos; persistência de revisão.
- **DoD:** cálculo ao vivo; alertas de benchmark; edição registrada.
- **Dependências:** S0.3, S3.2

---

## DoD da Sprint 3
- [ ] Números tipados e realistas por segmento (P1).
- [ ] Coerência numérica determinística cobertura ≥95% (P2).
- [ ] `TrafficConstraints` extraído e consumido pelo tráfego (P1/P6).
- [ ] UI com calculadora ao vivo e edição registrada (P3/P5).
