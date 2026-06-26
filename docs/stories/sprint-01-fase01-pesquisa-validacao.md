# Sprint 1 — Fase 1: Pesquisa e Validação de Mercado

> **Épico:** Fase 1 do Big Flux Document. **Pilares:** P1, P4, P5.
> **Referências:** Parte 1 §2 (inputs), §3.2 (template Fase 1), §4 (pipeline), §5 (prompt Architect).
> **Entrega da sprint:** ingestão e validação do Report do Board, geração+render+edição da seção "Fase 1" do Big Flux, validadores determinísticos e KB de pesquisa.

A Fase 1 estabelece **cliente-alvo (ICP)**, **análise de concorrência**, **TAM/SAM/SOM** e **validações pendentes**. É a base factual de todo o Big Flux.

---

### [S1.1] Ingestão e sanitização do Report de Marketing do Board
- **Pilares:** P2, P4, P5
- **Premium:** §6 (input_validation), §12.2 (PII)
- **Design System:** `dropzone` (colar/subir report), `coach` (explica o que é o report), `friendly-error`.
- **User story:** Como Aprovador, quero colar/enviar o Report do Board e ver validação imediata, para não gastar IA com input incompleto.
- **Contexto ampliado:** Parte 1 §2.1-2.3 — o report chega em `projects.metadata` com `marketing_strategy.*` e `lead_generation_strategy.*`. Antes de qualquer chamada à IA, valida estrutura mínima, normaliza polimorfismo (`value_proposition` string|`{content}`), sanitiza (remove blocos MD extras, escapa caracteres), e checa coerência mínima (UVP, público, canais não-vazios). Falha ⇒ erro estruturado **sem chamar IA** (economiza tokens).
- **Critérios de aceitação (Gherkin):**
  1. Given um report sem UVP/público/canais, When validado, Then retorna erro estruturado e **não** chama a IA.
  2. Given `value_proposition` como objeto `{content}`, When parseado, Then é normalizado para string.
  3. Given blocos ```md``` extras, When sanitizado, Then são removidos sem corromper o conteúdo.
  4. Given dados pessoais detectados, When ingeridos, Then PII é sinalizada e tratada conforme §12.2.
- **Tarefas técnicas:** `ReportParser.normalize()`; `ReportValidator.validate()` (determinístico); detector de PII; snapshot do report (`source_report_snapshot`); UI de upload/paste com dropzone.
- **Schema:** `source_report_snapshot JSONB` em `big_flux_documents` (Parte 1 §6.1).
- **DoD:** validação 100% determinística; nenhuma chamada IA em input inválido; teste de polimorfismo.
- **Dependências:** S0.1, S0.3

---

### [S1.2] Carga de contexto do tenant para a geração
- **Pilares:** P4, P5
- **User story:** Como Architect (agente), quero o pacote de contexto completo do tenant, para gerar uma Fase 1 assertiva e não genérica.
- **Contexto ampliado:** Parte 1 §2.2/§4 Passo 2 — além do report: identidade do tenant (segmento, modelo, porte), Big Flux anteriores aprovados, resultados históricos de campanhas, restrições (budget cap, plataformas vetadas, categorias sensíveis).
- **Critérios de aceitação:**
  1. Given um tenant com Big Flux anterior aprovado, When monta contexto, Then inclui o `structured_data` anterior para continuidade.
  2. Given restrições explícitas, When montadas, Then `forbidden_platforms`/`sensitive_categories` entram no contexto.
  3. Given tenant novo sem histórico, When monta contexto, Then funciona sem erro (campos opcionais ausentes).
- **Tarefas técnicas:** `ContextLoader.build(tenant_id, project_id)` → `BigFluxArchitectInput.tenant_context/history`; cache do contexto.
- **DoD:** contexto montado com e sem histórico; restrições respeitadas downstream.
- **Dependências:** S0.10, S1.1

---

### [S1.3] Prompt-contract da Fase 1 e geração da seção pelo Big Flux Architect
- **Pilares:** P1, P5
- **Premium:** §7 (Opus quality_first), §10 (prompt contracts), §10.3 (JSON)
- **User story:** Como Architect, quero um contrato de prompt específico da Fase 1, para preencher ICP, concorrência e TAM/SAM/SOM com realismo e sem inventar dados.
- **Contexto ampliado:** Parte 1 §3.2 (template Fase 1: 1.1 ICP, 1.2 concorrência, 1.3 TAM/SAM/SOM, 1.4 validações pendentes) + §5 princípios (coerência, quantificação, realismo, não inventar — usar `[Pendente Board]`). A geração do Big Flux é uma chamada Opus única para o doc inteiro; esta story define a **porção de template + regras da Fase 1** e o parser da seção.
- **Critérios de aceitação:**
  1. Given report com público-alvo, When gera Fase 1, Then 1.1 granulariza ICP (dor real, contexto, gatilhos, objeções) — não copia o público bruto.
  2. Given dado ausente para TAM/SAM/SOM, When gera, Then marca `[Pendente Board]` em vez de inventar.
  3. Given concorrência, When gera 1.2, Then sugere fontes (Meta Ad Library, Google Ads Transparency).
  4. Given a saída, When parseada, Then produz MD + `structured_data.phase_1_research` válido.
- **Tarefas técnicas:** arquivo de prompt versionado `prompts/big_flux_architect/fase1.partial`; parser MD→JSON da seção; checagem de `[Pendente Board]`.
- **DoD:** seção gera MD+JSON; pendências sinalizadas; prompt versionado (P5).
- **Dependências:** S0.8, S1.2

---

### [S1.4] Validadores determinísticos da Fase 1
- **Pilares:** P2
- **User story:** Como sistema, quero validar a Fase 1 por código, para garantir completude antes de persistir como draft.
- **Contexto ampliado:** Parte 1 §4 Passo 4 — código (não IA) verifica presença de subseções 1.1-1.4 e ausência de placeholders não-resolvidos não-sinalizados.
- **Critérios de aceitação:**
  1. Given Fase 1 sem subseção 1.1, When valida, Then issue `block`.
  2. Given placeholder vazio sem `[Pendente Board]`, When valida, Then issue `block`.
  3. Given Fase 1 completa, When valida, Then `passed=true`.
- **Tarefas técnicas:** `gate_fase1(structured): GateResult`; testes positivos/negativos.
- **DoD:** cobertura ≥90%; integrado ao pipeline de validação do doc.
- **Dependências:** S0.7, S1.3

---

### [S1.5] UI mobile-first de revisão/edição da Fase 1
- **Pilares:** P3, P5
- **Design System:** seção colapsável no documento, `coach` (educa sobre ICP/TAM), edição inline, badge `[Pendente Board]`.
- **User story:** Como Aprovador, quero ler e editar a Fase 1 no celular com explicações, para revisar mesmo sem ser especialista.
- **Contexto ampliado:** Parte 1 §9 (tela de revisão) — leitura renderizada, edição inline por campo, marcar pendência, registrar revisão (`big_flux_revisions`).
- **Critérios de aceitação:**
  1. Given a Fase 1 renderizada, When edito 1.1 inline, Then a alteração cria registro em `big_flux_revisions` (section, previous, new).
  2. Given um termo técnico (TAM/SAM/SOM), When toco no `coach`, Then vejo explicação em linguagem simples.
  3. Given mobile, When reviso, Then layout vertical, toque ≥48px.
- **Tarefas técnicas:** componente de seção; editor inline; persistência de revisão; coach tips por conceito.
- **Schema:** `big_flux_revisions` (Parte 1 §6.3).
- **DoD:** edição registrada; mobile validado; coach presente.
- **Dependências:** S0.3, S1.4

---

### [S1.6] Persistência de aprendizados de pesquisa na KB do tenant
- **Pilares:** P4, P5
- **User story:** Como Analista (futuro), quero que insights de ICP/concorrência fiquem na KB do tenant, para reuso em fases e campanhas futuras.
- **Critérios de aceitação:**
  1. Given Fase 1 aprovada, When persistida, Then concorrentes/ICP relevantes viram entradas `knowledge_base` `scope='tenant'`.
  2. Given busca semântica, When o tráfego pergunta sobre concorrência, Then recupera do tenant.
- **Tarefas técnicas:** mapper Fase 1 → KB; confidence; embedding.
- **DoD:** entradas criadas; recuperáveis por busca.
- **Dependências:** S0.10, S1.5

---

## DoD da Sprint 1
- [ ] Report ingerido/validado sem gastar IA em input ruim (P2).
- [ ] Fase 1 gerada com ICP granular e pendências sinalizadas (P1).
- [ ] Validadores determinísticos cobertura ≥90% (P2).
- [ ] UI mobile-first com edição registrada (P3/P5).
- [ ] KB de pesquisa alimentada por tenant (P4).
