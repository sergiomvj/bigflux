# Sprint 6 — Fase 6: Assets de Conversão

> **Épico:** Fase 6 do Big Flux Document. **Pilares:** P1, P5.
> **Referências:** Parte 1 §3.2 (Fase 6).

A Fase 6 especifica os **assets de conversão**: **landing pages** (quantas, para quais ofertas/ângulos, elementos obrigatórios), **checkout** (plataforma, métodos, integração com pixel/CAPI), **comunicações automatizadas** (carrinho abandonado, boas-vindas, nurturing, SMS, WhatsApp) e **página de obrigado/pós-venda** (upsell).

---

### [S6.1] Prompt-contract da Fase 6 — inventário de assets
- **Pilares:** P1, P5
- **Premium:** §10
- **User story:** Como Architect, quero gerar a lista de assets necessários por ângulo/oferta, para que a operação saiba o que produzir.
- **Contexto ampliado:** Parte 1 §3.2 Fase 6. As LPs derivam dos ângulos (Fase 4); o checkout referencia o pixel/CAPI (Fase 8); as automações referenciam o funil (Fase 5).
- **Critérios de aceitação:**
  1. Given ângulos da Fase 4, When gera 6.1, Then propõe LPs cobrindo os ângulos prioritários com elementos obrigatórios.
  2. Given a saída, When parseada, Then `phase_6_assets` traz `landing_pages[]`, `checkout{}`, `automations[]`, `thankyou{}`.
  3. Given plataforma de checkout ausente no report, When gera, Then marca `[Pendente Board]`.
- **Tarefas técnicas:** `prompts/big_flux_architect/fase6.partial`; parser; tipos de asset.
- **DoD:** inventário tipado; ligação com Fase 4/5/8; pendências sinalizadas.
- **Dependências:** S4.1, S5.1

---

### [S6.2] Validadores determinísticos da Fase 6
- **Pilares:** P2
- **Critérios de aceitação:**
  1. Given checkout sem integração pixel/CAPI declarada, When valida, Then issue `warn` (depende da Fase 8).
  2. Given nenhuma LP para um ângulo prioritário, When valida, Then issue `warn`.
  3. Given Fase 6 completa, When valida, Then `passed=true`.
- **Tarefas técnicas:** `gate_fase6` com checagem de cobertura ângulo→LP.
- **DoD:** cobertura ≥90%.
- **Dependências:** S0.7, S6.1

---

### [S6.3] UI de revisão da Fase 6 — checklist de assets por status
- **Pilares:** P3, P5
- **Design System:** lista de assets com status (a produzir/pronto), `coach` (elementos obrigatórios de LP), `tpl` (templates de e-mail por etapa do funil).
- **User story:** Como Aprovador, quero ver os assets como checklist com status, para acompanhar o que falta produzir.
- **Critérios de aceitação:**
  1. Given assets, When marco um como "pronto"/"a produzir", Then estado persiste e registra revisão.
  2. Given mobile, When reviso, Then lista vertical com toque ≥48px.
- **Tarefas técnicas:** checklist de assets; status; persistência.
- **DoD:** status persistido; mobile; edição registrada.
- **Dependências:** S0.3, S6.2

---

## DoD da Sprint 6
- [ ] Inventário de assets tipado, ligado a Fase 4/5/8 (P1).
- [ ] Validadores de cobertura ≥90% (P2).
- [ ] UI checklist de assets com status (P3/P5).
