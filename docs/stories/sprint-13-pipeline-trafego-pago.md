# Sprint 13 — Pipeline de Gestão de Tráfego Pago

> **Épico:** Sub-módulo executor (Parte 2) + agentes operacionais (Parte 3). **Pilares:** P1, P2, P3, P6 (e P4/P5 transversais).
> **Sprint dedicada** — todos os recursos e fluxos de trabalho explicados criteriosamente.
> **Pré-requisitos:** S0 (fundação completa), S3 (Unit Economics), S7 (Criativos), S8 (Mensuração), S9 (Contingência), S10 (Lançamento).
> **Referências:** Parte 2 (integral), Parte 3 §4.2-4.9, §5.2-5.4.

---

## 0. Mapa da sprint

O sub-módulo transforma o Big Flux aprovado em campanhas reais, executando a espinha dorsal de **10 etapas com gates determinísticos**, orquestrando **8 agentes operacionais** via Traffic Orchestrator e publicando através de **adapters** Meta/Google. Governança por **blast radius** e **HITL**.

```
TrafficConstraints (cache) ─► Traffic Orchestrator (state machine + gates)
   │                                  │ invoca (nunca agente→agente)
   ▼                                  ▼
Etapas 1..10 ──► EST·CW·DC·CFG·AUD·ANL·OTM   ◄── SEN (loop 24/7)
                            │
                            ▼ (só CFG chama)
                     Camada de Adapters ──► Meta API / Google API
```

**Grupos de stories:** A) cache & constraints · B) state machine das 10 etapas & gates · C) agentes operacionais (8) · D) adapters Meta/Google · E) blast radius & fila de aprovações · F) Sentinela & contingência · G) otimização & análise · H) UX (6 telas) · I) custo & observabilidade.

---

## A. Cache de Big Flux & TrafficConstraints

### [S13.A1] Cache de TrafficConstraints por tenant com invalidação por evento
- **Pilares:** P1, P6
- **User story:** Como agente, quero ler `TrafficConstraints` de um cache rápido por tenant, para decidir sem consultar o banco a cada vez.
- **Contexto ampliado:** Parte 2 §3.1/§5.4 — ao abrir o sub-módulo carrega `big_flux_current` e extrai `TrafficConstraints`; cache (Redis/in-process) TTL curto ou invalidação via `big_flux.approved`. Agentes leem do cache.
- **Critérios de aceitação:**
  1. Given um tenant sem Big Flux aprovado, When abre o sub-módulo, Then bloqueia: "Você precisa de um Big Flux aprovado antes de criar campanhas."
  2. Given `big_flux.approved` emitido, When recebido, Then cache é invalidado e recarregado, e campanhas ativas baseadas na versão anterior são listadas para conflito (Parte 2 §3.2).
  3. Given leitura de constraint, When um agente consulta, Then vem do cache (não do banco).
- **Tarefas técnicas:** `TrafficConstraintsCache`; assinatura do evento; rotina de detecção de campanhas impactadas; bloqueio de criação sem Big Flux.
- **DoD:** cache + invalidação testados; bloqueio sem Big Flux; lista de impacto.
- **Dependências:** S0.10, S3.3, S10.3

### [S13.A2] Fluxo "Solicitar revisão do Big Flux" (governança P1)
- **Pilares:** P1, P3
- **User story:** Como Gestor de Tráfego, quero solicitar mudança no Big Flux (ex.: relaxar CAC) sem alterá-lo direto, para preservar a governança estratégia↔execução.
- **Contexto ampliado:** Parte 2 §3.3 — o tráfego não inventa estratégia; abre formulário pré-preenchido que vai ao Aprovador/board; se aprovado, gera nova versão.
- **Critérios de aceitação:**
  1. Given um gestor querendo aumentar CAC alvo, When solicita, Then um formulário pré-preenchido vai ao Aprovador (não muda o Big Flux).
  2. Given aprovação, When concedida, Then nova versão do Big Flux é gerada e o cache recarrega.
- **Tarefas técnicas:** formulário de solicitação; roteamento ao aprovador; ligação com geração de nova versão.
- **DoD:** solicitação não muta Big Flux; aprovação gera versão.
- **Dependências:** S13.A1, S12.3

---

## B. State machine das 10 etapas & gates determinísticos

### [S13.B1] State machine das 10 etapas e estados da campanha
- **Pilares:** P2, P5
- **User story:** Como sistema, quero uma máquina de estados que percorra as 10 etapas com gates, para que nenhuma campanha avance sem validação.
- **Contexto ampliado:** Parte 2 §4.1/§4.2 — estados: `draft → tracking_ready → creative_ready → structure_ready → config_ready → audited → published → learning → optimizing → scaling → contingency? → ended/archived`. Estado regride se gate falha em revalidação.
- **Critérios de aceitação:**
  1. Given uma campanha em `draft`, When gate Etapa 1 passa, Then vai a `tracking_ready`; se falha, permanece com issues.
  2. Given revalidação que falha, When ocorre, Then o estado regride.
  3. Given cada transição, When acontece, Then é persistida em `campaigns.status/current_stage` + log.
- **Tarefas técnicas:** state machine das 10 etapas sobre o orchestrator base (S0.7); persistência; testes de transição.
- **Schema:** `campaigns` (Parte 2 §7.1) com RLS.
- **DoD:** todas as transições testadas; regressão de estado; cobertura ≥90%.
- **Dependências:** S0.7, S13.A1

### [S13.B2] Os 10 gates determinísticos (código puro, P2)
- **Pilares:** P2
- **User story:** Como sistema, quero um gate por etapa que valide regras sem LLM, para que a aprovação seja determinística, testável e auditável.
- **Contexto ampliado:** Parte 2 §4.1 (tabela de gates) e §4.3 (exemplo do gate da Etapa 6). Cada gate retorna `{passed, issues[]}`; issues `block` impedem avanço, `warn` permitem com confirmação humana.
- **Critérios de aceitação (por etapa):**
  1. **G1 Pré-campanha:** objetivo dentro do Big Flux, KPIs definidos, budget ≤ `budget_diario_max` ⇒ senão `block`.
  2. **G2 Tracking:** pixel verificado + CAPI ativo + eventos disparando + UTM implementável.
  3. **G3 Criativos:** ≥N criativos por ângulo, formatos válidos, compliance ok.
  4. **G4 Estrutura:** naming convention, sem canibalização, budget total ok.
  5. **G5 Config:** lance, audiências, exclusões, evento de otimização, UTMs presentes.
  6. **G6 Pré-publicação:** checklist completo (tracking+copy+criativo+UTM+budget+landing) — conforme `gate_etapa_6` da Parte 2 §4.3.
  7. **G7 Publicação:** confirmação humana presente (`confirmation_token`).
  8. **G8 Otimização:** ação dentro de janela mínima (3-7d) e blast radius.
  9. **G9 Escala:** aumento ≤ `max_increase_pct`, ROAS sustentado, aprovação humana p/ passos grandes.
  10. **G10 Contingência:** trigger monitorado, retrospectiva gerada.
- **Tarefas técnicas:** implementar `gate_etapa_1..10`; reutilizar `GateResult`; testes positivos/negativos por gate; integração com a state machine.
- **DoD:** 10 gates implementados; cobertura ≥90%; nenhum gate usa LLM (P2).
- **Dependências:** S13.B1, S8.3, S9.4

---

## C. Agentes operacionais (8)

> Todos seguem o envelope `AgentInvocation/AgentResponse` (S0.8), são **stateless**, logam em `agent_executions`, e respeitam `blast_radius`. Modelos conforme Parte 3 §2.1.

### [S13.C1] Estrategista (Sonnet) — propõe estrutura de campanha
- **Pilares:** P1
- **Premium:** §7 (balanced), §10
- **User story:** Como Gestor, quero uma proposta de estrutura alinhada ao Big Flux, para começar uma campanha sem desenhar do zero.
- **Contexto ampliado:** Parte 3 §4.2 — input `TrafficConstraints` + briefing; output `proposal` (plataforma, tipo, conjuntos, budget ≤ limite, KPIs herdados) + `rationale` + `alternatives` + `flags`. Nunca propõe fora do Big Flux; plataforma vetada não é proposta.
- **Critérios de aceitação:**
  1. Given briefing pedindo plataforma vetada, When propõe, Then sinaliza em `flags.risks` e não a usa.
  2. Given uma proposta, When retornada, Then budget ≤ `budget_diario_max` e KPIs = Fase 3.
  3. Given "pedir alternativa", When solicitado, Then retorna 1-2 alternativas.
- **Tarefas técnicas:** prompt-contract `estrategista.v1`; schema I/O; validação pós-modelo (conformidade com Big Flux).
- **DoD:** conformidade 100% (Auditor confirma); latência <15s p95; log + custo.
- **Dependências:** S0.8, S10.3, S13.A1

### [S13.C2] Copywriter (Sonnet) — hooks, headlines, descrições, primary text
- **Pilares:** P1, P5
- **User story:** Como Gestor, quero variações de copy por ângulo respeitando tom e compliance, para alimentar os criativos.
- **Contexto ampliado:** Parte 3 §4.3 — input ângulos/tom/compliance + request (tipo, ângulo, quantidade, plataforma, max_chars); output `variations[]` com `estimated_compliance`. Validação pós-modelo: char count, regex de termos proibidos, descarta `block`.
- **Critérios de aceitação:**
  1. Given `restricoes_compliance` (saúde), When gera, Then é conservador e marca `risk`.
  2. Given `max_chars`, When gera, Then nenhuma variação excede (validação pós-modelo descarta).
  3. Given variações, When retornadas, Then cada uma é distinta em estrutura, não só em palavras.
- **Tarefas técnicas:** prompt-contract `copywriter.v1`; validador de char/termos; reference winners da KB tenant.
- **DoD:** taxa de bloqueio por política <5% (meta); log + custo.
- **Dependências:** S0.8, S7.3, S13.A1

### [S13.C3] Diretor de Criativo (Sonnet) — briefings de criativo
- **Pilares:** P1
- **User story:** Como Gestor, quero briefings executáveis de vídeo/imagem por ângulo, para produzir criativos consistentes.
- **Contexto ampliado:** Parte 3 §4.4 — output `briefings[]` com `hook_visual`, `hook_textual`, `estrutura[]` (cenas), `cta_final`, `notas_producao`, `compliance_warnings`. Foco em performance, não branding.
- **Critérios de aceitação:**
  1. Given um ângulo, When gera briefing, Then é executável por um leigo (gestor entende e produz).
  2. Given fadiga criativa detectada (S13.F/G), When Otimizador pede "novos criativos", Then gera variações com novo ângulo.
- **Tarefas técnicas:** prompt-contract `diretor.v1`; schema; ligação com `dropzone` de referência (DS v2) para consistência visual.
- **DoD:** briefings executáveis; diversidade de ângulos; log + custo.
- **Dependências:** S0.8, S7.3

### [S13.C4] Configurador (Sonnet + código) — monta spec e publica via adapter
- **Pilares:** P3, P6
- **User story:** Como sistema, quero um agente que mapeia a proposta em `CampaignSpec` e publica via adapter com confirmação humana, para executar com segurança.
- **Contexto ampliado:** Parte 3 §4.5 — **único agente que invoca o adapter**. Raciocínio LLM para mapear `EstrategistaOutput → CampaignSpec`, interpretar erros e escolher evento de otimização; **execução (chamada API) é código**. Tasks: `verify_tracking | build_spec | publish | update | pause | unpause`. Publicar exige `confirmation_token` (P3).
- **Critérios de aceitação:**
  1. Given task `publish` sem `confirmation_token`, When chamada, Then retorna `HUMAN_REQUIRED` (não publica).
  2. Given publicação, When confirmada, Then publica em `paused` (rascunho), retorna `preview_url`, e só vira `active` após confirmação.
  3. Given `update budget`, When acima de `max_increase_pct`, Then `BLAST_RADIUS_EXCEEDED`.
  4. Given erro do adapter, When ocorre, Then traduz para issue acionável (100%).
- **Tarefas técnicas:** prompt-contract `configurador.v1`; mapper `CampaignSpec`; integração com adapters (S13.D); idempotência (`idempotency_key`).
- **DoD:** publish exige confirmação; blast radius respeitado; >90% publicação 1ª tentativa.
- **Dependências:** S0.8, S0.9, S13.B2

### [S13.C5] Auditor (Haiku + código) — validação pré-publicação
- **Pilares:** P2, P3
- **User story:** Como sistema, quero um auditor híbrido (80% código + Haiku para semântica) que aprova/bloqueia, para garantir conformidade antes de publicar.
- **Contexto ampliado:** Parte 3 §4.6 — maioria dos checks é determinística; Haiku só para avaliação semântica de copy ("promessa absoluta?") e coerência criativo↔oferta. Scopes: `pre_publication | big_flux_change | pre_scale`. Recebe flag de compliance da Fase 7 (S7.2).
- **Critérios de aceitação:**
  1. Given `scope=pre_publication`, When audita, Then roda o checklist da Etapa 6 e retorna `passed` + `issues[]` categorizadas.
  2. Given Big Flux mudou, When `scope=big_flux_change`, Then verifica campanhas ativas (budget>novo max? ângulo removido?).
  3. Given copy com promessa absoluta, When Haiku avalia, Then issue `block` categoria compliance.
- **Tarefas técnicas:** pipeline híbrida (código→Haiku); prompt-contract `auditor.v1`; categorias de issue; falso negativo <2% (meta).
- **DoD:** checklist completo; híbrido funciona; latência <8s p95.
- **Dependências:** S0.8, S13.B2, S7.2

### [S13.C6] Analista (Sonnet) — insights, causa raiz, briefings, retrospectivas
- **Pilares:** P2, P5
- **User story:** Como Gestor, quero briefings diários e análise de causa raiz, para entender o que está acontecendo e por quê.
- **Contexto ampliado:** Parte 3 §4.7 — scopes `daily_briefing | root_cause | campaign_retrospective | monthly_review`. Recebe `metrics_snapshots` pré-agregados pelo orquestrador. Análise de causa raiz estruturada (o que/quando/onde/hipóteses ranqueadas) — Parte 2 §12.3. Persiste aprendizados na KB tenant.
- **Critérios de aceitação:**
  1. Given dados do dia, When `daily_briefing`, Then retorna headline + highlights + sugestões acionáveis (>60% com ação).
  2. Given "por que CAC subiu 40%?", When `root_cause`, Then retorna hipóteses ranqueadas (top-1 acerta >50%).
  3. Given retrospectiva, When `campaign_retrospective`, Then gera `knowledge_base_updates`.
- **Tarefas técnicas:** prompt-contract `analista.v1`; pré-agregação de métricas; mapper KB; jobs agendados (cron por tenant).
- **DoD:** briefings acionáveis; causa raiz estruturada; KB atualizada.
- **Dependências:** S0.8, S13.I1

### [S13.C7] Otimizador (Sonnet) — propõe ações dentro do blast radius
- **Pilares:** P3
- **User story:** Como sistema, quero um otimizador que proponha pausar/escalar/redistribuir respeitando blast radius e volume mínimo, para melhorar sem risco.
- **Contexto ampliado:** Parte 3 §4.8 — output `proposed_actions[]` com `within_blast_radius`, `requires_human_approval`, `minimum_data_satisfied`, `confidence`, `risk_level`. Thresholds da Fase 11 (S11.2). Tabela de blast radius default (§4.8).
- **Critérios de aceitação:**
  1. Given critério estatístico não satisfeito, When propõe, Then `minimum_data_satisfied=false` e não executa.
  2. Given pausar criativo individual, When proposto, Then `within_blast_radius=true` (executa via Configurador).
  3. Given aumentar budget >20%, When proposto, Then `requires_human_approval=true` (vai à fila).
- **Tarefas técnicas:** prompt-contract `otimizador.v1`; integração com thresholds (S11.2) e `BlastRadiusConfig` (S9.4); encadeamento com Analista.
- **DoD:** blast radius respeitado; >70% das ações fora do radius aprovadas por humano (qualidade).
- **Dependências:** S0.8, S11.2, S9.4, S13.E1

### [S13.C8] Sentinela (Haiku + código) — monitoramento 24/7
- **Pilares:** P2, P3
- **User story:** Como sistema, quero um sentinela que detecte anomalias por código e dispare contingência, para proteger o investimento continuamente.
- **Contexto ampliado:** Parte 3 §4.9 + Parte 2 §11 — majoritariamente código: consulta `campaign_metrics_snapshots`, aplica `TriggerRule[]` compiladas (S9.2). Haiku só classifica casos ambíguos (webhook de política) e compõe notificação. Cadências: métricas 30min, conversões 1h, health 6h, real-time via webhook. Anti-flapping (dedup window). Prefere falso positivo a negativo.
- **Critérios de aceitação:**
  1. Given trigger crítico com playbook no Big Flux, When detecta, Then executa playbook (código) + notifica imediatamente + registra `contingency_event`.
  2. Given mesma condição contínua, When persiste, Then não dispara repetido dentro da dedup window.
  3. Given webhook "ad disapproved policy X", When ambíguo, Then Haiku traduz para categoria conhecida.
  4. Given anomalia crítica, When detectada, Then latência detecção→alerta <5min.
- **Tarefas técnicas:** loop de jobs por cadência; avaliador de triggers (S9.2); webhooks Meta/Google; classificador Haiku; composição de notificação; anti-flapping.
- **DoD:** falso negativo <1%; latência crítica <5min; anti-flapping testado.
- **Dependências:** S0.8, S9.2, S13.D1, S13.F1

---

## D. Adapters Meta & Google

### [S13.D1] MetaAdapter funcional (criar/pausar/atualizar/métricas/health/policy)
- **Pilares:** P6
- **User story:** Como Configurador/Sentinela, quero um MetaAdapter completo, para operar campanhas em Meta sem conhecer a API.
- **Contexto ampliado:** Parte 2 §8.2 — Marketing API v19+, CAPI server-side + EMQ, eventos mapeados, tipos Sales/Leads na v1, naming convention, rate limits, categorias especiais. Erro padronizado `AdapterResult`.
- **Critérios de aceitação:**
  1. Given `createCampaign(spec)`, When publica em sandbox, Then retorna `ExternalCampaign` ou `AdapterResult.error` padronizado.
  2. Given rate limit, When atingido, Then retorna `retryable` com `retry_after_seconds`.
  3. Given conta bloqueada (webhook), When recebida, Then `fetchAccountHealth` reflete e Sentinela é acionado.
  4. Given categoria especial, When publica, Then exige declaração.
- **Tarefas técnicas:** implementar `TrafficPlatformAdapter` para Meta; CAPI/EMQ; mapa de erros; cobertura de testes (API muda — canary).
- **DoD:** CRUD + métricas + health + policy em sandbox; erros normalizados.
- **Dependências:** S0.9

### [S13.D2] GoogleAdapter (Search + Performance Max)
- **Pilares:** P6
- **User story:** Como Configurador, quero um GoogleAdapter para Search e Performance Max, para operar campanhas Google pela mesma interface.
- **Contexto ampliado:** Parte 2 §8.3 — Google Ads API v17+, conversion + GA4 import, Enhanced Conversions, MCC, Performance Max é blackbox (documentar limitações).
- **Critérios de aceitação:**
  1. Given Search campaign, When criada, Then keywords + conversion tracking configurados.
  2. Given Performance Max, When criada, Then asset groups + expectativa de blackbox documentada ao gestor.
  3. Given erro de domínio não aprovado, When ocorre, Then issue acionável.
- **Tarefas técnicas:** adapter Google (mesma interface); MCC; Enhanced Conversions; documentação de limitações PMax.
- **DoD:** Search + PMax em sandbox; mesma interface do Meta.
- **Dependências:** S0.9

---

## E. Blast radius & fila de aprovações (HITL)

### [S13.E1] Motor de blast radius + fila de aprovações
- **Pilares:** P3
- **User story:** Como Gestor, quero que ações grandes esperem minha aprovação com racional e impacto, para manter controle sobre a automação.
- **Contexto ampliado:** Parte 2 §10 — cada ação tem blast radius; excedente vai à fila. Defaults conservadores configuráveis por tenant; relaxa com confiança. Fila mostra ação, agente, racional, impacto estimado, prazo.
- **Critérios de aceitação:**
  1. Given ação fora do radius, When proposta, Then entra na fila e registra `proposed_by_agent`.
  2. Given aprovação, When concedida, Then executa via Configurador e registra `approved_by`.
  3. Given config de tenant, When ajustada, Then novos limites valem para próximas ações.
  4. Given ação dentro do radius, When proposta, Then executa automaticamente e registra `campaign_actions`.
- **Tarefas técnicas:** `BlastRadiusEngine`; tabela/serviço de fila; UI de aprovações; tabela `campaign_actions` (Parte 2 §7.4).
- **Schema:** `campaign_actions` com RLS.
- **DoD:** fila funcional; toda ação registrada com proposer/approver; defaults conservadores.
- **Dependências:** S0.7, S9.4

---

## F. Sentinela & contingência

### [S13.F1] Playbooks de contingência (código) + failover de BM/MCC
- **Pilares:** P2, P3
- **User story:** Como sistema, quero playbooks de código acionados por trigger, para responder a incidentes (conta bloqueada, CAC explodindo) com rapidez.
- **Contexto ampliado:** Parte 3 §4.9 (playbooks são código), Parte 2 §9.3/§17 — `account_blocked` (pausa tudo + notifica + prepara failover sem executar sem humano), `cac_explosion` (pausa pior ad set + reduz 50% + pede causa raiz + notifica). Credenciais backup em `platform_credentials` (`is_backup`).
- **Critérios de aceitação:**
  1. Given `account_blocked`, When dispara, Then pausa campanhas da conta, notifica urgente, registra `contingency_event` e prepara (não executa) failover.
  2. Given `cac_explosion`, When dispara, Then executa as 4 ações e solicita causa raiz ao Analista.
  3. Given failover de BM, When necessário, Then exige confirmação humana (P3).
- **Tarefas técnicas:** registry de playbooks (código); `contingency_events` (Parte 2 §7.6); `platform_credentials` cifrada (Supabase Vault); failover.
- **Schema:** `contingency_events`, `platform_credentials` com RLS.
- **DoD:** playbooks idempotentes; failover HITL; eventos registrados.
- **Dependências:** S13.C8, S13.E1

---

## G. Otimização & análise

### [S13.G1] Workflow de otimização diária (encadeamento Analista→Otimizador→Configurador)
- **Pilares:** P2, P3
- **User story:** Como Gestor, quero uma rotina diária que analise, proponha e execute (dentro do radius) automaticamente, para otimizar sem trabalho manual.
- **Contexto ampliado:** Parte 3 §5.3 — cron por tenant: coleta métricas 24h → Analista (daily_briefing) → para cada sugestão: Otimizador refina com blast radius → within_radius executa via Configurador, senão fila → persiste briefing + notifica.
- **Critérios de aceitação:**
  1. Given cron diário, When dispara, Then encadeia Analista→Otimizador respeitando blast radius.
  2. Given janela de aprendizado (72-168h), When campanha ainda aprende, Then Otimizador não age (exceto exceções da Sentinela — Parte 2 §6 Passo 10).
  3. Given briefing gerado, When concluído, Then gestor é notificado e nada é executado fora do radius sem aprovação.
- **Tarefas técnicas:** workflow encadeado no orchestrator; respeito à janela de aprendizado; agendamento por tenant.
- **DoD:** encadeamento testado; janela de aprendizado respeitada; ações registradas.
- **Dependências:** S13.C6, S13.C7, S13.C4

---

## H. UX do sub-módulo (6 telas, DS v2, mobile-first)

### [S13.H1] Wizard de Nova Campanha (stepper 10 etapas)
- **Pilares:** P1, P2, P3
- **Design System:** `stepper` (10 etapas), `coach` por etapa, validação ao vivo do gate, `prog-friendly`, `friendly-error`, `celebrate` na publicação.
- **User story:** Como Gestor, quero um wizard que me guie pelas 10 etapas mostrando o que falta para passar cada gate, para criar campanhas sem erro.
- **Contexto ampliado:** Parte 2 §6 (fluxo 14 passos) + §9.3 (desenho do wizard). Cada etapa mostra inputs, validação em tempo real e o que falta. ORACULO embedded.
- **Critérios de aceitação:**
  1. Given uma etapa, When o gate tem issue `block`, Then o stepper não avança e mostra o que falta em linguagem do usuário.
  2. Given issue `warn`, When confirmo, Then avanço.
  3. Given publicação, When confirmada (`confirmation_token`), Then `celebrate` + estado `published`.
  4. Given mobile, When uso o wizard, Then uma decisão por tela, toque ≥48px.
- **Tarefas técnicas:** wizard com stepper; binding aos gates (S13.B2); confirmação de publicação; ORACULO embedded (S14).
- **DoD:** 10 etapas navegáveis; gates ao vivo; celebrate; mobile.
- **Dependências:** S0.3, S13.B2, S13.C1-C5

### [S13.H2] Dashboard de Tráfego (KPIs agregados + alertas)
- **Pilares:** P4, P5
- **Design System:** cards de KPI, badges de status, alertas ativos.
- **User story:** Como Gestor, quero ver gasto/conversões/CAC/ROAS de hoje e alertas, para ter o pulso da operação.
- **Contexto ampliado:** Parte 2 §9.1 — filtros por plataforma/status/performance; alertas (contingências em curso, campanhas com problema).
- **Critérios de aceitação:**
  1. Given campanhas do tenant, When abro o dashboard, Then vejo KPIs agregados e alertas ativos (só do meu tenant — P4).
  2. Given filtros, When aplico, Then a visão atualiza.
- **Tarefas técnicas:** dashboard; agregação por tenant; alertas em tempo real.
- **DoD:** KPIs corretos; isolamento por tenant; alertas.
- **Dependências:** S0.3, S13.I1

### [S13.H3] Detalhe de Campanha, Configuração de Contas, Histórico/Auditoria, Playbooks
- **Pilares:** P3, P5, P6
- **Design System:** timeline de ações, logs de agentes, sugestões pendentes, `dropzone` para conectar contas.
- **User story:** Como Gestor, quero ver detalhe da campanha, conectar contas, auditar o histórico e testar playbooks, para operar com transparência total.
- **Contexto ampliado:** Parte 2 §9.1 telas 2,4,5,6 — Detalhe (métricas tempo real, histórico de ações, sugestões, ORACULO); Contas (conecta BM/MCC, marca primária/backup); Histórico (toda ação humana/automática, mudança de estado, contingência); Playbooks (triggers ativos + modo de teste simulado).
- **Critérios de aceitação:**
  1. Given uma campanha, When abro o detalhe, Then vejo métricas, ações, sugestões pendentes e logs de agentes.
  2. Given a tela de contas, When conecto um BM, Then credencial é cifrada (`platform_credentials`) e posso marcar backup.
  3. Given o histórico, When filtro por agente/período, Then vejo a linha do tempo completa.
  4. Given um playbook, When executo em modo teste, Then vejo o efeito simulado sem ação real.
- **Tarefas técnicas:** 4 telas; integração com `campaign_actions`, `platform_credentials`, `contingency_events`; modo de teste de playbook.
- **DoD:** 4 telas funcionais; credenciais cifradas; auditoria completa; teste de playbook dry-run.
- **Dependências:** S0.3, S13.E1, S13.F1

---

## I. Custo & observabilidade

### [S13.I1] Coleta de métricas, snapshots e custo de IA por campanha/tenant
- **Pilares:** P4, P5
- **User story:** Como Super-admin, quero métricas de campanha e custo de IA segregados por tenant, para visibilidade e billing.
- **Contexto ampliado:** Parte 2 §7.3 (`campaign_metrics_snapshots`), §13 (custo de IA por tenant), §14 (observabilidade). Alertas operacionais distintos dos triggers de campanha (adapter erro >5%, agente latência >30s, Sentinela não rodou em 60min).
- **Critérios de aceitação:**
  1. Given coleta periódica, When roda, Then grava `campaign_metrics_snapshots` (impressões, cliques, conversões, spend, revenue, CAC, ROAS, frequência) com `raw_payload`.
  2. Given execuções de agente, When registradas, Then custo de IA agrega por campanha/tenant.
  3. Given alerta operacional, When disparado, Then vai ao canal de engenharia (não ao gestor).
- **Tarefas técnicas:** coletor de métricas via adapters; `campaign_metrics_snapshots` com RLS; agregação de custo (liga S0.5); alertas operacionais.
- **Schema:** `campaign_metrics_snapshots`, `campaign_validations` (Parte 2 §7.2/§7.3).
- **DoD:** snapshots gravados; custo por tenant; alertas operacionais separados.
- **Dependências:** S0.5, S13.D1

---

## Fluxo de referência — Nova campanha (ponta a ponta, Parte 2 §6 / Parte 3 §5.2)

```
1  Gestor inicia wizard (bloqueia se não há Big Flux aprovado)
2  Orquestrador carrega TrafficConstraints + briefing
3  Estrategista propõe estrutura ──► Gate 1
4  Configurador verify_tracking ──► Gate 2
5  Copywriter + Diretor (paralelo) ──► Gate 3
6  Configurador build_spec (estrutura) ──► Gate 4
7  Configurador config técnica ──► Gate 5
8  Auditor pré-publicação ──► Gate 6
9  Preview ao gestor ──► confirmação (confirmation_token)
10 Configurador publish (paused→active) ──► published → learning
11 Janela de não-interferência (72-168h; Sentinela monitora, Otimizador não age)
12 Otimização ativa (Analista→Otimizador, blast radius)
13 Escala (Gate 9, HITL para passos grandes)
14 Contingência se trigger (Sentinela→playbook) · Encerramento→retrospectiva
```

---

## DoD da Sprint 13
- [ ] State machine das 10 etapas com 10 gates determinísticos cobertura ≥90% (P2).
- [ ] 8 agentes operacionais stateless, logados, respeitando blast radius (P3/P5).
- [ ] Agentes nunca chamam adapter direto — só Configurador (P6).
- [ ] MetaAdapter + GoogleAdapter com erro padronizado em sandbox (P6).
- [ ] Blast radius + fila de aprovações com proposer/approver registrados (P3).
- [ ] Sentinela 24/7 + playbooks + failover HITL; falso negativo <1% (P2/P3).
- [ ] Otimização diária encadeada respeitando janela de aprendizado (P2/P3).
- [ ] 6 telas DS v2 mobile-first; isolamento por tenant comprovado (P4).
- [ ] Nenhuma campanha contradiz o Big Flux aprovado (P1).
