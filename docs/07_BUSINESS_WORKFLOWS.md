# EcoSetu — Business Workflows

> **Reference:** All terminology follows `00_PROJECT_INDEX.md`.

---

## 1. Citizen Workflow

### 1.1 E-Waste Submission and Collection Request

```mermaid
flowchart TD
    A["Citizen registers on Android App<br/>(ACTIVE immediately)"] --> B["Citizen submits<br/>e-waste item(s)"]
    B --> C{"Capture/Upload photo?"}
    C -->|Yes (Camera/Gallery)| D["AI suggests category<br/>(citizen can override)"]
    C -->|No| E["Citizen selects<br/>category manually"]
    D --> F["Item saved<br/>(status: SUBMITTED)"]
    E --> F
    F --> G["Citizen creates<br/>collection request"]
    G --> H["Set pickup address<br/>(GPS / Map selection)"]
    H --> I["Set preferred date/time<br/>(optional)"]
    I --> J["Submit request<br/>(status: SUBMITTED)"]
    J --> K["Wait for collector<br/>to accept"]
    K --> L["Android Notification:<br/>Collector accepted"]
    L --> M["Wait for pickup"]
    M --> N["Android Notification:<br/>Pickup completed"]
    N --> O["View traceability<br/>chain in app"]
```

### 1.2 Status Tracking

The citizen can check their request status at any time:

| Status | Citizen Sees |
|--------|-------------|
| `DRAFT` | "Your request is not yet submitted" |
| `SUBMITTED` | "Waiting for a collector to accept your request" |
| `ACCEPTED` | "A collector has accepted. Pickup will be scheduled." |
| `PICKUP_SCHEDULED` | "Pickup scheduled for [date]" |
| `PICKED_UP` | "Your items have been collected" |
| `CANCELLED` | "This request was cancelled" |
| `EXPIRED` | "This request has expired. Please create a new one." |

### 1.3 Cancellation

- Citizen can cancel a request in `DRAFT`, `SUBMITTED`, or `ACCEPTED` status
- Cannot cancel after `PICKED_UP`
- Must provide a cancellation reason
- If a collector has already accepted, they receive a cancellation notification

---

## 2. Informal Collector Workflow

### 2.1 Onboarding and Verification

```mermaid
flowchart TD
    A["Collector registers<br/>(status: PENDING_VERIFICATION)"] --> B["Complete profile<br/>(service area, bio)"]
    B --> C["Upload ID document"]
    C --> D["Submit verification<br/>(status: PENDING)"]
    D --> E{"Admin reviews"}
    E -->|Approved| F["Account ACTIVE<br/>Notification sent"]
    E -->|Rejected| G["Notification with reason"]
    G --> H["Collector can resubmit"]
    H --> D
    F --> I["Collector can now<br/>browse requests"]
```

### 2.2 Collection Process

```mermaid
flowchart TD
    A["Collector opens<br/>available requests"] --> B["Filter by area<br/>(auto or manual)"]
    B --> C["View request details<br/>(items, area, time)"]
    C --> D{"Accept request?"}
    D -->|No| A
    D -->|Yes| E["Request status: ACCEPTED<br/>Pickup created: SCHEDULED"]
    E --> F["Contact citizen<br/>(phone visible now)"]
    F --> G["Travel to pickup location"]
    G --> H["Start pickup<br/>(status: IN_PROGRESS)"]
    H --> I["Verify and collect items"]
    I --> J["Enter actual weights"]
    J --> K["Take pickup photo via phone camera<br/>(optional)"]
    K --> L["Complete pickup<br/>(status: COMPLETED)"]
    L --> M["Items status: COLLECTED"]
    M --> N["Citizen notified"]
```

### 2.3 Handover to Recycler

```mermaid
flowchart TD
    A["Collector has<br/>collected items"] --> B["Select items<br/>for consignment"]
    B --> C["Choose a verified<br/>recycler"]
    C --> D["Create consignment<br/>(status: CREATED)"]
    D --> E["Deliver items<br/>to recycler"]
    E --> F["Mark as delivered<br/>(status: DELIVERED)"]
    F --> G["Recycler notified"]
    G --> H{"Recycler decision"}
    H -->|Accepted| I["Consignment ACCEPTED<br/>Items: CONSIGNED"]
    H -->|Rejected| J["Consignment REJECTED<br/>Collector notified"]
    J --> K["Collector retrieves items<br/>or finds another recycler"]
```

### 2.4 Availability Management

- Collector can toggle availability ON/OFF
- When OFF, they do not appear in request matching
- Useful for days off, travel, or capacity limits

---

## 3. Recycler Workflow

### 3.1 Onboarding and Verification

```mermaid
flowchart TD
    A["Recycler registers<br/>(status: PENDING_VERIFICATION)"] --> B["Complete facility profile"]
    B --> C["Enter facility name,<br/>address, accepted categories"]
    C --> D["Upload license/registration<br/>document"]
    D --> E["Submit verification<br/>(status: PENDING)"]
    E --> F{"Admin reviews"}
    F -->|Approved| G["Account ACTIVE<br/>Notification sent"]
    F -->|Rejected| H["Notification with reason"]
    H --> I["Recycler can resubmit"]
    I --> E
```

### 3.2 Receiving and Processing

```mermaid
flowchart TD
    A["Notification: Incoming<br/>consignment"] --> B["View consignment<br/>details"]
    B --> C["Verify items match<br/>description"]
    C --> D{"Accept or Reject?"}
    D -->|Reject| E["Provide rejection reason"]
    E --> F["Consignment REJECTED<br/>Collector notified"]
    D -->|Accept| G["Consignment ACCEPTED"]
    G --> H["Recycling record created<br/>(status: RECEIVED)"]
    H --> I["Begin processing"]
    I --> J["Record status: PROCESSING"]
    J --> K["Complete recycling"]
    K --> L["Enter processing notes<br/>and output details"]
    L --> M["Upload certificate<br/>(optional)"]
    M --> N["Record status: COMPLETED"]
    N --> O["Items status: RECYCLED"]
    O --> P["Audit log entry created"]
```

---

## 4. Administrator Workflow

> **Platform Implementation Note:** For the MVP demonstration, core administrator tasks (verification approvals and activity monitoring) are managed directly via the **Admin View inside the Android Application**. An expansive multi-pane management console is marked as **FUTURE / DEFERRED** for the web portal.

### 4.1 User Verification Management

```mermaid
flowchart TD
    A["Admin opens<br/>verification queue"] --> B["View pending<br/>verifications"]
    B --> C["Select a verification<br/>request"]
    C --> D["View submitted<br/>documents"]
    D --> E["View user profile<br/>details"]
    E --> F{"Decision"}
    F -->|Approve| G["User status: ACTIVE<br/>Notification sent"]
    F -->|Reject| H["Enter rejection reason"]
    H --> I["User notified<br/>Can resubmit"]
```

### 4.2 Platform Monitoring

```mermaid
flowchart TD
    A["Admin opens<br/>dashboard"] --> B["View key metrics"]
    B --> C["Total users by role"]
    B --> D["Active collection requests"]
    B --> E["Completed pickups"]
    B --> F["Recycling completion rate"]
    B --> G["Recent activity feed"]
    
    A --> H["User management"]
    H --> I["Search/filter users"]
    I --> J["View user details"]
    J --> K{"Action needed?"}
    K -->|Suspend| L["Suspend account<br/>(provide reason)"]
    K -->|Reactivate| M["Reactivate account"]
    
    A --> N["Audit logs"]
    N --> O["Filter by action,<br/>user, date"]
    O --> P["View event details"]
```

### 4.3 Dispute Handling (Manual Process)

For the MVP, disputes are handled manually:

1. Admin reviews audit logs for the disputed transaction
2. Admin contacts involved parties (via platform data)
3. Admin makes a judgment based on available evidence
4. Admin can suspend accounts if misconduct is found
5. Admin creates an audit log entry documenting the resolution

> **Note:** There is no formal dispute resolution system in the MVP. Disputes are rare in a prototype and can be handled through admin intervention.

---

## 5. Complete End-to-End Flow

```mermaid
flowchart LR
    subgraph "Citizen"
        C1["Submit items"] --> C2["Create request"]
    end
    
    subgraph "Collector"
        IC1["Accept request"] --> IC2["Perform pickup"] --> IC3["Create consignment"]
    end
    
    subgraph "Recycler"
        R1["Accept consignment"] --> R2["Process materials"] --> R3["Complete recycling"]
    end
    
    subgraph "Traceability"
        T1["Full lifecycle<br/>recorded"]
    end
    
    C2 --> IC1
    IC3 --> R1
    R3 --> T1
```

### State Transitions Summary

```mermaid
stateDiagram-v2
    state "Collection Request" as CR {
        [*] --> DRAFT
        DRAFT --> SUBMITTED: Citizen submits
        SUBMITTED --> ACCEPTED: Collector accepts
        SUBMITTED --> EXPIRED: Time limit
        SUBMITTED --> CANCELLED: Citizen cancels
        ACCEPTED --> PICKUP_SCHEDULED: Collector schedules
        ACCEPTED --> CANCELLED: Citizen/Admin cancels
        PICKUP_SCHEDULED --> PICKED_UP: Pickup completed
        PICKUP_SCHEDULED --> CANCELLED: Cancel
    }

    state "E-Waste Item" as EI {
        [*] --> SUBMITTED_I: Citizen submits
        SUBMITTED_I --> COLLECTED: Pickup completed
        COLLECTED --> CONSIGNED: Added to consignment
        CONSIGNED --> RECYCLED: Recycling completed
    }
```

---

## 6. Business Rules

### 6.1 Collection Request Rules

| Rule | Description |
|------|-------------|
| BR-CR-01 | A request must contain at least 1 e-waste item |
| BR-CR-02 | Only one collector can accept a given request |
| BR-CR-03 | A request cannot be cancelled after status `PICKED_UP` |
| BR-CR-04 | An item can only belong to one active collection request |
| BR-CR-05 | Requests in `SUBMITTED` status for more than 7 days move to `EXPIRED` |

### 6.2 Pickup Rules

| Rule | Description |
|------|-------------|
| BR-PU-01 | Only the assigned collector can complete a pickup |
| BR-PU-02 | Pickup completion requires actual weight for each item |
| BR-PU-03 | Pickup completion changes all associated items to `COLLECTED` |

### 6.3 Consignment Rules

| Rule | Description |
|------|-------------|
| BR-CO-01 | Only items in `COLLECTED` status can be added to a consignment |
| BR-CO-02 | An item can only be in one active consignment |
| BR-CO-03 | Consignment can only be created to a verified recycler |
| BR-CO-04 | Only the receiving recycler can accept or reject a consignment |

### 6.4 Recycling Rules

| Rule | Description |
|------|-------------|
| BR-RR-01 | A recycling record is auto-created when a consignment is accepted |
| BR-RR-02 | Recycling completion changes all linked items to `RECYCLED` |
| BR-RR-03 | Recycling completion creates an audit log entry |

---

*All terminology in this document follows `00_PROJECT_INDEX.md`.*
