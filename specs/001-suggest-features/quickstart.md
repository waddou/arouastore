# Quickstart: 5 Fonctionnalités Suggérées pour PhoneStore POS

**Branch**: `001-suggest-features` | **Date**: 2026-02-05

## Prerequisites

- Node.js 18+ installed
- Git checkout on branch `001-suggest-features`
- Local backend running on port 3001 (TiDB Cloud or local MySQL)

## Setup

```bash
# 1. Switch to feature branch
git checkout 001-suggest-features

# 2. Install dependencies (if Vitest is added)
npm install

# 3. Start both frontend and backend
npm run start
# Or run them separately:
# npm run backend   (Express on port 3001)
# npm run dev       (Vite on port 5173)
```

## Implementation Order

Each feature is independent and can be implemented in any order. The recommended sequence based on priority and dependencies:

### Feature 1: Receipt & Ticket Printing (P1)

**Files to create/modify**:
- `src/components/receipts/SaleReceipt.tsx` — Receipt document component
- `src/components/receipts/RepairTicket.tsx` — Repair ticket document component
- `src/pages/POS.tsx` — Add "Print Receipt" button after sale completion
- `src/pages/Repairs.tsx` — Add "Print Ticket" button on repair cards
- `src/api/client.ts` — Add `getSaleReceipt()`, `getRepairTicket()`
- `src/index.css` — Add `@media print` styles
- `local-backend/server.cjs` — Add receipt/ticket data endpoints
- `backend/src/index.ts` — Add receipt/ticket data endpoints (Hono)

**Key patterns**:
- Receipt component renders all sale data in a print-friendly layout
- Use `window.print()` on a hidden iframe containing the receipt component
- Target 80mm width for thermal printers
- Include store info from `useStoreSettingsStore`

### Feature 2: Notifications (P2)

**Files to create/modify**:
- `src/store/notificationStore.ts` — New Zustand store for notifications
- `src/components/notifications/NotificationBell.tsx` — Bell icon with badge count
- `src/components/notifications/NotificationPanel.tsx` — Dropdown panel listing notifications
- `src/layouts/DashboardLayout.tsx` — Add NotificationBell to header
- `src/api/client.ts` — Add notification API methods
- `src/types/index.ts` — Add Notification type
- `local-backend/server.cjs` — Add notification CRUD routes + notification generation in existing routes
- `backend/src/index.ts` — Same for Hono

**Key patterns**:
- `notificationStore` polls `getUnreadNotificationCount()` every 30s
- Notifications are created server-side as side effects (e.g., stock check after sale)
- Bell icon shows unread count badge (Lucide `Bell` icon)
- Panel uses Headless UI `Popover` or `Menu` component

### Feature 3: Suppliers & Purchase Orders (P3)

**Files to create/modify**:
- `src/pages/Suppliers.tsx` — New page: supplier list and CRUD
- `src/pages/PurchaseOrders.tsx` — New page: purchase order management
- `src/store/useStore.ts` — Add supplier/PO state and actions (or new dedicated store)
- `src/api/client.ts` — Add supplier and PO API methods
- `src/types/index.ts` — Add Supplier, PurchaseOrder, PurchaseOrderItem types
- `src/App.tsx` — Add routes `/admin/suppliers` and `/admin/purchase-orders`
- `src/layouts/DashboardLayout.tsx` — Add navigation items for suppliers/POs
- `local-backend/server.cjs` — Add supplier and PO CRUD routes + stock update on receive
- `backend/src/index.ts` — Same for Hono

**Key patterns**:
- Follow existing page pattern (useEffect fetch, modal forms, table list)
- Admin/Manager access only (same as ProductManagement)
- Stock update on receive uses atomic increment (`SET stock = stock + ?`)

### Feature 4: Loyalty Program (P4)

**Files to create/modify**:
- `src/pages/POS.tsx` — Add loyalty points display and redemption UI
- `src/pages/Customers.tsx` — Show loyalty points on customer cards
- `src/store/useStore.ts` — Modify checkout to include loyalty points
- `src/api/client.ts` — Add loyalty API methods, modify `createSale`
- `src/types/index.ts` — Add LoyaltyTransaction type, update Customer type
- `local-backend/server.cjs` — Add loyalty endpoints, modify sale creation/cancellation
- `backend/src/index.ts` — Same for Hono

**Key patterns**:
- Loyalty points displayed next to customer name in POS
- "Use points" toggle in checkout flow
- Integer arithmetic only (constitution)
- Sale cancellation reverses all loyalty movements

### Feature 5: Reports & Exports (P5)

**Files to create/modify**:
- `src/pages/Reports.tsx` — New page: report generation and display
- `src/utils/csv-export.ts` — CSV generation and download utility
- `src/api/client.ts` — Add report API methods
- `src/types/index.ts` — Add report response types
- `src/App.tsx` — Add route `/admin/reports`
- `src/layouts/DashboardLayout.tsx` — Add navigation item
- `local-backend/server.cjs` — Add report endpoints
- `backend/src/index.ts` — Same for Hono

**Key patterns**:
- Reports page has tabs: Ventes, Inventaire, Caisse, Réparations
- Date range picker for period selection
- Data displayed as tables, "Exporter CSV" button
- CSV uses semicolon separator for French Excel compatibility

## Database Migrations

For local backend (`local-backend/server.cjs`), add these `CREATE TABLE IF NOT EXISTS` statements to the initialization section:

1. `notifications` table
2. `suppliers` table
3. `purchase_orders` table
4. `purchase_order_items` table
5. `loyalty_transactions` table
6. `ALTER TABLE customers ADD COLUMN loyalty_points INTEGER NOT NULL DEFAULT 0` (with error handling for existing column)

See `data-model.md` for full schema definitions.

## Testing

After adding Vitest:

```bash
# Run all tests
npx vitest

# Run tests for a specific feature
npx vitest tests/receipts/
npx vitest tests/notifications/
npx vitest tests/suppliers/
npx vitest tests/loyalty/
npx vitest tests/reports/
```

**Required tests per constitution**:
- Unit tests for financial calculations (loyalty points, report totals, PO totals)
- Integration tests for each user story's primary flow
- Regression tests for any bugs found during development

## Verification

After each feature implementation, verify:

1. `npx tsc --noEmit` — No TypeScript errors
2. `npx vite build` — Build succeeds with 0 warnings
3. `npx vitest` — All tests pass
4. Manual verification of user acceptance scenarios from spec.md
5. Role-based access: test as admin, manager, and agent
