# BIGFLUX — Source Tree (Monorepo Layout)

> **Status:** CLOSED por @architect (Aria) em 2026-06-23.
> **Escopo:** Layout do monorepo pnpm. Cada package mapeia a uma ou mais stories da Sprint 0. `packages/` é camada L4 (livre — `boundary.frameworkProtection: false`).
> **Regra:** S0.0 cria o **esqueleto** (diretório + `package.json` + 1 smoke test) de cada package; a lógica entra na story dona. @dev não implementa domínio na S0.0.

---

## 1. Raiz

```text
BigFlux/
├── package.json              # workspace root, packageManager: pnpm, scripts agregados
├── pnpm-workspace.yaml        # packages: ["packages/*", "apps/*"]
├── turbo.json                 # pipeline: lint → typecheck → test → build (cache)
├── tsconfig.base.json         # strict + paths "@bigflux/*"
├── eslint.config.js           # flat config + no-restricted-imports (absolute imports)
├── .prettierrc
├── vitest.config.ts           # config base de teste + coverage v8
├── .github/workflows/ci.yml   # install → lint → typecheck → test (S0.0 AC3)
├── supabase/                  # migrations SQL versionadas + config (Supabase CLI)
│   └── migrations/            # *.sql idempotentes (S0.1+)
├── packages/                  # libs internas (L4) — ver §2
├── apps/                      # apps consumidores (frontend) — ver §3
└── docs/                      # PRDs, stories, framework, architecture
```

## 2. `packages/*` — libs internas (mapeadas a stories)

```text
packages/
├── db/              # @bigflux/db        — modelo tenant, RLS helpers, set_tenant_context   ← S0.1
├── auth/            # @bigflux/auth      — Supabase Auth wrapper, RBAC guards, papel approver ← S0.2
├── ui/              # @bigflux/ui        — DS v2 tokens + componentes React + Storybook       ← S0.3
├── llm-router/      # @bigflux/llm-router— ModelRouter (capacidade), LLMClient, fallback       ← S0.4
├── cost/            # @bigflux/cost      — CostTracker, QuotaGuard, degradação 70/90/100%       ← S0.5
├── artifacts/       # @bigflux/artifacts — ArtifactService, versionamento, Supabase Storage      ← S0.6
├── orchestrator/    # @bigflux/orchestrator — XState state machine, gates, GateResult            ← S0.7
├── agents/          # @bigflux/agents    — AgentRunner (sync/job/stream), envelope, catálogo erro ← S0.8
├── adapters/        # @bigflux/adapters  — TrafficPlatformAdapter, Meta/Google skeleton           ← S0.9
├── kb/              # @bigflux/kb        — Knowledge Base pgvector (global+tenant)                ← S0.10
├── events/          # @bigflux/events    — barramento Realtime (big_flux.approved …)             ← S0.10/README §7
└── core/            # @bigflux/core      — tipos compartilhados (Issue, GateResult, Result-like) ← transversal
```

### Convenção interna de cada package

```text
packages/<name>/
├── package.json        # name: @bigflux/<name>, type: module
├── tsconfig.json       # extends ../../tsconfig.base.json
├── src/
│   ├── index.ts        # API pública do package (único ponto de export cross-package)
│   └── *.ts
└── src/*.spec.ts       # testes co-localizados (Vitest)
```

> **Regra de dependência (P6 / Zero Coupling):** packages dependem de **interfaces** de outros packages via `@bigflux/*`, nunca de internals. `agents` depende de `orchestrator`+`llm-router` por suas APIs públicas; nunca de Supabase SDK direto. Encapsulamento de infra Supabase fica em `auth`/`artifacts`/`events`/`db` (ver ADR-0001).

## 3. `apps/*` — consumidores

```text
apps/
└── web/             # app frontend Vite + React (DS v2), mobile-first   ← consome @bigflux/ui (S0.3+)
```

> O backend Premium (router LLM, cost, agentes) roda **server-side** (Supabase Edge Functions / rotas server desacopladas), **não** acoplado ao app Vite. Keys de LLM nunca chegam ao bundle do browser (premium-params §12.1).

## 4. `docs/`

```text
docs/
├── framework/                 # tech-stack.md, coding-standards.md, source-tree.md (devLoadAlwaysFiles)
├── architecture/
│   └── project-decisions/     # ADRs (ADR-0001 Supabase, ADR-0002 Vite, ADR-0003 XState …)
├── stories/                   # 0.0 … 0.10 + sprints
├── prd/                       # PRDs compartilhados
└── qa/                        # gates QA, coderabbit reports
```

## 5. Mapa rápido package → story (referência @dev)

| Package | Story | Pilares |
|---------|-------|---------|
| `@bigflux/core` | transversal | — |
| `@bigflux/db` | S0.1 | P4 P5 |
| `@bigflux/auth` | S0.2 | P3 P4 |
| `@bigflux/ui` | S0.3 | qualidade |
| `@bigflux/llm-router` | S0.4 | P5 P6 |
| `@bigflux/cost` | S0.5 | P4 P5 |
| `@bigflux/artifacts` | S0.6 | P5 |
| `@bigflux/orchestrator` | S0.7 | P2 P3 P5 |
| `@bigflux/agents` | S0.8 | P5 P6 |
| `@bigflux/adapters` | S0.9 | P6 |
| `@bigflux/kb` + `@bigflux/events` | S0.10 | P4 P5 |
| `apps/web` | S0.3+ | qualidade |

---

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-06-23 | 1.0 | Layout monorepo com package→story mapping | @architect (Aria) |
