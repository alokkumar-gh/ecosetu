# EcoSetu — Analytics and Reporting

> **Reference:** All terminology follows `00_PROJECT_INDEX.md`.

---

## 1. Purpose

Analytics provide visibility into platform activity for administrators and summary progress for collectors and citizens. All analytics are derived from real transactional data — no synthetic or predicted values.

---

## 2. MVP Analytics (Mobile & In-App View)

These are implemented in the MVP and displayed on the Android Admin View (and summarized for collectors/citizens).

### 2.1 Summary Metrics

| Metric | Query Source | Display |
|--------|------------|---------|
| Total registered users (by role) | `COUNT(*) FROM users GROUP BY role` | Metric cards |
| Total e-waste items submitted | `COUNT(*) FROM ewaste_items` | Metric card |
| Total collection requests | `COUNT(*) FROM collection_requests` | Metric card |
| Total completed pickups | `COUNT(*) FROM pickups WHERE status = 'COMPLETED'` | Metric card |
| Total consignments delivered | `COUNT(*) FROM consignments WHERE status = 'ACCEPTED'` | Metric card |
| Total recycling completed | `COUNT(*) FROM recycling_records WHERE status = 'COMPLETED'` | Metric card |
| Total weight collected (kg) | `SUM(total_weight_kg) FROM pickups WHERE status = 'COMPLETED'` | Metric card |
| Total weight recycled (kg) | `SUM(output_weight_kg) FROM recycling_records WHERE status = 'COMPLETED'` | Metric card |

### 2.2 Category Distribution

| Metric | Query Source | Display |
|--------|------------|---------|
| Items by category | `COUNT(*) FROM ewaste_items GROUP BY category` | Mobile category list with progress bars |

### 2.3 Status Distribution

| Metric | Query Source | Display |
|--------|------------|---------|
| Requests by status | `COUNT(*) FROM collection_requests GROUP BY status` | Status pill breakdown |

### 2.4 Recent Activity

| Metric | Query Source | Display |
|--------|------------|---------|
| Last 20 platform events | `SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 20` | FlatList activity feed |

### 2.5 Conversion Funnel

| Step | Metric | Query |
|------|--------|-------|
| 1 | Items submitted | Total ewaste_items |
| 2 | Requests submitted | Requests with status ≠ DRAFT |
| 3 | Requests accepted | Requests with accepted_at |
| 4 | Pickups completed | Completed pickups |
| 5 | Consignments delivered | Accepted consignments |
| 6 | Recycling completed | Completed recycling records |

Display as a step indicator showing conversion rates.

---

## 3. API

### GET `/api/v1/admin/analytics`

**Auth:** ADMIN only

**Response:**

```json
{
  "success": true,
  "data": {
    "users": {
      "total": 63,
      "byRole": {
        "CITIZEN": 50,
        "INFORMAL_COLLECTOR": 10,
        "RECYCLER": 3
      }
    },
    "ewasteItems": {
      "total": 120,
      "byCategory": {
        "MOBILE_PHONE": 35,
        "LAPTOP": 28,
        "MONITOR": 18,
        "KEYBOARD_MOUSE": 15,
        "CABLE_CHARGER": 10,
        "OTHER": 14
      }
    },
    "requests": {
      "total": 85,
      "byStatus": {
        "SUBMITTED": 5,
        "ACCEPTED": 8,
        "PICKED_UP": 60,
        "CANCELLED": 7,
        "EXPIRED": 5
      }
    },
    "pickups": {
      "total": 68,
      "completed": 60,
      "totalWeightKg": 450.5
    },
    "consignments": {
      "total": 30,
      "accepted": 25,
      "rejected": 3
    },
    "recycling": {
      "total": 25,
      "completed": 22,
      "totalOutputWeightKg": 380.2
    },
    "recentActivity": [
      {
        "action": "RECYCLING_COMPLETED",
        "entityType": "recycling_records",
        "actorName": "GreenTech Recyclers",
        "createdAt": "2024-01-20T16:00:00Z"
      }
    ]
  }
}
```

---

## 4. Future Analytics (Not in MVP)

These are documented for future reference but NOT implemented in the current build.

### 4.1 Time-Series Analytics

| Metric | Description |
|--------|-------------|
| Collections over time | Daily/weekly/monthly collection counts |
| Weight trend | Total weight collected per week |
| User growth | New registrations over time |
| Response time | Average time from request submission to acceptance |
| Processing time | Average time from consignment acceptance to recycling completion |

### 4.2 Geographic Analytics

| Metric | Description |
|--------|-------------|
| Collection heatmap | Map showing collection density by area |
| Collector coverage | Service areas with/without collector coverage |
| Recycler proximity | Distance analysis between collectors and recyclers |

### 4.3 Collector Performance

| Metric | Description |
|--------|-------------|
| Pickups per collector | Ranking by activity |
| Average weight per pickup | Efficiency indicator |
| Acceptance rate | % of requests accepted vs. ignored |
| Completion rate | % of accepted requests completed |

### 4.4 AI Performance Analytics

| Metric | Description |
|--------|-------------|
| Prediction acceptance rate | % of AI predictions accepted by users |
| Accuracy by category | Which categories the model gets right most often |
| Correction patterns | Most common override patterns (what the model confuses) |
| Confidence distribution | Distribution of confidence scores |

### 4.5 Environmental Impact (Estimated)

| Metric | Description |
|--------|-------------|
| E-waste diverted from landfill | Total weight formally recycled |
| Material recovery rate | Output weight / input weight |
| Carbon offset estimate | Based on recycling vs. mining virgin materials |

> These environmental metrics would require research-backed conversion factors to report accurately. Do not fabricate impact numbers.

---

## 5. Mobile & Dashboard Presentation

### 5.1 Android In-App View (MVP)

The mobile administration and summary screen displays:
- **Top Metrics:** Scrollable summary cards (Users, Items, Pickups, Total Weight in kg)
- **Category Progress Bars:** Visual breakdown of collected items by canonical category
- **Recent Activity:** Infinite-scroll FlatList of recent platform transactions

### 5.2 Future Web Management Console (FUTURE / DEFERRED)

An advanced multi-pane desktop web dashboard with interactive Chart.js visualizations, custom date-range pickers, CSV data export, and EPR compliance reporting is planned as **FUTURE / DEFERRED** to consume the existing backend analytics endpoints.

---

*All terminology in this document follows `00_PROJECT_INDEX.md`.*
