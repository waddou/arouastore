# API Contract: Reports & Exports

**Feature**: Rapports et exports avancés
**Date**: 2026-02-05

## Overview

Reports extend existing statistics endpoints with more detailed data and date range filtering. CSV export is handled client-side from the API response data.

---

## Endpoints

### GET /api/public/reports/sales

Detailed sales report for a given period.

**Auth**: Login optional
**Access**: Admin, Manager

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| from | integer | (required) | Start date as unix timestamp |
| to | integer | (required) | End date as unix timestamp |

**Response 200**:
```json
{
  "data": {
    "period": {
      "from": 1738368000,
      "to": 1738972800
    },
    "summary": {
      "totalSales": 45,
      "totalRevenue": 2500000,
      "totalDiscount": 125000,
      "netRevenue": 2375000,
      "averageTicket": 52778,
      "totalCost": 1500000,
      "grossMargin": 875000,
      "marginPercentage": 3684
    },
    "byPaymentMethod": {
      "cash": { "count": 25, "total": 1400000 },
      "card": { "count": 15, "total": 800000 },
      "mobile": { "count": 5, "total": 300000 }
    },
    "topProducts": [
      {
        "productId": 42,
        "productName": "Coque iPhone 15",
        "sku": "ACC-IP15-001",
        "quantitySold": 30,
        "revenue": 450000
      }
    ],
    "salesByDay": [
      {
        "date": "2026-02-01",
        "count": 8,
        "revenue": 450000
      }
    ],
    "sales": [
      {
        "id": 1,
        "customerName": "Ahmed Ben Ali",
        "total": 15000,
        "discount": 500,
        "paymentMethod": "cash",
        "sellerName": "Mohamed",
        "createdAt": 1738700000,
        "items": [
          {
            "productName": "Coque iPhone 15",
            "quantity": 2,
            "unitPrice": 5000,
            "subtotal": 10000
          }
        ]
      }
    ]
  }
}
```

---

### GET /api/public/reports/inventory

Current inventory state report.

**Auth**: Login optional
**Access**: Admin, Manager

**Response 200**:
```json
{
  "data": {
    "summary": {
      "totalProducts": 150,
      "activeProducts": 142,
      "totalStockValue": 5000000,
      "totalRetailValue": 8500000,
      "lowStockCount": 12,
      "outOfStockCount": 3
    },
    "byCategory": {
      "phone": { "count": 30, "stockValue": 3000000 },
      "accessory": { "count": 80, "stockValue": 1200000 },
      "component": { "count": 40, "stockValue": 800000 }
    },
    "products": [
      {
        "id": 42,
        "sku": "ACC-IP15-001",
        "name": "Coque iPhone 15",
        "category": "accessory",
        "brand": "Apple",
        "stock": 25,
        "alertThreshold": 5,
        "pricePurchase": 2000,
        "priceSale": 5000,
        "stockValue": 50000,
        "retailValue": 125000,
        "isLowStock": false
      }
    ],
    "lowStockProducts": [
      {
        "id": 43,
        "sku": "CMP-SCR-001",
        "name": "Écran iPhone 14",
        "stock": 2,
        "alertThreshold": 5
      }
    ]
  }
}
```

---

### GET /api/public/reports/cash-sessions

Cash session report for a given period.

**Auth**: Login optional
**Access**: Admin, Manager

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| from | integer | (required) | Start date as unix timestamp |
| to | integer | (required) | End date as unix timestamp |

**Response 200**:
```json
{
  "data": {
    "period": {
      "from": 1738368000,
      "to": 1738972800
    },
    "summary": {
      "totalSessions": 14,
      "totalOpeningAmount": 700000,
      "totalClosingAmount": 2100000,
      "totalExpectedAmount": 2150000,
      "totalDifference": -50000,
      "sessionsWithDiscrepancy": 3
    },
    "sessions": [
      {
        "id": 1,
        "userName": "Mohamed",
        "openingAmount": 50000,
        "closingAmount": 150000,
        "expectedAmount": 155000,
        "difference": -5000,
        "openedAt": 1738700000,
        "closedAt": 1738735000,
        "notes": "Monnaie manquante"
      }
    ]
  }
}
```

---

### GET /api/public/reports/repairs

Repair activity report for a given period.

**Auth**: Login optional
**Access**: Admin, Manager

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| from | integer | (required) | Start date as unix timestamp |
| to | integer | (required) | End date as unix timestamp |

**Response 200**:
```json
{
  "data": {
    "period": {
      "from": 1738368000,
      "to": 1738972800
    },
    "summary": {
      "totalRepairs": 25,
      "totalRevenue": 750000,
      "averageCost": 30000,
      "averageCompletionDays": 3
    },
    "byStatus": {
      "new": 5,
      "diagnostic": 3,
      "repair": 2,
      "delivered": 15
    },
    "byTechnician": [
      {
        "technicianId": 2,
        "technicianName": "Karim",
        "repairCount": 12,
        "totalRevenue": 360000
      }
    ],
    "repairs": [
      {
        "id": 1,
        "customerName": "Ahmed Ben Ali",
        "deviceBrand": "Apple",
        "deviceModel": "iPhone 14 Pro",
        "issueDescription": "Écran cassé",
        "status": "delivered",
        "estimatedCost": 25000,
        "finalCost": 22000,
        "technicianName": "Karim",
        "createdAt": 1738700000,
        "deliveredAt": 1738900000
      }
    ]
  }
}
```

---

## Frontend API Client Additions

```typescript
// In src/api/client.ts
getSalesReport(from: number, to: number): Promise<SalesReportData>
getInventoryReport(): Promise<InventoryReportData>
getCashSessionsReport(from: number, to: number): Promise<CashSessionsReportData>
getRepairsReport(from: number, to: number): Promise<RepairsReportData>
```

## CSV Export (Client-Side)

CSV generation is handled by a utility function in `src/utils/csv-export.ts`:

```typescript
exportToCSV(data: Record<string, unknown>[], filename: string, columns: ColumnDef[]): void
```

**Behavior**:
- Takes an array of objects and column definitions
- Generates a CSV string with headers
- Triggers a browser download via `Blob` + `URL.createObjectURL`
- Handles French-friendly formatting (semicolon separator for Excel compatibility)

## Notes

- All monetary values are in integer cents (constitution compliance)
- `marginPercentage` is expressed as integer basis points (3684 = 36.84%)
- Reports are read-only, no data modification
- Access restricted to Admin and Manager roles (both frontend route hiding and backend role check)
