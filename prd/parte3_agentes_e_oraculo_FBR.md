# Parte 3 — Agent Management e ORACULO: Especificação de Integração para a FBR

**Documento:** Especificação de integração do Módulo de Gestão de Tráfego ao pool de agentes FBR
**Sistema:** Builder Business
**Destinatário:** Equipe FBR (responsável pelo pool de agentes)
**Versão:** 1.0
**Data:** 21 de maio de 2026

---

## 1. Propósito deste documento

Este documento especifica os **9 agentes** que precisam ser adicionados ao pool da FBR para suportar o Módulo de Marketing reformulado (Parte 1) e o Sub-módulo de Gestão de Tráfego Pago (Parte 2) do sistema Builder Business.

Além dos agentes individuais, o documento define:

- O **protocolo de comunicação entre agentes** (proposto do zero, conforme solicitado).
- O **schema de execução, logging e auditoria** que o pool deve suportar.
- Os **contratos de I/O** de cada agente (input/output estruturado).
- O **modelo de governança** (blast radius, human-in-the-loop, escalation).
- As **dependências de infraestrutura** necessárias.
- Os **critérios de aceitação** por agente para considerar a integração completa.

**O documento assume que a FBR já tem um pool de agentes operacional** e que este módulo é uma extensão. Onde houver convenções existentes na FBR que conflitem com o proposto aqui, prevalecem as convenções da FBR (com discussão antes da implementação).

---

## 2. Visão geral do pool a ser estendido

### 2.1 Os 9 agentes

| # | Nome | Papel | Modelo recomendado | Onde atua |
|---|------|-------|--------------------|-----------|
| 1 | **Big Flux Architect** | Gera o Big Flux Document a partir do report do board | Opus 4.7 | Módulo de Marketing (Parte 1) |
| 2 | **Estrategista** | Propõe estrutura de campanha alinhada ao Big Flux | Sonnet 4.6 | Tráfego Pago (Parte 2) |
| 3 | **Copywriter** | Gera hooks, headlines, descriptions, primary text | Sonnet 4.6 | Tráfego Pago (Parte 2) |
| 4 | **Diretor de Criativo** | Gera briefings de criativo (vídeo, imagem, formato) | Sonnet 4.6 | Tráfego Pago (Parte 2) |
| 5 | **Configurador** | Monta a estrutura técnica e publica via adapter | Sonnet 4.6 | Tráfego Pago (Parte 2) |
| 6 | **Auditor** | Valida pré-publicação contra Big Flux e políticas | Haiku 4.5 | Tráfego Pago (Parte 2) |
| 7 | **Analista** | Gera insights, análise de causa raiz, briefings diários | Sonnet 4.6 | Tráfego Pago (Parte 2) |
| 8 | **Otimizador** | Propõe ações de otimização (pausar, escalar, redistribuir) | Sonnet 4.6 | Tráfego Pago (Parte 2) |
| 9 | **Sentinela** | Monitora 24/7, detecta anomalias, dispara contingência | Haiku 4.5 (+ código) | Tráfego Pago (Parte 2) |
| 10 | **ORACULO** | Assistente conversacional contextualizado (transversal) | Opus 4.7 | Marketing + Tráfego Pago |

### 2.2 Mapa de comunicação entre agentes

```
                   ┌─────────────────────────────┐
                   │   Big Flux Architect (Opus) │
                   │   (Parte 1)                 │
                   └──────────────┬──────────────┘
                                  │
                                  │ TrafficConstraints
                                  ▼
   ┌──────────────────────────────────────────────────────────┐
   │             Traffic Orchestrator (código)                 │
   │  Roteia intenções, encadeia workflows, aplica gates       │
   └────┬────┬────┬────┬────┬────┬────┬────────────────────────┘
        │    │    │    │    │    │    │
        ▼    ▼    ▼    ▼    ▼    ▼    ▼
    ┌───┐ ┌──┐ ┌──┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐
    │EST│ │CW│ │DC│ │CFG│ │AUD│ │ANL│ │OTM│
    └───┘ └──┘ └──┘ └───┘ └───┘ └───┘ └───┘
                                            ▲
                                            │ insights/triggers
                                            │
                                       ┌────┴────┐
                                       │  SEN    │
                                       └─────────┘

   ┌──────────────────────────────────────────────────────────┐
   │   ORACULO (transversal — lê contexto, propõe, explica)   │
   └──────────────────────────────────────────────────────────┘
```

**Leitura do diagrama:**
- Agentes operacionais (EST, CW, DC, CFG, AUD, ANL, OTM, SEN) **não se chamam entre si**. Toda comunicação passa pelo Orquestrador.
- ORACULO é transversal: lê o contexto que outros agentes produziram, mas não os comanda.
- Big Flux Architect só roda no Módulo de Marketing; seu output (Big Flux Document) é consumido pelos demais via `TrafficConstraints`.

---

## 3. Protocolo de comunicação entre agentes

Como vocês solicitaram que eu propusesse o padrão do zero, esta seção é o coração do documento. O protocolo é desenhado para ser simples, auditável, e independente de framework.

### 3.1 Princípios do protocolo

1. **Mensagens, não chamadas diretas.** Agente nunca chama agente. Quem invoca agente é o Orquestrador (código).
2. **Tudo é estruturado.** Inputs e outputs seguem schemas tipados. Nada de "passa o texto que o próximo entende".
3. **Tudo é versionado.** Schema de cada agente tem versão; cliente declara qual versão usa.
4. **Tudo é logado.** Cada execução vira registro permanente.
5. **Tudo tem tenant.** `tenant_id` é obrigatório em toda chamada.
6. **Idempotência onde faz sentido.** Configurador publicando campanha tem `idempotency_key`; Copywriter gerando texto não precisa.
7. **Falha explícita.** Agente nunca retorna "não consegui"; retorna estrutura de erro com código padronizado.

### 3.2 Envelope de chamada (request)

Toda invocação de agente segue este envelope:

```typescript
interface AgentInvocation {
  // Identificação
  invocation_id: string;                  // UUID gerado pelo orquestrador
  agent_name: string;                     // 'estrategista', 'copywriter', ...
  agent_version: string;                  // ex: 'estrategista.v1.2'

  // Contexto obrigatório
  tenant_id: string;
  project_id: string;
  user_id?: string;                       // quem disparou (humano ou system)
  triggered_by: 'user' | 'orchestrator' | 'sentinel' | 'schedule';

  // Correlação
  workflow_id?: string;                   // se faz parte de workflow multi-etapa
  parent_invocation_id?: string;          // se foi disparado por outro agente (via orquestrador)
  campaign_id?: string;                   // se contexto é uma campanha específica

  // Idempotência (opcional, depende do agente)
  idempotency_key?: string;

  // Payload específico do agente
  input: Record<string, any>;             // schema definido por agente (ver seção 4)

  // Metadados
  timestamp: string;                      // ISO 8601
  trace_id?: string;                      // para distributed tracing
}
```

### 3.3 Envelope de resposta (response)

```typescript
interface AgentResponse {
  invocation_id: string;
  agent_name: string;
  agent_version: string;

  // Resultado
  status: 'success' | 'partial' | 'failed' | 'needs_human';
  output?: Record<string, any>;           // schema definido por agente
  error?: AgentError;

  // Observabilidade
  execution: {
    started_at: string;
    finished_at: string;
    latency_ms: number;
    model_used: string;
    tokens_input: number;
    tokens_output: number;
    cost_usd: number;
  };

  // Próximas ações sugeridas (opcional, alguns agentes preenchem)
  suggested_next_actions?: SuggestedAction[];

  // Logs adicionais (debug)
  trace?: Record<string, any>;
}

interface AgentError {
  code: string;                           // ver catálogo abaixo
  message: string;
  retryable: boolean;
  retry_after_seconds?: number;
  details?: any;
}
```

### 3.4 Catálogo de códigos de erro

Códigos padronizados entre todos os agentes:

| Código | Significado | Retryable |
|--------|-------------|-----------|
| `MODEL_ERROR` | Erro do provider (Anthropic API) | sim |
| `MODEL_TIMEOUT` | Timeout na chamada ao modelo | sim |
| `INVALID_INPUT` | Input não passa no schema | não |
| `MISSING_CONTEXT` | Falta contexto obrigatório (ex.: Big Flux não aprovado) | não |
| `POLICY_VIOLATION` | Output do agente viola política (ex.: copy proibida) | não |
| `BLAST_RADIUS_EXCEEDED` | Ação proposta excede o que o agente pode fazer sozinho | não |
| `TENANT_QUOTA_EXCEEDED` | Tenant atingiu cap de custo/uso | não |
| `ADAPTER_ERROR` | Erro em chamada externa (Meta/Google) — só Configurador e Sentinela | depende |
| `VALIDATION_FAILED` | Output gerado não passa em validação determinística pós-modelo | sim (com correção) |
| `HUMAN_REQUIRED` | Decisão fora do escopo do agente; precisa de humano | não |

### 3.5 Modos de invocação

**Modo síncrono (request-response):** padrão para agentes rápidos (Copywriter, Auditor, Estrategista). Orquestrador aguarda resposta.

**Modo assíncrono (job):** padrão para agentes longos (Big Flux Architect demora 30-90s; Analista produzindo retrospectiva mensal pode demorar). Orquestrador recebe `job_id`, faz polling ou recebe webhook.

**Modo streaming:** padrão para ORACULO (conversação). Resposta vem por chunks via Server-Sent Events ou WebSocket.

Cada agente declara seu modo na seção 4. FBR deve suportar os três modos no pool.

### 3.6 Logging obrigatório

Toda execução, sem exceção, gera registro em `agent_executions`:

```sql
CREATE TABLE agent_executions (
  invocation_id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  agent_name TEXT NOT NULL,
  agent_version TEXT NOT NULL,
  workflow_id UUID,
  parent_invocation_id UUID,
  campaign_id UUID,

  triggered_by TEXT NOT NULL,
  user_id UUID,

  status TEXT NOT NULL,
  input JSONB NOT NULL,
  output JSONB,
  error JSONB,

  started_at TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ,
  latency_ms INTEGER,
  model_used TEXT,
  tokens_input INTEGER,
  tokens_output INTEGER,
  cost_usd NUMERIC(10, 4),

  trace_id TEXT,
  raw_trace JSONB
);

CREATE INDEX idx_executions_tenant_time ON agent_executions(tenant_id, started_at DESC);
CREATE INDEX idx_executions_workflow ON agent_executions(workflow_id);
CREATE INDEX idx_executions_campaign ON agent_executions(campaign_id);
ALTER TABLE agent_executions ENABLE ROW LEVEL SECURITY;
```

### 3.7 Memória compartilhada e contexto

Agentes operacionais **não têm memória própria**. Eles são stateless. O Orquestrador é responsável por:
- Carregar o contexto relevante antes de chamar o agente.
- Passar tudo no `input`.
- Persistir o output onde os próximos agentes possam consultar.

**ORACULO é exceção:** mantém histórico de conversa por `tenant_id + user_id + context_scope` (ver seção 6).

**Knowledge base compartilhada:** todos os agentes podem ler de uma KB centralizada (ver seção 7), mas com escopo: KB global (todos os tenants) vs. KB tenant-específica.

---

## 4. Especificação detalhada por agente

Para cada agente: papel, modelo, modo de invocação, schema de input/output, prompt system base, blast radius, critérios de qualidade.

---

### 4.1 Agent #1 — Big Flux Architect

**Papel:** Gerar o Big Flux Document a partir do report do board e contexto do tenant.

**Onde atua:** Módulo de Marketing (Parte 1).

**Modelo:** `claude-opus-4-7`

**Modo:** Assíncrono (job). Latência típica: 30-90s.

**Quando é invocado:**
- Manualmente pelo usuário ("Gerar Big Flux").
- Por trigger quando `metadata.marketing_strategy` é atualizado.
- Por solicitação de revisão (nova versão).

**Input schema:**

```typescript
interface BigFluxArchitectInput {
  tenant_context: {
    tenant_id: string;
    business_name: string;
    business_segment: string;             // ex: 'ecommerce_fisico', 'saas', 'infoproduto'
    business_model: string;
    size_estimate: string;                // small | medium | large
    explicit_constraints: {
      budget_cap_monthly?: number;
      forbidden_platforms?: string[];
      sensitive_categories?: string[];    // saúde, finanças, etc.
    };
  };

  board_report: {
    raw_markdown: string;                 // report original do board
    structured: {                         // sanitizado (ver Parte 1)
      marketing_strategy: any;
      lead_generation_strategy: any;
    };
    report_version_id: string;
  };

  history: {
    previous_big_flux?: {
      version: number;
      structured_data: any;               // último Big Flux aprovado
    };
    campaign_results_summary?: string;    // resumo qualitativo de performance histórica
  };

  generation_params: {
    locale: string;                       // 'pt-BR' default
    output_format: 'markdown_and_json';
  };
}
```

**Output schema:**

```typescript
interface BigFluxArchitectOutput {
  big_flux: {
    markdown_content: string;             // documento completo (template da Parte 1, seção 3.2)
    structured_data: any;                 // JSON paralelo (Parte 1, seção 3.3)
    executive_summary: string;
  };

  generation_notes: {
    pending_items: string[];              // pontos marcados como "[Pendente Board]"
    assumptions_made: string[];           // suposições explícitas
    quality_self_assessment: number;      // 0-1 (modelo avalia próprio output)
  };

  validation_targets: {                   // o que a validação determinística vai checar
    expected_phases: string[];
    required_numeric_fields: string[];
  };
}
```

**Prompt system base:**

Ver Parte 1, seção 5. Resumo: persona "Big Flux Architect", contexto do tenant, report sanitizado, histórico, template obrigatório das 12 fases, princípios (coerência, quantificação, realismo, execução, compliance, não inventar dados).

**Pós-processamento determinístico (responsabilidade do orquestrador, não do agente):**
- Parsing do MD em JSON.
- Validação: todas as 12 fases presentes; campos numéricos críticos preenchidos (CAC, LTV, ticket); coerência (LTV > CAC, margem positiva).
- Se falha → reinvocar agente com feedback estruturado (até 2 retries).

**Blast radius:** N/A. Big Flux é sempre rascunho até aprovação humana.

**Critérios de qualidade:**
- Taxa de aprovação na primeira geração: ≥70%.
- Taxa de edição humana média: <30% das seções.
- Custo médio por geração: <US$ 1.00.

---

### 4.2 Agent #2 — Estrategista

**Papel:** Propor estrutura de campanha alinhada ao Big Flux.

**Onde atua:** Sub-módulo de Tráfego Pago.

**Modelo:** `claude-sonnet-4-6`

**Modo:** Síncrono. Latência típica: 5-15s.

**Quando é invocado:**
- Início do wizard de nova campanha (Etapa 1).
- Quando gestor pede "alternativa" para uma proposta.
- Quando Big Flux muda e há campanhas precisando reavaliação.

**Input schema:**

```typescript
interface EstrategistaInput {
  tenant_id: string;
  big_flux_constraints: TrafficConstraints;  // do Big Flux atual

  briefing: {
    objective: string;                    // 'sales', 'leads', 'app_install', 'awareness'
    product_or_offer: string;             // ID ou descrição
    target_audience_override?: string;    // se gestor quer público diferente do default
    timeframe: { start: string; end?: string };
    desired_budget?: number;              // se gestor já tem em mente
    desired_platform?: 'meta' | 'google' | 'both';
  };

  historical_context?: {
    recent_campaigns_summary: string;     // o que rodou recentemente
    learnings: string[];                  // aprendizados do tenant
  };
}
```

**Output schema:**

```typescript
interface EstrategistaOutput {
  proposal: {
    recommended_platform: 'meta' | 'google' | 'multi';
    campaign_type: string;                // 'conversion', 'leads', 'pmax', 'asc', etc.
    structure: {
      campaign_name: string;              // já com naming convention aplicada
      ad_sets: Array<{
        name: string;
        audience: AudienceSpec;
        daily_budget: number;
        placements: string[];
        optimization_event: string;
      }>;
    };
    kpis_alvo: {
      cac_alvo: number;
      roas_alvo: number;
      ctr_minimo: number;
    };
    estimated_validation_period_days: number;
  };

  rationale: string;                      // explicação da escolha (vai ao gestor + ORACULO)

  alternatives?: AlternativeProposal[];   // 1-2 propostas alternativas (opcional)

  flags: {                                // sinalizações importantes
    risks: string[];
    assumptions: string[];
  };
}
```

**Prompt system base (esqueleto):**

```
Você é o Estrategista de Tráfego Pago do Builder Business. Sua missão
é propor a melhor estrutura de campanha para o briefing recebido,
SEMPRE respeitando os limites e diretrizes do Big Flux do tenant.

Princípios:
1. Nunca proponha algo fora do Big Flux. Se o briefing pede algo
   incompatível, sinalize em "flags.risks".
2. Justifique cada escolha. Gestor precisa entender o porquê.
3. Quantifique tudo que der.
4. Aplique naming convention do tenant.
5. Considere canibalização ao desenhar audiências.
6. Para platforms suportadas mas com restrições do Big Flux (ex.: TikTok
   vetada), não proponha.

Big Flux constraints atuais:
[INSERIR objeto TrafficConstraints]

Histórico do tenant:
[INSERIR se houver]

Briefing:
[INSERIR]

Responda APENAS com o JSON do output schema, sem preâmbulo.
```

**Blast radius:** Nenhum — o Estrategista apenas propõe. Toda proposta passa por gestor antes de qualquer execução.

**Critérios de qualidade:**
- Conformidade com Big Flux: 100% (Auditor verifica).
- Taxa de aceitação direta pelo gestor: >60%.
- Latência: <15s no p95.

---

### 4.3 Agent #3 — Copywriter

**Papel:** Gerar hooks, headlines, descriptions, primary text.

**Onde atua:** Sub-módulo de Tráfego Pago (Etapa 3).

**Modelo:** `claude-sonnet-4-6`

**Modo:** Síncrono. Latência típica: 5-10s.

**Quando é invocado:**
- Geração inicial de copy para campanha nova.
- Geração de variações ("me dá mais 5 hooks com ângulo X").
- Reescrita de copy reprovada por política.

**Input schema:**

```typescript
interface CopywriterInput {
  tenant_id: string;
  big_flux_constraints: {
    angulos_venda: string[];
    tom_de_voz: string;
    restricoes_compliance: string[];
    product_or_offer_description: string;
  };

  request: {
    type: 'hooks' | 'headlines' | 'descriptions' | 'primary_text' | 'all';
    angulo: string;                       // qual ângulo focar
    quantity: number;                     // quantas variações
    platform: 'meta' | 'google';          // muda formato
    placement?: string;                   // 'feed', 'stories', 'search', etc.
    max_chars?: number;                   // restrição da plataforma
    language: string;                     // 'pt-BR'
    avoid?: string[];                     // palavras/conceitos a evitar
  };

  reference_winners?: string[];           // copys vencedoras anteriores do tenant
}
```

**Output schema:**

```typescript
interface CopywriterOutput {
  variations: Array<{
    id: string;                           // UUID local
    text: string;
    angulo: string;
    char_count: number;
    estimated_compliance: 'ok' | 'risk' | 'block';  // self-assessment
    notes?: string;
  }>;

  rationale_summary: string;              // explicação geral da abordagem
}
```

**Prompt system base (esqueleto):**

```
Você é o Copywriter de Tráfego Pago do Builder Business. Produza copy
de alta performance respeitando o tom, ângulos e restrições do Big Flux.

Princípios:
1. Hooks DEVEM funcionar nos primeiros 3 segundos.
2. Use vocabulário do nicho — não generalidades.
3. Evite gatilhos que violam políticas (Meta: discriminação, promessas
   absolutas, "você"; Google: pontuação excessiva, palavras proibidas).
4. Cada variação é DIFERENTE em estrutura, não só em palavras.
5. Se a restrição de compliance pede atenção (saúde, finanças,
   emagrecimento), seja conservador e marque "risk" em estimated_compliance.

Big Flux constraints:
[INSERIR]

Pedido:
[INSERIR]

Responda APENAS com o JSON do output schema.
```

**Validação pós-modelo (orquestrador):**
- Char count dentro do limite da plataforma.
- Regex para detectar termos proibidos óbvios (lista por categoria).
- Estimated_compliance = 'block' → variação é descartada antes de mostrar ao gestor.

**Blast radius:** Nenhum — copy é proposta. Sempre passa por gestor + Auditor antes de publicação.

**Critérios de qualidade:**
- Taxa de aceitação sem edição: >40%.
- Taxa de reprovação por política após publicação: <5%.

---

### 4.4 Agent #4 — Diretor de Criativo

**Papel:** Gerar briefings de criativo (vídeo, imagem, formato).

**Onde atua:** Sub-módulo de Tráfego Pago (Etapa 3).

**Modelo:** `claude-sonnet-4-6`

**Modo:** Síncrono. Latência típica: 5-15s.

**Quando é invocado:**
- Geração inicial de briefings para uma campanha nova.
- Quando Sentinela/Analista detectam fadiga criativa e Otimizador pede "novos criativos".
- Geração de variações com novo ângulo.

**Input schema:**

```typescript
interface DiretorCriativoInput {
  tenant_id: string;
  big_flux_constraints: {
    angulos_venda: string[];
    tom_de_voz: string;
    formatos_prioritarios: string[];
    tipos_criativo: string[];             // UGC, demonstração, etc.
    diretrizes_hook: string;
    restricoes_compliance: string[];
  };

  request: {
    quantity: number;                     // quantos briefings
    angulos_focar: string[];
    formato: '9:16' | '1:1' | '16:9' | 'mix';
    tipo_preferencial?: string;
    duracao_seg?: number;                 // para vídeo
    referencias?: string[];               // URLs ou descrições de criativos vencedores
  };

  product_or_offer: {
    nome: string;
    descricao: string;
    publico_alvo: string;
    proposta_unica: string;
  };
}
```

**Output schema:**

```typescript
interface DiretorCriativoOutput {
  briefings: Array<{
    id: string;
    titulo: string;                       // ex: "UGC — depoimento sobre transformação"
    angulo: string;
    formato: string;
    duracao_seg?: number;
    tipo: string;                         // UGC, demonstração, PAS, etc.

    hook_visual: string;                  // o que aparece nos primeiros 3s
    hook_textual: string;                 // texto sobreposto inicial
    estrutura: Array<{
      tempo_seg?: number;
      descricao_cena: string;
      narracao_ou_texto: string;
    }>;
    cta_final: string;

    referencias_visuais?: string[];       // sugestões de inspiração
    notas_producao: string[];             // dicas práticas (iluminação, ambiente, etc.)
    compliance_warnings?: string[];
  }>;
}
```

**Prompt system base:** segue padrão dos anteriores; foco em criativos para perfomance, não para branding.

**Blast radius:** Nenhum — briefing é input para produção externa (estúdio, freelancer, IA generativa). Não gera ação automática.

**Critérios de qualidade:**
- Briefings devem ser executáveis: leitor não-criativo (gestor) consegue entender e produzir.
- Diversidade de ângulos atendida.

---

### 4.5 Agent #5 — Configurador

**Papel:** Montar a estrutura técnica e publicar via adapter.

**Onde atua:** Sub-módulo de Tráfego Pago (Etapas 2, 4, 5, 7).

**Modelo:** `claude-sonnet-4-6` (raciocínio) + código (execução via adapter).

**Modo:** Síncrono. Latência típica: 10-30s (inclui chamadas ao adapter externo).

**Quando é invocado:**
- Verificação de tracking (Etapa 2).
- Montagem da estrutura técnica (Etapas 4-5).
- Publicação efetiva (Etapa 7).
- Mudanças configuração de campanhas ativas.

**Input schema (varia por sub-tarefa):**

```typescript
interface ConfiguradorInput {
  tenant_id: string;
  platform: 'meta' | 'google';
  task: 'verify_tracking' | 'build_spec' | 'publish' | 'update' | 'pause' | 'unpause';

  // Dependendo da task, payload muda
  payload: {
    // Para build_spec:
    proposal?: EstrategistaOutput['proposal'];
    copy_variations?: CopywriterOutput['variations'];
    creative_assets?: CreativeAsset[];

    // Para publish:
    campaign_id?: string;
    confirmation_token?: string;          // gestor confirmou publicação

    // Para update:
    changes?: Partial<CampaignSpec>;
  };

  big_flux_constraints: TrafficConstraints;

  idempotency_key?: string;
}
```

**Output schema:**

```typescript
interface ConfiguradorOutput {
  task: string;
  result: {
    // Para verify_tracking:
    tracking_status?: {
      pixel_active: boolean;
      capi_active: boolean;
      events_firing: { [event: string]: boolean };
      issues: Issue[];
    };

    // Para build_spec:
    campaign_spec?: CampaignSpec;         // estrutura completa interna

    // Para publish:
    external_id?: string;                 // ID na plataforma
    publication_status?: 'published' | 'pending_review' | 'failed';
    preview_url?: string;

    // Para update/pause/unpause:
    success?: boolean;
    new_state?: string;
  };

  adapter_response_raw?: any;             // resposta crua para auditoria
  warnings?: string[];
}
```

**Detalhe crítico:** Configurador é o único agente que **invoca o adapter** (Meta API, Google API). O raciocínio LLM é usado para:
- Mapear a `EstrategistaOutput` em `CampaignSpec` da plataforma.
- Interpretar erros do adapter e propor correção.
- Decidir qual evento de otimização escolher dada a complexidade.

A execução em si (chamada à API) é código, não LLM.

**Blast radius:**
- Verificar tracking: ilimitado.
- Build spec (sem publicar): ilimitado.
- Publicar: **sempre humano confirma** (via `confirmation_token`).
- Update budget: dentro do limite do Big Flux (`max_increase_pct`).
- Pause: permitido se for por trigger do Sentinela ou ação do Otimizador.

**Critérios de qualidade:**
- Taxa de publicação bem-sucedida na primeira tentativa: >90%.
- Erros de adapter capturados e traduzidos para issues acionáveis: 100%.

---

### 4.6 Agent #6 — Auditor

**Papel:** Validar pré-publicação contra Big Flux e políticas.

**Onde atua:** Sub-módulo de Tráfego Pago (Etapa 6, mas também é chamado em outras transições críticas).

**Modelo:** `claude-haiku-4-5` (a maioria do trabalho é determinístico; Haiku para nuances semânticas como "essa copy parece violar política?").

**Modo:** Síncrono. Latência típica: 3-8s.

**Quando é invocado:**
- Gate da Etapa 6 (pré-publicação).
- Sempre que Big Flux muda — para verificar campanhas ativas.
- Antes de qualquer escala (>X% de aumento de budget).

**Input schema:**

```typescript
interface AuditorInput {
  tenant_id: string;
  campaign_spec: CampaignSpec;            // estrutura completa proposta
  big_flux_constraints: TrafficConstraints;
  audit_scope: 'pre_publication' | 'big_flux_change' | 'pre_scale';
}
```

**Output schema:**

```typescript
interface AuditorOutput {
  passed: boolean;
  issues: Array<{
    level: 'block' | 'warn' | 'info';
    category: 'tracking' | 'copy' | 'creative' | 'budget' | 'targeting' | 'naming' | 'compliance' | 'big_flux_conflict';
    message: string;
    affected_element?: string;            // ID do ad/conjunto/campanha
    suggested_fix?: string;
  }>;

  checklist_summary: {
    total_checks: number;
    passed_checks: number;
    failed_checks: number;
  };
}
```

**Nota arquitetural importante:** A MAIORIA dos checks do Auditor é determinística (código). O LLM Haiku entra apenas para:
- Avaliação semântica de copy ("isso parece promessa absoluta?").
- Avaliação de coerência entre criativo e oferta.
- Sugestões em linguagem natural quando o check falha.

Implementação sugerida: pipeline híbrida onde código roda 80% dos checks; o que sobra (semântico) vai pro Haiku.

**Blast radius:** N/A — Auditor não executa ação. Apenas aprova ou bloqueia.

**Critérios de qualidade:**
- Taxa de falso negativo (passou e deu problema na plataforma): <2%.
- Taxa de falso positivo (bloqueou desnecessariamente): <10%.
- Latência: <8s no p95.

---

### 4.7 Agent #7 — Analista

**Papel:** Gerar insights, análise de causa raiz, briefings diários, retrospectivas.

**Onde atua:** Sub-módulo de Tráfego Pago (Etapas 8, 11).

**Modelo:** `claude-sonnet-4-6`

**Modo:** Misto:
- Briefing diário: assíncrono (job agendado).
- Análise de causa raiz: síncrono.
- Retrospectiva mensal: assíncrono.

**Quando é invocado:**
- Cron diário (job agendado por tenant).
- Por solicitação manual ("por que o CAC subiu?").
- Após contingência ser resolvida.
- Encerramento de campanha (gera retrospectiva).

**Input schema:**

```typescript
interface AnalistaInput {
  tenant_id: string;
  scope: 'daily_briefing' | 'root_cause' | 'campaign_retrospective' | 'monthly_review';

  data_window: {
    start: string;
    end: string;
  };

  campaigns_in_scope: string[];           // IDs de campanhas a analisar

  metrics_snapshots: CampaignMetricsSnapshot[];  // dados pré-agregados pelo orquestrador
  recent_actions: CampaignAction[];       // ações recentes (humanas ou agentes)

  // Para root_cause:
  focus_question?: string;                // "por que CAC subiu 40%?"
  focus_metric?: string;
}
```

**Output schema:**

```typescript
interface AnalistaOutput {
  scope: string;

  // Para daily_briefing:
  daily_briefing?: {
    headline: string;                     // resumo de 1 linha
    summary: string;                      // 3-5 linhas
    highlights: Array<{
      campaign_id: string;
      type: 'positive' | 'concern' | 'anomaly';
      message: string;
    }>;
    suggested_actions: SuggestedAction[];
  };

  // Para root_cause:
  root_cause_analysis?: {
    finding: string;                      // o que mudou
    when_started: string;                 // quando começou
    where: string;                        // onde está
    hypotheses: Array<{
      hypothesis: string;
      probability: number;                // 0-1
      supporting_evidence: string[];
      recommended_action: string;
    }>;
  };

  // Para campaign_retrospective:
  retrospective?: {
    overall_assessment: string;
    what_worked: string[];
    what_didnt: string[];
    learnings_for_next: string[];
    metrics_summary: any;
  };

  knowledge_base_updates?: Array<{        // aprendizados a persistir na KB do tenant
    insight: string;
    confidence: number;
    scope: 'tenant' | 'global_recommend';
  }>;
}
```

**Blast radius:** Nenhum — Analista produz insight, não ação.

**Critérios de qualidade:**
- Briefings diários devem ser acionáveis (>60% têm pelo menos uma sugestão concreta).
- Análise de causa raiz: hipótese top-1 acerta em >50% dos casos.

---

### 4.8 Agent #8 — Otimizador

**Papel:** Propor ações de otimização (pausar, escalar, redistribuir).

**Onde atua:** Sub-módulo de Tráfego Pago (Etapas 8-9).

**Modelo:** `claude-sonnet-4-6`

**Modo:** Síncrono. Latência típica: 5-15s.

**Quando é invocado:**
- Após análise diária do Analista (encadeado).
- Por solicitação manual do gestor.
- Quando Sentinela sinaliza anomalia não-crítica.

**Input schema:**

```typescript
interface OtimizadorInput {
  tenant_id: string;
  campaign_id: string;

  big_flux_constraints: TrafficConstraints;
  current_state: {
    metrics_snapshots: CampaignMetricsSnapshot[];
    spec: CampaignSpec;
    days_running: number;
    days_in_learning: number;
  };

  analyst_insights?: AnalistaOutput;      // se está encadeado com Analista

  scope: 'pause' | 'scale' | 'redistribute' | 'creative_refresh' | 'general';
  blast_radius_config: BlastRadiusConfig; // limites do tenant
}
```

**Output schema:**

```typescript
interface OtimizadorOutput {
  proposed_actions: Array<{
    action_id: string;
    action_type: 'pause' | 'scale_up' | 'scale_down' | 'duplicate' | 'creative_refresh' | 'budget_change' | 'audience_change';
    target: {                             // o que será afetado
      level: 'campaign' | 'ad_set' | 'ad';
      external_id: string;
    };
    payload: any;                         // detalhes (novo budget, novo criativo, etc.)
    rationale: string;
    expected_impact: string;
    confidence: number;                   // 0-1
    risk_level: 'low' | 'medium' | 'high';
    within_blast_radius: boolean;         // pode rodar sozinho?
    requires_human_approval: boolean;
    minimum_data_satisfied: boolean;      // critério estatístico ok?
  }>;

  no_action_recommended_reasons?: string[];  // se decidiu não propor nada
}
```

**Blast radius (default; configurável por tenant):**

| Ação | Automático? |
|------|-------------|
| Pausar criativo individual | ✓ |
| Pausar ad set com gasto baixo + zero conversão | ✓ |
| Pausar campanha | ✗ |
| Aumentar budget ≤ 20% | ✓ (com intervalo mínimo) |
| Aumentar budget > 20% | ✗ |
| Diminuir budget ≤ 50% | ✓ |
| Diminuir budget > 50% | ✗ |
| Duplicar ad set | ✗ |
| Trocar criativo (substituição direta) | ✓ |
| Adicionar nova audiência | ✗ |

**Critérios de qualidade:**
- Ações dentro do blast radius: nenhuma deve regredir performance (medido via A/B quando possível).
- Aprovação humana de ações fora do blast radius: >70% (significa que o agente propõe coisas que fazem sentido).

---

### 4.9 Agent #9 — Sentinela

**Papel:** Monitorar 24/7, detectar anomalias, disparar contingência.

**Onde atua:** Sub-módulo de Tráfego Pago (Etapa 10 e transversal).

**Modelo:** `claude-haiku-4-5` (apenas para classificação semântica de alertas e composição de notificação; detecção em si é código puro).

**Modo:** Background job. Cadências:
- Métricas básicas: a cada 30 minutos.
- Conversões: a cada 1 hora.
- Health da conta: a cada 6 horas.
- Real-time via webhooks quando disponível.

**Quando é invocado:**
- Agendado (cron interno).
- Por webhook da plataforma (eventos como rejeição de anúncio, bloqueio de conta).

**Input schema:**

```typescript
interface SentinelaInput {
  tenant_id: string;
  scope: 'metrics_check' | 'health_check' | 'webhook_event';

  // Para metrics_check / health_check:
  campaigns_to_check?: string[];          // IDs (ou null = todas ativas)

  // Para webhook_event:
  event?: {
    source: 'meta' | 'google';
    event_type: string;
    payload: any;
  };

  trigger_rules: TriggerRule[];           // regras do Big Flux Fase 9
  recent_dedup_window: ContingencyEvent[];// para anti-flapping
}
```

**Output schema:**

```typescript
interface SentinelaOutput {
  detections: Array<{
    detection_id: string;
    severity: 'info' | 'warn' | 'critical';
    trigger_rule_id: string;
    campaign_id?: string;
    description: string;
    context_snapshot: any;

    playbook_to_execute?: string;         // se há playbook automático
    suggested_action?: SuggestedAction;
    requires_human_immediately: boolean;
  }>;

  no_detection_summary?: string;          // "rodou, tudo ok"
}
```

**Arquitetura especial do Sentinela:**

Diferente dos outros agentes, Sentinela é majoritariamente **código com pinch de LLM**:

1. **Detecção (código):** consulta `campaign_metrics_snapshots`, aplica `TriggerRule[]` (expressões avaliadas em código), gera lista de detections.
2. **Classificação semântica (Haiku):** apenas para casos onde a regra é ambígua (ex.: webhook do Meta dizendo "ad disapproved with policy reason X" — Haiku traduz para categoria conhecida).
3. **Composição de notificação (Haiku):** gera mensagem humana para alertar o gestor.

**Playbooks de contingência:**

Cada `TriggerRule` aponta para um playbook. Playbook é código (não LLM):

```typescript
const playbooks = {
  'account_blocked': async (context) => {
    // 1. Pausa todas as campanhas da conta bloqueada
    // 2. Notifica gestor com urgência
    // 3. Se BM reserva existe: prepara failover (não executa sem humano)
    // 4. Registra contingency_event
  },
  'cac_explosion': async (context) => {
    // 1. Pausa ad set com pior performance
    // 2. Reduz budget total em 50%
    // 3. Solicita análise de causa raiz ao Analista
    // 4. Notifica gestor
  },
  // ...
};
```

**Blast radius:**
- Detectar e notificar: sempre permitido.
- Executar playbook severity=critical com playbook pré-definido no Big Flux: permitido.
- Executar playbook severity≠critical: notifica e aguarda.

**Critérios de qualidade:**
- Falso negativo (anomalia real não detectada): <1%.
- Falso positivo (alerta sem necessidade): <15% (tolerado mais alto que falso negativo).
- Latência de detecção crítica: <5 min do evento ao alerta.

---

### 4.10 Agent #10 — ORACULO

**Papel:** Assistente conversacional contextualizado (transversal).

**Onde atua:** Módulo de Marketing + Sub-módulo de Tráfego Pago (todas as telas).

**Modelo:** `claude-opus-4-7`

**Modo:** Streaming (Server-Sent Events ou WebSocket).

**Quando é invocado:**
- Usuário envia mensagem no chat.
- Sistema dispara ORACULO em modo "proativo" (configurável, baixa frequência).

#### 4.10.1 Modelo de contexto do ORACULO

O contexto carregado depende de **onde o usuário está**:

| Tela | Contexto carregado |
|------|---------------------|
| Big Flux (revisão) | Big Flux atual + report do board + Big Flux anteriores aprovados |
| Dashboard de Tráfego | Big Flux atual + estado agregado das campanhas (resumo) |
| Detalhe de Campanha | Big Flux + estado completo da campanha + últimas ações + métricas recentes |
| Wizard de Nova Campanha | Big Flux + briefing em construção + propostas dos agentes |
| Histórico/Auditoria | Big Flux + eventos do período em consulta |
| Configuração de Contas | Estado das credenciais + health checks |
| Playbooks | Triggers do Big Flux + histórico de contingências |

#### 4.10.2 Input schema

```typescript
interface OraculoInput {
  tenant_id: string;
  user_id: string;

  conversation_id: string;                // mantém histórico por scope
  context_scope: {
    module: 'marketing' | 'traffic';
    page: string;                         // ex: 'campaign_detail'
    entity_id?: string;                   // ex: campaign_id se está em detail
  };

  user_message: string;

  // Contexto carregado pelo orquestrador (depende do scope)
  loaded_context: {
    big_flux?: any;
    campaign?: any;
    metrics_recent?: any;
    recent_actions?: any;
    knowledge_base_excerpts?: string[];
  };

  conversation_history: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>;
}
```

#### 4.10.3 Output schema

```typescript
interface OraculoOutput {
  message: string;                        // resposta em texto (streamed)

  // Ações sugeridas que o usuário pode disparar via UI
  suggested_actions?: Array<{
    label: string;
    action_type: 'invoke_agent' | 'open_screen' | 'apply_edit' | 'export_data';
    payload: any;
  }>;

  // Citações de fontes (Big Flux, métricas, KB)
  citations?: Array<{
    source: string;                       // 'big_flux:phase_3' | 'metrics:last_7d' | 'kb:meta_policies'
    excerpt: string;
  }>;

  // Indicador se ORACULO precisa de mais informação
  needs_clarification?: {
    question: string;
    options?: string[];
  };
}
```

#### 4.10.4 Capacidades do ORACULO

**No Módulo de Marketing (Parte 1):**
- Explicar decisões do Big Flux ("por que o CAC alvo é R$ 80?").
- Sugerir reescritas de seções.
- Comparar versões do Big Flux.
- Educar sobre conceitos (EMQ, CAPI, atribuição, etc.).
- Desafiar premissas ("esse LTV é realista?").

**No Sub-módulo de Tráfego (Parte 2):**
- Explicar métricas em tempo real.
- Análise de causa raiz conversacional.
- Sugerir ações (sempre referentes a ações que o Otimizador pode propor formalmente).
- Explicar por que um agente sugeriu certa ação.
- Tutorial contextual ("como funciona o Performance Max?").
- Ajudar a montar briefing antes de pedir aos agentes.

#### 4.10.5 Limites do ORACULO

- **Não executa ações por conta própria.** Sugere; usuário aciona.
- **Não muda Big Flux diretamente.** Propõe edição; usuário aplica.
- **Não pode quebrar isolamento de tenant.** Mesmo em modo "super-admin", responde com dados agregados.
- **Não cita métricas que não foram carregadas em `loaded_context`.** Se usuário pergunta algo fora do scope, ORACULO solicita ao orquestrador carregar (próximo turno).
- **Não toma decisão estratégica fora do Big Flux.** Se usuário pergunta "devo lançar produto X?", ORACULO orienta a discutir no Módulo de Marketing.

#### 4.10.6 Prompt system base (esqueleto)

```
Você é ORACULO, assistente cognitivo especialista em marketing
digital, tráfego pago e estratégia de negócio do Builder Business.
Você atende UM usuário de UM tenant específico.

Seu papel:
- Esclarecer dúvidas técnicas e estratégicas.
- Explicar decisões tomadas por outros agentes ou pelo Big Flux.
- Sugerir ações que o usuário pode executar via UI.
- Educar sem ser condescendente.
- Desafiar premissas quando dados contradizem.

Princípios:
1. NUNCA invente dados. Só use o que está em loaded_context.
2. Se faltar contexto, peça clarificação ou solicite que orquestrador carregue mais.
3. NUNCA execute ações por conta própria — sugira via suggested_actions.
4. Respeite ISOLAMENTO de tenant — nunca mencione dados de outros.
5. Seja conciso. Respostas longas só quando o usuário pede aprofundamento.
6. Use vocabulário técnico de tráfego pago — usuário entende.
7. Cite fontes (Big Flux, métricas, KB) sempre que basear afirmação em dado.

Contexto atual:
- Tenant: [INSERIR]
- Onde o usuário está: [INSERIR scope]
- Big Flux carregado: [INSERIR resumo]
- Dados relevantes: [INSERIR loaded_context]

Histórico da conversa:
[INSERIR]

Mensagem do usuário:
[INSERIR]
```

#### 4.10.7 Critérios de qualidade

- Resposta tem citação quando afirma fato baseado em dado: 100%.
- Taxa de "ORACULO inventou dado": 0% (audit periódico).
- Tempo até primeiro token (streaming): <2s no p95.
- Taxa de uso de `suggested_actions` pelo usuário: >25% (sinaliza que sugestões são úteis).

---

## 5. Workflows multi-agente

Alguns fluxos do sistema envolvem múltiplos agentes encadeados. O Orquestrador (código, não agente) é responsável por coordenar esses workflows.

### 5.1 Workflow: Geração de Big Flux

```
1. Orquestrador recebe trigger
2. Carrega contexto do tenant + report do board
3. Invoca Big Flux Architect (Opus 4.7) → assíncrono
4. Recebe job_id; aguarda finalização (polling ou webhook)
5. Recebe BigFluxArchitectOutput
6. Roda validação determinística (parsing, completude, coerência numérica)
7. Se falhou: reinvoca com feedback (até 2 retries)
8. Se passou: persiste como draft em big_flux_documents
9. Notifica usuário responsável
```

### 5.2 Workflow: Nova campanha do zero

```
1. Gestor inicia wizard
2. Orquestrador carrega Big Flux current + briefing inicial
3. Invoca Estrategista → proposta
4. Gestor revisa, aceita/ajusta
5. Gate Etapa 1 (determinístico)
6. Invoca Configurador (task=verify_tracking)
7. Gate Etapa 2
8. Invoca Copywriter + Diretor de Criativo em paralelo
9. Gestor revisa output, produz criativos externamente, upload
10. Gate Etapa 3
11. Invoca Configurador (task=build_spec)
12. Gate Etapa 4
13. Invoca Configurador (task=build_spec finalização)
14. Gate Etapa 5
15. Invoca Auditor
16. Gate Etapa 6 (resultado do Auditor)
17. Mostra preview ao gestor
18. Gestor confirma → Configurador (task=publish)
19. Persiste estado; entra em janela de aprendizagem
```

### 5.3 Workflow: Otimização diária

```
1. Cron dispara por tenant (horário configurável)
2. Orquestrador coleta métricas das últimas 24h via adapters
3. Invoca Analista (scope=daily_briefing)
4. Recebe briefing + sugestões iniciais
5. Para cada sugestão relevante:
   a. Invoca Otimizador para refinar com blast radius
   b. Se within_blast_radius=true → executa via Configurador
   c. Se requires_human_approval=true → adiciona à fila de aprovações
6. Persiste briefing em campaign_actions (sem ações), notifica gestor
```

### 5.4 Workflow: Contingência crítica

```
1. Sentinela detecta evento crítico
2. Orquestrador consulta playbook associado no Big Flux Fase 9
3. Se playbook é automático (severity=critical, declarado no Big Flux):
   a. Executa playbook (código)
   b. Registra contingency_event
   c. Notifica gestor IMEDIATAMENTE (push, email, SMS conforme config)
4. Se playbook requer humano:
   a. Notifica gestor com proposta
   b. Aguarda decisão
5. Após resolução: invoca Analista (scope=root_cause)
6. Persiste aprendizado em knowledge_base
```

---

## 6. Memória, knowledge base e aprendizado

### 6.1 Memória de conversação (ORACULO)

ORACULO mantém histórico por `tenant_id + user_id + conversation_id`. Persistido em:

```sql
CREATE TABLE oracle_conversations (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  context_scope JSONB NOT NULL,           -- { module, page, entity_id }
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ,
  archived BOOLEAN DEFAULT false
);

CREATE TABLE oracle_messages (
  id UUID PRIMARY KEY,
  conversation_id UUID REFERENCES oracle_conversations(id),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  citations JSONB,
  suggested_actions JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  tokens_input INTEGER,
  tokens_output INTEGER,
  cost_usd NUMERIC(10, 4)
);

ALTER TABLE oracle_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE oracle_messages ENABLE ROW LEVEL SECURITY;
```

Janela de contexto enviada ao Opus 4.7: últimas 20 mensagens da conversa atual + summary se conversa muito longa.

### 6.2 Knowledge base — escopo global e tenant

Dois níveis:

**KB global (`scope='global'`):** playbooks da empresa, melhores práticas, documentação de políticas de plataforma, glossário, casos públicos. Atualizada pelo time de produto/marketing. Acessível a todos os tenants.

**KB tenant (`scope='tenant'`):** aprendizados específicos daquele business — copys vencedoras, criativos vencedores, audiências que funcionaram, gatilhos identificados, particularidades do segmento. Alimentada por:
- Aprendizado consolidado pelo Analista após retrospectivas.
- Anotações manuais do gestor.
- Padrões detectados em campanhas históricas.

```sql
CREATE TABLE knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL CHECK (scope IN ('global', 'tenant')),
  tenant_id UUID,                         -- NULL se global
  category TEXT NOT NULL,                 -- 'playbook', 'learning', 'reference', 'glossary'
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(1536),                 -- pgvector para busca semântica
  metadata JSONB,
  confidence NUMERIC(3,2),                -- 0-1, para aprendizados gerados por agente

  created_by UUID,
  created_by_agent TEXT,                  -- se foi gerado por agente
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,

  CHECK ((scope = 'global' AND tenant_id IS NULL) OR (scope = 'tenant' AND tenant_id IS NOT NULL))
);

CREATE INDEX idx_kb_scope_tenant ON knowledge_base(scope, tenant_id);
CREATE INDEX idx_kb_embedding ON knowledge_base USING ivfflat (embedding vector_cosine_ops);
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
```

### 6.3 Aprendizado contínuo (sem fine-tuning)

Os agentes não são fine-tuned. Aprendizado acontece via:
1. **Atualização da KB** com padrões observados.
2. **Evolução dos prompts** dos agentes (versionados).
3. **Ajuste de thresholds** em código (Sentinela, Otimizador).
4. **Feedback explícito** do usuário (botão "essa sugestão foi útil" → influencia ranking de propostas similares).

---

## 7. Versionamento de agentes e prompts

### 7.1 Versionamento

Cada agente tem:
- **Nome:** ex.: `estrategista`.
- **Versão:** semver-like (`v1.2.0`).
- **Prompt:** arquivo versionado em repositório (ex.: `prompts/estrategista/v1.2.0.txt`).
- **Schema de I/O:** versionado em código (TypeScript types ou JSON Schema).

Toda invocação registra qual versão foi usada (`agent_version` no envelope).

### 7.2 Deploy de nova versão

1. Nova versão é desenvolvida em ambiente de staging.
2. **Eval suite** roda contra conjunto de casos de teste por agente (~30-100 casos por agente).
3. Comparação A/B com versão atual em métricas-chave.
4. Se melhora: rollout gradual (canary 5% → 25% → 100%).
5. Versão antiga fica disponível por 30 dias para rollback.

### 7.3 Eval suite por agente

Cada agente tem suite mínima:
- Big Flux Architect: ~50 casos cobrindo segmentos diferentes.
- Estrategista: ~30 casos com briefings variados.
- Copywriter: ~50 casos por ângulo principal.
- Auditor: ~100 casos (positivos e negativos).
- Otimizador: ~30 cenários simulados.
- ORACULO: ~80 perguntas de usuários reais (anonimizadas).

Métricas avaliadas variam por agente; documentadas junto com cada eval suite.

---

## 8. Custos e quotas

### 8.1 Custo por agente (estimativa)

Baseado em modelos atuais e uso típico:

| Agente | Custo por invocação | Frequência típica/tenant/mês | Custo total/tenant/mês |
|--------|---------------------|-------------------------------|------------------------|
| Big Flux Architect | US$ 0.80 | 2-4 | US$ 1.60-3.20 |
| Estrategista | US$ 0.05 | 20-50 | US$ 1.00-2.50 |
| Copywriter | US$ 0.04 | 50-150 | US$ 2.00-6.00 |
| Diretor de Criativo | US$ 0.05 | 20-60 | US$ 1.00-3.00 |
| Configurador | US$ 0.06 | 30-80 | US$ 1.80-4.80 |
| Auditor | US$ 0.02 | 50-150 | US$ 1.00-3.00 |
| Analista | US$ 0.10 | 30 (daily) + 5 (root cause) | US$ 3.50 |
| Otimizador | US$ 0.08 | 30-90 | US$ 2.40-7.20 |
| Sentinela | US$ 0.005 | 1440 (a cada 30min) | US$ 7.20 |
| ORACULO | US$ 0.10 | 50-200 | US$ 5.00-20.00 |

**Total estimado por tenant ativo: US$ 26 a US$ 60/mês.**

### 8.2 Quotas e degradação

Cada tenant tem cap mensal configurável (default sugerido: US$ 100). Ao atingir:
- 70%: aviso ao gestor.
- 90%: degradação suave — agentes mais caros (Opus) usam modelo menor onde possível.
- 100%: bloqueio de invocações não-críticas; Sentinela e Auditor continuam (segurança); demais ficam manuais.

### 8.3 Otimizações sugeridas

- **Caching de respostas** para inputs idênticos (raro mas acontece).
- **Compactação de contexto** para ORACULO em conversas longas.
- **Batch de Sentinela** — verificar várias campanhas em uma invocação.
- **Modelos menores** onde a qualidade não cai (Auditor majoritariamente em Haiku).

---

## 9. Integração com o pool da FBR — requisitos

Esta seção é o que vocês precisam para plugar no pool existente.

### 9.1 Capabilities esperadas do pool

O pool da FBR já deve suportar (se não suportar, precisa ser estendido):

- [ ] Invocação síncrona, assíncrona e streaming.
- [ ] Logging estruturado por execução (com `tenant_id`).
- [ ] Isolamento multi-tenant em logs e métricas.
- [ ] Versionamento de prompts e agentes.
- [ ] Suporte aos modelos: Opus 4.7, Sonnet 4.6, Haiku 4.5.
- [ ] Cap de custo por tenant.
- [ ] Eval suite com CI/CD.
- [ ] Schema de I/O tipado e validado.

### 9.2 Entregáveis da FBR para esta integração

- [ ] Onboarding dos 10 agentes no pool (config, prompts, schemas).
- [ ] Endpoints expostos para o sistema Builder Business chamar cada agente.
- [ ] Documentação de uso (como o time de dev do Builder invoca cada agente).
- [ ] Dashboards de saúde por agente (latência, taxa de erro, custo).
- [ ] Suporte a webhooks para invocações assíncronas (Big Flux Architect, Analista).
- [ ] Implementação dos modos streaming (ORACULO).
- [ ] Sandboxes por tenant para testes.

### 9.3 Critérios de aceitação por agente

Cada agente está "pronto" quando:
1. Schema de I/O implementado e validado.
2. Prompt v1 escrito e revisado por especialista de domínio.
3. Eval suite passa com taxa de sucesso ≥ critério mínimo (definido por agente).
4. Logging funcionando (toda invocação aparece em `agent_executions`).
5. Custo por invocação dentro do estimado (±30%).
6. Latência dentro do p95 esperado.
7. Documentação de uso publicada.

### 9.4 Ordem sugerida de implementação na FBR

**Sprint 1 (semanas 1-2):** Estrategista, Copywriter, Auditor (agentes "mais simples", validam o protocolo).

**Sprint 2 (semanas 3-4):** Big Flux Architect (mais complexo, modelo premium), Diretor de Criativo, Configurador (sem adapter ainda — só raciocínio).

**Sprint 3 (semanas 5-6):** Configurador integrado com MetaAdapter, Analista, Otimizador.

**Sprint 4 (semanas 7-8):** Sentinela com loop de monitoramento, ORACULO em todas as telas.

**Sprint 5 (semanas 9-10):** Eval suites completas, dashboards de saúde, ajustes finos.

Total: ~10 semanas. Pode rodar em paralelo com Ondas 2-3 da Parte 2 (Builder Business).

---

## 10. Governança e segurança

### 10.1 Princípios

- **Tenant isolation é sagrado.** Pool da FBR garante que agente nunca acessa dado de outro tenant. RLS obrigatório.
- **Logging não-repudiável.** Todo log é append-only. Não há deleção (apenas archive com retenção configurada).
- **Sem persistência de dados sensíveis em prompts.** Credenciais de plataforma nunca aparecem em prompt.
- **Audit trail completo.** Toda ação executada (humana ou automática) é rastreável.
- **Approval workflow.** Toda ação fora de blast radius requer aprovação humana com identidade registrada.

### 10.2 Dados sensíveis e PII

Agentes podem processar:
- Métricas de campanha (não sensíveis).
- Copy e criativos (não sensíveis).
- Estrutura de campanha (não sensível).

Agentes não devem processar:
- Tokens de acesso de plataforma (Meta/Google).
- Dados pessoais de leads (nome, e-mail, telefone) — esses ficam nas plataformas externas.
- Dados financeiros (cartão, conta bancária).

### 10.3 Conformidade

- LGPD: dados de tenant brasileiro armazenados em região apropriada.
- Retenção de logs: 12 meses ativos, archive por 5 anos.
- Direito ao esquecimento: procedimento documentado para anonimização sob solicitação.

---

## 11. Métricas operacionais do pool

Métricas que a FBR deve expor para monitoramento contínuo:

### 11.1 Por agente
- Invocações por dia / semana / mês.
- Latência p50 / p95 / p99.
- Taxa de sucesso (`status='success'`).
- Taxa de erro por código.
- Custo médio por invocação.
- Tokens médios input/output.

### 11.2 Por tenant
- Custo total no mês.
- Uso por agente.
- Saúde geral (taxa de erro agregada).

### 11.3 Globais
- Disponibilidade do pool (uptime).
- Taxa de erro do Anthropic API (provider).
- Filas de jobs assíncronos (lag).

---

## 12. Riscos e mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Anthropic API instável/lenta | Média | Alto | Retry com backoff; degradação para Sonnet/Haiku quando Opus indisponível; circuit breaker |
| Prompts desatualizados produzem output ruim | Alta | Médio | Eval suite contínua; deploy gradual; rollback rápido |
| Custo escala sem controle | Média | Alto | Cap por tenant; alertas em 70/90/100%; degradação automática |
| Vazamento entre tenants (bug) | Baixa | Catastrófico | Testes automatizados de isolamento; auditoria periódica; RLS forçado |
| Agente alucina e propõe ação ruim | Alta | Baixo (se HITL) a Alto (se autônomo) | HITL em pontos críticos; validação determinística pós-LLM; blast radius pequeno por default |
| Prompt injection via input do usuário | Média | Alto | Sanitização de input; prompts robustos; testes de injection |
| Modelo descontinuado pela Anthropic | Baixa | Alto | Acompanhar roadmap; preparar migração antes do EOL |

---

## 13. Solicitação à FBR — resumo executivo

Para implementar este módulo, solicito à equipe FBR:

1. **Onboarding de 10 agentes** no pool, com especificações desta documentação.
2. **Suporte aos 3 modos de invocação** (síncrono, assíncrono, streaming).
3. **Schema de logging e auditoria** conforme seção 3.6.
4. **Eval suites por agente** com taxa de sucesso mínima.
5. **Dashboards de saúde** por agente e por tenant.
6. **Sandboxes para testes** isolados por ambiente.
7. **Suporte a versionamento de prompts** com rollback.
8. **Implementação do protocolo de comunicação** da seção 3.
9. **Endpoints expostos** documentados para o time do Builder Business.
10. **Estimativa de prazo:** 10 semanas para entrega completa.

---

## 14. Considerações finais

Três decisões merecem cuidado especial na implementação:

1. **O protocolo de comunicação é a fundação.** Se for mal desenhado, refatorar depois custa caro. Vale investir tempo de arquitetura na seção 3 antes de começar a codar agentes.

2. **Eval suites desde o início.** Não trate como "depois". Sem eval, qualquer mudança de prompt vira aposta. Eval ruim é melhor que eval nenhum.

3. **ORACULO é tentador de escalar de função.** Vai aparecer pedido pra ele "executar ação", "lembrar tudo", "dar opinião sobre estratégia geral". Resistir. ORACULO é sparring partner cognitivo, não executor. Confundir os dois mata o design.

---

## 15. Anexos

### A. Glossário

- **Big Flux:** documento estratégico-operacional com 12 fases que conecta produto à expansão.
- **Tenant:** business independente da empresa, isolado no sistema.
- **Blast radius:** limite de impacto que um agente pode causar sem aprovação humana.
- **HITL:** Human-In-The-Loop — humano no ponto crítico de decisão.
- **Gate:** validação determinística entre etapas do fluxo.
- **TrafficConstraints:** objeto derivado do Big Flux com regras para o sub-módulo de tráfego.
- **Playbook:** rotina pré-aprovada de contingência.
- **EMQ:** Event Match Quality — métrica do Meta para qualidade de matching de eventos.
- **CAPI:** Conversions API — API server-side do Meta para envio de eventos.

### B. Contatos sugeridos

- **PO do módulo (Builder Business):** [a definir]
- **Tech lead FBR:** [a definir]
- **Especialista de domínio (marketing):** [a definir]
- **Compliance/segurança:** [a definir]

---

**Fim do documento. Anexos: Parte 1 (Big Flux Generator) e Parte 2 (Sub-módulo de Tráfego Pago).**
