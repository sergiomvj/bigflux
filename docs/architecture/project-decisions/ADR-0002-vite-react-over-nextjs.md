# ADR-0002 — Vite + React (não Next.js) para o frontend

- **Status:** Accepted
- **Date:** 2026-06-23
- **Decider:** @architect (Aria)
- **Rastreabilidade:** S0.3 (DS v2 mobile-first, Storybook, componentes React)

## Contexto
S0.3 exige biblioteca de componentes React do Design System v2, mobile-first, publicada em Storybook. Precisamos escolher o build/framework de frontend.

## Decisão
Adotar **Vite 5 + React 18**. App consumidor em `apps/web`; biblioteca DS v2 em `@bigflux/ui`. Storybook 8 para o workshop de componentes.

## Alternativas consideradas
- **Next.js:** SSR/SEO nativo e API routes. Porém a Sprint 0 não tem requisito de SSR/SEO (produto é app autenticado por tenant, não site público), e acoplaria o backend Premium ao framework de UI. O backend (router LLM, cost, agentes) roda server-side desacoplado (Supabase Edge / rotas server). Next excede o necessário e aumenta acoplamento.

## Consequências
- **Positivo:** menor acoplamento UI↔backend; dev mais rápido; integração natural com Storybook/Vitest/ESM; keys de LLM nunca no bundle (premium-params §12.1).
- **Negativo / risco:** sem SSR/SEO nativo.
- **Mitigação:** se uma necessidade futura de SSR/SEO surgir (improvável para app interno multi-tenant), será um app público separado, não migração do core — registrar em novo ADR.
