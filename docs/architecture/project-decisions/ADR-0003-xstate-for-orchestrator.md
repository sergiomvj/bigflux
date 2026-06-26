# ADR-0003 — XState 5 para o Traffic Orchestrator (state machine determinística)

- **Status:** Accepted
- **Date:** 2026-06-23
- **Decider:** @architect (Aria)
- **Rastreabilidade:** P2 (validação determinística), S0.7

## Contexto
S0.7 pede um orquestrador de **código puro** (não framework de agentes) que encadeia etapas, aplica gates booleanos e persiste estado. A story explicita a opção "state machine própria ou XState".

## Decisão
Adotar **XState 5** como engine do orquestrador.

## Alternativas consideradas
- **State machine própria:** controle total, porém reinventa persistência, guards e testes com pior cobertura — contra REUSE > CREATE (skill architect-first) e contra "No Invention".

## Consequências
- **Positivo:** código puro (zero LLM no fluxo — alinha P2); guards síncronos mapeiam direto em `GateFn<TCtx> → GateResult`; estado serializável atende S0.7 AC4 (toda transição persistida); maduro e testável.
- **Negativo / risco:** curva de aprendizado da API XState 5.
- **Mitigação:** gates permanecem funções puras isoladas (`{ passed, issues[] }`), testáveis fora do XState; a máquina só orquestra transições. Cobertura de gates ≥90% (DoD global).
