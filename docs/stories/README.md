# BIGFLUX — Backlog de Stories (Builder Business)

> Documento mestre do desenvolvimento story-driven do **BIGFLUX**.
> Toda implementação parte de uma story aqui catalogada. Stories obedecem **rigorosamente** à arquitetura em 6 pilares, ao **Design System v2** (`prd/design-system-v2.html`) e ao padrão **software-premium-params** (`prd/software-premium-params.md`).

**Versão:** 1.0 · **Data:** 22/06/2026 · **Fonte:** PRDs Parte 1 (Big Flux Generator), Parte 2 (Tráfego Pago), Parte 3 (Agentes & ORACULO).

---

## 1. Visão do produto

O BIGFLUX transforma o **Report de Marketing do Board** em um **Big Flux Document** de 12 fases (fonte de verdade estratégica), e o **executa** em Meta/Google Ads através de um pool de **10 agentes de IA** orquestrados, com **ORACULO** como copiloto cognitivo transversal. Cada artefato gerado (Big Flux, campanha, copy, briefing, relatório) é um **artefato Premium exportável, versionado e auditável**.

```
Report do Board ─► Big Flux Generator (12 fases) ─► Tráfego Pago (10 etapas) ─► Otimização contínua
                          │                               │
                          └──────── ORACULO (transversal) ┘
```

---

## 2. Os 6 Pilares (NÃO-NEGOCIÁVEIS)

Toda story declara, no campo `Pilares`, quais pilares ela materializa. Um critério de aceitação que viole um pilar **bloqueia** o merge.

| # | Pilar | Significado operacional | Gate de verificação |
|---|-------|-------------------------|---------------------|
| **P1** | **Estrategista vs. Executor** | O tráfego nunca executa nada que contradiga o Big Flux aprovado. Estratégia nasce no Big Flux; execução obedece. | Toda ação de campanha valida contra `TrafficConstraints` do `big_flux_current`. Conflito ⇒ bloqueio + revisão humana. |
| **P2** | **Validação determinística** | Regras, comparações, cálculos e gates são **código puro** — nunca LLM. IA só onde há criatividade/semântica. | Gates retornam `{passed, issues[]}` testável; cobertura unitária ≥ 90% nos gates. |
| **P3** | **Humano-no-loop (HITL)** | `blast_radius` define o que o agente faz sozinho. Começa conservador. Publicação/escala grande sempre confirmadas por humano. | Fila de aprovações; toda ação fora do radius registra `approved_by`. |
| **P4** | **Multi-tenant sagrado** | Cada business é um tenant isolado. `tenant_id` em toda query. RLS obrigatório. Credenciais cifradas. Custos por tenant. | Teste automatizado de isolamento; RLS ativo em 100% das tabelas; nenhum cross-tenant leak. |
| **P5** | **Tudo versionado e logado** | Big Flux, prompts, agentes e artefatos têm versão. Toda execução vira log append-only não-repudiável. | `agent_executions`, `premium_llm_calls`, `*_revisions`, `artifact_versions` populados; logs sanitizados (sem PII/keys). |
| **P6** | **Adapters intercambiáveis** | Meta/Google/TikTok são adapters de interface comum. Agentes nunca chamam API externa direto. | Agentes dependem só de `TrafficPlatformAdapter`; trocar adapter não altera agente. |

---

## 3. Mapa de Épicos → Sprints

| Sprint | Épico | Arquivo | Pilares dominantes |
|--------|-------|---------|--------------------|
| **S0** | Fundação Premium & Multi-tenant | `sprint-00-fundacao.md` | P2 P4 P5 P6 |
| **S1** | Fase 1 — Pesquisa & Validação de Mercado | `sprint-01-fase01-pesquisa-validacao.md` | P1 P4 P5 |
| **S2** | Fase 2 — Concepção do Produto/Oferta | `sprint-02-fase02-oferta.md` | P1 P5 |
| **S3** | Fase 3 — Precificação & Unit Economics | `sprint-03-fase03-unit-economics.md` | P1 P2 P5 |
| **S4** | Fase 4 — Posicionamento & Mensagem | `sprint-04-fase04-posicionamento.md` | P1 P5 |
| **S5** | Fase 5 — Funil & Jornada do Cliente | `sprint-05-fase05-funil.md` | P1 P2 P5 |
| **S6** | Fase 6 — Assets de Conversão | `sprint-06-fase06-assets.md` | P1 P5 |
| **S7** | Fase 7 — Criativos | `sprint-07-fase07-criativos.md` | P1 P3 P5 |
| **S8** | Fase 8 — Infraestrutura de Mensuração | `sprint-08-fase08-mensuracao.md` | P2 P5 P6 |
| **S9** | Fase 9 — Regras de Operação & Contingência | `sprint-09-fase09-regras-contingencia.md` | P2 P3 P5 |
| **S10** | Fase 10 — Lançamento & Tráfego Pago | `sprint-10-fase10-lancamento.md` | P1 P3 P6 |
| **S11** | Fase 11 — Otimização Cíclica | `sprint-11-fase11-otimizacao.md` | P2 P5 |
| **S12** | Fase 12 — Expansão | `sprint-12-fase12-expansao.md` | P1 P5 |
| **S13** | Pipeline de Tráfego Pago (10 etapas + agentes) | `sprint-13-pipeline-trafego-pago.md` | P1 P2 P3 P6 |
| **S14** | ORACULO (assistente transversal) | `sprint-14-oraculo.md` | P3 P4 P5 |

> **Nota sobre as Fases 1-12:** cada Sprint S1-S12 entrega (a) o **gerador/render da seção da fase** dentro do Big Flux Generator, (b) o **prompt-contract Premium** que o Big Flux Architect usa para preencher aquela fase, (c) os **validadores determinísticos** específicos da fase, (d) a **UI mobile-first** de revisão/edição daquela fase com Design System v2, e (e) a **extração para `TrafficConstraints`** quando a fase alimenta o tráfego. A geração do Big Flux é monolítica (uma chamada Opus por documento), mas a **especificação, validação, render e edição** de cada fase é modular — daí uma Sprint por fase.

---

## 4. Convenção de Story (template obrigatório)

Cada story segue este formato:

```
### [S{n}.{m}] Título da story
- **Pilares:** P1, P4 ...
- **Premium:** quais cláusulas de software-premium-params aplicam (multi-LLM / cost / artifact / safety …)
- **Design System:** componentes v2 usados (stepper, coach, celebrate, dropzone …)
- **User story:** Como <papel>, quero <ação> para <benefício>.
- **Contexto ampliado:** descrição detalhada do recurso e por que existe.
- **Critérios de aceitação (Gherkin):** Given/When/Then numerados.
- **Tarefas técnicas:** checklist de implementação (backend, db, frontend, prompt, testes).
- **Schema / contrato:** SQL, TypeScript interfaces, JSON, prompt contract.
- **Definition of Done:** itens verificáveis incluindo gates dos pilares.
- **Dependências:** stories que precisam estar prontas antes.
```

### Papéis (personas) referenciados
- **Aprovador do Big Flux** — usuário com permissão de aprovar/rejeitar Big Flux do tenant.
- **Gestor de Tráfego** — opera campanhas no sub-módulo.
- **Super-admin (board)** — vê agregados cross-tenant (read-only).
- **Dev/DevOps** — implementa e opera o sistema.
- **Agente** — executor de IA (Big Flux Architect, Estrategista, etc.).

---

## 5. Design System v2 — tokens canônicos (aplicar em TODA UI)

Fonte: `prd/design-system-v2.html`. Princípios: **mobile-first**, **uma decisão por tela**, **ensina pelo caminho**, **ousadia só em CTA/entrega**, **erro é direção**.

```css
/* Superfícies (tema escuro) */
--bg:#0D0D0D; --surface:#171717; --surface2:#1F1F1F; --surface3:#2A2A2A;
--border:rgba(255,255,255,.08); --border2:rgba(255,255,255,.15);
/* Texto */
--text:#F0EDE6; --text2:#A09D97; --text3:#5A5755;
/* Acentos semânticos */
--red:#FF3D57 (ação) --green:#1FBA7A (sucesso) --yellow:#FFD600 (atenção)
--blue:#4A9EFF (info) --orange:#FF8C00 (mídia) --purple:#9B6DFF (voz)
/* Gradientes de marca (uso parcimonioso: CTA, logo, entrega) */
--grad-brand:linear-gradient(135deg,#FF3D57,#FF8C00);
--grad-celebrate:linear-gradient(135deg,#FF3D57,#9B6DFF 60%,#4A9EFF);
/* Tipografia */
--display:'Bricolage Grotesque'  --font:'Inter'  --mono:'JetBrains Mono'
/* Raios / sombras / toque */
--r-2xl:22px  --sh-glow:0 8px 40px rgba(255,61,87,.28)  --tap:48px  --tap-cta:54px
```

**Componentes v2 a reutilizar:** `stepper` (fases do wizard), `coach` tip (onboarding/educação), `dropzone` (upload de referência/report), `tpl` cards (templates por vertical), `caption-frame` (preview criativo), `prog-friendly` (progresso de geração), `friendly-error` (erros sem jargão técnico), `celebrate` (entrega de artefato pronto), `field` (inputs com toque ≥48px).

**Regra de microcopy:** nunca expor termo de sistema ("HTTP 429", "token", "temperature") ao usuário. Erros explicam o que houve + próximo passo, na voz do produto.

---

## 6. Padrão Premium global (software-premium-params)

Todo gerador de artefato do BIGFLUX é um **mini-app Premium**. Cláusulas globais que valem para todas as sprints:

### 6.1 Multi-LLM com roteamento por tarefa
Nunca um único modelo para tudo. Config por app/fase em `premium_model_configs`. Capacidades, não nomes, decidem o modelo. Perfis: `cost_saver | balanced | quality_first | speed_first | multimodal_first | legal_safe`.

| Papel no BIGFLUX | Modelo recomendado | Perfil |
|------------------|--------------------|--------|
| Big Flux Architect | `claude-opus-4-7` | quality_first |
| Estrategista / Copywriter / Diretor / Analista / Otimizador | `claude-sonnet-4-6` | balanced |
| Auditor / Sentinela | `claude-haiku-4-5` | speed_first / cost_saver |
| ORACULO | `claude-opus-4-7` | quality_first (streaming) |

### 6.2 Fallback Premium (obrigatório)
1. registra erro técnico → 2. modelo equivalente mesmo provedor → 3. provedor alternativo mesma modalidade → 4. reduz complexidade → 5. avisa usuário só se qualidade/formato final afetados → 6. tudo em `premium_llm_calls`.

### 6.3 Fases de execução logáveis
`input_validation → planning → generation → tool_enrichment → review → post_processing → artifact_export → history_save → cost_recording → user_delivery`.

### 6.4 Custo medido por execução
`premium_app_runs`, `premium_llm_calls`, `premium_tool_calls`, `premium_cost_ledger`, `user_premium_limits`. Estimativa antes de rodar; custo real depois; cap por tenant (70% aviso / 90% degradação / 100% bloqueio não-crítico).

### 6.5 Artefato primeiro + exportação
Big Flux ⇒ MD + JSON + **PDF**. Copy/Briefing/Relatório ⇒ Markdown/CSV/PDF/ZIP. Persistir em `generated_artifacts` + `artifact_versions`. Permitir copiar, baixar, regenerar etapa, duplicar, favoritar, versionar.

### 6.6 Segurança
API keys só em secrets do servidor. Nunca em `input_payload`, logs, prompts ou export. `provider_slug` + `secret_ref`. PII detectada e tratada. Logs sanitizados.

### 6.7 HITL para risco (alinha com P3)
Categorias sensíveis (saúde, finanças, emagrecimento, imigração, jurídico) ⇒ aviso + revisão humana + perfil `legal_safe`. Sinalizado na Fase 7 (compliance) e no Auditor.

---

## 7. Convenção de banco e segurança (todas as sprints)

- Toda tabela de domínio: `tenant_id UUID NOT NULL` + `ALTER TABLE … ENABLE ROW LEVEL SECURITY` + policy `tenant_isolation`.
- Toda escrita relevante gera log/append (`*_revisions`, `*_actions`, `agent_executions`).
- Migrations versionadas e idempotentes. Índices em `(tenant_id, status)` e chaves de correlação.
- Eventos de domínio via Supabase Realtime: `big_flux.approved`, `campaign.published`, `contingency.detected`.

---

## 8. Ordem de execução recomendada

```
S0 (fundação) ─► S1…S12 (fases, podem paralelizar após S0 + S3) ─► S13 (tráfego, requer S0,S3,S7,S8,S9,S10) ─► S14 (ORACULO, requer S0 + ≥1 fase + S13 parcial)
```

S3 (Unit Economics) é pré-requisito de S13 porque define `TrafficConstraints` numéricos. S8/S9 (mensuração/contingência) alimentam gates e Sentinela do tráfego.

---

## 9. Definition of Done global (todas as stories herdam)

- [ ] Critérios de aceitação Gherkin verdes.
- [ ] Pilares declarados verificados por gate (RLS, blast radius, validação determinística, versionamento).
- [ ] UI mobile-first com Design System v2; toque ≥48px; erros amigáveis.
- [ ] Multi-LLM com fallback; `premium_llm_calls` e `premium_cost_ledger` populados.
- [ ] Artefato exportável + versionado quando aplicável.
- [ ] `lint`, `typecheck`, `test` passam; cobertura de gates ≥90%.
- [ ] Logs sanitizados (sem PII/keys); RLS testado.
- [ ] Documentação da story atualizada (File List, checkboxes).
```
