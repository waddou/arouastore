# API Contract: Suppliers & Purchase Orders

**Feature**: Gestion des fournisseurs et commandes d'approvisionnement
**Date**: 2026-02-05

## Overview

Full CRUD for suppliers and purchase orders, including partial/full receipt of orders with automatic stock updates.

---

## Supplier Endpoints

### GET /api/public/suppliers

List all active suppliers.

**Auth**: Login optional
**Access**: All authenticated users

**Response 200**:
```json
{
  "data": [
    {
      "id": 1,
      "name": "TechParts SARL",
      "phone": "+216 71 000 000",
      "email": "contact@techparts.tn",
      "address": "Zone Industrielle, Tunis",
      "notes": "Fournisseur principal d'écrans",
      "isActive": true,
      "createdAt": 1738700000
    }
  ]
}
```

---

### GET /api/public/suppliers/:id

Get a single supplier.

**Auth**: Login optional
**Access**: All authenticated users

**Response 200**:
```json
{
  "data": {
    "id": 1,
    "name": "TechParts SARL",
    "phone": "+216 71 000 000",
    "email": "contact@techparts.tn",
    "address": "Zone Industrielle, Tunis",
    "notes": "Fournisseur principal d'écrans",
    "isActive": true,
    "createdAt": 1738700000
  }
}
```

---

### POST /api/admin/suppliers

Create a new supplier.

**Auth**: Login required
**Access**: Admin, Manager

**Request Body**:
```json
{
  "name": "TechParts SARL",
  "phone": "+216 71 000 000",
  "email": "contact@techparts.tn",
  "address": "Zone Industrielle, Tunis",
  "notes": "Fournisseur principal d'écrans"
}
```

**Validation**:
- `name`: required, non-empty string
- `phone`, `email`, `address`, `notes`: optional strings

**Response 201**:
```json
{
  "data": { "id": 1, "name": "TechParts SARL", "..." : "..." }
}
```

---

### PUT /api/admin/suppliers/:id

Update a supplier.

**Auth**: Login required
**Access**: Admin, Manager

**Request Body**: Same fields as POST (all optional for partial update)

**Response 200**:
```json
{
  "data": { "id": 1, "name": "TechParts SARL (updated)", "..." : "..." }
}
```

---

### DELETE /api/admin/suppliers/:id

Soft-delete a supplier (set `is_active = 0`).

**Auth**: Login required
**Access**: Admin, Manager

**Response 200**:
```json
{
  "data": { "success": true }
}
```

**Response 409** (if supplier has pending orders):
```json
{
  "error": "Ce fournisseur a des commandes en cours. Veuillez d'abord les clôturer."
}
```

---

## Purchase Order Endpoints

### GET /api/public/purchase-orders

List purchase orders with optional filters.

**Auth**: Login optional
**Access**: All authenticated users

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| status | string | (all) | Filter by status: pending, partially_received, received, cancelled |
| supplier_id | integer | (all) | Filter by supplier |
| limit | integer | 50 | Max results |

**Response 200**:
```json
{
  "data": [
    {
      "id": 1,
      "orderNumber": "PO-2026-0001",
      "supplierId": 1,
      "supplierName": "TechParts SARL",
      "status": "pending",
      "totalAmount": 150000,
      "notes": null,
      "orderedAt": 1738700000,
      "receivedAt": null,
      "createdBy": 1,
      "createdAt": 1738700000
    }
  ]
}
```

---

### GET /api/public/purchase-orders/:id

Get a single purchase order with its items.

**Auth**: Login optional
**Access**: All authenticated users

**Response 200**:
```json
{
  "data": {
    "id": 1,
    "orderNumber": "PO-2026-0001",
    "supplierId": 1,
    "supplierName": "TechParts SARL",
    "status": "pending",
    "totalAmount": 150000,
    "notes": null,
    "orderedAt": 1738700000,
    "items": [
      {
        "id": 1,
        "productId": 42,
        "productName": "Écran iPhone 14",
        "productSku": "SCR-IP14-001",
        "quantityOrdered": 10,
        "quantityReceived": 0,
        "unitPrice": 15000,
        "subtotal": 150000
      }
    ]
  }
}
```

---

### POST /api/admin/purchase-orders

Create a new purchase order.

**Auth**: Login required
**Access**: Admin, Manager

**Request Body**:
```json
{
  "supplierId": 1,
  "notes": "Commande urgente",
  "items": [
    {
      "productId": 42,
      "quantityOrdered": 10
    },
    {
      "productId": 43,
      "quantityOrdered": 5
    }
  ]
}
```

**Validation**:
- `supplierId`: required, must reference existing active supplier
- `items`: required, non-empty array
- Each item: `productId` required (must exist), `quantityOrdered` required (>0)
- `unitPrice` is auto-filled from product's `price_purchase`
- `orderNumber` is auto-generated
- `totalAmount` is auto-calculated

**Response 201**:
```json
{
  "data": { "id": 1, "orderNumber": "PO-2026-0001", "..." : "..." }
}
```

---

### PUT /api/admin/purchase-orders/:id/receive

Receive a purchase order (full or partial).

**Auth**: Login required
**Access**: Admin, Manager

**Request Body**:
```json
{
  "items": [
    {
      "itemId": 1,
      "quantityReceived": 8
    },
    {
      "itemId": 2,
      "quantityReceived": 5
    }
  ]
}
```

**Behavior**:
- Updates `quantity_received` for each item
- **Atomically** increments product stock by `quantityReceived`
- If all items fully received → status = `received`, set `received_at`
- If some items partially received → status = `partially_received`

**Response 200**:
```json
{
  "data": { "id": 1, "status": "partially_received", "..." : "..." }
}
```

**Response 400** (if order already received/cancelled):
```json
{
  "error": "Cette commande ne peut plus être modifiée"
}
```

---

### PUT /api/admin/purchase-orders/:id/cancel

Cancel a pending or partially received order.

**Auth**: Login required
**Access**: Admin, Manager

**Behavior**:
- Sets status to `cancelled`
- Does NOT reverse already-received stock (already in inventory)

**Response 200**:
```json
{
  "data": { "id": 1, "status": "cancelled" }
}
```

---

## Frontend API Client Additions

```typescript
// In src/api/client.ts

// Suppliers
getSuppliers(): Promise<Supplier[]>
getSupplier(id: number): Promise<Supplier>
createSupplier(supplier: CreateSupplierInput): Promise<Supplier>
updateSupplier(id: number, updates: Partial<CreateSupplierInput>): Promise<Supplier>
deleteSupplier(id: number): Promise<void>

// Purchase Orders
getPurchaseOrders(params?: { status?: string; supplierId?: number; limit?: number }): Promise<PurchaseOrder[]>
getPurchaseOrder(id: number): Promise<PurchaseOrderDetail>
createPurchaseOrder(order: CreatePurchaseOrderInput): Promise<PurchaseOrder>
receivePurchaseOrder(id: number, items: ReceiveItem[]): Promise<PurchaseOrder>
cancelPurchaseOrder(id: number): Promise<PurchaseOrder>
```
