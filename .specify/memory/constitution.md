<!--
  Sync Impact Report
  ─────────────────────────────────────────────────────────
  Version change: 0.0.0 → 1.0.0 (MAJOR — initial ratification)
  
  Modified principles: N/A (initial creation)
  
  Added sections:
    - Principle I: Code Quality & Maintainability
    - Principle II: Testing Standards
    - Principle III: User Experience Consistency
    - Principle IV: Performance Requirements
    - Principle V: Security & Data Integrity
    - Section: Development Workflow
    - Section: Technical Standards
    - Section: Governance
  
  Removed sections: N/A
  
  Templates requiring updates:
    - .specify/templates/plan-template.md        ✅ compatible (Constitution Check section aligns)
    - .specify/templates/spec-template.md         ✅ compatible (requirements & success criteria align)
    - .specify/templates/tasks-template.md        ✅ compatible (phase structure supports principles)
  
  Follow-up TODOs: None
  ─────────────────────────────────────────────────────────
-->

# ArouaStore Constitution

## Core Principles

### I. Code Quality & Maintainability

Every contribution MUST adhere to strict code quality standards to ensure
long-term maintainability of the ArouaStore POS system.

- All code MUST be written in TypeScript with strict mode enabled; `any` types
  are forbidden unless explicitly justified with a inline comment.
- Components MUST follow single-responsibility: one component per file, one
  concern per component.
- Business logic MUST be separated from UI components — Zustand stores and
  dedicated service modules handle state and logic; React components handle
  rendering only.
- Functions MUST NOT exceed 50 lines of logic (excluding type definitions and
  imports). Larger functions MUST be decomposed.
- Dead code, unused imports, and commented-out code MUST be removed before
  merge — no `// TODO: remove later` artifacts.
- Naming conventions MUST be consistent: PascalCase for components and types,
  camelCase for functions and variables, SCREAMING_SNAKE_CASE for constants.
- API client functions in `src/api/client.ts` MUST be typed with explicit
  return types; raw `fetch` calls outside the API client are forbidden.

### II. Testing Standards

All features MUST be verifiable through defined testing practices to prevent
regressions and ensure correctness.

- Every new feature MUST include at least one integration-level test or
  end-to-end scenario that validates the user-facing behavior.
- Bug fixes MUST include a regression test that reproduces the original defect
  before applying the fix.
- Critical business logic (sales calculations, discount application, stock
  updates, cash session reconciliation) MUST have unit tests covering normal
  cases, edge cases, and error paths.
- Tests MUST be deterministic — no reliance on real time, network calls, or
  database state that is not explicitly set up and torn down.
- Test files MUST be co-located or clearly mapped to their source:
  `src/module/foo.ts` → `tests/module/foo.test.ts`.
- All tests MUST pass before any code is considered merge-ready; a broken test
  suite blocks all other work.

### III. User Experience Consistency

The ArouaStore interface MUST deliver a uniform, predictable experience
across all screens and user roles.

- All UI components MUST use the established Tailwind CSS design tokens
  (`dark-bg`, `dark-surface`, `dark-border`, `primary-*`, `slate-*`) — no
  arbitrary color values or inline styles.
- Interactive elements MUST provide immediate visual feedback: loading
  spinners for async operations, disabled states during submissions, and
  success/error notifications via the existing toast system.
- Navigation MUST be role-aware: agents see only their permitted screens;
  admin/manager users see the full navigation. Unauthorized routes MUST
  redirect gracefully, never show a blank page or error.
- Animations MUST use Framer Motion with consistent duration (`0.3s–0.4s`)
  and easing (`easeInOut`) matching existing transitions.
- All user-facing text MUST be in French, matching the existing application
  language. Currency formatting MUST use the `useSettingsStore` formatter.
- Forms MUST validate inputs client-side before submission and display
  inline error messages in French. Required fields MUST be visually marked.
- Modals, drawers, and overlays MUST be dismissible via Escape key and
  background click, consistent with existing Headless UI patterns.

### IV. Performance Requirements

The application MUST remain responsive under typical retail workload
conditions to avoid disrupting sales operations.

- Initial page load (after authentication) MUST render interactive content
  within 2 seconds on a standard retail terminal.
- POS product search and filtering MUST return results within 200ms of user
  input — debounce at 150ms minimum for search fields.
- Cart operations (add, remove, quantity change) MUST update the UI within
  a single animation frame (16ms) — no perceptible lag.
- API calls MUST include timeout handling (10s default) and display a
  user-friendly error message on failure; the UI MUST NOT freeze waiting
  for a response.
- Component re-renders MUST be minimized: use `React.memo`, `useMemo`, and
  `useCallback` where profiling shows unnecessary re-renders in lists or
  frequently updating components.
- Bundle size MUST NOT grow beyond 500KB gzipped for the main chunk;
  large dependencies MUST be lazy-loaded via `React.lazy` and `Suspense`.
- Images MUST use optimized formats and lazy loading; product images in the
  POS grid MUST NOT block initial render.

### V. Security & Data Integrity

Financial and user data MUST be protected through defensive coding
practices at every layer.

- All API endpoints that modify data MUST validate the user's role on the
  backend — frontend route hiding is NOT a substitute for server-side
  authorization.
- User input MUST be sanitized before rendering (XSS prevention) and before
  database operations (injection prevention).
- Sensitive operations (cash session close, sale void, user deletion) MUST
  require explicit confirmation from the user.
- Financial calculations (totals, discounts, change) MUST use integer
  arithmetic (cents) or a decimal library — floating-point arithmetic on
  currency values is forbidden.
- Stock quantities MUST NOT go negative; the backend MUST enforce stock
  checks atomically during sale creation.

## Technical Standards

- **Framework**: React 18 + TypeScript 5 + Vite, backend on Hono.
- **State Management**: Zustand with persistence middleware for auth state;
  Zustand stores for domain state (cart, products, sales).
- **Styling**: Tailwind CSS 3 with the project's custom dark theme
  configuration. No CSS modules or styled-components.
- **Routing**: React Router DOM 6 with role-based conditional route
  rendering in `App.tsx`.
- **API Communication**: Centralized through `src/api/client.ts` with typed
  methods. All requests include auth headers.
- **Dependencies**: New dependencies MUST be justified. Prefer existing
  libraries (Headless UI, Lucide, Framer Motion) over adding alternatives
  that serve the same purpose.

## Development Workflow

- Every change MUST be scoped to a single concern — avoid mixing unrelated
  fixes or features in one commit.
- Code review MUST verify compliance with all five constitutional principles
  before approval.
- The build (`npx tsc --noEmit` + `vite build`) MUST succeed with zero
  errors and zero warnings before merge.
- Role-based access changes MUST be verified on both frontend (route/nav
  hiding) and backend (403 enforcement) before merge.
- Database schema changes MUST include a migration path and MUST NOT break
  existing data.

## Governance

This constitution is the authoritative reference for all development
decisions in the ArouaStore project. It supersedes informal conventions,
prior habits, and ad-hoc agreements.

- **Amendments** require: (1) written proposal describing the change and
  rationale, (2) version bump following semver (MAJOR for principle
  removal/redefinition, MINOR for additions, PATCH for clarifications),
  and (3) update of this document with the new version and date.
- **Compliance review**: every pull request or code change MUST be checked
  against the principles listed above. Non-compliance MUST be resolved
  before merge.
- **Complexity justification**: any deviation from simplicity (extra
  abstractions, additional dependencies, architectural changes) MUST be
  documented with a rationale explaining why the simpler alternative is
  insufficient.
- **Runtime guidance**: see `CLAUDE.md` (if present) for AI-assisted
  development conventions specific to this project.

**Version**: 1.0.0 | **Ratified**: 2026-02-04 | **Last Amended**: 2026-02-04
