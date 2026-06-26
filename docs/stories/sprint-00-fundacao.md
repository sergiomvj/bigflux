# Sprint 0 — Fundação Premium & Multi-tenant

> **Épico:** Infraestrutura que sustenta os 6 pilares antes de qualquer fase do Big Flux.
> **Pilares dominantes:** P2 (validação determinística), P4 (multi-tenant), P5 (versionamento/log), P6 (adapters).
> **Pré-requisito de:** todas as demais sprints.
> **Referências:** Parte 1 §6-7, Parte 2 §2/§5/§7/§8, Parte 3 §3/§6, `software-premium-params` §6-13, `design-system-v2`.

---

## Objetivo da sprint

Entregar o esqueleto sobre o qual as 12 fases, o tráfego e o ORACULO serão construídos: isolamento multi-tenant com RLS, autenticação e RBAC, design system tokenizado, infraestrutura Premium (multi-LLM router + cost tracking + artifact store), o Traffic Orchestrator base (state machine + gates determinísticos genéricos), a camada de adapters e o pool de execução de agentes com logging.

**Critério de sucesso da sprint:** um "hello world" de agente roda ponta a ponta — invocação tipada → execução com modelo roteado → fallback testado → log em `agent_executions` + custo em `premium_llm_calls` → artefato persistido e exportável — tudo dentro de um tenant isolado, sem vazamento cross-tenant comprovado por teste automatizado.

---

## Stories

### [S0.1] Modelo multi-tenant com RLS e isolamento comprovado
- **Pilares:** P4, P5
- **Premium:** §12 (segurança/governança)
- **User story:** Como Dev, quero um modelo de tenant com RLS forçado em todas as tabelas, para que nenhum dado vaze entre businesses — mesmo em bug ou debug.
- **Contexto ampliado:** Cada business da empresa é um tenant com contas de anúncio próprias, Big Flux próprio, campanhas, métricas, usuários e custos isolados (Parte 2 §2.1). O isolamento é "sagrado": toda query carrega `tenant_id`, sem exceção. Existe perfil **super-admin** (board) que lê agregados cross-tenant **sem mutação** e sempre logado.
- **Critérios de aceitação (Gherkin):**
  1. Given duas tenants A e B com dados, When um usuário de A consulta qualquer tabela de domínio, Then só retornam linhas com `tenant_id = A`.
  2. Given RLS ativo, When um dev tenta query sem `app.current_tenant_id` setado, Then a query retorna vazio (fail-closed), não erro silencioso que exponha dados.
  3. Given um super-admin, When acessa dashboard consolidado, Then vê agregados cross-tenant read-only e a ação fica em log de auditoria.
  4. Given um teste automatizado de isolamento, When roda no CI, Then prova que nenhuma das N tabelas permite leak cross-tenant.
- **Tarefas técnicas:**
  - [ ] Migration `tenants`, `users`, `tenant_memberships (role)` com RBAC.
  - [ ] Função `set_tenant_context(uuid)` que seta `app.current_tenant_id`.
  - [ ] Template de policy `tenant_isolation` aplicado por gerador a toda tabela de domínio.
  - [ ] Papel super-admin: view materializada agregada + `audit_log` de acesso cross-tenant.
  - [ ] Suite `tenant-isolation.spec` parametrizada por tabela.
- **Schema:**
```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, segment TEXT, business_model TEXT, size_estimate TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE tenant_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner','approver','traffic_manager','viewer','super_admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, user_id)
);
-- macro aplicado a toda tabela de domínio:
-- ALTER TABLE <t> ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY tenant_isolation ON <t>
--   USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```
- **Definition of Done:** RLS em 100% das tabelas de domínio; suite de isolamento verde; super-admin read-only logado.
- **Dependências:** —

---

### [S0.2] Autenticação, RBAC e papel "Aprovador do Big Flux"
- **Pilares:** P3, P4
- **User story:** Como Owner do tenant, quero definir quem aprova o Big Flux e quem gerencia tráfego, para que decisões críticas tenham identidade registrada.
- **Contexto ampliado:** Parte 1 §13 exige definir o "usuário aprovador" por tenant. HITL (P3) depende de identidade: toda aprovação fora de blast radius registra `approved_by`.
- **Critérios de aceitação:**
  1. Given roles definidas, When um `viewer` tenta aprovar Big Flux, Then a ação é bloqueada com mensagem amigável.
  2. Given um `approver`, When aprova um Big Flux, Then `approved_by` e `approved_at` são gravados.
  3. Given sessão expirada, When usuário age, Then é redirecionado a login sem expor jargão técnico.
- **Tarefas técnicas:** integração Supabase Auth; guard de rota por role; middleware que injeta `tenant_id` + role no contexto de request; testes de autorização por papel.
- **Definition of Done:** matriz de permissões testada por role; sessões seguras.
- **Dependências:** S0.1

---

### [S0.3] Design System v2 tokenizado e biblioteca de componentes base
- **Pilares:** — (transversal de qualidade)
- **Premium:** §16 (UX/UI checklist)
- **Design System:** todos os tokens e componentes do `design-system-v2.html`.
- **User story:** Como Frontend, quero tokens e componentes do DS v2 prontos, para que toda tela seja mobile-first e consistente sem reinventar estilos.
- **Contexto ampliado:** O DS v2 define tema escuro, Bricolage Grotesque (display), Inter (corpo), JetBrains Mono (dados), gradiente de marca parcimonioso, alvos de toque ≥48px e componentes que "ensinam pelo caminho".
- **Critérios de aceitação:**
  1. Given os tokens CSS do DS v2, When um componente é estilizado, Then usa apenas variáveis (`--red`, `--grad-brand`, `--r-2xl`, `--tap`…), nunca hex hardcoded.
  2. Given mobile (≤560px), When qualquer tela renderiza, Then CTA é alcançável com o polegar e toque ≥48px.
  3. Given a biblioteca, When dev usa `<Stepper>`, `<Coach>`, `<Dropzone>`, `<TemplateCard>`, `<FriendlyError>`, `<Celebrate>`, `<ProgressFriendly>`, Then o visual é idêntico ao DS v2.
  4. Given um erro de sistema, When exibido, Then nunca aparece termo técnico cru ("HTTP 429"), e sim mensagem + próximo passo.
- **Tarefas técnicas:** importar fontes; arquivo de tokens; componentes React: `Button` (`btn-grad`/`btn-cta`/`btn-ghost`), `Stepper`, `Coach`, `Dropzone`, `TemplateCard`, `CaptionFrame`, `ProgressFriendly`, `FriendlyError`, `Celebrate`, `Field`, `Toggle`, `Badge`; Storybook; teste de acessibilidade/tap-target.
- **Definition of Done:** Storybook publicado; lint de "no hardcoded color"; snapshot mobile.
- **Dependências:** —

---

### [S0.4] Infra Premium — provedores, configs de modelo e router multi-LLM
- **Pilares:** P5, P6
- **Premium:** §7 (multi-LLM), §10 (prompt contracts), §11.1-11.2
- **User story:** Como Dev, quero um router que escolhe modelo por capacidade e tarefa com fallback, para que cada agente use o modelo certo sem hardcode.
- **Contexto ampliado:** §7.4 — selecionar por capacidades (`json_schema`, `function_calling`, `long_context`…), não por nome. §7.5 — fallback em cascata. Provedores extensíveis (Anthropic default; OpenAI/Gemini/etc. plugáveis).
- **Critérios de aceitação:**
  1. Given config `quality_first`, When o Big Flux Architect é invocado, Then o router seleciona Opus 4.7 e registra a escolha.
  2. Given o modelo principal falha (timeout), When o router executa fallback, Then tenta equivalente → provedor alt → reduz complexidade, e cada tentativa grava em `premium_llm_calls`.
  3. Given um agente que exige `json_schema`, When um provedor sem essa capacidade é candidato, Then é descartado pelo router.
  4. Given uma key, When qualquer log é gravado, Then a key nunca aparece (apenas `provider_slug`/`secret_ref`).
- **Tarefas técnicas:** tabelas `premium_model_providers`, `premium_model_configs`; `ModelRouter.select(taskCapabilities, profile)`; `LLMClient.invoke()` com rettry/backoff e cascata de fallback; prompt-contract runner (system + JSON schema validável); secrets via env por ambiente.
- **Schema:** ver `software-premium-params` §11.1-11.2 (`premium_model_providers`, `premium_model_configs`).
- **Definition of Done:** fallback testado com mock de falha; nenhuma key em log; seleção por capacidade coberta por teste.
- **Dependências:** S0.1

---

### [S0.5] Cost tracking, quotas e degradação por tenant
- **Pilares:** P4, P5
- **Premium:** §6 (custos), §11.4-11.10, §12.4
- **User story:** Como Super-admin, quero ver e limitar o custo de IA por tenant, para que nenhum business estoure orçamento silenciosamente.
- **Contexto ampliado:** Parte 2 §13 + Parte 3 §8: estimativa antes, custo real depois, cap mensal por tenant com degradação 70/90/100%. Sentinela e Auditor continuam mesmo em bloqueio (segurança).
- **Critérios de aceitação:**
  1. Given uma execução, When termina, Then `premium_app_runs` registra custo estimado e real, tokens, latência, nº de LLM/tool calls e arquivos gerados.
  2. Given tenant em 70% do cap, When nova execução, Then gestor recebe aviso (não bloqueia).
  3. Given 90%, When agente Opus seria usado, Then degrada para modelo menor onde a qualidade permite.
  4. Given 100%, When execução não-crítica, Then é bloqueada; Sentinela e Auditor seguem rodando.
- **Tarefas técnicas:** tabelas `premium_app_runs`, `premium_llm_calls`, `premium_tool_calls`, `premium_cost_ledger`, `user_premium_limits`; `CostTracker.record()`; `QuotaGuard.check()` com política de degradação; dashboard de custo por tenant/agente/campanha.
- **Definition of Done:** degradação testada nos 3 limiares; dashboard funcional; ledger consistente.
- **Dependências:** S0.4

---

### [S0.6] Artifact store — geração, versionamento e exportação
- **Pilares:** P5
- **Premium:** §11.7-11.8, §13 (exportação)
- **Design System:** `celebrate` na entrega, `prog-friendly` na geração.
- **User story:** Como usuário, quero baixar, regenerar, duplicar, favoritar e versionar qualquer artefato gerado, para reusar o resultado profissional.
- **Contexto ampliado:** Artefato-primeiro (§4.1). Big Flux ⇒ MD+JSON+PDF; copy/briefing/relatório ⇒ MD/CSV/PDF/ZIP. Nome de arquivo previsível: `{app_slug}/{tenant_id}/{yyyy}/{mm}/{run_id}/{artifact_slug}.{ext}`.
- **Critérios de aceitação:**
  1. Given um artefato gerado, When salvo, Then aparece em `generated_artifacts` com `version=1`, mime, tamanho, formato e metadados.
  2. Given edição/regeneração, When confirmada, Then cria `artifact_versions` com `change_summary`, preservando histórico.
  3. Given artefato visual, When exibido, Then mostra preview antes do download e tela de `celebrate`.
  4. Given storage, When arquivo salvo, Then segue o padrão de path e respeita `max_file_storage_mb` do plano.
- **Tarefas técnicas:** tabelas `generated_artifacts`, `artifact_versions`; `ArtifactService` (create/version/export/favorite/duplicate); exportadores PDF/DOCX/CSV/MD/ZIP; integração Supabase Storage; preview server-side.
- **Definition of Done:** export multi-formato testado; versionamento preserva histórico; preview funciona.
- **Dependências:** S0.5

---

### [S0.7] Traffic Orchestrator base — state machine + gates determinísticos genéricos
- **Pilares:** P2, P3, P5
- **User story:** Como Dev, quero um orquestrador de código (não-agente) que encadeia etapas, aplica gates booleanos e persiste estado, para que o fluxo seja determinístico e auditável.
- **Contexto ampliado:** Parte 2 §5.2 — orquestrador é **código puro** (state machine própria ou XState), não framework de agentes. Parte 3 §3.1 — agentes nunca se chamam; só o orquestrador invoca. Gate genérico retorna `{passed, issues[]}` (§4.3).
- **Critérios de aceitação:**
  1. Given um workflow declarado, When uma etapa conclui, Then o estado transiciona só se o gate `passed=true` (sem issue `block`).
  2. Given um gate com issue `warn`, When humano confirma, Then avança; sem confirmação, fica retido.
  3. Given falha de etapa, When ocorre, Then o orquestrador faz retry/escalation/rollback conforme política e emite evento.
  4. Given qualquer transição, When acontece, Then é persistida (auditoria).
- **Tarefas técnicas:** engine de state machine; tipo `GateResult`/`Issue`; registry de gates por etapa; emissor de eventos (Realtime); persistência de estado; testes determinísticos de gate (cobertura ≥90%).
- **Schema/contrato:**
```typescript
interface Issue { level: 'block'|'warn'|'info'; msg: string; affected_element?: string; suggested_fix?: string; }
interface GateResult { passed: boolean; issues: Issue[]; }
type GateFn<TCtx> = (ctx: TCtx) => GateResult; // determinístico, sem LLM
```
- **Definition of Done:** state machine testada; gates 100% determinísticos; eventos emitidos.
- **Dependências:** S0.1

---

### [S0.8] Pool de execução de agentes — envelope, logging e 3 modos de invocação
- **Pilares:** P5, P6
- **Premium:** §8 (agentes operacionais)
- **User story:** Como Dev, quero invocar qualquer agente por um envelope tipado com log obrigatório, para padronizar e auditar todas as execuções de IA.
- **Contexto ampliado:** Parte 3 §3 — protocolo do zero: mensagens não chamadas diretas; tudo estruturado, versionado, logado, com `tenant_id`; idempotência onde faz sentido; falha explícita com código padronizado. 3 modos: síncrono, assíncrono (job), streaming.
- **Critérios de aceitação:**
  1. Given uma invocação, When executada, Then segue `AgentInvocation`/`AgentResponse` e gera registro em `agent_executions`.
  2. Given um agente longo (Architect/Analista), When invocado em modo job, Then retorna `job_id` e suporta polling/webhook.
  3. Given ORACULO, When invocado, Then responde via streaming (SSE/WebSocket).
  4. Given um erro, When ocorre, Then retorna `AgentError` com código do catálogo (`MODEL_TIMEOUT`, `MISSING_CONTEXT`, `BLAST_RADIUS_EXCEEDED`…) e `retryable` correto.
  5. Given agentes operacionais, When um precisa de outro, Then a comunicação passa pelo orquestrador (nunca agente→agente).
- **Tarefas técnicas:** tipos `AgentInvocation`/`AgentResponse`/`AgentError`; catálogo de erros; `AgentRunner` (sync/job/stream); tabela `agent_executions` (Parte 3 §3.6) com RLS; versionamento de agente/prompt (`agent_version`).
- **Schema:** `agent_executions` conforme Parte 3 §3.6.
- **Definition of Done:** 3 modos testados; logging 100%; catálogo de erros coberto; stateless verificado.
- **Dependências:** S0.4, S0.7

---

### [S0.9] Camada de Adapters — interface comum + skeleton Meta/Google
- **Pilares:** P6
- **User story:** Como Dev, quero adapters intercambiáveis com interface única, para que agentes nunca dependam da API específica da plataforma.
- **Contexto ampliado:** Parte 2 §5.3/§8 — `TrafficPlatformAdapter` único; adapters traduzem `CampaignSpec`→API; resiliência (retry, circuit breaker, fila idempotente); erro padronizado `AdapterResult<T>`; versão de API travada por adapter.
- **Critérios de aceitação:**
  1. Given um agente, When publica/consulta campanha, Then chama apenas `TrafficPlatformAdapter` — nunca Meta/Google API direto.
  2. Given erro transitório, When ocorre, Then retry exponencial; se API fora, circuit breaker abre.
  3. Given erro de plataforma, When retornado, Then é mapeado para `AdapterResult.error.code` padronizado entre adapters.
  4. Given troca de adapter, When feita, Then nenhum código de agente muda.
- **Tarefas técnicas:** interface `TrafficPlatformAdapter`; `AdapterResult<T>`; skeleton `MetaAdapter`/`GoogleAdapter` (stubs + sandbox); resiliência (retry/circuit breaker/fila); mapa de erros padronizado.
- **Schema/contrato:** `TrafficPlatformAdapter` e `AdapterResult<T>` conforme Parte 2 §5.3/§8.5.
- **Definition of Done:** stub testado em sandbox; circuit breaker validado; erros normalizados.
- **Dependências:** S0.7

---

### [S0.10] Knowledge Base com pgvector (global + tenant) e eventos de domínio
- **Pilares:** P4, P5
- **User story:** Como agente, quero ler de uma KB com escopo global e tenant, para fundamentar decisões com aprendizados sem quebrar isolamento.
- **Contexto ampliado:** Parte 3 §6.2 — KB global (todos os tenants, mantida por produto) e KB tenant (aprendizados do business). Busca semântica via pgvector. Eventos Realtime (`big_flux.approved` etc.).
- **Critérios de aceitação:**
  1. Given KB com `scope='global'`, When qualquer tenant lê, Then acessa; `scope='tenant'` só o próprio tenant.
  2. Given uma busca semântica, When executada, Then usa embedding e respeita escopo.
  3. Given um evento `big_flux.approved`, When emitido, Then assinantes (cache do tráfego) recebem.
- **Tarefas técnicas:** tabela `knowledge_base` (Parte 3 §6.2) com pgvector + RLS + CHECK de escopo; serviço de embedding; barramento de eventos Realtime.
- **Definition of Done:** busca semântica testada; escopo respeitado; eventos entregues.
- **Dependências:** S0.1

---

## Definition of Done da Sprint 0
- [ ] Teste de isolamento multi-tenant verde em CI (P4).
- [ ] Router multi-LLM com fallback e nenhuma key em log (P5/P6).
- [ ] Cost tracking + degradação 70/90/100% (P4).
- [ ] Artifact store com export multi-formato e versionamento (P5).
- [ ] Orchestrator + gates determinísticos cobertura ≥90% (P2).
- [ ] Pool de agentes nos 3 modos com log obrigatório (P5).
- [ ] Adapters intercambiáveis com erro padronizado (P6).
- [ ] DS v2 em Storybook, mobile-first, sem cor hardcoded.
- [ ] "Hello world" de agente roda ponta a ponta isolado por tenant.
