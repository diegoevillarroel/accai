# Workspace

## Overview

ACCAI — Autoridad, Confianza y Conversión AI. A private full-stack personal content intelligence system for Diego Villarroel / VILLACLUB™. Password-gated ("villaclub2026"), desktop-only, terminal aesthetic: black #080808, electric blue #0C2DF5, Space Mono font, zero border-radius.

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
React + Vite + Tailwind CSS. Single app with 5 modules:
- **CUENTA** — Account snapshots + strategic directive
- **REELS** — Performance tracking with "firma" auto-classification (CONVERTIDOR, VIRAL, EDUCATIVO, MUERTO)
- **COMPETIDORES** — Competitor tracking (max 8 competitors)
- **ACCAI AI** — Claude-powered streaming AI with 6 modes (AUTOPSIA, BRIEF, DIAGNOSTICO, COMPETENCIA, FUNNEL CHECK, CIERRE)
- **PLAN 90D** — 90-day content calendar

### Backend (artifacts/api-server)
Express API server running on port 8080, prefixed at `/api`.
- Routes: cuenta, reels, competitors, plan, accai-sessions, accai-stream
- DB serialization helper: `src/lib/serialize.ts` — call `serialize(dbResult)` before Zod parsing to convert Date objects to ISO strings

### Database (lib/db)
Railway PostgreSQL: `postgresql://postgres:...@junction.proxy.rlwy.net:49963/railway`
Tables: `account_snapshots`, `strategic_directive`, `reels`, `competitors`, `competitor_reels`, `accai_sessions`, `plan_reels`, `plan_objectives`

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
