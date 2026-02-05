# API Contract: Receipts & Tickets

**Feature**: Impression de reçus et tickets de réparation
**Date**: 2026-02-05

## Overview

Receipt and ticket generation is primarily a **frontend concern** — the document is rendered as a React component and printed via the browser's print API. No new backend endpoints are needed for the core functionality since all required data is already available through existing endpoints.

However, one optional endpoint is provided for fetching complete receipt data in a single call (combining sale + items + customer + store info).

---

## Endpoints

### GET /api/public/sales/:id/receipt

Fetch all data needed to render a sale receipt in a single call.

**Auth**: Login optional (public)
**Access**: All authenticated users

**Response 200**:
```json
{
  "data": {
    "sale": {
      "id": 1,
      "total": 15000,
      "discount": 500,
      "paymentMethod": "cash",
      "status": "completed",
      "createdAt": 1738700000
    },
    "items": [
      {
        "productName": "Coque iPhone 15",
        "quantity": 2,
        "unitPrice": 5000,
        "subtotal": 10000
      }
    ],
    "customer": {
      "name": "Ahmed Ben Ali",
      "phone": "+216 98 765 432"
    },
    "store": {
      "name": "Aroua Store",
      "address": "123 Rue Example",
      "phone": "+216 71 234 567",
      "email": "contact@arouastore.tn"
    },
    "seller": {
      "name": "Mohamed"
    }
  }
}
```

**Response 404**:
```json
{
  "error": "Vente introuvable"
}
```

---

### GET /api/public/repairs/:id/ticket

Fetch all data needed to render a repair ticket in a single call.

**Auth**: Login optional (public)
**Access**: All authenticated users

**Response 200**:
```json
{
  "data": {
    "repair": {
      "id": 1,
      "deviceBrand": "Apple",
      "deviceModel": "iPhone 14 Pro",
      "deviceVariant": "256GB",
      "issueDescription": "Écran cassé",
      "estimatedCost": 25000,
      "status": "new",
      "promisedDate": 1738900000,
      "createdAt": 1738700000
    },
    "customer": {
      "name": "Ahmed Ben Ali",
      "phone": "+216 98 765 432"
    },
    "technician": {
      "name": "Karim"
    },
    "store": {
      "name": "Aroua Store",
      "address": "123 Rue Example",
      "phone": "+216 71 234 567"
    }
  }
}
```

**Response 404**:
```json
{
  "error": "Réparation introuvable"
}
```

---

## Frontend API Client Additions

```typescript
// In src/api/client.ts
getSaleReceipt(saleId: number): Promise<SaleReceiptData>
getRepairTicket(repairId: number): Promise<RepairTicketData>
```

## Notes

- Receipt/ticket rendering and printing is handled entirely in the frontend
- The browser `window.print()` API is used with `@media print` CSS
- Print layout targets 80mm thermal receipt paper width
- Store information is fetched from store settings (already available in `useStoreSettingsStore`)
