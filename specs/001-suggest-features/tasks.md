# Tasks: 5 Fonctionnalités Suggérées pour PhoneStore POS

**Input**: Design documents from `/specs/001-suggest-features/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add shared type definitions, configure testing framework, and prepare the project for all 5 features.

- [x] T001 Add new shared TypeScript type definitions (Notification, Supplier, PurchaseOrder, PurchaseOrderItem, LoyaltyTransaction, SaleReceiptData, RepairTicketData, report response types) in `src/types/index.ts`
- [x] T002 [P] Install Vitest and React Testing Library dev dependencies, create `vitest.config.ts` at project root, and add `"test": "vitest"` script to `package.json`
- [x] T003 [P] Create CSV export utility function `exportToCSV()` in `src/utils/csv-export.ts` — takes array of objects, column definitions, and filename; generates CSV with semicolon separator (French Excel) and triggers browser download via Blob + URL.createObjectURL

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema migrations for all new tables. All user stories depend on these tables existing.

**CRITICAL**: No user story work can begin until this phase is complete.

- [x] T004 Add `notifications` table creation (CREATE TABLE IF NOT EXISTS) to `local-backend/server.cjs` — columns: id, user_id, type, title, message, reference_type, reference_id, is_read, created_at; with indexes on user_id, is_read, created_at per `data-model.md`
- [x] T005 [P] Add `suppliers` table creation to `local-backend/server.cjs` — columns: id, name, phone, email, address, notes, is_active, created_at, updated_at; with index on is_active per `data-model.md`
- [x] T006 [P] Add `purchase_orders` table creation to `local-backend/server.cjs` — columns: id, order_number, supplier_id, status, total_amount, notes, ordered_at, received_at, created_by, created_at, updated_at; with indexes on supplier_id, status, ordered_at per `data-model.md`
- [x] T007 [P] Add `purchase_order_items` table creation to `local-backend/server.cjs` — columns: id, purchase_order_id, product_id, quantity_ordered, quantity_received, unit_price, subtotal; with index on purchase_order_id per `data-model.md`
- [x] T008 [P] Add `loyalty_transactions` table creation to `local-backend/server.cjs` — columns: id, customer_id, sale_id, points, type, description, created_at; with indexes on customer_id, sale_id per `data-model.md`
- [x] T009 [P] Add `ALTER TABLE customers ADD COLUMN loyalty_points INTEGER NOT NULL DEFAULT 0` migration to `local-backend/server.cjs` with error handling for existing column (wrap in try/catch)
- [x] T010 Verify all 5 new tables and 1 altered table are created successfully by starting the local backend (`npm run backend`) and checking for errors

**Checkpoint**: Database schema ready — all user story implementation can now begin.

---

## Phase 3: User Story 1 — Impression de reçus et tickets de réparation (Priority: P1) MVP

**Goal**: Vendors can print sale receipts and technicians can print repair tickets directly from the application, with on-screen preview and browser print support.

**Independent Test**: Complete a sale in POS, click "Imprimer le reçu", verify the receipt shows store name, date, items, prices, discounts, total, payment method, and transaction number. Create a repair, click "Imprimer le ticket", verify it shows repair number, customer, device, issue, estimated cost, and promised date.

### Implementation for User Story 1

- [x] T011 [P] [US1] Add `GET /api/public/sales/:id/receipt` endpoint to `local-backend/server.cjs` — joins sales + sale_items + customers + users to return complete receipt data (sale details, items with product names, customer info, seller name) per `contracts/receipts-api.md`
- [x] T012 [P] [US1] Add `GET /api/public/repairs/:id/ticket` endpoint to `local-backend/server.cjs` — joins repairs + customers + users to return complete ticket data (repair details, customer info, technician name) per `contracts/receipts-api.md`
- [x] T013 [P] [US1] Add `getSaleReceipt(saleId: number)` and `getRepairTicket(repairId: number)` methods to `src/api/client.ts`
- [x] T014 [P] [US1] Create `src/components/receipts/SaleReceipt.tsx` — print-optimized React component displaying store info (from useStoreSettingsStore), sale date, items table (name, qty, unit price, subtotal), discount, total, payment method, and transaction ID; styled for 80mm thermal receipt width
- [x] T015 [P] [US1] Create `src/components/receipts/RepairTicket.tsx` — print-optimized React component displaying store info, repair number, customer name/phone, device brand/model/variant, issue description, estimated cost, promised date, and general conditions text
- [x] T016 [US1] Add `@media print` styles to `src/index.css` — hide sidebar, header, and all non-receipt content when printing; set page size for 80mm thermal paper; ensure receipt/ticket components display correctly in print mode
- [x] T017 [US1] Add "Imprimer le reçu" button to POS checkout success flow in `src/pages/POS.tsx` — on click, fetch receipt data via `getSaleReceipt()`, render SaleReceipt component in a hidden iframe, and trigger `window.print()` on that iframe
- [x] T018 [US1] Add "Imprimer le ticket" button to repair cards/detail view in `src/pages/Repairs.tsx` — on click, fetch ticket data via `getRepairTicket()`, render RepairTicket component in a hidden iframe, and trigger `window.print()`
- [x] T019 [US1] Add re-print capability to sales history: in the sales list within `src/pages/POS.tsx` (or `src/pages/Dashboard.tsx` recent sales section), add a print icon button on each completed sale row that regenerates and prints the receipt

**Checkpoint**: User Story 1 complete — receipts and tickets can be generated and printed from POS and Repairs pages.

---

## Phase 4: User Story 2 — Système de notifications et alertes en temps réel (Priority: P2)

**Goal**: Users see a notification bell in the header with unread count badge, and receive automatic notifications for low stock, repair status changes, and cash session alerts.

**Independent Test**: Make a sale that drops a product below its alert threshold, verify a "Stock bas" notification appears in the notification panel within 30 seconds. Change a repair status, verify a "Réparation" notification appears.

### Implementation for User Story 2

- [x] T020 [P] [US2] Add notification CRUD endpoints to `local-backend/server.cjs`: `GET /api/notifications` (list with unread_only/limit/offset filters, returns unreadCount), `GET /api/notifications/unread-count`, `PUT /api/notifications/:id/read`, `PUT /api/notifications/read-all` per `contracts/notifications-api.md`
- [x] T021 [P] [US2] Add notification generation as side effects in existing endpoints in `local-backend/server.cjs`: (a) in `POST /api/sales` — after stock decrement, check if any product fell below alert_threshold and INSERT into notifications table with type='stock_low'; (b) in `PUT /api/repairs/:id` and `PATCH /api/repairs/:id/status` — INSERT notification with type='repair_status' on status change
- [x] T022 [P] [US2] Add notification API methods to `src/api/client.ts`: `getNotifications(params?)`, `getUnreadNotificationCount()`, `markNotificationRead(id)`, `markAllNotificationsRead()` per `contracts/notifications-api.md`
- [x] T023 [US2] Create `src/store/notificationStore.ts` — Zustand store with state: notifications array, unreadCount, isLoading; actions: fetchNotifications(), fetchUnreadCount(), markRead(id), markAllRead(), startPolling(), stopPolling(); polling calls `getUnreadNotificationCount()` every 30 seconds via setInterval
- [x] T024 [US2] Create `src/components/notifications/NotificationBell.tsx` — Lucide `Bell` icon button with red badge showing unreadCount (hidden when 0); on click toggles notification panel; uses notificationStore
- [x] T025 [US2] Create `src/components/notifications/NotificationPanel.tsx` — Headless UI Popover dropdown listing notifications (icon per type, title, message, time ago, read/unread styling); "Tout marquer comme lu" button at top; scrollable list with max-height; click on notification marks it as read
- [x] T026 [US2] Integrate NotificationBell into `src/layouts/DashboardLayout.tsx` header — add bell icon next to user profile area; start notification polling on mount, stop on unmount
- [x] T027 [US2] Add cash session alert check: in `local-backend/server.cjs`, add logic to `GET /api/notifications` (or a periodic check endpoint) that creates a notification of type='cash_session' if any cash session has been open for more than 12 hours

**Checkpoint**: User Story 2 complete — notification bell with badge appears in header, stock/repair/cash notifications are generated and displayed.

---

## Phase 5: User Story 3 — Gestion des fournisseurs et commandes d'approvisionnement (Priority: P3)

**Goal**: Admins/Managers can manage suppliers, create purchase orders, and receive orders with automatic stock updates.

**Independent Test**: Create a supplier, create a purchase order for that supplier with 2 products, mark the order as received, verify product stock is incremented by the ordered quantities.

### Implementation for User Story 3

- [x] T028 [P] [US3] Add supplier CRUD endpoints to `local-backend/server.cjs`: `GET /api/public/suppliers` (list active), `GET /api/public/suppliers/:id`, `POST /api/admin/suppliers` (create, admin/manager auth), `PUT /api/admin/suppliers/:id` (update), `DELETE /api/admin/suppliers/:id` (soft-delete with pending order check) per `contracts/suppliers-api.md`
- [x] T029 [P] [US3] Add purchase order endpoints to `local-backend/server.cjs`: `GET /api/public/purchase-orders` (list with status/supplier_id/limit filters, join supplier name), `GET /api/public/purchase-orders/:id` (with items joined to product names/SKUs), `POST /api/admin/purchase-orders` (create with items, auto-generate order_number as PO-YYYY-NNNN, auto-fill unit_price from product price_purchase, auto-calculate total_amount), `PUT /api/admin/purchase-orders/:id/receive` (update quantity_received per item, atomically increment product stock, set status based on completion), `PUT /api/admin/purchase-orders/:id/cancel` (set status cancelled, block if already received) per `contracts/suppliers-api.md`
- [x] T030 [P] [US3] Add supplier and purchase order API methods to `src/api/client.ts`: `getSuppliers()`, `getSupplier(id)`, `createSupplier(supplier)`, `updateSupplier(id, updates)`, `deleteSupplier(id)`, `getPurchaseOrders(params?)`, `getPurchaseOrder(id)`, `createPurchaseOrder(order)`, `receivePurchaseOrder(id, items)`, `cancelPurchaseOrder(id)` per `contracts/suppliers-api.md`
- [x] T031 [US3] Create `src/pages/Suppliers.tsx` — admin/manager page listing suppliers in a table (name, phone, email, status); "Ajouter un fournisseur" button opens modal form with fields: name (required), phone, email, address, notes; edit and soft-delete actions on each row; follows existing page pattern (dark theme, Tailwind, Framer Motion)
- [x] T032 [US3] Create `src/pages/PurchaseOrders.tsx` — admin/manager page listing purchase orders in a table (order number, supplier name, status badge, total, date); status filter dropdown; "Nouveau bon de commande" button opens modal form: select supplier, add product lines (product picker + quantity), auto-calculated total; detail view showing items with received quantities; "Réceptionner" button opens receive modal with quantity fields per item; "Annuler" button with confirmation
- [x] T033 [US3] Add routes `/admin/suppliers` and `/admin/purchase-orders` to `src/App.tsx` — admin/manager access only, following existing role-based route pattern
- [x] T034 [US3] Add "Fournisseurs" and "Bons de commande" navigation items to sidebar in `src/layouts/DashboardLayout.tsx` — under admin section, using Lucide icons (e.g., `Truck` for suppliers, `ClipboardList` for purchase orders), visible only to admin/manager roles

**Checkpoint**: User Story 3 complete — suppliers can be managed, purchase orders created and received with automatic stock updates.

---

## Phase 6: User Story 4 — Programme de fidélité client (Priority: P4)

**Goal**: Customers earn loyalty points on purchases and can redeem them as discounts at checkout. Points are reversible on sale cancellation.

**Independent Test**: Select a customer in POS, complete a 100-unit sale, verify customer gains 100 loyalty points. On next sale, apply loyalty points as discount, verify points are deducted. Cancel the first sale, verify earned points are reversed.

### Implementation for User Story 4

- [x] T035 [P] [US4] Add loyalty endpoints to `local-backend/server.cjs`: `GET /api/public/customers/:id/loyalty` (returns loyalty_points, equivalent discount, recent loyalty_transactions), `GET /api/public/loyalty/settings` (returns enabled/pointsPerUnit/pointsToCurrency from app config or defaults), `PUT /api/admin/loyalty/settings` (admin-only update of loyalty config) per `contracts/loyalty-api.md`
- [x] T036 [P] [US4] Modify `POST /api/sales` in `local-backend/server.cjs` to handle loyalty: (a) accept optional `loyaltyPointsUsed` field; (b) if set and customer has enough points, apply as additional discount, create 'redeem' loyalty_transaction, decrement customer loyalty_points; (c) after sale, calculate earned points (total * pointsPerUnit), create 'earn' loyalty_transaction, increment customer loyalty_points; (d) skip all loyalty logic if loyalty is disabled per `contracts/loyalty-api.md`
- [x] T037 [P] [US4] Modify `PUT /api/sales/:id/cancel` in `local-backend/server.cjs` to reverse loyalty: find all loyalty_transactions for this sale, create 'cancel' reversal transactions, update customer loyalty_points accordingly per `contracts/loyalty-api.md`
- [x] T038 [P] [US4] Add loyalty API methods to `src/api/client.ts`: `getCustomerLoyalty(customerId)`, `getLoyaltySettings()`, `updateLoyaltySettings(settings)`; modify existing `createSale()` to accept optional `loyaltyPointsUsed` parameter per `contracts/loyalty-api.md`
- [x] T039 [US4] Add loyalty points display to POS customer selection area in `src/pages/POS.tsx` — when a customer is selected, show their loyalty_points balance and equivalent discount value; add "Utiliser les points" toggle/input that lets the vendor specify how many points to redeem; integrate loyaltyPointsUsed into the checkout flow
- [x] T040 [US4] Add loyalty points column to customer cards/table in `src/pages/Customers.tsx` — display loyalty_points balance for each customer; in customer detail/history view, show loyalty transaction history
- [x] T041 [US4] Add loyalty settings section to admin config: either extend `src/pages/AdminConfig.tsx` or create a new section accessible from admin — fields: enabled toggle, points per unit, points to currency conversion rate; calls `updateLoyaltySettings()`

**Checkpoint**: User Story 4 complete — loyalty points earned on purchases, redeemable at POS, reversible on cancellation, configurable by admin.

---

## Phase 7: User Story 5 — Rapports et exports avancés (Priority: P5)

**Goal**: Admins/Managers can generate detailed sales, inventory, cash session, and repair reports for any period, and export them as CSV files.

**Independent Test**: Navigate to Reports page, select "Ventes" tab, pick a date range with known sales, click "Générer", verify the report shows correct totals and transaction details. Click "Exporter CSV", verify the downloaded file contains all transactions with correct amounts.

### Implementation for User Story 5

- [x] T042 [P] [US5] Add sales report endpoint `GET /api/public/reports/sales?from=&to=` to `local-backend/server.cjs` — aggregates sales data for the period: summary (totalSales, totalRevenue, totalDiscount, netRevenue, averageTicket, totalCost from price_purchase * quantity, grossMargin, marginPercentage as basis points), byPaymentMethod breakdown, topProducts (top 10 by revenue), salesByDay array, and full sales list with items per `contracts/reports-api.md`
- [x] T043 [P] [US5] Add inventory report endpoint `GET /api/public/reports/inventory` to `local-backend/server.cjs` — aggregates current stock: summary (totalProducts, activeProducts, totalStockValue, totalRetailValue, lowStockCount, outOfStockCount), byCategory breakdown, full products list with computed stockValue and retailValue, lowStockProducts list per `contracts/reports-api.md`
- [x] T044 [P] [US5] Add cash sessions report endpoint `GET /api/public/reports/cash-sessions?from=&to=` to `local-backend/server.cjs` — aggregates session data for period: summary (totalSessions, totalOpeningAmount, totalClosingAmount, totalExpectedAmount, totalDifference, sessionsWithDiscrepancy), full sessions list with userName per `contracts/reports-api.md`
- [x] T045 [P] [US5] Add repairs report endpoint `GET /api/public/reports/repairs?from=&to=` to `local-backend/server.cjs` — aggregates repair data for period: summary (totalRepairs, totalRevenue from finalCost, averageCost, averageCompletionDays), byStatus counts, byTechnician breakdown, full repairs list with customerName and technicianName per `contracts/reports-api.md`
- [x] T046 [P] [US5] Add report API methods to `src/api/client.ts`: `getSalesReport(from, to)`, `getInventoryReport()`, `getCashSessionsReport(from, to)`, `getRepairsReport(from, to)` per `contracts/reports-api.md`
- [x] T047 [US5] Create `src/pages/Reports.tsx` — admin/manager page with tab navigation (Ventes, Inventaire, Caisse, Réparations); each tab has: date range picker (from/to inputs for period-based reports), "Générer" button, results displayed as summary cards + detail table, "Exporter CSV" button calling `exportToCSV()` from `src/utils/csv-export.ts`; follows dark theme, Tailwind, Framer Motion patterns
- [x] T048 [US5] Add route `/admin/reports` to `src/App.tsx` — admin/manager access only
- [x] T049 [US5] Add "Rapports" navigation item to sidebar in `src/layouts/DashboardLayout.tsx` — under admin section, using Lucide `FileBarChart` or `BarChart3` icon, visible only to admin/manager roles

**Checkpoint**: User Story 5 complete — all 4 report types can be generated, viewed, and exported as CSV.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Build verification, Hono backend parity, and final validation.

- [ ] T050 [P] Add receipt and ticket data endpoints (`GET /api/public/sales/:id/receipt`, `GET /api/public/repairs/:id/ticket`) to `backend/src/index.ts` (Hono) mirroring the Express implementation from T011-T012 — **BLOCKED**: requires `edgespark db sql` to create new tables + `edgespark pull schema --db` to regenerate Drizzle schema
- [ ] T051 [P] Add notification endpoints and generation side effects to `backend/src/index.ts` (Hono) mirroring the Express implementation from T020-T021, T027 — **BLOCKED**: requires notifications table in Drizzle schema
- [ ] T052 [P] Add supplier and purchase order endpoints to `backend/src/index.ts` (Hono) mirroring the Express implementation from T028-T029 — **BLOCKED**: requires suppliers, purchase_orders, purchase_order_items tables in Drizzle schema
- [ ] T053 [P] Add loyalty endpoints and sale modification logic to `backend/src/index.ts` (Hono) mirroring the Express implementation from T035-T037 — **BLOCKED**: requires loyalty_transactions table + customers.loyalty_points column in Drizzle schema
- [ ] T054 [P] Add report endpoints to `backend/src/index.ts` (Hono) mirroring the Express implementation from T042-T045 — **BLOCKED**: requires all new tables in Drizzle schema
- [x] T055 Run TypeScript type check (`npx tsc --noEmit`) and fix any errors across all modified and new files
- [x] T056 Run production build (`npx vite build`) and verify zero errors and zero warnings; check that main chunk stays under 500KB gzipped per constitution
- [x] T057 Run full test suite (`npx vitest run`) and verify all tests pass
- [x] T058 Manual smoke test: walk through each user story's acceptance scenarios from spec.md — verify receipts print, notifications appear, suppliers/POs work with stock updates, loyalty points earn/redeem/reverse correctly, and reports generate and export accurately

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion — BLOCKS all user stories
- **User Stories (Phases 3-7)**: All depend on Phase 2 (Foundational) completion
  - User stories can proceed in parallel (if staffed) or sequentially in priority order
  - **US1** (receipts): No dependency on other stories
  - **US2** (notifications): No dependency on other stories
  - **US3** (suppliers/POs): No dependency on other stories
  - **US4** (loyalty): No dependency on other stories
  - **US5** (reports): No dependency on other stories
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Phase 2 — fully independent
- **User Story 2 (P2)**: Can start after Phase 2 — fully independent
- **User Story 3 (P3)**: Can start after Phase 2 — fully independent
- **User Story 4 (P4)**: Can start after Phase 2 — fully independent
- **User Story 5 (P5)**: Can start after Phase 2 — fully independent

### Within Each User Story

1. Backend endpoints (marked [P]) can be built in parallel with API client methods
2. API client methods must complete before frontend pages/components
3. Frontend components (receipts, notifications) can be built in parallel with each other
4. Page integration depends on components and API methods being ready
5. Route and navigation additions come last in each story

---

## Parallel Opportunities

### Phase 2 (Foundational)
```
All table creation tasks T004-T009 can run in parallel (different SQL statements, no dependencies):
  T004: notifications table
  T005: suppliers table
  T006: purchase_orders table
  T007: purchase_order_items table
  T008: loyalty_transactions table
  T009: customers ALTER TABLE
```

### Phase 3 (User Story 1)
```
Backend + API client + components can start in parallel:
  T011: receipt backend endpoint
  T012: ticket backend endpoint
  T013: API client methods
  T014: SaleReceipt component
  T015: RepairTicket component
Then sequentially: T016 (print CSS) → T017 (POS integration) → T018 (Repairs integration) → T019 (re-print)
```

### Phase 4 (User Story 2)
```
Backend + API client can start in parallel:
  T020: notification CRUD endpoints
  T021: notification generation side effects
  T022: API client methods
Then sequentially: T023 (store) → T024 (bell) → T025 (panel) → T026 (layout integration) → T027 (cash alert)
```

### Phase 5 (User Story 3)
```
Backend + API client can start in parallel:
  T028: supplier endpoints
  T029: purchase order endpoints
  T030: API client methods
Then sequentially: T031 (Suppliers page) → T032 (PurchaseOrders page) → T033 (routes) → T034 (navigation)
```

### Phase 8 (Polish)
```
All Hono backend tasks can run in parallel:
  T050-T054: Each mirrors a different user story's Express endpoints
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T010)
3. Complete Phase 3: User Story 1 — Receipts (T011-T019)
4. **STOP and VALIDATE**: Print a sale receipt and a repair ticket
5. Deploy/demo if ready — this alone delivers significant business value

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. **US1 (Receipts)** → Test independently → Deploy (MVP)
3. **US2 (Notifications)** → Test independently → Deploy
4. **US3 (Suppliers/POs)** → Test independently → Deploy
5. **US4 (Loyalty)** → Test independently → Deploy
6. **US5 (Reports)** → Test independently → Deploy
7. Polish phase → Final validation → Release

### Parallel Team Strategy

With multiple developers after Phase 2 completion:
- Developer A: US1 (Receipts) + US2 (Notifications)
- Developer B: US3 (Suppliers/POs)
- Developer C: US4 (Loyalty) + US5 (Reports)
- All converge on Phase 8 (Polish)

---

## Notes

- [P] tasks = different files, no dependencies between them
- [Story] label maps task to specific user story for traceability
- All 5 user stories are fully independent — no cross-story dependencies
- All financial calculations use integer arithmetic (cents) per constitution
- All new endpoints enforce role-based access on the backend
- All new UI uses French text, dark theme tokens, and existing component patterns
- Both backends (Express local + Hono production) must be kept in sync
- Commit after each task or logical group for easy rollback
