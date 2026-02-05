# API Contract: Notifications

**Feature**: Système de notifications et alertes en temps réel
**Date**: 2026-02-05

## Overview

Notifications are created server-side as side effects of existing operations and fetched by the frontend via polling. Each notification targets a specific user or all users (broadcast).

---

## Endpoints

### GET /api/notifications

Fetch notifications for the current user (includes broadcasts).

**Auth**: Login required
**Access**: All authenticated users

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| unread_only | boolean | false | If true, return only unread notifications |
| limit | integer | 50 | Max number of notifications to return |
| offset | integer | 0 | Pagination offset |

**Response 200**:
```json
{
  "data": [
    {
      "id": 1,
      "type": "stock_low",
      "title": "Stock bas",
      "message": "Le produit 'Coque iPhone 15' n'a plus que 3 unités en stock",
      "referenceType": "product",
      "referenceId": 42,
      "isRead": false,
      "createdAt": 1738700000
    }
  ],
  "unreadCount": 5
}
```

---

### GET /api/notifications/unread-count

Lightweight endpoint to get only the unread notification count (for badge polling).

**Auth**: Login required
**Access**: All authenticated users

**Response 200**:
```json
{
  "count": 5
}
```

---

### PUT /api/notifications/:id/read

Mark a single notification as read.

**Auth**: Login required
**Access**: Owner of the notification or broadcast notification

**Response 200**:
```json
{
  "data": { "id": 1, "isRead": true }
}
```

**Response 404**:
```json
{
  "error": "Notification introuvable"
}
```

---

### PUT /api/notifications/read-all

Mark all notifications as read for the current user.

**Auth**: Login required
**Access**: All authenticated users

**Response 200**:
```json
{
  "data": { "updatedCount": 5 }
}
```

---

## Notification Generation (Server-Side)

Notifications are created as side effects within existing endpoints:

| Trigger | Notification Type | Target | Condition |
|---------|------------------|--------|-----------|
| POST /api/sales (sale created) | stock_low | broadcast | Product stock falls below alert_threshold |
| PUT /api/repairs/:id (status change) | repair_status | broadcast | Status changes to any new value |
| PATCH /api/repairs/:id/status | repair_status | broadcast | Status changes |
| Periodic check (polling) | cash_session | admin, manager | Cash session open > 12h or past store closing time |

---

## Frontend API Client Additions

```typescript
// In src/api/client.ts
getNotifications(params?: { unreadOnly?: boolean; limit?: number; offset?: number }): Promise<{ data: Notification[]; unreadCount: number }>
getUnreadNotificationCount(): Promise<{ count: number }>
markNotificationRead(id: number): Promise<void>
markAllNotificationsRead(): Promise<void>
```

## Notes

- Frontend polls `getUnreadNotificationCount()` every 30 seconds for the badge
- Full notification list is fetched when the user opens the notification panel
- Notifications older than 30 days can be cleaned up by a periodic backend task (future enhancement)
