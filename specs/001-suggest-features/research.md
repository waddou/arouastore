# Research: 5 Fonctionnalités Suggérées pour PhoneStore POS

**Branch**: `001-suggest-features` | **Date**: 2026-02-05

## Research Tasks & Findings

### R1: Receipt/Ticket Printing — Browser Print API vs PDF Library

**Decision**: Use the browser's native `window.print()` API with a dedicated print-optimized React component rendered in a hidden container, styled with `@media print` CSS.

**Rationale**:
- No external dependency needed — aligns with constitution principle of minimizing new dependencies
- The browser print API is universally supported and allows the user to choose their printer (including thermal receipt printers)
- Print-specific CSS (`@media print`) allows hiding navigation and formatting the receipt layout without affecting the screen view
- A React component can render the receipt content, then trigger `window.print()` on a dedicated window/iframe containing only the receipt
- Thermal receipt printers (58mm/80mm) are supported via CSS `@page { size }` rules

**Alternatives Considered**:
- **jsPDF / react-pdf**: Heavy dependency (~200KB+), unnecessary for receipt printing where browser print is sufficient. Would bloat the bundle beyond the 500KB gzip limit.
- **Server-side PDF generation**: Adds backend complexity, requires file storage, and doesn't work offline. Overkill for a POS receipt.
- **Electron / native print**: Not applicable — this is a web-only SPA.

---

### R2: Real-Time Notifications — Polling vs WebSocket vs SSE

**Decision**: Use client-side polling with a Zustand store that periodically fetches notification state from the backend API. Notifications are generated server-side on relevant events and stored in a `notifications` table.

**Rationale**:
- The current architecture has no WebSocket infrastructure — adding one would require significant backend changes on both Express and Hono
- Polling at 30-second intervals is sufficient for retail operations (stock alerts and repair status changes are not time-critical to the second)
- A Zustand store (`notificationStore`) handles the notification state, badge count, and read/unread status
- Backend generates notifications as side effects of existing operations (sale creation triggers stock check, repair status update triggers notification)
- Keeps the architecture simple and aligned with existing patterns

**Alternatives Considered**:
- **WebSockets**: Would require `ws` package on Express, significant refactoring of both backends, and a persistent connection manager. Overkill for 5 concurrent users.
- **Server-Sent Events (SSE)**: Simpler than WebSockets but still requires backend streaming infrastructure. Not supported well with the current Express/Hono setup.
- **Browser Push Notifications**: Requires service worker, push subscription, and external push service. Out of scope — spec explicitly states in-app notifications only.

---

### R3: Supplier & Purchase Order Management — Schema Design Pattern

**Decision**: Create two new tables (`suppliers` and `purchase_orders`) plus a join table (`purchase_order_items`) following the exact pattern of existing `sales` / `sale_items` tables.

**Rationale**:
- The existing `sales` + `sale_items` pattern is well-established in the codebase and proven to work with both backends
- Purchase orders mirror sales conceptually (header + line items) but in the opposite direction (incoming stock vs outgoing)
- The `suppliers` table is a simple entity like `customers` with contact information
- Status workflow (`pending` → `partially_received` → `received` / `cancelled`) follows the same pattern as repair status
- Stock updates on receipt use the same atomic integer operations already used during sale creation (but incrementing instead of decrementing)

**Alternatives Considered**:
- **Embedding supplier info in products**: Would create data redundancy and make it impossible to track order history per supplier
- **Using a generic "transactions" table for both sales and purchases**: Over-engineering — the two flows have different fields and semantics

---

### R4: Loyalty Points System — Point Storage Strategy

**Decision**: Add a `loyalty_points` integer column to the existing `customers` table, plus a `loyalty_transactions` table for audit trail. Points are calculated as integer (1 point = 1 monetary unit spent, using the same integer-cents system).

**Rationale**:
- The `customers` table already has `total_spent` — adding `loyalty_points` follows the same pattern
- Integer arithmetic aligns with the constitution's requirement for no floating-point currency operations
- An audit table (`loyalty_transactions`) tracks point credits/debits linked to sales, enabling reversal on sale cancellation
- The conversion rate (points → discount) is stored in a settings mechanism (extend `useStoreSettingsStore` or add to store_settings in DB)
- Simple to integrate into the existing POS checkout flow — just add a "Use loyalty points" toggle

**Alternatives Considered**:
- **Points only on customer record (no audit trail)**: Would make it impossible to reverse points on sale cancellation or audit discrepancies
- **Complex tiered loyalty program**: Over-engineering for a single-store POS. Simple 1:1 point accumulation is sufficient

---

### R5: Reports & CSV Export — Generation Strategy

**Decision**: Generate reports client-side from API data, render as React components with table/chart views, and export to CSV using a lightweight utility function (no library needed).

**Rationale**:
- CSV generation is trivial in JavaScript (~20 lines of code) — no library dependency needed
- Reports are generated on-demand by fetching data through existing API endpoints (sales, products, cash sessions) with extended query parameters (date range)
- Client-side rendering allows immediate preview before export
- The existing `getSalesStats(period)` API already provides some aggregation — extend it with more granular data

**Alternatives Considered**:
- **Server-side report generation**: Adds backend complexity and file serving infrastructure. Not needed for the data volumes of a single store.
- **PDF report export**: Heavy dependency. CSV is specified in the spec assumptions and is universally compatible with spreadsheets.
- **Third-party charting library (Chart.js, Recharts)**: Could enhance visual reports but adds bundle size. Use simple HTML tables for MVP — charts can be added later if needed.

---

### R6: Testing Framework Setup

**Decision**: Add Vitest as the test runner with React Testing Library for component tests. This is a prerequisite for all 5 features per the constitution (Principle II).

**Rationale**:
- Vitest is the Vite-native test runner — zero additional configuration needed, shares Vite's transform pipeline
- React Testing Library is the standard for testing React components
- Constitution requires integration tests for new features and unit tests for critical business logic
- Test files will be placed in `tests/` directory mapped to source: `src/module/foo.ts` → `tests/module/foo.test.ts`

**Alternatives Considered**:
- **Jest**: Requires additional configuration for ESM, TypeScript, and Vite. Vitest is the natural choice for Vite projects.
- **Playwright/Cypress**: E2E tools, too heavy for unit/integration testing. Can be added later for full E2E coverage.

---

### R7: Database Migration Strategy

**Decision**: Add new tables and columns via additive SQL migrations in the local backend (`server.cjs` table creation section) and Drizzle schema updates for the Hono backend.

**Rationale**:
- The local backend creates tables with `CREATE TABLE IF NOT EXISTS` — new tables follow this pattern
- Adding a column to `customers` (loyalty_points) requires an `ALTER TABLE` migration
- The Drizzle ORM schema in `backend/src/__generated__/db_schema.ts` is auto-generated — new tables need to be added through the EdgeSpark/Drizzle migration system
- All migrations are additive (new tables, new columns) — no breaking changes to existing data

**Alternatives Considered**:
- **Rebuilding tables**: Destructive, would lose existing data
- **Using a migration tool (knex, prisma migrate)**: Over-engineering — the project uses direct SQL for the local backend and Drizzle's auto-generation for production

---

## Summary of Key Decisions

| Area | Decision | Key Rationale |
|------|----------|---------------|
| Receipt printing | Browser `window.print()` + print CSS | No new deps, universal printer support |
| Notifications | Polling (30s) + Zustand store + DB table | Simple, fits existing architecture |
| Suppliers | New tables mirroring sales/sale_items pattern | Proven pattern, consistent codebase |
| Loyalty points | Integer column on customers + audit table | Integer arithmetic (constitution), reversible |
| Reports/Export | Client-side CSV generation, no library | Trivial code, no bundle impact |
| Testing | Vitest + React Testing Library | Vite-native, constitution compliance |
| Migrations | Additive SQL (local) + Drizzle schema (prod) | Non-destructive, follows existing patterns |
