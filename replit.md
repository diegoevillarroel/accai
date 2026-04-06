# Workspace

## Overview

ACCAI — Autoridad, Confianza y Conversión AI. A private full-stack personal content intelligence system for Diego Villarroel / VILLACLUB™. Password-gated ("villaclub2026"), desktop-only, terminal aesthetic: black #080808, electric blue #0C2DF5, Space Mono font, zero border-radius.

**V3 Phase 2 COMPLETE** — All 6 modules wired to live Instagram/Threads data with full intelligence features.

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL (Railway) + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **AI**: Anthropic claude-3-5-sonnet-20241022 (streaming SSE)

## Architecture

### Frontend (artifacts/accai)
React + Vite + Tailwind CSS. Single app with 6 modules + nav badges:
- **CUENTA** — Account snapshots, SINCRONIZAR CUENTA button, 24h timing chart (optimal publish windows), strategic directive
- **REELS** — Instagram sync, auto-ACCAI-classify, intelligence cards (best angle/duration/timing/trend), quick inline classify form, watch time + replays columns, MINA DE COMENTARIOS (comment mining + AI analysis), autopsia stream after sync
- **COMPETIDORES** — Per-row SYNC button (IG data pull), auto-pull on add, DETECTAR BRECHAS (AI gap analysis)
- **ACCAI AI** — 6 modes: BRIEF, AUTOPSIA, ESTRATEGIA, COMPETENCIA, RESPONDER (comment queue + AI draft + mark-replied), CIERRE DM; funnel alert for recent CONVERTIDOR reels
- **PLAN 90D** — Live objective progress bars vs real metrics, 7-day calendar grid per week, all-13-weeks overview table, AI plan generation
- **THREADS** — Threads sync, PUBLICAR NUEVO, viral post detection + REEL conversion (AI guion generation + mark promoted), PROSPECCIÓN search, reply modal

### Backend (artifacts/api-server)
Express API server running on port 8080, prefixed at `/api`.
- Routes: cuenta, reels, competitors, plan, accai-sessions, accai-stream, instagram, threads
- Key Instagram routes: POST /instagram/sync, POST /instagram/sync-account, GET /instagram/timing, GET /instagram/token-status, GET/POST /instagram/comments/cache, POST /instagram/comments/:id/mark-replied
- Key Threads routes: GET /threads/posts, POST /threads/sync, POST /threads/publish, POST /threads/search, PUT /threads/:id/promote
- Key Reels routes: POST /reels/:id/classify (Claude auto-classification)
- DB serialization helper: `src/lib/serialize.ts` — call `serialize(dbResult)` before Zod parsing to convert Date objects to ISO strings

### Database (lib/db)
Railway PostgreSQL: `postgresql://postgres:...@junction.proxy.rlwy.net:49963/railway`
Tables: `account_snapshots`, `strategic_directive`, `reels`, `competitors`, `competitor_reels`, `accai_sessions`, `plan_reels`, `plan_objectives`, `threads_posts`, `instagram_comment_cache`
- Reel schema: `tema`, `angulo`, `formato` are NULLABLE (IG-synced reels start unclassified); `watchTimeAvg`, `replays`, `igMediaId` added

### API Client (lib/api-client-react)
Auto-generated React Query hooks from OpenAPI spec. Run codegen with:
`pnpm --filter @workspace/api-spec run codegen`

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Password Gate

Frontend is gated with password `villaclub2026`. State stored in `localStorage` key `vc_accai_ok`.

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
