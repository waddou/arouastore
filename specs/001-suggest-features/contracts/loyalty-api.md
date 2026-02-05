# API Contract: Loyalty Program

**Feature**: Programme de fidélité client
**Date**: 2026-02-05

## Overview

The loyalty system integrates with the existing sales flow. Points are earned automatically on sale completion and can be redeemed as discounts during POS checkout. All point movements are tracked via an audit table.

---

## Endpoints

### GET /api/public/customers/:id/loyalty

Get loyalty information for a specific customer.

**Auth**: Login optional
**Access**: All authenticated users

**Response 200**:
```json
{
  "data": {
    "customerId": 1,
    "loyaltyPoints": 1500,
    "equivalentDiscount": 1500,
    "recentTransactions": [
      {
        "id": 1,
        "points": 500,
        "type": "earn",
        "description": "Achat #42 — 500 points gagnés",
        "saleId": 42,
        "createdAt": 1738700000
      },
      {
        "id": 2,
        "points": -200,
        "type": "redeem",
        "description": "Remise fidélité — 200 points utilisés",
        "saleId": 43,
        "createdAt": 1738750000
      }
    ]
  }
}
```

---

### GET /api/public/loyalty/settings

Get current loyalty program configuration.

**Auth**: Login optional
**Access**: All authenticated users

**Response 200**:
```json
{
  "data": {
    "enabled": true,
    "pointsPerUnit": 1,
    "pointsToCurrency": 100
  }
}
```

---

### PUT /api/admin/loyalty/settings

Update loyalty program configuration.

**Auth**: Login required
**Access**: Admin only

**Request Body**:
```json
{
  "enabled": true,
  "pointsPerUnit": 1,
  "pointsToCurrency": 100
}
```

**Validation**:
- `enabled`: boolean
- `pointsPerUnit`: integer >= 0
- `pointsToCurrency`: integer > 0

**Response 200**:
```json
{
  "data": {
    "enabled": true,
    "pointsPerUnit": 1,
    "pointsToCurrency": 100
  }
}
```

---

## Integration with Existing Endpoints

### POST /api/sales (modified)

**Additional Request Field**:
```json
{
  "customerId": 1,
  "items": [...],
  "discount": 0,
  "paymentMethod": "cash",
  "loyaltyPointsUsed": 200
}
```

**Additional Behavior on Sale Creation**:
1. If `loyaltyPointsUsed > 0` and customer has enough points:
   - Calculate discount: `loyaltyPointsUsed / pointsToCurrency` (in monetary units)
   - Add this discount to the sale total reduction
   - Create `loyalty_transaction` with type `redeem` and negative points
   - Decrement customer's `loyalty_points`
2. After sale is created:
   - Calculate earned points: `sale.total * pointsPerUnit` (on the final total after all discounts)
   - Create `loyalty_transaction` with type `earn` and positive points
   - Increment customer's `loyalty_points`
3. If loyalty is disabled, skip all loyalty logic

### PUT /api/sales/:id/cancel (modified)

**Additional Behavior on Sale Cancellation**:
1. Find all `loyalty_transactions` linked to this sale
2. Reverse each transaction:
   - For `earn` transactions: create `cancel` transaction with negative points, decrement customer points
   - For `redeem` transactions: create `cancel` transaction with positive points, increment customer points (refund the used points)

---

## Frontend API Client Additions

```typescript
// In src/api/client.ts
getCustomerLoyalty(customerId: number): Promise<CustomerLoyaltyData>
getLoyaltySettings(): Promise<LoyaltySettings>
updateLoyaltySettings(settings: LoyaltySettings): Promise<LoyaltySettings>

// Modified existing method signature:
createSale(sale: CreateSaleInput & { loyaltyPointsUsed?: number }): Promise<Sale>
```

## Notes

- Points use integer arithmetic only (aligned with constitution)
- Default conversion: 100 points = 1 monetary unit (configurable)
- Points are earned on the final sale total (after all discounts including loyalty discount)
- Sale cancellation fully reverses all loyalty point movements
