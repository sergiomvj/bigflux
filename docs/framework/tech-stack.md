# BIGFLUX — Tech Stack (FECHADA)

> **Status:** CLOSED por @architect (Aria) em 2026-06-23.
> **Autoridade:** Decisão de arquitetura/tecnologia (`.claude/rules/agent-authority.md` → @architect Design Authority).
> **Rastreabilidade:** Toda escolha abaixo rastreia a um Pilar (P1–P6), uma Story da Sprint 0, ou uma cláusula de `prd/software-premium-params.md` / `prd/design-system-v2.html`. Nenhuma tecnologia foi inventada fora dos PRDs/stories (Constitution Art. IV — No Invention).
> **Escopo:** Esta é a stack da **Sprint 0** (fundação). Tecnologias específicas de fases posteriores (ex.: provedores de vídeo/voz de S7, SDKs Meta/Google de S13) são adicionadas quando a respectiva story chegar — não antecipadas aqui.

---

## 1. Tabela-resumo (camada → tecnologia → versão → justificativa)

| Camada | Tecnologia | Versão alvo | Rastreabilidade |
|--------|-----------|-------------|-----------------|
| **Linguagem** | TypeScript (`strict`) | 5.5.x | DoD global "typecheck"; S0.0 AC2/AC5; Constitution Art. VI (absolute imports) |
| **Runtime** | Node.js LTS | 20.x (>=20.11) | Padrão para toolchain TS/Vitest/Supabase SDK; S0.0 AC1 |
| **Package manager / Monorepo** | pnpm workspaces | pnpm 9.x | S0.0 AC1/AC4 ("escolher pnpm ou npm workspaces") |
| **Task runner (mono)** | Turborepo | 2.x | S0.0 "turbo/nx opcional" — escolhido turbo (cache + pipeline lint/typecheck/test/build) |
| **Banco de dados** | PostgreSQL (via Supabase) | PG 15+ | P4 (RLS), S0.1, S0.10 (pgvector); README §7 |
| **Extensão vetorial** | pgvector | >=0.7 (Supabase nativo) | S0.10 (KB busca semântica) |
| **BaaS / Auth / Storage / Realtime** | Supabase | Cloud + CLI 1.x | S0.2 (Auth/RBAC), S0.6 (Storage), README §7 (Realtime); P4 |
| **DB client / migrations** | Supabase CLI (migrations SQL versionadas) | CLI 1.x | README §7 "migrations versionadas e idempotentes"; S0.1 |
| **Frontend framework** | Vite + React | Vite 5.x · React 18.x | S0.3 (DS v2 mobile-first); ver §3 (trade-off Next vs Vite) |
| **Estilo / tokens** | CSS Custom Properties (DS v2) + CSS Modules | nativo | S0.3 AC1 ("apenas variáveis, nunca hex hardcoded"); `design-system-v2.html` |
| **Component workshop** | Storybook | 8.x | S0.3 DoD ("Storybook publicado") |
| **State machine (orquestrador)** | XState | 5.x | S0.7 ("state machine própria ou XState" → XState); P2 |
| **LLM SDK (default)** | `@anthropic-ai/sdk` | latest | premium-params §6.1 (Anthropic default); S0.4 |
| **LLM SDK (plugáveis)** | `openai`, `@google/generative-ai` (lazy, por adapter) | latest | premium-params §7.2 (provedores extensíveis); S0.4 |
| **Schema validation** | Zod | 3.x | premium-params §7.4/§10.3 (JSON schema validável); S0.4/S0.7/S0.8 (envelopes tipados) |
| **Test runner** | Vitest | 2.x | S0.0 "Vitest recomendado"; Testing section da story |
| **Coverage** | Vitest c8 (`@vitest/coverage-v8`) | 2.x | DoD global "cobertura de gates ≥90%" |
| **Lint** | ESLint (flat config) + `@typescript-eslint` | ESLint 9.x | S0.0 AC5 (`no-restricted-imports`); DoD "lint" |
| **Format** | Prettier | 3.x | S0.0 "ESLint flat config + Prettier" |
| **CI** | GitHub Actions | — | S0.0 AC3 (`.github/workflows/ci.yml`) |
| **PDF export** | (decisão diferida p/ S0.6) | — | S0.6 "exportadores PDF/DOCX/CSV/MD/ZIP" — escolha do lib fica na story que entrega, não na fundação |

---

## 2. Justificativa por camada

### 2.1 Linguagem & Runtime — TypeScript strict sobre Node 20 LTS
- **Por quê:** o DoD global exige `typecheck` verde e a Constitution Art. VI exige absolute imports — ambos pressupõem TS. `strict: true` é obrigatório porque os pilares P2 (validação determinística) e P5 (logs não-repudiáveis) dependem de tipos exatos nos envelopes (`GateResult`, `AgentInvocation`, `AdapterResult<T>`).
- **Node 20 LTS:** alinhamento com o ecossistema Supabase JS SDK, Vitest 2 e Turborepo 2. Evita 22 (mais novo, menos rodado em CI estável) e 18 (fim de suporte se aproximando).

### 2.2 Monorepo — pdpm workspaces + Turborepo
- **Por quê pnpm:** S0.0 AC1/AC4 pedem um workspace onde "um package em `packages/` herda tsconfig base, eslint e jest/vitest sem reconfigurar". pnpm tem o melhor isolamento de dependências (symlink store, sem phantom deps), crítico para P6 (adapters independentes) e para a regra de Zero Coupling do skill architect-first.
- **Por quê Turborepo (não Nx):** a story chama "turbo/nx opcional". Turbo é mais leve, config mínima (`turbo.json`), e o pipeline `lint → typecheck → test → build` mapeia 1:1 nos AC2/AC3. Nx traria geradores/plugins que não temos requisito para usar — adicioná-lo violaria "No Invention". Turbo dá cache local/remoto sem acoplar a estrutura.

### 2.3 Banco & Multi-tenant — PostgreSQL via Supabase + pgvector
- **Por quê Supabase:** é a única opção que satisfaz num só provedor **quatro** requisitos de fundação distintos:
  - **P4 / S0.1** — Postgres com RLS forçado (`current_setting('app.current_tenant_id')`), exatamente o modelo do schema em S0.1.
  - **S0.2** — Supabase Auth para RBAC e papel "Aprovador".
  - **S0.6** — Supabase Storage para o artifact store (path `{app_slug}/{tenant_id}/...`).
  - **README §7** — Supabase Realtime para eventos de domínio (`big_flux.approved`, `campaign.published`, `contingency.detected`).
  - **S0.10** — pgvector nativo para a Knowledge Base semântica.
- **Trade-off de lock-in:** ver §3.

### 2.4 Frontend — Vite + React (mobile-first DS v2)
- **Por quê React:** S0.3 lista componentes React explícitos (`<Stepper>`, `<Coach>`, `<Dropzone>`, `<Celebrate>`…) e Storybook — React é o alvo declarado.
- **Por quê Vite e não Next.js:** ver trade-off em §3. Resumo: a Sprint 0 não tem requisito de SSR/SEO/rotas server; o backend Premium (router LLM, cost, agentes) roda server-side via Supabase Edge Functions / API routes desacopladas, não acoplado ao framework de UI. Vite entrega o DS v2 + Storybook com o menor acoplamento e maior velocidade de dev. Decisão registrada como ADR-0002.
- **Tokens:** DS v2 é um arquivo de CSS custom properties (`--bg`, `--red`, `--grad-brand`, `--tap`…). S0.3 AC1 proíbe hex hardcoded → usamos CSS variables + CSS Modules; uma regra de lint "no hardcoded color" será adicionada em S0.3 (reservada na S0.0 conforme a story).

### 2.5 Orquestração determinística — XState 5
- **Por quê:** S0.7 dá a opção "state machine própria ou XState". XState 5 é escolhido porque (a) é código puro (zero LLM — alinha P2), (b) tem persistência de estado serializável (S0.7 AC4 "toda transição persistida"), (c) suporta guards síncronos que mapeiam diretamente em `GateFn<TCtx> → GateResult`. Escrever uma engine própria seria reinventar com pior cobertura de testes — contra o skill architect-first (REUSE > CREATE).

### 2.6 Camada Premium LLM — Anthropic SDK default + Zod
- **Por quê Anthropic default:** premium-params §6.1 mapeia todos os papéis BIGFLUX para modelos Claude (Opus/Sonnet/Haiku). O `@anthropic-ai/sdk` é o cliente de primeira classe.
- **Por quê provedores plugáveis lazy:** premium-params §7.2 lista ~17 provedores e diz "não hardcodar como única fonte de verdade". O `ModelRouter` (S0.4) seleciona por **capacidade**, não por nome; SDKs de OpenAI/Gemini entram como dependências opcionais carregadas pelo provider adapter, não no core.
- **Por quê Zod:** premium-params §10.3 exige "JSON validável" e S0.4 AC3 exige descartar provedor sem `json_schema`. Zod dá o schema runtime + tipo TS num só lugar, reutilizável nos prompt-contracts, nos envelopes de agente (S0.8) e nos gates (S0.7).

### 2.7 Testes — Vitest + coverage v8
- **Por quê:** S0.0 recomenda Vitest; integra nativamente com Vite/TS/ESM sem o atrito de config do Jest. Coverage v8 cobre o gate ≥90% que o DoD global aplica a partir de S0.1.

### 2.8 CI — GitHub Actions
- **Por quê:** S0.0 AC3 especifica `.github/workflows/ci.yml` com `install → lint → typecheck → test` e branch protection. O `core-config.yaml` já assume GitHub (`github.enabled: true`, `gh pr create`).

---

## 3. Trade-offs e riscos (LEIA antes da S0.0)

### 3.1 Vite + React vs Next.js — **ADR-0002**
| | Vite + React (ESCOLHIDO) | Next.js |
|---|---|---|
| SSR/SEO | Não nativo | Nativo |
| Acoplamento UI↔backend | Baixo (backend é Supabase/Edge, separado) | Alto (API routes no mesmo framework) |
| Velocidade dev / Storybook | Excelente | Bom |
| Requisito da Sprint 0 | Atendido (DS v2 é client-side) | Excede o necessário |

**Decisão:** Vite. A Sprint 0 não tem requisito de SSR/SEO; o produto é um app autenticado por tenant (não site público). Caso uma fase futura exija SSR (improvável — é app interno multi-tenant), reavaliar via novo ADR. **Risco residual:** se marketing pedir landing pública com SEO, será um app separado, não migração do core.

### 3.2 Lock-in Supabase — **ADR-0001**
- **Risco:** acoplamento a Supabase (Auth + Storage + Realtime + Postgres).
- **Mitigação:** o **Postgres é padrão** (RLS, pgvector e SQL são portáveis para qualquer Postgres gerenciado). O acoplamento real fica em Auth/Storage/Realtime. Encapsulamos esses três atrás de packages internos (`@bigflux/auth`, `@bigflux/artifacts`, `@bigflux/events`) — nenhum agente ou gate chama o Supabase SDK direto. Isso espelha o princípio P6 (adapters) aplicado à própria infra. Trocar de provedor = reimplementar 3 packages, não o produto inteiro.
- **Aceito:** o ganho de entregar 4 requisitos de fundação num provedor supera o lock-in encapsulado.

### 3.3 Coverage gate ≥90% só vale de S0.1+
- A própria S0.0 entrega 1 teste smoke por package skeleton para provar o pipeline verde (exit 0 com ~0 lógica). O gate de 90% **não** se aplica à S0.0 — confirmado na Testing section da story. @dev não deve travar a S0.0 por coverage.

### 3.4 Secrets — nunca no client (premium-params §12.1)
- API keys de LLM/provedores ficam **exclusivamente** em secrets do servidor (Supabase Edge Function env / GitHub Actions secrets). O frontend Vite **nunca** recebe keys. A regra `no-hardcoded-secret` e a separação client/server são parte do contrato — o `@bigflux/llm-router` roda server-side, não no bundle do browser.

### 3.5 PDF/export libs — decisão diferida
- S0.6 lista exportadores multi-formato. A escolha do lib específico (ex.: PDF) pertence à story S0.6, não à fundação. A S0.0 não instala libs de export. Evita "No Invention" na fundação.

---

## 4. O que a S0.0 DEVE instalar (escopo mínimo de fundação)

Apenas o necessário para `install / lint / typecheck / test / build` verdes e o skeleton de packages:

- `typescript`, `@types/node`
- `pnpm` (via packageManager field) + `turbo`
- `eslint`, `@typescript-eslint/*`, `eslint-config-prettier`, `prettier`
- `vitest`, `@vitest/coverage-v8`
- (placeholder dirs para os packages de §source-tree, com 1 smoke test cada)

**Não** instalar nesta story: Supabase SDK, React/Vite, XState, SDKs de LLM, Storybook. Esses entram nas stories que os consomem (S0.1+). A S0.0 é só o esqueleto + tooling (confirmado na story: "Não implementa lógica de domínio. Só esqueleto + tooling.").

---

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-06-23 | 1.0 | Stack fechada (Sprint 0) com rastreabilidade por pilar/story/PRD | @architect (Aria) |
