# ADR-0001 — Supabase como BaaS (Postgres + Auth + Storage + Realtime + pgvector)

- **Status:** Accepted
- **Date:** 2026-06-23
- **Decider:** @architect (Aria)
- **Rastreabilidade:** P4 (multi-tenant/RLS), S0.1, S0.2, S0.6, S0.10, README §7

## Contexto
A Sprint 0 exige, na fundação, quatro capacidades de infra distintas: Postgres com RLS forçado (P4/S0.1), autenticação + RBAC (S0.2), object storage para artefatos (S0.6), eventos de domínio em tempo real (README §7) e busca vetorial (pgvector, S0.10).

## Decisão
Adotar **Supabase** como BaaS único de fundação. Postgres 15+ gerenciado com RLS, Supabase Auth, Supabase Storage, Supabase Realtime e extensão pgvector nativa. Migrations via Supabase CLI (SQL versionado, idempotente).

## Alternativas consideradas
- **Postgres self-hosted + Auth0 + S3 + Pusher + pgvector:** mais portável, porém 4 integrações para manter na fundação; contraria "menor caminho que preserva qualidade".
- **Firebase:** não é Postgres; RLS de S0.1 e SQL/pgvector não se aplicam. Rejeitado.

## Consequências
- **Positivo:** uma só plataforma entrega 4 requisitos; pgvector nativo; RLS modela P4 diretamente.
- **Negativo / risco:** lock-in em Auth/Storage/Realtime.
- **Mitigação:** Postgres+RLS+SQL+pgvector são portáveis para qualquer Postgres. Auth/Storage/Realtime ficam encapsulados em `@bigflux/auth`, `@bigflux/artifacts`, `@bigflux/events` — nenhum agente/gate chama Supabase SDK direto (aplica P6 à própria infra). Trocar provedor = reescrever 3 packages, não o produto.
