# Implementation Plan: 5 Fonctionnalités Suggérées pour PhoneStore POS

**Branch**: `001-suggest-features` | **Date**: 2026-02-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-suggest-features/spec.md`

## Summary

Ce plan couvre l'implémentation de 5 fonctionnalités complémentaires au système POS existant : (1) impression de reçus et tickets de réparation via génération de documents imprimables dans le navigateur, (2) système de notifications en temps réel avec panneau dédié dans la navigation, (3) gestion des fournisseurs et bons de commande d'approvisionnement, (4) programme de fidélité client intégré au POS, et (5) rapports et exports avancés en CSV. Chaque fonctionnalité est indépendante et peut être implémentée séparément, en suivant les patterns existants (Zustand stores, API client, pages React avec Tailwind dark theme).

## Technical Context

**Language/Version**: TypeScript 5.8.3 (strict mode), React 18.3.1
**Primary Dependencies**: React Router DOM 6.30.1, Zustand 4.4.7, Tailwind CSS 3.4.17, Framer Motion 11.0.8, Headless UI 1.7.18, Lucide React, Zod 3.25.67
**Storage**: TiDB Cloud (MySQL-compatible) via local Express backend (port 3001), SQLite via Drizzle ORM (Hono backend for production)
**Testing**: No test framework currently configured. Constitution requires tests — Vitest recommended as Vite-native runner
**Target Platform**: Web application (SPA), navigateur web sur terminal de vente, responsive
**Project Type**: Web (frontend React + dual backend Express/Hono)
**Performance Goals**: Page load <2s, POS search <200ms, cart operations <16ms (constitution), receipt generation <5s (spec)
**Constraints**: Bundle <500KB gzipped main chunk (constitution), integer arithmetic for currency, role-based access control on both frontend and backend
**Scale/Scope**: Single-store POS system, typical retail workload, ~5 concurrent users

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate Check | Status |
|-----------|-----------|--------|
| I. Code Quality | TypeScript strict, no `any`, single-responsibility components, business logic in stores/services, functions <50 lines, API calls via `src/api/client.ts` | PASS — Plan follows existing patterns |
| II. Testing Standards | New features need integration tests, critical business logic needs unit tests | PASS WITH NOTE — No test framework exists yet; must add Vitest before merge |
| III. UX Consistency | Dark theme tokens, Framer Motion animations (0.3-0.4s), French text, currency via `useSettingsStore`, Headless UI patterns, role-aware navigation | PASS — All new pages/components follow existing patterns |
| IV. Performance | Page load <2s, search <200ms, bundle <500KB gzipped, lazy-load large dependencies | PASS — Receipt generation uses browser print API (no heavy deps), reports use CSV (lightweight), notifications are in-memory polling |
| V. Security | Server-side role validation, input sanitization, integer arithmetic for currency, explicit confirmation for sensitive ops | PASS — All new endpoints include role checks, all financial calculations use integer cents |
| Dev Workflow | Single-concern changes, build must pass (tsc + vite build), schema migrations must not break existing data | PASS — Each feature is independently implementable, new tables use additive migrations |

**Gate Result**: PASS — Proceed to Phase 0

## Project Structure

### Documentation (this feature)

```text
specs/001-suggest-features/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── receipts-api.md
│   ├── notifications-api.md
│   ├── suppliers-api.md
│   ├── loyalty-api.md
│   └── reports-api.md
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
# Frontend (existing structure, new additions marked with +)
src/
├── api/
│   └── client.ts                    # + Add new API methods for all 5 features
├── components/
│   ├── receipts/                    # + Receipt/ticket document components
│   │   ├── SaleReceipt.tsx
│   │   └── RepairTicket.tsx
│   └── notifications/               # + Notification panel component
│       ├── NotificationPanel.tsx
│       └── NotificationBell.tsx
├── layouts/
│   └── DashboardLayout.tsx          # + Add notification bell to header
├── pages/
│   ├── POS.tsx                      # + Add receipt print button, loyalty points display
│   ├── Repairs.tsx                  # + Add ticket print button
│   ├── Suppliers.tsx                # + New page: supplier management
│   ├── PurchaseOrders.tsx           # + New page: purchase order management
│   └── Reports.tsx                  # + New page: reports & exports
├── store/
│   ├── useStore.ts                  # + Add supplier, purchase order, notification actions
│   ├── authStore.ts
│   ├── notificationStore.ts         # + New store: notifications state
│   └── loyaltyStore.ts             # + New store: loyalty points state (or extend useStore)
├── types/
│   └── index.ts                     # + Add new type definitions
├── utils/
│   └── csv-export.ts               # + CSV generation utility
└── App.tsx                          # + Add new routes

# Local Backend (Express.js)
local-backend/
└── server.cjs                       # + Add new API routes for all 5 features

# Production Backend (Hono + Drizzle ORM)
backend/
└── src/
    ├── index.ts                     # + Add new Hono routes
    └── __generated__/
        └── db_schema.ts             # + New tables (via migration)
```

**Structure Decision**: Follows existing web application structure. New pages are added to `src/pages/`, new stores to `src/store/`, new API methods to `src/api/client.ts`. Backend routes are added to both `local-backend/server.cjs` and `backend/src/index.ts` in parallel. New components are organized in subdirectories under `src/components/` by feature domain.

## Complexity Tracking

No constitution violations detected. All features follow existing patterns and add minimal complexity.
