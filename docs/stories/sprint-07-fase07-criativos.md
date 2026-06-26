# Sprint 7 — Fase 7: Criativos

> **Épico:** Fase 7 do Big Flux Document. **Pilares:** P1, P3, P5.
> **Alimenta tráfego:** `formatos_prioritarios`, `tipos_criativo`, `diretrizes_hook`, `restricoes_compliance` → `TrafficConstraints` (Parte 2 §3.1), consumidos por Copywriter e Diretor de Criativo.
> **Referências:** Parte 1 §3.2 (Fase 7), Parte 3 §4.3/§4.4 (Copywriter, Diretor).

A Fase 7 define a **estratégia criativa** (criativos por ângulo, cadência semanal), o **pipeline de produção** (volume, formatos 9:16/1:1/16:9, tipos UGC/depoimento/demonstração/comparação/PAS), as **diretrizes de hook** (3 primeiros segundos) e as **restrições de compliance** (categorias sensíveis — gatilho para HITL).

---

### [S7.1] Prompt-contract da Fase 7 — estratégia e pipeline criativo
- **Pilares:** P1, P5
- **Premium:** §10
- **User story:** Como Architect, quero gerar estratégia criativa ancorada nos ângulos da Fase 4, para que cada ângulo gere famílias de criativos com hook forte.
- **Contexto ampliado:** Parte 1 §3.2 Fase 7 (7.1 estratégia: N criativos por ângulo, formatos prioritários, cadência; 7.2 pipeline: volume semanal, formatos, tipos; 7.3 diretrizes de hook; 7.4 compliance). Princípio §5.5: compliance respeita categorias sensíveis (saúde, finanças, emagrecimento) e **sinaliza**.
- **Critérios de aceitação:**
  1. Given ângulos da Fase 4, When gera 7.1, Then define nº de criativos por ângulo e cadência semanal.
  2. Given segmento sensível, When gera 7.4, Then lista restrições de compliance explícitas.
  3. Given a saída, When parseada, Then `phase_7_creative` traz `formatos_prioritarios[]`, `tipos_criativo[]`, `diretrizes_hook`, `restricoes_compliance[]`.
- **Tarefas técnicas:** `prompts/big_flux_architect/fase7.partial`; parser; detector de categoria sensível (liga HITL).
- **DoD:** estratégia ancorada em ângulos; compliance sinalizado; MD+JSON.
- **Dependências:** S4.1

---

### [S7.2] Validadores determinísticos da Fase 7 + flag de compliance HITL
- **Pilares:** P2, P3
- **User story:** Como sistema, quero validar formatos/tipos e levantar flag HITL quando há categoria sensível, para forçar revisão humana.
- **Contexto ampliado:** §5 software-premium §9 (HITL para risco). Categoria sensível ⇒ perfil `legal_safe` + aviso + revisão humana recomendada.
- **Critérios de aceitação:**
  1. Given formato inválido (fora de 9:16/1:1/16:9), When valida, Then issue `block`.
  2. Given categoria sensível detectada, When valida, Then issue `warn` + flag `requires_human_review=true`.
  3. Given Fase 7 sem diretriz de hook, When valida, Then issue `warn`.
- **Tarefas técnicas:** `gate_fase7`; flag HITL propagada ao Auditor (S13).
- **DoD:** cobertura ≥90%; flag HITL propagada.
- **Dependências:** S0.7, S7.1

---

### [S7.3] Extração para TrafficConstraints (criativos)
- **Pilares:** P1, P6
- **User story:** Como Copywriter/Diretor, quero formatos, tipos, hook e compliance do Big Flux, para gerar copy/briefings conformes.
- **Critérios de aceitação:**
  1. Given Big Flux aprovado, When extrai, Then `TrafficConstraints` recebe os 4 campos da Fase 7.
  2. Given `restricoes_compliance`, When o Copywriter gera, Then respeita e marca `estimated_compliance` (Parte 3 §4.3).
- **Tarefas técnicas:** extractor; ligação com Copywriter/Diretor.
- **DoD:** extração testada; compliance propagado.
- **Dependências:** S3.3, S7.2

---

### [S7.4] UI de revisão da Fase 7 — preview de formatos e compliance
- **Pilares:** P3, P5
- **Design System:** `caption-frame` (preview 9:16), `tpl` (templates de estilo UGC/Clean/Depoimento), `coach` (o que é hook/PAS), banner de compliance (`friendly-error` em amarelo para atenção).
- **User story:** Como Aprovador, quero ver formatos e tipos como cards visuais e o aviso de compliance destacado, para aprovar a direção criativa com segurança.
- **Critérios de aceitação:**
  1. Given a Fase 7, When edito tipos/formatos, Then registra `big_flux_revisions`.
  2. Given categoria sensível, When reviso, Then vejo banner de compliance com o que evitar.
  3. Given mobile, When reviso, Then preview 9:16 e cards verticais.
- **Tarefas técnicas:** preview de formato; templates de estilo; banner de compliance; persistência.
- **DoD:** preview mobile; compliance visível; edição registrada.
- **Dependências:** S0.3, S7.2

---

## DoD da Sprint 7
- [ ] Estratégia criativa ancorada nos ângulos da Fase 4 (P1).
- [ ] Compliance sensível levanta flag HITL (P3).
- [ ] Extração para `TrafficConstraints` com compliance propagado (P1/P6).
- [ ] UI com preview 9:16 e banner de compliance (P3/P5).
