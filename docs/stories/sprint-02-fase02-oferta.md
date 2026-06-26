# Sprint 2 — Fase 2: Concepção do Produto/Oferta

> **Épico:** Fase 2 do Big Flux Document. **Pilares:** P1, P5.
> **Referências:** Parte 1 §3.2 (template Fase 2).
> **Entrega:** geração+validação+render da seção "Fase 2", distinguindo **produto** de **oferta** e estruturando os componentes da oferta.

A Fase 2 define **Produto vs. Oferta**, **componentes da oferta** (core, bônus, garantia, pagamento, urgência/escassez, prova social) e **posicionamento da oferta**.

---

### [S2.1] Prompt-contract da Fase 2 e geração da seção
- **Pilares:** P1, P5
- **Premium:** §10 (prompt contracts), §10.3 (JSON)
- **User story:** Como Architect, quero um contrato que separe produto entregue de oferta vendida, para que a Fase 2 seja acionável pelo tráfego.
- **Contexto ampliado:** Parte 1 §3.2 Fase 2 — 2.1 distinção explícita produto×oferta; 2.2 componentes (core, bônus, garantia com tipo/prazo/condições, condições de pagamento, urgência/escassez **legítimas**, prova social); 2.3 frase de posicionamento. Princípio: não inventar bônus/garantias inexistentes — sinalizar `[Pendente Board]`.
- **Critérios de aceitação:**
  1. Given report com produto, When gera 2.1, Then distingue claramente "o que é entregue" de "o que é vendido".
  2. Given ausência de garantia no report, When gera 2.2, Then marca `[Pendente Board]` em garantia.
  3. Given a saída, When parseada, Then `structured_data.phase_2_offer` tem componentes tipados (core, bonuses[], guarantee{}, payment[], urgency, social_proof[]).
  4. Given urgência/escassez, When gerada, Then o prompt restringe a mecanismos **legítimos** (sem falsa escassez).
- **Tarefas técnicas:** `prompts/big_flux_architect/fase2.partial`; parser; tipos da oferta.
- **DoD:** seção MD+JSON; componentes tipados; pendências sinalizadas.
- **Dependências:** S1.3

---

### [S2.2] Validadores determinísticos da Fase 2
- **Pilares:** P2
- **User story:** Como sistema, quero validar presença e coerência dos componentes da oferta, para garantir que o tráfego tenha o que promover.
- **Critérios de aceitação:**
  1. Given Fase 2 sem produto core, When valida, Then issue `block`.
  2. Given oferta sem nenhum elemento de valor (bônus/garantia/prova), When valida, Then issue `warn`.
  3. Given Fase 2 completa, When valida, Then `passed=true`.
- **Tarefas técnicas:** `gate_fase2(structured): GateResult`; testes.
- **DoD:** cobertura ≥90%; integrado ao pipeline.
- **Dependências:** S0.7, S2.1

---

### [S2.3] UI de revisão/edição da Fase 2 com builder de oferta
- **Pilares:** P3, P5
- **Design System:** cards de componentes da oferta, `coach` (o que é prova social/garantia), edição inline, `tpl` (presets de oferta por vertical).
- **User story:** Como Aprovador, quero montar/editar a oferta visualmente, para refinar bônus, garantia e prova social com clareza.
- **Contexto ampliado:** Parte 1 §9 — edição inline; presets por vertical (e-commerce físico, SaaS, infoproduto) ajudam o leigo.
- **Critérios de aceitação:**
  1. Given a Fase 2, When adiciono um bônus, Then a edição registra em `big_flux_revisions`.
  2. Given um preset de oferta, When aplico, Then preenche estrutura base mantendo dados do report.
  3. Given mobile, When edito, Then cards verticais e toque ≥48px.
- **Tarefas técnicas:** offer builder; presets; persistência de revisão.
- **DoD:** edição registrada; presets funcionam; mobile validado.
- **Dependências:** S0.3, S2.2

---

### [S2.4] Coerência cruzada Fase 2 ↔ Fase 1 (oferta serve o ICP)
- **Pilares:** P1
- **User story:** Como sistema, quero checar que a oferta dialoga com o ICP, para evitar Big Flux incoerente.
- **Contexto ampliado:** Parte 1 §5 princípio 1 (coerência entre fases). A oferta (Fase 2) deve responder à dor/objeções do ICP (Fase 1).
- **Critérios de aceitação:**
  1. Given ICP da Fase 1, When a oferta não endereça nenhuma dor mapeada, Then issue `warn` (sinaliza para ORACULO/revisão).
- **Tarefas técnicas:** check de coerência semântica leve (Haiku) marcado como aviso, não bloqueio.
- **DoD:** aviso de incoerência aparece na revisão.
- **Dependências:** S1.5, S2.3

---

## DoD da Sprint 2
- [ ] Produto vs. oferta distinguidos e componentes tipados (P1).
- [ ] Validadores determinísticos ≥90% (P2).
- [ ] UI builder de oferta mobile-first com edição registrada (P3/P5).
- [ ] Coerência Fase 2↔Fase 1 sinalizada (P1).
