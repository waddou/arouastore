# Data Model: 5 Fonctionnalités Suggérées pour PhoneStore POS

**Branch**: `001-suggest-features` | **Date**: 2026-02-05

## Existing Entities (Modified)

### customers (existing — modified)

| Field | Type | Constraints | Notes |
|-------|------|------------|-------|
| ... | ... | (existing fields unchanged) | |
| **loyalty_points** | integer | NOT NULL, DEFAULT 0 | **NEW** — Current loyalty point balance |

**Migration**: `ALTER TABLE customers ADD COLUMN loyalty_points INTEGER NOT NULL DEFAULT 0;`

---

## New Entities

### notifications

Stores in-app notification events for all users.

| Field | Type | Constraints | Notes |
|-------|------|------------|-------|
| id | integer | PRIMARY KEY, AUTOINCREMENT | |
| user_id | integer | FK → users.id, nullable | Null = broadcast to all users |
| type | text | NOT NULL, CHECK(type IN ('stock_low', 'repair_status', 'cash_session', 'general')) | Notification category |
| title | text | NOT NULL | Short notification title |
| message | text | NOT NULL | Notification body text |
| reference_type | text | nullable, CHECK(reference_type IN ('product', 'repair', 'cash_session', 'sale')) | Entity type being referenced |
| reference_id | integer | nullable | ID of referenced entity |
| is_read | integer | NOT NULL, DEFAULT 0 | 0=unread, 1=read |
| created_at | integer | NOT NULL, DEFAULT (unixepoch()) | Unix timestamp |

**Indexes**:
- `idx_notifications_user_id` on `user_id`
- `idx_notifications_is_read` on `is_read`
- `idx_notifications_created_at` on `created_at`

**Relationships**: Many notifications → one user (optional)

---

### suppliers

Stores supplier/vendor contact information.

| Field | Type | Constraints | Notes |
|-------|------|------------|-------|
| id | integer | PRIMARY KEY, AUTOINCREMENT | |
| name | text | NOT NULL | Company or contact name |
| phone | text | nullable | Phone number |
| email | text | nullable | Email address |
| address | text | nullable | Physical address |
| notes | text | nullable | Free-form notes |
| is_active | integer | NOT NULL, DEFAULT 1 | Soft delete (0=inactive) |
| created_at | integer | NOT NULL, DEFAULT (unixepoch()) | Unix timestamp |
| updated_at | integer | NOT NULL, DEFAULT (unixepoch()) | Unix timestamp |

**Indexes**:
- `idx_suppliers_is_active` on `is_active`

---

### purchase_orders

Header for stock replenishment orders, linked to a supplier.

| Field | Type | Constraints | Notes |
|-------|------|------------|-------|
| id | integer | PRIMARY KEY, AUTOINCREMENT | |
| order_number | text | NOT NULL, UNIQUE | Auto-generated (e.g. PO-2026-0001) |
| supplier_id | integer | NOT NULL, FK → suppliers.id | |
| status | text | NOT NULL, DEFAULT 'pending', CHECK(status IN ('pending', 'partially_received', 'received', 'cancelled')) | Order lifecycle |
| total_amount | integer | NOT NULL, DEFAULT 0 | Total in cents (integer arithmetic) |
| notes | text | nullable | Order notes |
| ordered_at | integer | NOT NULL, DEFAULT (unixepoch()) | When order was placed |
| received_at | integer | nullable | When order was fully received |
| created_by | integer | NOT NULL, FK → users.id | User who created the order |
| created_at | integer | NOT NULL, DEFAULT (unixepoch()) | |
| updated_at | integer | NOT NULL, DEFAULT (unixepoch()) | |

**Indexes**:
- `idx_purchase_orders_supplier_id` on `supplier_id`
- `idx_purchase_orders_status` on `status`
- `idx_purchase_orders_ordered_at` on `ordered_at`

**Relationships**: Many orders → one supplier. Many orders → one creating user.

---

### purchase_order_items

Line items for each purchase order (mirrors `sale_items` pattern).

| Field | Type | Constraints | Notes |
|-------|------|------------|-------|
| id | integer | PRIMARY KEY, AUTOINCREMENT | |
| purchase_order_id | integer | NOT NULL, FK → purchase_orders.id | |
| product_id | integer | NOT NULL, FK → products.id | |
| quantity_ordered | integer | NOT NULL | Quantity requested |
| quantity_received | integer | NOT NULL, DEFAULT 0 | Quantity actually received |
| unit_price | integer | NOT NULL | Purchase price in cents at time of order |
| subtotal | integer | NOT NULL | quantity_ordered * unit_price |

**Indexes**:
- `idx_purchase_order_items_order_id` on `purchase_order_id`

**Relationships**: Many items → one purchase order. Many items → one product.

---

### loyalty_transactions

Audit trail for loyalty point credits and debits.

| Field | Type | Constraints | Notes |
|-------|------|------------|-------|
| id | integer | PRIMARY KEY, AUTOINCREMENT | |
| customer_id | integer | NOT NULL, FK → customers.id | |
| sale_id | integer | nullable, FK → sales.id | Linked sale (null for manual adjustments) |
| points | integer | NOT NULL | Positive = credit, negative = debit |
| type | text | NOT NULL, CHECK(type IN ('earn', 'redeem', 'cancel', 'adjust')) | Transaction type |
| description | text | nullable | Human-readable description |
| created_at | integer | NOT NULL, DEFAULT (unixepoch()) | Unix timestamp |

**Indexes**:
- `idx_loyalty_transactions_customer_id` on `customer_id`
- `idx_loyalty_transactions_sale_id` on `sale_id`

**Relationships**: Many transactions → one customer. Many transactions → one sale (optional).

---

## State Transitions

### Purchase Order Status

```
pending → partially_received → received
pending → received (direct full receipt)
pending → cancelled
partially_received → received
partially_received → cancelled
```

### Notification Lifecycle

```
created (is_read=0) → read (is_read=1)
```

### Loyalty Transaction Types

| Type | Points | Trigger |
|------|--------|---------|
| earn | +N | Sale completed (1 point per monetary unit) |
| redeem | -N | Points used as discount at POS |
| cancel | -N / +N | Sale cancelled (reverses earn) or cancellation of redemption |
| adjust | ±N | Manual admin adjustment |

---

## Entity Relationship Summary

```
suppliers 1──────*  purchase_orders
                        1
                        │
                        * purchase_order_items *──────1 products
                        
customers 1──────*  loyalty_transactions *──────1 sales
    │
    └── loyalty_points (column on customers)

users 1──────*  notifications

products ←── (referenced by notifications via reference_type/reference_id)
repairs  ←── (referenced by notifications via reference_type/reference_id)
cash_sessions ←── (referenced by notifications via reference_type/reference_id)
```

---

## Settings Extension

The loyalty program configuration needs a settings storage mechanism. Options:

**Approach**: Add to the existing store settings pattern (if a store_settings table or localStorage config exists), or create a simple `app_settings` key-value table.

| Setting Key | Type | Default | Description |
|------------|------|---------|-------------|
| loyalty_points_per_unit | integer | 1 | Points earned per monetary unit spent |
| loyalty_points_to_currency | integer | 100 | Points needed for 1 monetary unit discount |
| loyalty_enabled | integer | 1 | 0=disabled, 1=enabled |

**Storage**: These can be stored in localStorage via `useStoreSettingsStore` (matching existing currency/store settings pattern) or in a new `app_settings` table for server persistence. Recommend localStorage for MVP, migrate to DB if multi-device sync is needed.
