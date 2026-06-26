# Sprint 4 — Fase 4: Posicionamento e Mensagem

> **Épico:** Fase 4 do Big Flux Document. **Pilares:** P1, P5.
> **Alimenta tráfego:** `angulos_venda[]` e `tom_de_voz` viram `TrafficConstraints` consumidos por Copywriter e Diretor de Criativo (Parte 2 §3.1).
> **Referências:** Parte 1 §3.2 (Fase 4).

A Fase 4 define **posicionamento estratégico** (quem somos / para quem / contra quem / por que diferentes), **ângulos de venda** (portas de entrada emocionais que geram famílias de criativos) e **tom de voz/linguagem**.

---

### [S4.1] Prompt-contract da Fase 4 — ângulos e posicionamento
- **Pilares:** P1, P5
- **Premium:** §10 (prompt contracts)
- **User story:** Como Architect, quero gerar ângulos de venda distintos e um posicionamento claro, para que cada ângulo origine famílias de criativos na Fase 7.
- **Contexto ampliado:** Parte 1 §3.2 Fase 4 (4.1 posicionamento; 4.2 ângulos — medo, status, conveniência, economia, transformação; 4.3 tom de voz e vocabulário do nicho). Os ângulos são a ponte para a Fase 7 e para o Copywriter.
- **Critérios de aceitação:**
  1. Given ICP e oferta, When gera 4.2, Then produz ≥3 ângulos distintos (não variações da mesma ideia), cada um com gatilho emocional nomeado.
  2. Given segmento, When gera 4.3, Then o tom de voz usa vocabulário do nicho, não generalidades.
  3. Given a saída, When parseada, Then `phase_4_positioning` traz `angulos_venda[]` e `tom_de_voz`.
- **Tarefas técnicas:** `prompts/big_flux_architect/fase4.partial`; parser; tipos de ângulo.
- **DoD:** ângulos distintos; tom de voz com vocabulário do nicho; MD+JSON.
- **Dependências:** S2.1, S3.1

---

### [S4.2] Validadores determinísticos da Fase 4
- **Pilares:** P2
- **Critérios de aceitação:**
  1. Given Fase 4 sem ângulos, When valida, Then issue `block`.
  2. Given <2 ângulos distintos, When valida, Then issue `warn`.
  3. Given posicionamento sem "contra quem", When valida, Then issue `warn`.
- **Tarefas técnicas:** `gate_fase4`; teste de contagem/distinção de ângulos.
- **DoD:** cobertura ≥90%.
- **Dependências:** S0.7, S4.1

---

### [S4.3] Extração de ângulos/tom para TrafficConstraints
- **Pilares:** P1, P6
- **User story:** Como Copywriter/Diretor, quero ler `angulos_venda` e `tom_de_voz` do Big Flux, para gerar copy/briefings alinhados.
- **Critérios de aceitação:**
  1. Given Big Flux aprovado, When extrai, Then `TrafficConstraints.angulos_venda/tom_de_voz` populados.
  2. Given um ângulo removido em nova versão, When tráfego recarrega, Then Auditor sinaliza campanhas que usavam o ângulo removido (Parte 2 §3.2).
- **Tarefas técnicas:** extractor; ligação com invalidação de cache.
- **DoD:** extração testada; conflito de ângulo removido detectável.
- **Dependências:** S3.3, S4.2

---

### [S4.4] UI de revisão da Fase 4 com cards de ângulo e ORACULO inline
- **Pilares:** P3, P5
- **Design System:** cards de ângulo, `coach` (o que é ângulo de venda), edição inline, `tpl` (biblioteca de ângulos comuns por vertical).
- **User story:** Como Aprovador, quero ver os ângulos como cards editáveis com exemplos, para refinar a mensagem sem ser copywriter.
- **Critérios de aceitação:**
  1. Given ângulos, When edito/adiciono, Then registra `big_flux_revisions`.
  2. Given biblioteca de ângulos, When aplico um preset, Then é adicionado mantendo coerência.
  3. Given mobile, When reviso, Then cards verticais, toque ≥48px.
- **Tarefas técnicas:** card de ângulo; biblioteca/preset; persistência.
- **DoD:** edição registrada; presets; mobile.
- **Dependências:** S0.3, S4.2

---

## DoD da Sprint 4
- [ ] ≥3 ângulos distintos com gatilho emocional (P1).
- [ ] Tom de voz com vocabulário do nicho (P1).
- [ ] Extração para `TrafficConstraints` + detecção de ângulo removido (P1/P6).
- [ ] UI de cards de ângulo com edição registrada (P3/P5).
