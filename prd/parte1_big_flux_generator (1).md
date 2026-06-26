# Parte 1 — Big Flux Generator: Especificação Técnica Detalhada

**Documento:** Especificação do componente Big Flux Generator
**Módulo:** Marketing (reformulação)
**Sistema:** Builder Business
**Versão:** 1.0
**Data:** 21 de maio de 2026

---

## 1. Propósito e escopo

O **Big Flux Generator** é o componente que recebe o Report de Marketing produzido pelo Board of Directors e gera o **Big Flux Document**: um plano executável detalhado com as 12 fases que conectam a concepção do produto à expansão de vendas. Este documento é a fonte de verdade estratégica que alimentará todos os módulos operacionais subsequentes — especialmente o sub-módulo de Gestão de Tráfego Pago (Parte 2).

**O componente substitui o Módulo de Marketing atual.** Onde antes havia apenas o report do board persistido em `metadata`, agora há um processo de tradução estratégico-operacional assistido por IA Opus 4.7, com versionamento, aprovação humana e integração com ORACULO.

**Princípio central:** o Big Flux não é um documento estático. Ele é versionável, auditável, e reflete o estado estratégico atual do tenant em qualquer ponto do tempo.

---

## 2. Inputs do componente

### 2.1 Input primário: Report de Marketing

O Report de Marketing chega ao componente nas estruturas definidas no documento `marketing_report_spec.md`, persistidas em `projects.metadata`:

- `marketing_strategy.value_proposition` (String ou Object)
- `marketing_strategy.target_audience` (Object com `primary` e `secondary`)
- `marketing_strategy.approach_strategy` (String)
- `marketing_strategy.channels` (Array de Object)
- `marketing_strategy.tactics` (Array de Object)
- `lead_generation_strategy.lead_magnets` (Array de Object)
- `lead_generation_strategy.conversion_tactics` (Array de Object)

### 2.2 Inputs secundários (contexto do tenant)

Para gerar um Big Flux verdadeiramente assertivo, o Opus 4.7 precisa de mais do que o report isolado. O componente carrega adicionalmente:

- **Identidade do tenant:** nome do business, segmento, modelo de negócio (B2B, B2C, infoproduto, e-commerce físico, SaaS, serviço, etc.), porte estimado.
- **Histórico estratégico:** Big Flux anteriores aprovados (se houver), permitindo continuidade e evolução em vez de reset a cada geração.
- **Restrições conhecidas:** budget máximo, CAC alvo definido pelo board, prazos críticos, plataformas excluídas (compliance ou política interna), categorias de produto sensíveis.
- **Resultados históricos:** se houver dados de campanhas passadas, métricas de performance, custos reais, gargalos identificados.

### 2.3 Validação de input

Antes de qualquer chamada à IA, o componente valida:

- Estrutura mínima do report (todos os campos obrigatórios presentes).
- Tratamento de polimorfismo: `value_proposition` pode vir como string ou como objeto `{content: "..."}` — o parser normaliza para string.
- Sanitização: remoção de blocos de código Markdown extras, escape de caracteres problemáticos.
- Coerência mínima: report não pode estar vazio nas seções críticas (UVP, público-alvo, canais).

Se a validação falha, o componente retorna erro estruturado ao usuário **sem chamar a IA** — economiza tokens e dá feedback claro.

---

## 3. Output do componente

### 3.1 Formato de saída

O output principal é um **Markdown estruturado** seguindo o padrão visual do report de entrada, mas expandido para conter as 12 fases do Big Flux. O MD é a representação canônica e auditável.

Adicionalmente, o componente gera uma **representação JSON estruturada** do mesmo conteúdo, persistida em paralelo. Essa versão JSON serve para consumo programático pelos agentes da Parte 2 (eles consultam campos específicos sem ter que parsear MD).

**Por que ambos:**
- MD é para humanos (revisão, aprovação, leitura, exportação para apresentação).
- JSON é para máquinas (agentes do sub-módulo de tráfego consultam `bigFlux.fase3.unit_economics.cac_maximo` diretamente).

### 3.2 Template do Big Flux Document (MD)

A estrutura abaixo é o padrão a ser gerado pelo Opus 4.7. Cada fase tem cabeçalho fixo e subseções específicas. O modelo recebe esse template como parte do prompt e preenche cada campo.

```markdown
# Big Flux Document: [Nome do Projeto/Business]

**Tenant:** [tenant_name]
**Project ID:** [project_id]
**Versão:** [v1, v2, ...]
**Data de Geração:** [DD/MM/YYYY]
**Status:** [Draft | Em Revisão | Aprovado | Arquivado]
**Baseado no Report:** [report_version_id]
**Gerado por:** Opus 4.7 (Big Flux Architect)
**Aprovado por:** [user_id ou pendente]

---

## Sumário Executivo

[Parágrafo de 4-6 linhas que sintetiza a estratégia do Big Flux:
quem é o cliente, qual a oferta, qual o canal principal, qual o CAC
alvo, qual o horizonte de execução. Permite ao executivo ter contexto
em 30 segundos.]

---

## Fase 1 — Pesquisa e Validação de Mercado

### 1.1 Cliente-alvo
[Descrição detalhada do ICP — Ideal Customer Profile. Não é só o público-alvo
do report; é a granularização: dor real, contexto de uso, gatilhos de compra,
objeções típicas.]

### 1.2 Análise de concorrência
[Lista de concorrentes diretos e indiretos identificados. Para cada um:
posicionamento, faixa de preço, ângulos de venda observados, presença em
plataformas de tráfego. Fontes recomendadas: Meta Ad Library, Google Ads
Transparency Center, sites concorrentes.]

### 1.3 Tamanho de mercado endereçável (TAM/SAM/SOM)
[Estimativas quantitativas quando possível, qualitativas quando não.
Foco em SOM (Serviceable Obtainable Market) — o que esse negócio
realisticamente pode capturar em 12 meses.]

### 1.4 Validações pendentes
[Hipóteses estratégicas que ainda precisam ser validadas antes de
investir pesado. Cada hipótese tem método de validação sugerido.]

---

## Fase 2 — Concepção do Produto/Oferta

### 2.1 Produto vs. Oferta
[Distinção explícita: o que é o produto entregue vs. o que é a oferta vendida.]

### 2.2 Componentes da oferta
- **Produto core:** [descrição]
- **Bônus:** [lista de bônus que aumentam valor percebido]
- **Garantia:** [tipo, prazo, condições]
- **Condições de pagamento:** [opções]
- **Urgência/Escassez:** [mecanismos legítimos aplicáveis]
- **Prova social:** [depoimentos, números, casos]

### 2.3 Posicionamento da oferta
[Como ela se diferencia no mercado. Frase de posicionamento clara.]

---

## Fase 3 — Precificação e Unit Economics

### 3.1 Preço de venda
- **Ticket médio alvo:** R$ [valor]
- **Estratégia de pricing:** [premium | competitivo | penetração | valor]
- **Justificativa:** [racional]

### 3.2 Estrutura de custos (COGS)
[Custos diretos por unidade vendida.]

### 3.3 Margem
- **Margem bruta:** [%]
- **Margem após CAC:** [%]
- **Margem após CAC + retenção:** [%]

### 3.4 CAC máximo aceitável
- **CAC alvo:** R$ [valor]
- **CAC teto (kill switch):** R$ [valor]
- **Justificativa:** [LTV estimado, payback aceitável]

### 3.5 LTV e payback
- **LTV estimado:** R$ [valor]
- **Payback period alvo:** [dias/meses]
- **Razão LTV/CAC alvo:** [valor — deve ser ≥ 3 para negócio saudável]

---

## Fase 4 — Posicionamento e Mensagem

### 4.1 Posicionamento estratégico
- **Quem somos:** [identidade]
- **Para quem:** [audiência]
- **Contra quem:** [alternativas que substituímos]
- **Por que diferentes:** [diferencial real]

### 4.2 Ângulos de venda
[Lista de ângulos — portas de entrada emocionais. Ex.: medo, status,
conveniência, economia, transformação. Cada ângulo gera famílias de criativos
na Fase 7.]

### 4.3 Tom de voz e linguagem
[Como a marca fala: formal/informal, técnica/coloquial, vocabulário
do nicho, gatilhos linguísticos.]

---

## Fase 5 — Funil e Jornada do Cliente

### 5.1 Mapa do funil
[Diagrama textual: anúncio → LP → checkout → pós-venda → upsell → fidelização.]

### 5.2 Métricas-meta por etapa
- **CTR do anúncio:** [%]
- **Conversão LP:** [%]
- **Conversão checkout:** [%]
- **Taxa de carrinho abandonado recuperado:** [%]
- **Upsell take rate:** [%]
- **Taxa de recompra (60 dias):** [%]

### 5.3 Gatilhos e automações entre etapas
[E-mail, SMS, WhatsApp, retargeting — quando dispara cada um.]

---

## Fase 6 — Assets de Conversão

### 6.1 Landing pages
[Quantas, para quais ofertas/ângulos, requisitos de copy e design,
elementos obrigatórios.]

### 6.2 Checkout
[Plataforma, otimizações, métodos de pagamento, integração com pixel/CAPI.]

### 6.3 Comunicações automatizadas
[E-mails (carrinho abandonado, boas-vindas, nurturing), SMS, WhatsApp.]

### 6.4 Página de obrigado e pós-venda
[Elementos, próximos passos do cliente, oportunidades de upsell.]

---

## Fase 7 — Criativos

### 7.1 Estratégia criativa
[Base nos ângulos da Fase 4. Quantos criativos por ângulo, formatos
prioritários, cadência de produção semanal.]

### 7.2 Pipeline de produção
- **Volume semanal alvo:** [N criativos novos por semana]
- **Formatos prioritários:** [9:16 vertical, 1:1, 16:9]
- **Tipos:** [UGC, depoimento, demonstração, comparação, PAS — problema-agitação-solução]

### 7.3 Diretrizes de hook
[Os primeiros 3 segundos. Padrões que funcionam para este produto/audiência.]

### 7.4 Restrições de compliance
[O que não pode ser dito por causa de política de plataforma ou regulação.]

---

## Fase 8 — Infraestrutura de Mensuração

### 8.1 Pixel e CAPI
[Eventos a serem rastreados, configuração server-side, EMQ alvo.]

### 8.2 Atribuição
- **Modelo escolhido:** [last click | data-driven | MMM | misto]
- **Janelas:** [clique e visualização]
- **Cruzamento com GA4 e pós-venda:** [sim/não, frequência]

### 8.3 UTMs padronizadas
[Padrão obrigatório: utm_source, utm_medium, utm_campaign, utm_content, utm_term.]

### 8.4 Dashboard consolidado
[Onde os dados serão visualizados, atualização, KPIs prioritários.]

---

## Fase 9 — Regras de Operação e Contingência

### 9.1 Limites de gasto
- **Budget diário máximo por campanha:** R$ [valor]
- **Budget semanal máximo agregado:** R$ [valor]
- **Limite de aumento por escalação:** [% por vez, intervalo mínimo]

### 9.2 Gatilhos automáticos
| Condição | Ação | Aprovação |
|----------|------|-----------|
| CAC > 1.5x meta por 48h | Pausa | Automática (Sentinela) |
| ROAS < 0.5x meta por 72h | Pausa | Automática (Sentinela) |
| Conta bloqueada | Failover BM reserva | Humano |
| Frequência > 3.5 em audiência fria | Alerta criativo | Automática |

### 9.3 Plano de contingência
- **Se conta cair:** [protocolo passo-a-passo]
- **Se estoque acabar:** [pausa, alteração de oferta]
- **Se política for violada:** [protocolo de revisão e recurso]
- **Se CAC explodir:** [redução escalonada de budget, diagnóstico]

### 9.4 SAC e operação
[Dimensionamento esperado, política de reembolso, gestão de reclamações.]

---

## Fase 10 — Lançamento e Tráfego Pago

### 10.1 Estratégia de validação inicial
- **Budget de validação:** R$ [valor]
- **Período:** [dias]
- **Critério de sucesso:** [CAC < X, ROAS > Y, ou marco específico]

### 10.2 Estrutura inicial de campanha
[Plataforma(s), tipo(s) de campanha, número de conjuntos, audiências
iniciais. Esses são os parâmetros que o sub-módulo da Parte 2 consumirá.]

### 10.3 Critérios de escala
[Quando dobrar budget, quando expandir audiência, quando lançar novos
canais.]

### 10.4 Critérios de kill
[Quando pausar a campanha definitivamente vs. quando ajustar.]

---

## Fase 11 — Otimização Cíclica

### 11.1 Cadência de revisão
[Daily, weekly, monthly — o que se olha em cada uma.]

### 11.2 A/B testing roadmap
[O que testar em ordem: oferta > landing > criativo > audiência.]

### 11.3 Análise de coorte
[Como segmentar coortes, frequência de análise, decisões esperadas.]

### 11.4 Retenção e CRM
[Estratégia de e-mail/WhatsApp pós-venda, segmentação, automações.]

---

## Fase 12 — Expansão

### 12.1 Novos canais
[Roadmap de adição de canais — TikTok, YouTube, afiliados, etc.]

### 12.2 Cross-sell para base existente
[Produtos complementares, gatilhos de oferta.]

### 12.3 Novos mercados/segmentos
[Geográficos ou demográficos.]

### 12.4 Novos formatos de oferta
[Assinatura, recorrência, ticket maior, etc.]

---

## Glossário e Definições

[Termos técnicos definidos para alinhar leitor não-técnico.]

---

## Histórico de Versões

| Versão | Data | Autor | Mudança Principal |
|--------|------|-------|-------------------|
| v1 | [data] | Opus 4.7 + [user] | Versão inicial |
```

### 3.3 Representação JSON paralela

Para consumo programático, o mesmo conteúdo é estruturado em JSON. Schema resumido:

```json
{
  "version": "v1",
  "tenant_id": "uuid",
  "project_id": "uuid",
  "status": "approved",
  "generated_at": "2026-05-21T10:00:00Z",
  "approved_at": "2026-05-21T15:30:00Z",
  "source_report_version": "uuid",
  "executive_summary": "string",
  "phases": {
    "phase_1_research": { ... },
    "phase_2_offer": { ... },
    "phase_3_unit_economics": {
      "ticket_medio_alvo": 297.00,
      "cac_alvo": 80.00,
      "cac_teto": 120.00,
      "ltv_estimado": 850.00,
      "payback_dias": 45,
      "ltv_cac_ratio": 10.6
    },
    "phase_4_positioning": { ... },
    "phase_5_funnel": { ... },
    "phase_6_assets": { ... },
    "phase_7_creative": { ... },
    "phase_8_measurement": { ... },
    "phase_9_rules_contingency": {
      "budget_diario_max": 5000.00,
      "budget_semanal_max": 30000.00,
      "max_increase_pct": 20,
      "triggers": [ ... ]
    },
    "phase_10_launch": { ... },
    "phase_11_optimization": { ... },
    "phase_12_expansion": { ... }
  }
}
```

---

## 4. Pipeline de geração — passo a passo técnico

### Passo 1 — Trigger
A geração pode ser iniciada por três caminhos:
- **Manual:** usuário clica "Gerar Big Flux" na tela do Módulo de Marketing.
- **Automática:** trigger do Supabase quando `metadata.marketing_strategy` é populado/atualizado pelo board.
- **API:** chamada externa autenticada (caso o board tenha sistema próprio).

### Passo 2 — Carga de contexto
Backend monta o pacote de contexto:
- Report atual (sanitizado).
- Dados do tenant (segmento, modelo, porte).
- Big Flux anteriores aprovados do mesmo tenant (se houver).
- Resultados históricos de campanhas (se houver).
- Restrições explícitas (budget cap global, plataformas vetadas).

### Passo 3 — Chamada ao Opus 4.7
Uma chamada estruturada usando o **prompt do Big Flux Architect** (documentado na seção 5). A resposta é solicitada em formato MD seguindo o template da seção 3.2.

Parâmetros recomendados:
- `model`: `claude-opus-4-7`
- `max_tokens`: 8000 (Big Flux completo é extenso; ajustar conforme experiência)
- `temperature`: 0.4 (criatividade controlada — queremos estratégia consistente, não imprevisível)

### Passo 4 — Validação determinística do output
Após recebimento do MD, código (não IA) verifica:
- Todas as 12 fases presentes (busca por cabeçalhos).
- Campos obrigatórios preenchidos (CAC alvo, ticket médio, métricas-meta).
- Coerência numérica (LTV > CAC, margem positiva, payback razoável).
- Parsing bem-sucedido do MD em JSON.

Se falhar, retorna ao modelo com feedback estruturado solicitando correção. Máximo de 2 retries antes de marcar como "needs human review".

### Passo 5 — Persistência como Draft
Big Flux gravado em `big_flux_documents` com `status = 'draft'`. UI notifica o usuário responsável que há um draft para revisar.

### Passo 6 — Revisão humana assistida
Usuário abre a tela de revisão. ORACULO está disponível na lateral, com contexto carregado (o Big Flux + o report-origem). Usuário pode:
- Ler o documento renderizado.
- Editar inline qualquer seção.
- Solicitar reescrita de uma seção ("ORACULO, reescreva a Fase 7 com foco em UGC").
- Comparar com versões anteriores (diff visual).
- Aprovar (`status` → `approved`) ou rejeitar (`status` → `archived`, com motivo).

### Passo 7 — Notificação downstream
Quando aprovado, sistema dispara evento `big_flux.approved` via Supabase Realtime. O sub-módulo de Gestão de Tráfego (Parte 2) escuta esse evento e atualiza o cache de constraints para aquele tenant.

---

## 5. Prompt do Big Flux Architect

O prompt é o coração do componente. Estrutura recomendada (system prompt para a chamada ao Opus 4.7):

```
Você é o Big Flux Architect, um estrategista sênior de marketing e
performance digital com 20+ anos de experiência. Sua missão é
transformar diretrizes estratégicas do Board of Directors em planos
operacionais executáveis e detalhados, cobrindo 12 fases que conectam
concepção de produto até expansão.

# Contexto do tenant
[INSERIR: nome do business, segmento, modelo, porte, restrições]

# Histórico (se houver)
[INSERIR: resumo de Big Flux anteriores, resultados de campanhas
passadas, gargalos identificados]

# Report do Board
[INSERIR: report completo sanitizado]

# Tarefa
Gere o Big Flux Document completo seguindo EXATAMENTE o template
abaixo. Não invente seções, não omita seções. Todas as 12 fases são
obrigatórias.

# Princípios obrigatórios
1. Coerência: cada fase deve dialogar com as outras. CAC da Fase 3
   deve ser consistente com canais da Fase 8 e budget da Fase 9.
2. Quantificação onde possível: prefira números a adjetivos. "CAC alvo
   R$ 80" é melhor que "CAC baixo".
3. Realismo: estimativas devem ser plausíveis para o segmento e porte.
   Não prometa LTV/CAC de 10 para e-commerce físico de ticket baixo.
4. Execução: cada fase deve ser acionável. Se um agente operacional ler
   a Fase 10, ele precisa saber EXATAMENTE como começar.
5. Compliance: respeite categorias sensíveis (saúde, finanças,
   emagrecimento, etc.) — sinalize na Fase 7.
6. Não invente dados: se uma informação crítica não está no report,
   sinalize como "A definir com o board" em vez de inventar.

# Formato de saída
Markdown estruturado idêntico ao template fornecido. Sem preâmbulo,
sem epílogo, sem blocos de código envolvendo o documento.

# Template
[INSERIR template completo da seção 3.2]
```

### 5.1 Diretrizes de evolução do prompt

O prompt é versionado em código (arquivo separado, ex.: `prompts/big_flux_architect.v1.txt`). Cada mudança gera nova versão. O `big_flux_documents` registra qual versão de prompt gerou cada documento — permite reproduzir o resultado e diagnosticar regressões.

---

## 6. Schema de banco de dados (Supabase)

### 6.1 Tabela `big_flux_documents`

```sql
CREATE TABLE big_flux_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  version INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'in_review', 'approved', 'archived', 'failed')),

  -- Conteúdo
  markdown_content TEXT NOT NULL,
  structured_data JSONB NOT NULL,
  executive_summary TEXT,

  -- Rastreabilidade
  source_report_snapshot JSONB NOT NULL, -- snapshot do report no momento da geração
  prompt_version TEXT NOT NULL,           -- ex: "big_flux_architect.v1"
  model_used TEXT NOT NULL,               -- ex: "claude-opus-4-7"

  -- Auditoria
  generated_by UUID,                      -- user que disparou a geração
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  archived_reason TEXT,

  -- Custo
  tokens_input INTEGER,
  tokens_output INTEGER,
  cost_usd NUMERIC(10, 4),

  -- Constraints
  UNIQUE (project_id, version)
);

CREATE INDEX idx_big_flux_tenant_status ON big_flux_documents(tenant_id, status);
CREATE INDEX idx_big_flux_project_version ON big_flux_documents(project_id, version DESC);

-- RLS
ALTER TABLE big_flux_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON big_flux_documents
  USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
```

### 6.2 View `big_flux_current`

Para acesso rápido ao Big Flux ativo de cada projeto:

```sql
CREATE VIEW big_flux_current AS
SELECT DISTINCT ON (project_id) *
FROM big_flux_documents
WHERE status = 'approved'
ORDER BY project_id, version DESC;
```

### 6.3 Tabela `big_flux_revisions`

Para rastrear edições humanas feitas em drafts antes da aprovação:

```sql
CREATE TABLE big_flux_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  big_flux_id UUID NOT NULL REFERENCES big_flux_documents(id),
  edited_by UUID NOT NULL,
  edited_at TIMESTAMPTZ DEFAULT NOW(),
  section TEXT NOT NULL,                  -- ex: "phase_7_creative"
  previous_content TEXT,
  new_content TEXT,
  reason TEXT
);
```

---

## 7. Versionamento e ciclo de vida

### 7.1 Estados possíveis

```
[Trigger] → draft → in_review → approved → archived
                       ↓
                    rejected → archived
                       ↓
              failed (validação técnica falhou)
```

### 7.2 Regras de versionamento

- Toda nova geração cria nova `version` para o mesmo `project_id`.
- Apenas uma versão por projeto pode ter `status = 'approved'` por vez. Ao aprovar uma nova, a anterior vira `archived` automaticamente.
- Versões `archived` permanecem consultáveis (para diff e auditoria).
- O sub-módulo de Tráfego sempre usa a versão `approved` mais recente.

### 7.3 Diff entre versões

A tela de revisão oferece comparação visual entre versões. Implementação:
- Diff a nível de seção (fase).
- Destaque de mudanças em campos numéricos críticos (CAC, LTV, budgets).
- Alerta se uma mudança de versão impactar campanhas ativas (ex.: novo Big Flux reduz CAC alvo — campanhas que estavam dentro do antigo podem precisar ser revistas).

---

## 8. Integração com ORACULO na tela de revisão

Quando o usuário abre o Big Flux para revisão, ORACULO está disponível como assistente lateral, com contexto pré-carregado:

- Big Flux atual (sendo revisado).
- Report-origem do board.
- Big Flux anteriores aprovados (para comparação).
- Resultados históricos relevantes do tenant.

### Capacidades de ORACULO neste contexto:

- **Explicar:** "Por que o Big Flux propôs CAC alvo de R$ 80?" — ORACULO consulta o racional e responde.
- **Desafiar:** "Esse LTV de R$ 850 é realista para nosso segmento?" — ORACULO contextualiza com benchmarks.
- **Sugerir:** "Reescreva a Fase 7 priorizando UGC em vez de produção interna" — ORACULO produz a sugestão; usuário aceita ou descarta.
- **Validar:** "Esse Big Flux está coerente com o que aprovamos no último trimestre?" — ORACULO compara versões.
- **Educar:** "O que é EMQ e por que está na Fase 8?" — ORACULO explica conceitos para usuários menos experientes.

### Limites de ORACULO nesta tela:

- Não publica nada sozinho. Toda sugestão precisa de aceitação humana.
- Não altera o Big Flux diretamente — propõe edição que o usuário aplica via interface.
- Toda interação é logada em `oracle_conversations` para auditoria.

---

## 9. UX da tela de revisão (especificação funcional)

### 9.1 Layout sugerido

```
┌─────────────────────────────────────────────────────────────────┐
│  Big Flux Document — [Projeto X]              v2  ●Em Revisão  │
│  [Comparar com v1] [Histórico] [Exportar PDF] [Aprovar/Rejeitar]│
├──────────────────────────────────────┬──────────────────────────┤
│                                       │                          │
│  [Sumário Executivo]                  │   ORACULO                │
│  [Fase 1 — Pesquisa]      ▼          │   ─────────              │
│  [Fase 2 — Oferta]        ▼          │   Olá! Estou aqui pra    │
│  [Fase 3 — Unit Economics] ▼ ⚠       │   ajudar a revisar este  │
│      CAC alvo: R$ 80 [editar]        │   Big Flux. Algumas      │
│      LTV: R$ 850 [editar]            │   sugestões:             │
│      ...                              │                          │
│  [Fase 4 — Posicionamento] ▼          │   • LTV/CAC = 10.6 está │
│  ...                                  │     acima do benchmark   │
│  [Fase 12 — Expansão]     ▼          │     do segmento (4-6).   │
│                                       │     Vale revisar?        │
│                                       │   • Fase 9 não tem      │
│                                       │     trigger para         │
│                                       │     frequência alta.    │
│                                       │                          │
│                                       │   [Caixa de chat]        │
└──────────────────────────────────────┴──────────────────────────┘
```

### 9.2 Ações disponíveis

- **Editar inline:** clicar em qualquer campo abre editor local.
- **Reescrever via ORACULO:** "Reescreva esta seção com foco em X".
- **Comparar versões:** mostra diff lado a lado.
- **Marcar pendência:** sinalizar campos que precisam de definição do board.
- **Aprovar:** muda status para `approved`; dispara evento downstream.
- **Rejeitar:** muda status para `archived` com motivo; pode disparar nova geração.

---

## 10. Tratamento de casos especiais

### 10.1 Report incompleto
Se o report do board não tem informação suficiente para uma fase, o Big Flux marca a fase com tag **[Pendente Board]** e detalha o que falta. O usuário pode aprovar o documento parcialmente e solicitar complemento do board.

### 10.2 Conflito com Big Flux anterior
Se há campanhas ativas baseadas em uma versão anterior aprovada, e a nova versão muda parâmetros críticos (CAC, budget, posicionamento), o sistema:
1. Aprova a nova versão.
2. Lista as campanhas potencialmente impactadas.
3. Notifica o gestor de tráfego.
4. Não pausa nada automaticamente — decisão é humana.

### 10.3 Falha de geração
Se Opus 4.7 falha (timeout, erro de API, resposta malformada após 2 retries), o status vira `failed`. Usuário é notificado e pode:
- Tentar nova geração (próxima `version`).
- Revisar e ajustar o report-origem antes de tentar de novo.
- Reportar à equipe técnica.

### 10.4 Custos elevados
Cada geração de Big Flux usa ~6-10k tokens de saída do Opus 4.7 (modelo premium). Custo estimado: US$ 0.50 a US$ 1.00 por geração. O sistema registra custo em `big_flux_documents.cost_usd` para visibilidade e budgeting.

---

## 11. Métricas de qualidade do componente

Métricas para acompanhar a saúde do Big Flux Generator em produção:

- **Taxa de aprovação na primeira geração:** % de Big Flux aprovados sem regeneração. Meta: >70%.
- **Taxa de edição humana:** % de seções editadas pelo usuário antes de aprovar. Meta: <30% das seções.
- **Tempo médio de revisão:** do draft à aprovação. Meta: <2 horas por documento.
- **Latência de geração:** tempo da requisição à entrega do MD. Meta: <90 segundos.
- **Custo médio por documento:** Meta: <US$ 1.00.
- **Coerência downstream:** % de campanhas que o Auditor (Parte 2) aprova sem conflito com Big Flux. Meta: >90%.

---

## 12. Roadmap de implementação (Onda 1)

**Estimativa:** 4-6 semanas com equipe de 2-3 devs + 1 product designer.

### Sprint 1 (semana 1-2): Fundação
- Migrations das tabelas `big_flux_documents` e `big_flux_revisions`.
- Setup do SDK Anthropic com Opus 4.7.
- Prompt v1 do Big Flux Architect (com revisão por especialista de domínio).
- Endpoint de trigger de geração.
- Validador determinístico básico.

### Sprint 2 (semana 3-4): Pipeline completo
- Pipeline ponta a ponta funcionando (trigger → geração → validação → persistência).
- Tela de revisão (read-only).
- Sistema de versionamento.
- Logs e métricas básicas.

### Sprint 3 (semana 5-6): UX e ORACULO
- Edição inline na tela de revisão.
- Integração com ORACULO (versão básica — chat com contexto carregado).
- Diff entre versões.
- Aprovação/rejeição com eventos downstream.
- Testes de regressão com Big Flux de diferentes verticais.

### Pós-onda 1 (futuro)
- Geração assistida por templates específicos por vertical (e-commerce físico vs. SaaS vs. infoproduto).
- Sugestões proativas do ORACULO baseadas em padrões de tenants similares.
- Exportação para PDF formatado.
- API pública para sistemas externos consumirem o Big Flux estruturado.

---

## 13. Dependências e bloqueios para iniciar

Antes de começar Sprint 1, é necessário:

- [ ] Acesso confirmado ao Anthropic API com cota para Opus 4.7.
- [ ] Definição final do schema do report do board (anexo está como referência; pode haver evolução).
- [ ] Definição de quem é o "usuário aprovador" do Big Flux por tenant (papel, permissão).
- [ ] Padrão de autenticação e tenant isolation já estabelecido no Builder Business (vai ser herdado).
- [ ] Decisão sobre framework de UI (qual editor de texto será usado na tela de revisão — TipTap, ProseMirror, ou plain textarea para v1).
- [ ] Aprovação do prompt v1 do Big Flux Architect por um especialista sênior de marketing da empresa (garantir que reflete a visão estratégica da casa).

---

## 14. Considerações finais

O Big Flux Generator é o componente de maior impacto estratégico do sistema. Ele determina a qualidade de tudo que vem depois — se o Big Flux é ruim, as campanhas serão ruins, por mais bem executadas que sejam.

Por isso, três decisões merecem cuidado especial:

1. **A qualidade do prompt v1 não é negociável.** Invista tempo de especialistas seniores nele. Ele vai evoluir, mas a v1 precisa ser excelente.

2. **A revisão humana é parte do design, não um workaround.** O sistema é projetado assumindo que o Opus 4.7 produz 80-90% do trabalho, e o humano refina os 10-20% finais. Isso é deliberado.

3. **Versionamento desde o dia 1.** Não tente "implementar depois". Big Flux sem versionamento vira inferno operacional rápido.

---

**Próximo documento:** Parte 2 — Sub-módulo de Gestão de Tráfego Pago (Multi-tenant)
