# Parte 2 — Sub-módulo de Gestão de Tráfego Pago: Especificação Técnica Detalhada

**Documento:** Especificação do sub-módulo de Gestão de Tráfego Pago
**Módulo pai:** Marketing (reformulado — ver Parte 1)
**Sistema:** Builder Business
**Versão:** 1.0
**Data:** 21 de maio de 2026

---

## 1. Propósito e escopo

O **Sub-módulo de Gestão de Tráfego Pago** é o componente executor da estratégia definida no Big Flux Document (Parte 1). Ele transforma diretrizes estratégicas em campanhas reais publicadas em Meta Ads e Google Ads, monitora performance, executa otimizações dentro de blast radius controlado, e dispara contingências quando necessário.

**Localização no sistema:** acessível via botão **"Gestão de Tráfego Pago"** dentro do Módulo de Marketing (Parte 1).

**Características arquiteturais críticas:**
- **Multi-tenant nativo:** cada business da empresa é um tenant isolado, com RLS rigoroso.
- **Executor, não estrategista:** consome o Big Flux como fonte de verdade. Não inventa estratégia.
- **Validação obrigatória pelas Etapas 1-10:** toda campanha passa pelo fluxo padrão antes de publicação.
- **Orquestrado por agentes:** ver Parte 3 para o pool completo.
- **Adapter-based:** Meta e Google são adapters intercambiáveis; TikTok plugável depois.

**Princípio-chave:** o sub-módulo nunca executa nada que contradiga o Big Flux atual. Se há conflito, o gestor é forçado a resolver antes de prosseguir (ou volta ao Módulo de Marketing para regenerar/ajustar o Big Flux).

---

## 2. Multi-tenancy — modelo e garantias

### 2.1 Conceito

Cada **business da empresa** é um **tenant** com:
- Conjunto próprio de contas de anúncio (Meta Business Manager, Google Ads MCC).
- Big Flux Document próprio (versionado).
- Campanhas isoladas.
- Métricas isoladas.
- Histórico isolado.
- Usuários e permissões próprias (ou compartilhadas via RBAC).

### 2.2 Garantias de isolamento

1. **Toda query carrega `tenant_id`** — sem exceção, nem para debug.
2. **RLS ativo em todas as tabelas** do sub-módulo.
3. **Agentes recebem `tenant_id` no contexto** — nunca decidem sozinhos a quem servem.
4. **Logs e métricas segregados por tenant** — dashboards nunca cruzam dados.
5. **Credenciais externas (Meta/Google) isoladas por tenant** — armazenadas cifradas, vinculadas ao tenant.
6. **Custos de IA rastreados por tenant** — billing/cost center por business.

### 2.3 Cenários especiais

- **Visão consolidada (board):** existe perfil "super-admin" que pode ver agregados cross-tenant em dashboards específicos. Acesso explícito, logado, sem possibilidade de mutação.
- **Templates compartilhados:** playbooks, estruturas de campanha, prompts de agentes podem ser globais (escopo `scope = 'global'`) ou específicos por tenant (`scope = 'tenant'`).
- **Migração entre tenants:** raro mas possível (ex.: business é spun off). Procedimento manual com auditoria.

---

## 3. Relação com o Big Flux (Parte 1)

### 3.1 Como o Big Flux entra no sub-módulo

Ao abrir o sub-módulo, o sistema:
1. Carrega o `big_flux_current` do tenant (versão `approved` mais recente).
2. Extrai os parâmetros relevantes para tráfego em um objeto **`TrafficConstraints`**:

```typescript
interface TrafficConstraints {
  // Da Fase 3 — Unit Economics
  ticket_medio_alvo: number;
  cac_alvo: number;
  cac_teto: number;
  ltv_estimado: number;
  payback_dias: number;

  // Da Fase 4 — Posicionamento
  angulos_venda: string[];
  tom_de_voz: string;

  // Da Fase 7 — Criativos
  formatos_prioritarios: string[];
  tipos_criativo: string[];
  diretrizes_hook: string;
  restricoes_compliance: string[];

  // Da Fase 8 — Mensuração
  modelo_atribuicao: string;
  janelas_atribuicao: { clique: number; visualizacao: number };
  utm_pattern: string;

  // Da Fase 9 — Regras e Contingência
  budget_diario_max: number;
  budget_semanal_max: number;
  max_increase_pct: number;
  triggers_contingencia: TriggerRule[];

  // Da Fase 10 — Lançamento
  budget_validacao: number;
  periodo_validacao_dias: number;
  estrutura_inicial: CampaignStructure;
  criterios_escala: ScaleCriteria;
  criterios_kill: KillCriteria;
}
```

3. Esse objeto fica em cache no estado do sub-módulo. Toda decisão dos agentes consulta esse cache.

### 3.2 O que acontece quando o Big Flux muda

Quando uma nova versão do Big Flux é aprovada (evento `big_flux.approved`):
1. Cache do sub-módulo é invalidado e recarregado.
2. Sistema identifica campanhas ativas baseadas na versão anterior.
3. Para cada campanha potencialmente impactada, **Auditor** verifica conflitos:
   - Budget atual > novo `budget_diario_max`?
   - CAC observado > novo `cac_teto`?
   - Criativos usam ângulos removidos?
4. Lista de "campanhas com conflito" é mostrada ao gestor com sugestões de ação.
5. Nenhuma campanha é pausada/alterada automaticamente — decisão é humana.

### 3.3 Quando o gestor de tráfego quer mudar algo do Big Flux

Cenário comum: gestor está rodando campanhas e percebe que precisa relaxar o CAC alvo, ou adicionar um ângulo novo, ou ajustar budget. **Ele não muda diretamente.**

Fluxo correto:
1. Gestor clica em "Solicitar revisão do Big Flux" no sub-módulo.
2. Sistema abre formulário pré-preenchido com a sugestão (ex.: "Sugerir aumento de CAC alvo de R$80 para R$95 por causa de [motivo]").
3. Solicitação vai para o aprovador do Big Flux (ou para o board, conforme política do tenant).
4. Se aprovada, gera nova versão do Big Flux.
5. Sub-módulo recarrega constraints.

Isso preserva governança: tráfego não inventa estratégia.

---

## 4. Validação pelo fluxo padrão (Etapas 1-10)

Esta é a espinha dorsal do sub-módulo. **Toda campanha** percorre as 10 etapas. Não há atalho. Cada etapa tem um **gate** — um conjunto de validações que precisa passar antes de avançar.

### 4.1 Visão geral das etapas

| # | Etapa | Agente principal | Gate (o que valida) |
|---|-------|------------------|---------------------|
| 1 | Pré-campanha (estratégia) | Estrategista | Objetivo coerente com Big Flux; KPIs definidos; budget dentro do limite |
| 2 | Infraestrutura de tracking | Configurador | Pixel ativo; CAPI configurado; eventos disparando; UTMs padronizadas |
| 3 | Criativos e copy | Copywriter + Diretor de Criativo | Mínimo de N criativos por ângulo; formatos corretos; compliance ok |
| 4 | Estrutura de campanha | Estrategista + Configurador | Naming convention; estrutura coerente com objetivo; sem canibalização |
| 5 | Configuração técnica | Configurador | Lances, audiências, exclusões, UTMs, evento de otimização |
| 6 | Revisão pré-publicação | Auditor | Checklist completo: tracking, copy, criativos, política, página de destino |
| 7 | Publicação e fase de aprendizagem | Configurador + Sentinela | Publicação em rascunho → preview → confirmação → publicação real; janela de não-interferência |
| 8 | Otimização | Analista + Otimizador | Decisões em janela mínima de 3-7 dias; ações dentro de blast radius |
| 9 | Escala | Otimizador (com aprovação) | Aumento ≤ max_increase_pct por vez; ROAS sustentado; humano aprova passos grandes |
| 10 | Contingência e revisão | Sentinela + Analista | Triggers monitorados; retrospectiva periódica; aprendizado consolidado |

### 4.2 Estados da campanha

```
draft → tracking_ready → creative_ready → structure_ready →
config_ready → audited → published → learning → optimizing →
scaling → contingency? → ended/archived
```

Cada estado corresponde à conclusão bem-sucedida de uma etapa. Estado regride se um gate falha em revalidação.

### 4.3 Gates detalhados

Cada gate é implementado como **função determinística** (não LLM) que retorna `{ passed: boolean, issues: Issue[] }`. Issues são bloqueantes (impede avanço) ou avisos (permite avanço com confirmação humana).

**Exemplo — Gate da Etapa 6 (Revisão pré-publicação):**

```typescript
function gate_etapa_6(campaign: Campaign, constraints: TrafficConstraints): GateResult {
  const issues: Issue[] = [];

  // Tracking
  if (!campaign.pixel_verified) issues.push({ level: 'block', msg: 'Pixel não verificado' });
  if (!campaign.capi_active) issues.push({ level: 'block', msg: 'CAPI inativo' });

  // Copy
  for (const ad of campaign.ads) {
    if (!ad.copy_passes_policy) issues.push({ level: 'block', msg: `Ad ${ad.id}: copy viola política` });
    if (ad.copy_length > MAX_LENGTH) issues.push({ level: 'warn', msg: `Ad ${ad.id}: copy longa` });
  }

  // Criativos
  for (const ad of campaign.ads) {
    if (!validDimensions(ad.creative, ad.placements)) {
      issues.push({ level: 'block', msg: `Ad ${ad.id}: dimensão incompatível` });
    }
  }

  // UTM
  if (!campaign.utm_matches_pattern(constraints.utm_pattern)) {
    issues.push({ level: 'block', msg: 'UTM fora do padrão' });
  }

  // Budget
  if (campaign.daily_budget > constraints.budget_diario_max) {
    issues.push({ level: 'block', msg: 'Budget diário acima do limite do Big Flux' });
  }

  // Landing page
  if (!campaign.landing_page_health.ok) {
    issues.push({ level: 'block', msg: 'Landing page com problema' });
  }

  return { passed: issues.filter(i => i.level === 'block').length === 0, issues };
}
```

### 4.4 Por que validação determinística (e não agente)

Validações booleanas, comparações numéricas, regex de nomenclatura — tudo isso é **regra**, não decisão. Usar LLM aqui significa:
- Custo desnecessário.
- Não-determinismo (mesmo input pode dar output diferente).
- Difícil de testar.
- Difícil de auditar.

Onde há LLM no sub-módulo: geração de copy, briefing de criativo, análise de causa raiz de queda de performance, sugestão de otimização. Onde há código puro: validação, cálculo, comparação, persistência.

---

## 5. Arquitetura interna do sub-módulo

### 5.1 Componentes principais

```
┌────────────────────────────────────────────────────────────────┐
│                  SUB-MÓDULO DE TRÁFEGO PAGO                    │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │              Camada de Apresentação (UI)                  │ │
│  │  Dashboard | Wizard de nova campanha | Detalhe campanha  │ │
│  │  Logs de agentes | ORACULO embedded                       │ │
│  └────────────────────────┬─────────────────────────────────┘ │
│                           │                                    │
│  ┌────────────────────────▼─────────────────────────────────┐ │
│  │              Orquestrador (Traffic Orchestrator)          │ │
│  │  Roteia intenções → aciona agentes → encadeia workflows  │ │
│  └─────┬───────────────┬───────────────┬───────────────────┘ │
│        │               │               │                       │
│  ┌─────▼───┐    ┌─────▼─────┐   ┌────▼─────┐                │
│  │  Agentes │   │   Gates    │   │  Cache   │                │
│  │  (Parte3)│   │  (Det.)    │   │ Big Flux │                │
│  └─────┬───┘    └────────────┘   └──────────┘                │
│        │                                                       │
│  ┌─────▼─────────────────────────────────────────────────┐   │
│  │              Camada de Adapters                         │   │
│  │  MetaAdapter | GoogleAdapter | TikTokAdapter (futuro)  │   │
│  └─────┬─────────────────────────────────────────────────┘   │
│        │                                                       │
└────────┼──────────────────────────────────────────────────────┘
         │
         ▼
   Plataformas externas (Meta API, Google Ads API, etc.)
```

### 5.2 Orquestrador (Traffic Orchestrator)

Responsabilidades:
- Receber intenções do usuário (via UI ou via ação programada).
- Carregar `TrafficConstraints` do tenant.
- Decidir quais agentes acionar e em que ordem.
- Aplicar gates entre etapas.
- Persistir estado da campanha após cada transição.
- Lidar com falhas (retry, escalation, rollback).
- Emitir eventos para monitoramento.

Não é um agente. É código puro com lógica de workflow. Pode ser implementado com:
- **Opção A (recomendada para v1):** state machine simples em código (ex.: XState ou implementação própria).
- **Opção B:** engine de workflow tipo Temporal/Inngest se vocês já usam.
- **Opção C:** evitar — frameworks de orquestração de agentes (LangGraph, CrewAI) abstraem demais e perdem controle em produção.

### 5.3 Camada de Adapters

Cada plataforma de tráfego tem um adapter implementando a mesma interface:

```typescript
interface TrafficPlatformAdapter {
  // Identificação
  platform: 'meta' | 'google' | 'tiktok';

  // Auth
  authenticate(tenant_id: string): Promise<AuthContext>;

  // Estrutura
  createCampaign(spec: CampaignSpec): Promise<ExternalCampaign>;
  updateCampaign(id: string, changes: Partial<CampaignSpec>): Promise<void>;
  pauseCampaign(id: string): Promise<void>;
  deleteCampaign(id: string): Promise<void>;

  // Métricas
  fetchMetrics(id: string, window: TimeWindow): Promise<CampaignMetrics>;
  fetchAccountHealth(): Promise<AccountHealth>;

  // Validação
  validatePolicy(creative: Creative): Promise<PolicyResult>;
}
```

Razão de existir essa abstração: agentes nunca chamam Meta API ou Google API diretamente. Eles chamam o adapter. Quando a API do Meta muda (e muda), só o adapter precisa mudar — agentes ficam intactos.

### 5.4 Cache de Big Flux

Constraints carregados em memória (Redis, Supabase Cache, ou in-process) por tenant. TTL curto (ex.: 5 min) ou invalidação via evento. Agentes leem do cache, não do banco — performance.

---

## 6. Fluxo: Nova campanha do zero

Vou descrever ponta a ponta como uma nova campanha nasce no sub-módulo. Esse fluxo é o caso de uso central.

### Passo 1 — Gestor inicia "Nova Campanha"
UI abre wizard. Sistema verifica que existe `big_flux_current` aprovado para o tenant. Se não há, bloqueia: "Você precisa de um Big Flux aprovado antes de criar campanhas."

### Passo 2 — Estrategista propõe estrutura
Orquestrador chama **Estrategista** com:
- `TrafficConstraints` do tenant.
- Briefing do gestor (objetivo, produto/oferta a promover, prazo).

Estrategista (Sonnet 4.6) retorna proposta:
- Plataforma recomendada (Meta vs. Google vs. ambas).
- Tipo de campanha (Sales/Conversion, Leads, ASC, Performance Max).
- Estrutura sugerida (CBO vs. ABO, número de conjuntos, audiências).
- Budget sugerido (dentro do `budget_diario_max`).
- KPIs alvo herdados do Big Flux.

UI mostra ao gestor. Ele pode aceitar, ajustar, ou pedir alternativa ("e se fosse no Google ao invés do Meta?").

### Passo 3 — Gate Etapa 1
Validação determinística: objetivo dentro do Big Flux? KPIs definidos? Budget ok? Se sim → estado `tracking_ready`.

### Passo 4 — Verificação de tracking
**Configurador** verifica via adapter:
- Pixel/Tag instalado e disparando.
- CAPI/Tag Server configurado.
- Eventos esperados presentes (Purchase, Lead, ou customizado).
- UTMs padronizadas implementáveis.

Se algo falta, retorna issues acionáveis ao gestor (ex.: "Pixel não está disparando AddToCart — verifique o GTM"). Gate da Etapa 2 só passa quando tudo ok.

### Passo 5 — Geração de copy e briefing de criativos
Em paralelo:
- **Copywriter** gera hooks, headlines, descrições, primary text — múltiplas variações por ângulo. Baseado em `angulos_venda` e `tom_de_voz` do Big Flux.
- **Diretor de Criativo** gera briefings de criativo: o que filmar/desenhar, qual hook visual, qual formato, qual tipo (UGC, demonstração, depoimento, PAS).

Gestor revisa. Pode pedir mais variações, pode editar. Criativos são produzidos externamente (estúdio próprio, freelancers, IA generativa — escopo fora deste sub-módulo) e fazem upload de volta na plataforma.

Gate Etapa 3: tem mínimo de N criativos válidos por ângulo? Formatos corretos? Compliance ok? Se sim → `structure_ready`.

### Passo 6 — Montagem de estrutura
**Estrategista** + **Configurador** materializam a estrutura:
- Naming convention aplicada (regex próprio do tenant).
- Audiências definidas (broad, lookalike, custom, exclusões).
- Conjuntos e anúncios criados como `CampaignSpec` (objeto Java interno, ainda não publicado).

Gate Etapa 4: estrutura coerente? Sem canibalização? Naming ok?

### Passo 7 — Configuração técnica fina
**Configurador** completa:
- Estratégia de lance.
- Localização, idioma, demografia.
- Evento de otimização e conversão.
- URLs com UTMs.
- Cronograma.

Gate Etapa 5.

### Passo 8 — Auditoria pré-publicação
**Auditor** roda checklist completo (ver seção 4.3, exemplo do gate da Etapa 6). Se passa → `audited`. Se não → lista de issues bloqueantes vai ao gestor.

### Passo 9 — Publicação
**Configurador** chama o adapter:
1. Publica em modo `paused` (rascunho na plataforma).
2. Retorna preview ao gestor: URL da campanha na plataforma, prévia dos anúncios, configuração final.
3. Aguarda confirmação humana ("Publicar agora" ou "Agendar para X").
4. Ao confirmar, muda para `active`.
5. Persiste `external_id`, timestamps, snapshot do que foi enviado.

Estado vira `published`, depois automaticamente `learning` (período de aprendizagem da plataforma).

### Passo 10 — Janela de não-interferência
**Sentinela** começa a monitorar mas **Otimizador não age** nas primeiras 72-168h (configurável, default 72h). Razão: aprendizagem da plataforma precisa de espaço.

Exceções (Sentinela pausa automaticamente):
- CAC > 3x meta após gastar 1.5x ticket médio com zero conversão.
- Conta bloqueada.
- Política violada.

### Passo 11 — Otimização ativa
Após janela de aprendizado, **Analista** começa a gerar insights diários. **Otimizador** propõe ações:
- Pausar criativo X (CTR <50% da média).
- Escalar conjunto Y em 20% (ROAS sustentado >meta por 5 dias).
- Reinjetar criativos novos (frequência >3.5 em audiência fria).

Ações dentro do blast radius rodam automaticamente. Acima disso, aguardam aprovação humana.

### Passo 12 — Escala e expansão
Quando critérios de escala do Big Flux são atingidos, Otimizador propõe próximos passos (novos conjuntos, expansão de audiência, novo formato). Sempre dentro de Big Flux. Estados `scaling` → eventualmente `optimizing` de novo (volta ao steady state).

### Passo 13 — Contingência (se necessário)
Sentinela monitora 24/7. Se trigger dispara (definido no Big Flux Fase 9):
- Executa playbook (pausa, troca de BM, etc.).
- Notifica gestor.
- Log detalhado.

### Passo 14 — Encerramento
Quando campanha cumpre objetivo ou prazo, ou é pausada definitivamente, estado vira `ended`. Retrospectiva é gerada (Analista produz relatório de aprendizado), arquivada para informar próximas campanhas.

---

## 7. Schema de banco de dados (Supabase)

### 7.1 Tabela `campaigns`

```sql
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  big_flux_version_id UUID NOT NULL REFERENCES big_flux_documents(id),

  -- Identificação
  name TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('meta', 'google', 'tiktok')),
  external_id TEXT,                       -- ID na plataforma após publicação
  external_account_id TEXT NOT NULL,      -- conta de anúncio (BM, MCC)

  -- Estado
  status TEXT NOT NULL CHECK (status IN (
    'draft', 'tracking_ready', 'creative_ready', 'structure_ready',
    'config_ready', 'audited', 'published', 'learning', 'optimizing',
    'scaling', 'paused', 'contingency', 'ended', 'archived'
  )),
  current_stage INTEGER CHECK (current_stage BETWEEN 1 AND 10),

  -- Configuração
  objective TEXT NOT NULL,                -- conversion, leads, traffic, etc.
  spec JSONB NOT NULL,                    -- estrutura completa (audiências, criativos, etc.)
  daily_budget NUMERIC(10, 2),
  total_budget NUMERIC(10, 2),

  -- KPIs herdados do Big Flux (snapshot)
  cac_alvo NUMERIC(10, 2),
  cac_teto NUMERIC(10, 2),
  roas_alvo NUMERIC(10, 2),

  -- Auditoria
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  published_by UUID,
  published_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  ended_reason TEXT
);

CREATE INDEX idx_campaigns_tenant_status ON campaigns(tenant_id, status);
CREATE INDEX idx_campaigns_external ON campaigns(platform, external_id);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON campaigns
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
```

### 7.2 Tabela `campaign_validations`

```sql
CREATE TABLE campaign_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id),
  stage INTEGER NOT NULL CHECK (stage BETWEEN 1 AND 10),

  validated_at TIMESTAMPTZ DEFAULT NOW(),
  validated_by_agent TEXT NOT NULL,       -- nome do agente ou 'deterministic_gate'
  passed BOOLEAN NOT NULL,
  issues JSONB,                           -- array de {level, msg}

  -- Auditoria
  triggered_by UUID,
  context JSONB                           -- snapshot relevante
);

CREATE INDEX idx_validations_campaign ON campaign_validations(campaign_id, stage);
ALTER TABLE campaign_validations ENABLE ROW LEVEL SECURITY;
```

### 7.3 Tabela `campaign_metrics_snapshots`

```sql
CREATE TABLE campaign_metrics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  campaign_id UUID NOT NULL REFERENCES campaigns(id),

  captured_at TIMESTAMPTZ DEFAULT NOW(),
  window_start TIMESTAMPTZ,
  window_end TIMESTAMPTZ,

  -- Métricas básicas (estrutura comum entre plataformas)
  impressions BIGINT,
  clicks BIGINT,
  conversions INTEGER,
  spend NUMERIC(10, 2),
  revenue NUMERIC(12, 2),

  -- Derivadas
  ctr NUMERIC(6, 4),
  cpc NUMERIC(10, 2),
  cpm NUMERIC(10, 2),
  cac NUMERIC(10, 2),
  roas NUMERIC(6, 2),
  frequency NUMERIC(6, 2),

  -- Raw da plataforma (para auditoria)
  raw_payload JSONB
);

CREATE INDEX idx_metrics_campaign_time ON campaign_metrics_snapshots(campaign_id, captured_at DESC);
ALTER TABLE campaign_metrics_snapshots ENABLE ROW LEVEL SECURITY;
```

### 7.4 Tabela `campaign_actions`

Toda ação tomada em uma campanha — manual ou automática — é registrada.

```sql
CREATE TABLE campaign_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  campaign_id UUID NOT NULL REFERENCES campaigns(id),

  action_type TEXT NOT NULL,              -- 'pause', 'scale_up', 'scale_down', 'creative_add', 'budget_change', etc.
  payload JSONB NOT NULL,                 -- detalhes da ação
  reason TEXT,                            -- racional (do agente ou humano)

  proposed_by_agent TEXT,                 -- agente que propôs (se aplicável)
  approved_by UUID,                       -- humano que aprovou (se aplicável)
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  execution_status TEXT NOT NULL CHECK (execution_status IN ('pending', 'success', 'failed', 'rolled_back')),
  execution_error TEXT
);

CREATE INDEX idx_actions_campaign_time ON campaign_actions(campaign_id, executed_at DESC);
ALTER TABLE campaign_actions ENABLE ROW LEVEL SECURITY;
```

### 7.5 Tabela `platform_credentials`

```sql
CREATE TABLE platform_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  platform TEXT NOT NULL,
  account_external_id TEXT NOT NULL,      -- BM ID, MCC ID, etc.

  -- Credenciais cifradas (use Vault, Supabase Vault, ou similar)
  encrypted_credentials BYTEA NOT NULL,
  encryption_key_id TEXT NOT NULL,

  -- Metadados
  account_name TEXT,
  account_currency TEXT,
  is_primary BOOLEAN DEFAULT false,       -- conta primária do tenant nessa plataforma
  is_backup BOOLEAN DEFAULT false,        -- BM reserva para contingência

  -- Auditoria
  added_by UUID,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  last_validated_at TIMESTAMPTZ,
  validation_status TEXT,

  UNIQUE (tenant_id, platform, account_external_id)
);

ALTER TABLE platform_credentials ENABLE ROW LEVEL SECURITY;
```

### 7.6 Tabela `contingency_events`

```sql
CREATE TABLE contingency_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  campaign_id UUID REFERENCES campaigns(id),

  trigger_rule_id TEXT NOT NULL,          -- ID do trigger no Big Flux (Fase 9)
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  severity TEXT CHECK (severity IN ('info', 'warn', 'critical')),

  description TEXT NOT NULL,
  context_snapshot JSONB,

  -- Resolução
  playbook_executed TEXT,                 -- nome do playbook acionado
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,                       -- 'system' (UUID especial) ou user_id
  resolution_notes TEXT
);

CREATE INDEX idx_contingency_tenant_time ON contingency_events(tenant_id, detected_at DESC);
ALTER TABLE contingency_events ENABLE ROW LEVEL SECURITY;
```

---

## 8. Camada de adapters — Meta e Google

### 8.1 Princípios

- **Cada adapter é um módulo separado**, sem dependência cruzada.
- **Interface comum** (`TrafficPlatformAdapter`) — agentes não sabem qual plataforma estão usando.
- **Adapters não tomam decisão de negócio.** São tradutores: recebem `CampaignSpec` interno e produzem chamadas à API da plataforma.
- **Resiliência:** retry exponencial em erros transitórios, circuit breaker se a API está fora, fila de retry para operações idempotentes.
- **Versionamento de API:** cada adapter trava versão específica da API externa. Atualização é deliberada, testada.

### 8.2 MetaAdapter — pontos críticos

- **Marketing API:** v19+ no momento desta especificação; valida na implementação.
- **Conversions API (CAPI):** server-side, complementar ao Pixel. Adapter ajuda a configurar e validar EMQ.
- **Eventos:** Purchase, Lead, CompleteRegistration, ViewContent, AddToCart, InitiateCheckout — mapeados conforme Big Flux.
- **Tipos de campanha suportados na v1:** Sales (Conversion), Leads. Advantage+ Shopping Campaigns (ASC) na onda seguinte.
- **Estrutura de naming:** convenção padrão da Builder Business aplicada (ex.: `[Tenant]_[Produto]_[Objetivo]_[Audiencia]_[Data]`).
- **Cuidados especiais:**
  - Limites de rate da API (tier-dependent).
  - Categorias especiais (saúde, finanças, política) precisam declaração.
  - Mudanças frequentes na API — adapter precisa de cobertura de testes.

### 8.3 GoogleAdapter — pontos críticos

- **Google Ads API:** v17+ no momento desta especificação.
- **Tipos de campanha suportados na v1:** Search, Performance Max. Display e YouTube na onda seguinte.
- **Conversion tracking:** Google Ads Conversion + GA4 import.
- **Enhanced Conversions:** server-side, melhora atribuição.
- **Estrutura:** Search com keywords + Performance Max com asset groups.
- **Cuidados especiais:**
  - MCC necessário para gerenciamento multi-conta.
  - Aprovação de domínio pode demorar.
  - Performance Max é "blackbox" — gestor não controla muito.

### 8.4 TikTokAdapter — futuro

Plugável quando vocês decidirem expandir. Mesma interface. Não bloqueia v1.

### 8.5 Tratamento de erros nos adapters

Cada chamada externa retorna um resultado padronizado:

```typescript
interface AdapterResult<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;                         // 'rate_limit', 'policy_violation', 'invalid_param', 'account_blocked', etc.
    message: string;
    retryable: boolean;
    retry_after_seconds?: number;
    raw_platform_error?: any;
  };
}
```

Códigos de erro são padronizados entre adapters — orquestrador trata erros sem saber a plataforma específica.

---

## 9. UX do sub-módulo

### 9.1 Telas principais

**Tela 1 — Dashboard de Tráfego.** Visão geral de todas as campanhas do tenant. Filtros por plataforma, status, performance vs. meta. Cards com KPIs agregados: gasto hoje, conversões hoje, CAC médio, ROAS médio. Alertas ativos (contingências em curso, campanhas com problema).

**Tela 2 — Detalhe de Campanha.** Métricas em tempo real, histórico de ações, criativos ativos, estado do funil, logs de agentes, sugestões pendentes de aprovação. ORACULO embedded com contexto da campanha.

**Tela 3 — Wizard de Nova Campanha.** Stepper visual mostrando as 10 etapas. Cada etapa tem seu próprio painel com inputs, validações em tempo real, e indicação clara do que falta para passar o gate.

**Tela 4 — Configuração de Contas.** Onde o gestor conecta BMs do Meta e MCCs do Google, gerencia credenciais, marca conta primária e backup.

**Tela 5 — Histórico e Auditoria.** Linha do tempo completa: toda ação (humana ou automática), toda mudança de estado, toda contingência. Filtrável por campanha, agente, período.

**Tela 6 — Playbooks.** Visualização dos triggers de contingência ativos (definidos no Big Flux). Permite testar manualmente um playbook em modo simulado.

### 9.2 ORACULO no sub-módulo

ORACULO está disponível em todas as telas com contexto carregado conforme onde o gestor está:

- Dashboard: contexto agregado (todas as campanhas, estado geral).
- Detalhe de campanha: contexto específico daquela campanha.
- Wizard de criação: contexto do briefing em construção + Big Flux.
- Histórico: contexto temporal (pode responder "o que aconteceu na campanha X em 12/04?").

Mais detalhes na Parte 3.

### 9.3 Wizard de criação — desenho conceitual

```
┌─────────────────────────────────────────────────────────────┐
│ Nova Campanha — Plataforma X                                 │
├─────────────────────────────────────────────────────────────┤
│ [1] [2] [3] [4] [5] [6] [7] [8] [9] [10]    ← stepper       │
│  ✓   ✓   ✓   ●   -   -   -   -   -   -                      │
│                                                              │
│ Etapa 4: Estrutura de campanha                              │
│ ─────────────────────────────────                            │
│ O Estrategista propôs esta estrutura:                       │
│                                                              │
│   Campanha: [Tenant]_ProdutoX_Conv_BR_2026-05               │
│   ├── Conjunto 1: Broad — R$ 200/dia                        │
│   │   ├── Anúncio 1.1: hook "Pare de perder dinheiro..."   │
│   │   └── Anúncio 1.2: hook "3 erros que travam..."        │
│   └── Conjunto 2: Lookalike 1% — R$ 200/dia                 │
│       └── ...                                                │
│                                                              │
│ [Aceitar] [Ajustar] [Pedir alternativa]                     │
│                                                              │
│ ─── Validação do Gate 4 ───                                 │
│ ✓ Naming dentro do padrão                                   │
│ ✓ Sem canibalização detectada                               │
│ ✓ Budget total dentro do Big Flux                           │
│ ⚠ Aviso: 2 conjuntos competindo na mesma audiência fria     │
│                                                              │
│ ┌──────────────────── ORACULO ─────────────────────────┐   │
│ │ O aviso sobre competição entre conjuntos não é       │   │
│ │ bloqueante, mas vale considerar exclusão entre eles. │   │
│ │ Quer que eu sugira a configuração de exclusão?       │   │
│ └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 10. Blast radius e governança de ações automáticas

### 10.1 Conceito

Cada ação que um agente pode executar tem um **blast radius**: o impacto máximo permitido sem aprovação humana. Tudo que excede o radius vai para fila de aprovação.

### 10.2 Defaults sugeridos (configuráveis por tenant)

| Ação | Blast radius (automático) | Acima disso |
|------|---------------------------|-------------|
| Pausar criativo individual | ✓ sempre permitido | — |
| Pausar conjunto de anúncios | ✓ se gasto cumulativo < R$500 sem conversão | Aprovação humana |
| Pausar campanha | ✗ nunca automático | Sempre humano |
| Aumentar budget | ≤ 20% por vez, intervalo ≥ 24h | Aprovação humana |
| Diminuir budget | ≤ 50% por vez | Aprovação humana se >50% |
| Duplicar conjunto | ✗ nunca automático | Sempre humano |
| Adicionar audiência | ✗ nunca automático | Sempre humano |
| Trocar criativo | ✓ se for substituição direta de pausado | — |
| Executar playbook de contingência | ✓ se severity = critical e playbook está no Big Flux | Notificar humano em paralelo |

### 10.3 Configuração

Cada tenant pode ajustar via tela de configuração. Defaults começam conservadores; tenant amadurece com o tempo e relaxa onde faz sentido.

### 10.4 Fila de aprovações

UI mostra "Ações pendentes de aprovação" com:
- Ação proposta.
- Agente que propôs.
- Racional.
- Impacto estimado.
- Prazo (algumas decisões têm janela curta).

Aprovador pode aceitar, rejeitar, ou pedir mais informação (ORACULO ajuda a explicar).

---

## 11. Sentinela e monitoramento contínuo

### 11.1 Cadência

Sentinela roda em loop assíncrono, com cadência por categoria:

- **Métricas básicas:** a cada 30 minutos (impressões, cliques, gasto).
- **Métricas de conversão:** a cada 1 hora (atribuição leva tempo).
- **Health da conta:** a cada 6 horas (bloqueio, política, faturamento).
- **Anomalias críticas:** real-time via webhooks da plataforma quando disponível.

### 11.2 O que monitora

Triggers definidos na Fase 9 do Big Flux, materializados em código:

```typescript
interface TriggerRule {
  id: string;
  description: string;
  condition: ConditionExpression;         // ex.: "cac > cac_teto * 1.5 sustained_for 48h"
  severity: 'info' | 'warn' | 'critical';
  action: ActionPlan;                     // playbook a executar
  notify: NotificationConfig;
}
```

### 11.3 Anti-flapping

Trigger não dispara repetidamente para a mesma condição contínua. Implementação:
- Dedup window por trigger (ex.: 6h).
- Estado persistido em `contingency_events`.

### 11.4 Falsos positivos

Sentinela é sintonizado para preferir falso positivo a falso negativo. Custo de uma campanha rodando ruim sem alerta é maior que custo de checar um alerta que era ruído. Gestor pode marcar alerta como "ruído" — agente aprende e ajusta limiar (com aprovação humana antes de mudar trigger).

---

## 12. Otimização — modelo de decisão

### 12.1 Cadência de decisão

- **Daily:** Analista produz briefing diário (estado de cada campanha, anomalias do dia, sugestões).
- **Weekly:** revisão mais profunda, análise de coorte, decisões de escala.
- **Monthly:** retrospectiva, atualização de aprendizados na knowledge base.

### 12.2 Critérios estatísticos

Decisões precisam de volume mínimo:
- Pausar criativo: mínimo 1000 impressões + janela de 3 dias OU gasto > 1x ticket sem conversão.
- Escalar: ROAS >meta sustentado por 5+ dias, CAC <meta sustentado.
- Diminuir budget: CAC >1.5x meta por 48h consecutivas.

Esses limiares vêm de defaults da indústria mas são ajustáveis no Big Flux Fase 9.

### 12.3 Análise de causa raiz

Quando algo desvia, **Analista** roda análise estruturada:
1. O que mudou? (CAC subiu, ROAS caiu, frequência aumentou)
2. Quando começou? (correlação com mudanças, sazonalidade, eventos externos)
3. Onde está? (qual conjunto, qual criativo, qual audiência)
4. Hipóteses ranqueadas (3-5 causas possíveis, ordenadas por probabilidade)
5. Sugestões de ação por hipótese

Output vai para o gestor + serve de base para sugestão do Otimizador.

---

## 13. Custos de IA — visibilidade e controle

### 13.1 Por tenant

Cada execução de agente é logada com tokens e custo (ver Parte 3 para schema completo). Dashboard mostra:
- Gasto de IA do tenant no mês.
- Por agente.
- Por campanha.
- Tendência.

### 13.2 Limites por tenant

Tenant pode ter cap mensal de custo de IA. Atingiu o cap → degradação controlada (agentes mais caros desativam, modo "manual mais assistido" entra em ação) ao invés de simplesmente parar.

### 13.3 Estimativa para v1

Tenant médio (5-10 campanhas ativas):
- Geração inicial de campanha (Estrategista + Copywriter + Diretor + Configurador + Auditor): ~US$ 0.30
- Otimização diária (Analista + Otimizador): ~US$ 0.20/dia × 30 dias = US$ 6.00/mês
- Sentinela (Haiku 4.5, alta frequência): ~US$ 2.00/mês
- ORACULO (sob demanda): variável, estimado US$ 5-15/mês por usuário ativo

Total estimado por tenant: **US$ 15-30/mês** com uso moderado. Pode subir com uso intenso de ORACULO.

---

## 14. Observabilidade e logs

### 14.1 O que é logado

- Toda execução de agente: input, output, tokens, latência, custo, status.
- Toda chamada a adapter externo: payload, response, latência, status, erro.
- Toda transição de estado de campanha.
- Toda ação (humana ou automática).
- Toda interação com ORACULO.

### 14.2 Onde

Logs estruturados (JSON) no Supabase para v1 (escala média). Para tenants grandes ou agregado da empresa, considerar pipeline para Datadog/Grafana Loki.

### 14.3 Alertas operacionais

Distintos dos triggers de campanha (Fase 9). Alertas operacionais são sobre saúde do sistema:
- Adapter Meta com taxa de erro >5% em 1h.
- Agente X com latência >30s em média.
- Custo de IA do tenant Y >150% do mês anterior.
- Sentinela não rodou nos últimos 60min.

Vão para canal de engenharia, não para gestor de tráfego.

---

## 15. Roadmap de implementação (Ondas 2-4)

### Onda 2 (6-8 semanas) — Criação assistida de campanha em Meta
- Schema completo das tabelas do sub-módulo.
- MetaAdapter funcional (criar, pausar, atualizar, fetch métricas).
- Orquestrador com state machine das 10 etapas.
- Agentes: Estrategista, Copywriter, Diretor de Criativo, Configurador, Auditor.
- UI: Dashboard básico, Wizard de criação, Detalhe de campanha.
- ORACULO integrado nas telas.
- Publicação manual com confirmação humana.

**Critério de sucesso:** gestor consegue criar campanha em Meta do zero, ponta a ponta, com agentes assistindo e Big Flux validando.

### Onda 3 (4-6 semanas) — Monitoramento e otimização
- Sentinela ativa.
- Analista produzindo briefings diários.
- Otimizador propondo ações (com aprovação humana).
- Histórico de campanha completo.
- Fila de aprovações.
- Métricas em tempo real no dashboard.
- Blast radius aplicado para ações automáticas pequenas.

### Onda 4 (4-6 semanas) — Google Ads + contingência automática
- GoogleAdapter completo (Search + Performance Max).
- Playbooks de contingência ativos (definidos no Big Flux).
- Failover BM/MCC reserva.
- Triggers complexos.
- Tela de Playbooks com modo de teste.

### Pós-Onda 4 — Expansão
- TikTok Adapter.
- MMM próprio.
- Modelo de atribuição customizado.
- Cross-tenant insights (board view).
- Otimização autônoma com confiança crescente.

---

## 16. Dependências e bloqueios para iniciar Onda 2

- [ ] Parte 1 (Big Flux Generator) em produção ou em ambiente de staging utilizável.
- [ ] Pool de agentes da FBR estendido com os agentes deste sub-módulo (Parte 3 entregue à FBR e implementada).
- [ ] Credenciais de desenvolvimento para Meta Marketing API (app aprovado, BM de teste).
- [ ] Credenciais de desenvolvimento para Google Ads API (developer token, MCC de teste — esse é demorado, iniciar cedo).
- [ ] Definição de padrão de cifragem para `platform_credentials` (Supabase Vault ou solução própria).
- [ ] UI library / design system da Builder Business para componentes (wizard, dashboard, charts).
- [ ] Estratégia de filas/jobs assíncronos definida (Sentinela precisa rodar em loop).

---

## 17. Riscos e mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Meta muda API e quebra adapter | Alta | Alto | Cobertura de testes; staging com app de dev; canary release |
| Custo de IA escala sem controle | Média | Médio | Cap por tenant; monitoramento de tokens; degradação controlada |
| Conta de tenant é bloqueada na plataforma | Média | Alto | BM/MCC reserva configurado; playbook de failover automático |
| Agente sugere ação ruim e gestor aprova sem revisar | Média | Alto | Sempre mostrar racional + impacto estimado; histórico visível |
| Vazamento entre tenants | Baixa | Catastrófico | RLS obrigatório; testes automatizados de isolamento; auditoria |
| Big Flux desatualizado e campanhas baseadas nele | Média | Médio | Validação ao recarregar Big Flux; lista de campanhas impactadas |
| Performance Max do Google é blackbox | Alta | Médio | Documentar limitações; expectativa clara com gestor |
| Categorias especiais (saúde, finanças) reprovam criativos | Alta | Médio | Compliance check no Auditor; declaração de categoria obrigatória |

---

## 18. Considerações finais

O sub-módulo de Tráfego Pago é o componente onde teoria vira execução. Três decisões merecem cuidado especial:

1. **Os gates são o que protege o sistema.** Não negocie. Se um gate falha, a campanha não avança. Pressão para "publicar logo" não justifica burlar validação — exatamente quando há pressa é quando erros caros acontecem.

2. **Adapters são o ponto de maior manutenção contínua.** Meta e Google mudam APIs com frequência. Reserve capacidade de engenharia para acompanhar mudanças. Sem isso, o sistema fica defasado em meses.

3. **Blast radius começa pequeno e expande com confiança.** Tente liberar muita automação no dia 1 → vai dar problema, gestor perde confiança no sistema, e fica difícil recuperar. Comece com humano-no-loop em quase tudo, relaxe à medida que histórico mostra que o agente é confiável naquela ação.

---

**Próximo documento:** Parte 3 — Agent Management e ORACULO (documentação para a FBR)
