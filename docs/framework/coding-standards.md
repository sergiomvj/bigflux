# BIGFLUX — Coding Standards

> **Status:** CLOSED por @architect (Aria) em 2026-06-23.
> **Escopo:** Padrões obrigatórios para todo código em `packages/*`. Carregado por `core-config.devLoadAlwaysFiles` — @dev lê isto antes de implementar qualquer story.
> **Rastreabilidade:** Constitution Art. IV/V/VI; Pilares P2/P4/P5/P6; `software-premium-params` §12.

---

## 1. TypeScript strict (NON-NEGOTIABLE)

- `strict: true` em `tsconfig.base.json`. Sem exceções por package.
- Proibido `any` implícito ou explícito sem comentário `// eslint-disable` justificado e rastreável a um motivo. Prefira `unknown` + narrowing.
- `noUncheckedIndexedAccess: true` — acesso a array/record retorna `T | undefined`.
- Toda fronteira de IO (resposta de LLM, payload de adapter, row de DB) é validada com **Zod** antes de virar tipo confiável (P2: validação determinística; premium-params §10.3).
- Tipos de domínio são `interface`/`type` exportados de um package, nunca duplicados inline.

## 2. Absolute imports — `@bigflux/*` (Constitution Art. VI)

- **Proibido** import relativo profundo (`../../../`). Use path alias.
- Cross-package: `import { ModelRouter } from '@bigflux/llm-router'`.
- Intra-package: alias do próprio package (`@/...`) OU relativo raso (`./`, `../`) só dentro do mesmo diretório lógico.
- Enforced por ESLint `no-restricted-imports` (S0.0 AC5):

```jsonc
// regra: bloqueia "../../" e força @bigflux/*
"no-restricted-imports": ["error", {
  "patterns": ["../../*", "../../../*"]
}]
```

- `tsconfig.base.json` declara os paths:

```jsonc
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@bigflux/*": ["packages/*/src"] }
  }
}
```

## 3. Naming

| Elemento | Convenção | Exemplo |
|----------|-----------|---------|
| Package | kebab-case, prefixo `@bigflux/` | `@bigflux/llm-router` |
| Arquivo de módulo | kebab-case | `model-router.ts` |
| Arquivo de teste | co-localizado `*.spec.ts` | `model-router.spec.ts` |
| Type / Interface | PascalCase | `GateResult`, `AgentInvocation` |
| Função / variável | camelCase | `selectModel`, `tenantId` |
| Constante de módulo | UPPER_SNAKE | `MAX_FALLBACK_ATTEMPTS` |
| Tabela DB / coluna | snake_case | `premium_llm_calls`, `tenant_id` |
| Evento de domínio | dot.case | `big_flux.approved` |
| Erro (código catálogo) | UPPER_SNAKE | `MODEL_TIMEOUT`, `BLAST_RADIUS_EXCEEDED` |

## 4. Error handling

- **Falha explícita, nunca silenciosa.** Funções de domínio retornam Result-like (`{ passed, issues[] }` para gates; `AdapterResult<T>` para adapters; `AgentError` para agentes) OU lançam erro tipado — nunca retornam `undefined` ambíguo em caminho de erro.
- Catálogo de códigos de erro centralizado (S0.8): todo `AgentError` carrega `code` do catálogo + `retryable: boolean`.
- Padrão de wrap (já no CLAUDE.md do projeto):

```typescript
try {
  // operação
} catch (error) {
  // log sanitizado (SEM key, SEM PII) — ver §6
  throw new Error(`Failed to ${operation}: ${(error as Error).message}`);
}
```

- **Erro de usuário ≠ erro técnico.** Mensagem ao usuário nunca expõe jargão (`HTTP 429`, `token`, `temperature`) — DS v2 microcopy rule. O erro técnico vai pro log; o `FriendlyError` vai pra tela.

## 5. RLS-by-default (P4 — multi-tenant sagrado)

- **Toda** tabela de domínio nasce com: `tenant_id UUID NOT NULL` + `ENABLE ROW LEVEL SECURITY` + policy `tenant_isolation` usando `current_setting('app.current_tenant_id')::uuid` (modelo de S0.1).
- **Fail-closed:** query sem contexto de tenant setado retorna vazio, nunca dados (S0.1 AC2). Nunca desabilite RLS para "debug" — use `set_tenant_context()`.
- Migrations versionadas e idempotentes (README §7). Índices em `(tenant_id, status)` e chaves de correlação.
- Nenhuma camada de aplicação confia no `tenant_id` vindo do client — ele vem do contexto de sessão autenticada (middleware S0.2).
- **Tabelas `scope`-based (KB, S0.10):** CHECK constraint de escopo (`global`/`tenant`) + policy que respeita ambos.

## 6. Segurança de credenciais & logs (premium-params §12)

- API keys **só** em secrets do servidor (env por ambiente: `development`/`staging`/`production`). Nunca em código, client bundle, `input_payload`, log, prompt ou export.
- Referenciar provedores por `provider_slug` + `secret_ref` — nunca o valor.
- **Logs sanitizados (P5):** podem conter ID, status, provider, model, fase, latência, custo, erro sanitizado. **Nunca:** key, PII, documento integral, prompt com dados sensíveis.
- O `@bigflux/llm-router` e qualquer chamada a provedor roda **server-side**. Frontend nunca importa SDK de LLM.

## 7. Determinismo em gates (P2)

- Gates são **código puro**: `type GateFn<TCtx> = (ctx: TCtx) => GateResult`. **Zero LLM** dentro de um gate.
- Gate retorna `{ passed: boolean, issues: Issue[] }` — testável, com cobertura unitária ≥90% (DoD global, a partir de S0.1).
- IA só onde há criatividade/semântica; comparação/cálculo/regra é sempre código.

## 8. Versionamento & log append-only (P5)

- Toda escrita relevante gera log/append (`*_revisions`, `agent_executions`, `premium_llm_calls`). Logs são append-only, não-repudiáveis.
- Artefatos, prompts e agentes têm versão (`artifact_versions`, `agent_version`).

## 9. Adapters intercambiáveis (P6)

- Agentes dependem **apenas** de interfaces (`TrafficPlatformAdapter`, `ModelRouter`) — nunca de uma API externa concreta.
- Trocar um adapter não pode alterar nenhum código de agente (S0.9 AC4). Zero coupling entre packages (skill architect-first).

## 10. Testes

- Vitest, arquivos `*.spec.ts` **co-localizados** com o código.
- Gates e lógica determinística: cobertura ≥90% (a partir de S0.1).
- Fallback de LLM, isolamento de tenant e circuit breaker de adapter têm teste dedicado com mock de falha.
- Nenhuma key real em fixture de teste.

## 11. Lint & format

- ESLint flat config + Prettier. `lint` e `typecheck` devem passar antes de qualquer commit (DoD global).
- Regra `no-hardcoded-color` (DS v2): nenhum hex no código de UI — só CSS variables (`--red`, `--grad-brand`). Reservada na S0.0, ativada em S0.3.

---

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-06-23 | 1.0 | Coding standards iniciais (TS strict, absolute imports, RLS-by-default, security) | @architect (Aria) |
