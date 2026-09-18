# EcoSetu — UI/UX Specification

> **Reference:** All terminology follows `00_PROJECT_INDEX.md`.

---

## 1. Design Principles

| Principle | Description |
|-----------|-------------|
| **Simplicity First** | Minimal taps to complete core tasks; designed for fast field execution |
| **Role-Appropriate** | Citizen, Collector, Recycler, and Admin each get dedicated mobile screen flows |
| **Android-Native** | Designed specifically for Android touch ergonomics with minimum 48x48dp touch targets |
| **Low-Literacy Friendly** | High-contrast visual icons, status pills, and minimal text inputs for on-ground collectors |
| **Trust-Building** | Visual lifecycle stepper and transparent digital verification records |
| **Feedback-Rich** | Native ripple feedback, bottom snackbars, pull-to-refresh, and loading skeletons |

---

## 2. Design Tokens

### 2.1 Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| `primary` | `#2E7D32` (Green 800) | Top App Bar, Primary Buttons, Active Tabs |
| `primaryLight` | `#4CAF50` (Green 500) | Badges, Highlights |
| `primaryDark` | `#1B5E20` (Green 900) | Status Bar, Pressed States |
| `secondary` | `#1565C0` (Blue 800) | Secondary Actions, Info Cards |
| `surface` | `#FFFFFF` | Card & Sheet Backgrounds |
| `background` | `#F5F5F5` | Screen Background |
| `textPrimary` | `#212121` | High-emphasis text |
| `textSecondary` | `#757575` | Medium-emphasis text, labels |
| `success` | `#2E7D32` | Success badges, Completed status |
| `warning` | `#F57F17` | Pending actions, Warnings |
| `error` | `#C62828` | Error states, Rejections |
| `divider` | `#E0E0E0` | Card borders, dividers |

> Green represents environmental sustainability and formal recycling.

### 2.2 Typography

| Style | Size | Weight | Line Height |
|-------|------|--------|-------------|
| `Headline` | 24sp | Bold (700) | 32sp |
| `Title` | 20sp | Medium (500) | 28sp |
| `Subheading` | 16sp | Medium (500) | 24sp |
| `Body` | 14sp | Regular (400) | 20sp |
| `Caption` | 12sp | Regular (400) | 16sp |
| `Button` | 14sp | Bold (700) | 20sp |

### 2.3 Spacing & Elevation

| Token | Value | Usage |
|-------|-------|-------|
| `spaceXs` | 4dp | Tight component padding |
| `spaceSm` | 8dp | Inner card element spacing |
| `spaceMd` | 16dp | Screen margin, standard padding |
| `spaceLg` | 24dp | Section separation |
| `spaceXl` | 32dp | Major block spacing |
| `cardElevation` | 2dp | Card shadow on Android surface |
| `appBarElevation` | 4dp | Top App Bar elevation |
| `bottomSheetElevation` | 8dp | Modal bottom sheet elevation |

### 2.4 Android Screen Densities & Form Factors

| Category | Typical Width | Screen Density / Target |
|----------|---------------|-------------------------|
| `Compact Phone` | < 360dp | Budget Android devices (mdpi / hdpi) |
| `Standard Phone` | 360dp – 411dp | Primary target (xhdpi / xxhdpi) |
| `Large Phablet` | 412dp – 600dp | High-res flagships (xxxhdpi) |
| `Tablet` | > 600dp | Android tablets (sw600dp layout adaptation) |

---

## 3. Common Android Components

### 3.1 Navigation Elements

- **Top App Bar:** Shows screen title, active role pill, unread notification bell icon, and optional back navigation arrow
- **Bottom Navigation Bar:** 4-5 tabs per role with icons and active color indicator
- **Floating Action Button (FAB):** Bottom-right "+" button for fast creation (e.g. Add E-Waste Item)
- **Bottom Sheet Modal:** Slides up from bottom for category selection, filters, and photo source choice (Camera vs Gallery)

### 3.2 Cards & Lists

- **Card Layout:** Rounded corners (8dp), 2dp elevation, clear status pill, and ripple touch feedback
- **List Ergonomics:** Infinite scroll / flat lists with pull-to-refresh (`RefreshControl`)
- **Status Badges:** Color-coded rounded pills: Green (Active/Approved), Blue (Submitted), Orange (In-Progress), Red (Cancelled/Rejected), Gray (Draft/Completed)

### 3.3 Forms

| Pattern | Implementation |
|---------|---------------|
| Layout | Single column on mobile; two-column on desktop for short forms |
| Labels | Above input fields |
| Validation | Real-time inline validation; red border + error text below field |
| Required fields | Marked with asterisk (*) |
| Submit | Primary button at bottom; disabled during submission; shows spinner |

### 3.4 Status Badges

| Status | Color | Background |
|--------|-------|-----------|
| DRAFT | Gray | `#E0E0E0` |
| SUBMITTED / PENDING | Blue | `#BBDEFB` |
| ACCEPTED / APPROVED | Green | `#C8E6C9` |
| IN_PROGRESS / PROCESSING | Orange | `#FFE0B2` |
| COMPLETED / RECYCLED | Dark Green | `#A5D6A7` |
| CANCELLED / REJECTED | Red | `#FFCDD2` |
| EXPIRED | Gray | `#E0E0E0` |

### 3.5 Empty States

Every list/table must have an empty state with:
- Relevant icon
- Descriptive message
- Call-to-action button (where applicable)

Example: "No collection requests yet. Submit your first e-waste item to get started!"

### 3.6 Loading States

- **Page load:** Skeleton screens (not spinners)
- **Button actions:** Button shows spinner + disabled state
- **Data fetch:** Skeleton cards/rows

### 3.7 Error States

- **API error:** Toast notification (top-right, auto-dismiss 5s)
- **Form error:** Inline field-level errors
- **Page error:** Full-page error with "Try Again" button
- **Network error:** Banner at top: "You appear to be offline"

### 3.8 Notifications

- **Bell icon** in header with unread count badge
- **Dropdown panel** showing recent notifications
- **Full notifications page** with all notifications (paginated)
- Click notification → navigates to relevant resource

---

## 4. Screen Specifications

### 4.1 Public Screens

#### Landing Page

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Introduce the platform and guide to registration |
| **Components** | Hero section, how-it-works steps, role-based CTA buttons |
| **Actions** | "Register as Citizen", "Register as Collector", "Register as Recycler", "Login" |
| **API** | None |
| **Auth** | None |

#### Login Page

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Authenticate existing users |
| **Components** | Email input, password input, login button, link to register |
| **Actions** | Submit login form |
| **API** | `POST /api/v1/auth/login` |
| **Loading** | Button spinner during auth |
| **Error** | "Invalid email or password" below form |

#### Registration Page

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Create new accounts |
| **Components** | Role selector (tabs or radio), name, email, password, confirm password, phone (optional) |
| **Actions** | Submit registration |
| **API** | `POST /api/v1/auth/register` |
| **Validation** | Email format, password min 8 chars with letter+number, passwords match |
| **Error** | Field-level errors, "Email already registered" |

---

### 4.2 Citizen Screens

#### Citizen Dashboard

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Overview of citizen's e-waste activity |
| **Components** | Summary stats (items submitted, active requests, completed pickups), recent requests list |
| **API** | `GET /api/v1/collection-requests`, `GET /api/v1/ewaste-items` |
| **Empty State** | "No activity yet. Start by submitting your e-waste!" |

#### Submit E-Waste Item

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Add an e-waste item using Android device camera or gallery |
| **Components** | Camera capture button ("Take Photo"), Gallery picker, Image preview, Category dropdown / bottom sheet, Description, Quantity stepper, Condition selector, Estimated weight, AI prediction card |
| **Actions** | Open Camera → Snap Photo → Client-side JPEG compression (< 1MB) → Trigger AI Inference → Confirm Category → Save |
| **API** | `POST /api/v1/ewaste-items` (multipart), `POST /api/v1/ai/predict` |
| **AI Interaction** | If photo captured: show predicted category with confidence pill (e.g. "Laptop · 87% Confidence"); "Accept Prediction" or "Change Category" buttons |
| **Loading** | Skeleton shimmer during AI inference (~2-5s) with status: "Analyzing image with YOLOv8..." |
| **Error** | "AI service unavailable — please select category manually" |

#### My Items List

| Attribute | Detail |
|-----------|--------|
| **Purpose** | View all submitted items |
| **Components** | FlatList with item cards, thumbnail preview, category badge, status badge, quantity stepper |
| **API** | `GET /api/v1/ewaste-items` |
| **Empty State** | "No items yet. Tap '+' to photograph your first e-waste item!" |

#### Create Collection Request

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Request a pickup for submitted items |
| **Components** | Item selector (multi-select cards), "Use Current GPS Location" button, native map view with draggable pin (`react-native-maps`), address text input, native Date/Time picker dialogs, pickup notes |
| **Actions** | Select items → Tap GPS / Pin location → Select Date/Time → Submit Request |
| **API** | `POST /api/v1/collection-requests` |
| **Map & GPS** | Native GPS geocoding fills approximate address; draggable pin for precision |

#### Request Detail

| Attribute | Detail |
|-----------|--------|
| **Purpose** | View request status and details |
| **Components** | Status timeline (visual stepper), item list, collector info (when assigned), action buttons (cancel) |
| **API** | `GET /api/v1/collection-requests/:id` |
| **Permissions** | Cancel button only if status allows |

#### Item Traceability View

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Show full lifecycle of an e-waste item |
| **Components** | Vertical timeline showing: Submitted → Collected → Consigned → Recycled, with timestamps and actor names |
| **API** | `GET /api/v1/ewaste-items/:id/traceability` |
| **Empty State** | Steps not yet completed shown as gray/dashed |

---

### 4.3 Informal Collector Screens

#### Collector Dashboard

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Overview of collector activity |
| **Components** | Stats (total pickups, active requests, weight collected), availability toggle, recent activity |
| **API** | `GET /api/v1/collectors/stats`, `PATCH /api/v1/collectors/availability` |
| **Pre-verification** | Show verification status banner; disable operational actions |

#### Verification Submission

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Submit documents for verification |
| **Components** | Document upload area (drag-drop or file picker), current status display |
| **API** | `POST /api/v1/verifications`, `GET /api/v1/verifications/me` |
| **States** | PENDING: "Under review"; APPROVED: "Verified ✓"; REJECTED: "Rejected — reason" |

#### Available Requests (Browse)

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Find nearby collection requests |
| **Components** | Map view with request markers + list view toggle; request cards with item summary, area, preferred time |
| **API** | `GET /api/v1/collection-requests/available` |
| **Privacy** | Shows approximate area on map, not exact address |
| **Empty State** | "No requests in your area right now" |

#### Request Detail (Collector View)

| Attribute | Detail |
|-----------|--------|
| **Purpose** | View request details and accept |
| **Components** | Item list, area info, preferred time, Accept button |
| **API** | `GET /api/v1/collection-requests/:id`, `POST /api/v1/collection-requests/:id/accept` |
| **After Accept** | Shows full address, citizen contact, navigation link |

#### Pickup Completion

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Confirm items collected and record weights |
| **Components** | Item checklist with verified weight inputs, "Take Pickup Photo" button (phone camera capture), notes input, "Complete Pickup" button |
| **API** | `PATCH /api/v1/pickups/:id/complete` |

#### Create Consignment

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Send collected items to a recycler |
| **Components** | Item selector (collected items), recycler dropdown, weight, notes, create button |
| **API** | `POST /api/v1/consignments`, `GET /api/v1/recyclers` |

#### My Pickups / Consignments

| Attribute | Detail |
|-----------|--------|
| **Purpose** | History of pickups and consignments |
| **Components** | Tab view: Pickups | Consignments; cards with status badges |
| **API** | `GET /api/v1/pickups`, `GET /api/v1/consignments` |

---

### 4.4 Recycler Screens

#### Recycler Dashboard

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Overview of incoming and processed consignments |
| **Components** | Stats (received, processing, completed), pending consignments list |
| **API** | `GET /api/v1/consignments`, `GET /api/v1/recycling-records` |

#### Incoming Consignments

| Attribute | Detail |
|-----------|--------|
| **Purpose** | View and manage incoming deliveries |
| **Components** | Consignment cards with collector info, item count, weight, status; Accept/Reject buttons |
| **API** | `GET /api/v1/consignments`, `PATCH /api/v1/consignments/:id/accept`, `PATCH /api/v1/consignments/:id/reject` |

#### Recycling Record Management

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Track processing progress |
| **Components** | Record cards, status stepper, processing form (notes, output description, weight, certificate upload) |
| **API** | `GET /api/v1/recycling-records`, `PATCH /api/v1/recycling-records/:id/start-processing`, `PATCH /api/v1/recycling-records/:id/complete` |

---

### 4.5 Admin Screens

#### Admin Dashboard

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Platform overview and management hub |
| **Components** | Key metrics cards, pending verifications count, recent activity feed, quick action links |
| **API** | `GET /api/v1/admin/analytics` |

#### Verification Queue

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Review and approve/reject user verifications |
| **Components** | Verification cards with user info, document viewer, approve/reject buttons, notes input |
| **API** | `GET /api/v1/admin/verifications`, `PATCH /api/v1/admin/verifications/:id` |

#### User Management

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Search, view, and manage users |
| **Components** | Search bar, role filter, status filter, user table, detail modal with suspend/reactivate actions |
| **API** | `GET /api/v1/admin/users`, `PATCH /api/v1/admin/users/:id/status` |

#### Analytics Dashboard

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Visualize platform activity |
| **Components** | Bar charts (collections over time), pie chart (categories), metric cards, tables |
| **API** | `GET /api/v1/admin/analytics` |
| **Library** | Chart.js (optional) |

#### Audit Log Viewer

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Review platform audit trail |
| **Components** | Filterable table (action, actor, entity, date range), expandable detail rows |
| **API** | `GET /api/v1/admin/audit-logs` |

---

## 5. Navigation Structure

### 5.1 Citizen Navigation

| Tab | Icon | Screen |
|-----|------|--------|
| Home | 🏠 | Citizen Dashboard |
| Submit | ➕ | Submit E-Waste Item |
| Requests | 📋 | My Collection Requests |
| Notifications | 🔔 | Notifications |
| Profile | 👤 | Profile |

### 5.2 Collector Navigation

| Tab | Icon | Screen |
|-----|------|--------|
| Home | 🏠 | Collector Dashboard |
| Browse | 🔍 | Available Requests |
| Pickups | 📦 | My Pickups |
| Consign | 🚛 | Consignments |
| Profile | 👤 | Profile |

### 5.3 Recycler Navigation

| Tab | Icon | Screen |
|-----|------|--------|
| Home | 🏠 | Recycler Dashboard |
| Incoming | 📥 | Incoming Consignments |
| Processing | ⚙️ | Recycling Records |
| Notifications | 🔔 | Notifications |
| Profile | 👤 | Profile |

### 5.4 Admin Navigation (Android App / In-App Drawer)

For the SIH prototype MVP, administration is accessible directly within the Android App (via an Admin View / Navigation Drawer for accounts with the `ADMIN` role).

| Item | Android App Screen | Future Web Portal Equivalent (Deferred) |
|------|--------------------|----------------------------------------|
| Dashboard | Admin Metrics Screen | Full multi-widget web dashboard |
| Verifications | Verification Review Queue | Split-pane document verification console |
| Users | User Directory & Status Screen | Advanced filterable data table |
| Analytics | Metric Cards & Summary List | Interactive Chart.js charts & CSV export |
| Audit Logs | Audit Trail Screen | Full-text searchable audit log browser |

> **Web Application Note (FUTURE / DEFERRED):** The multi-pane desktop browser administration console is deferred to a future phase.

---

## 6. Android Screen Adaptations & Layout Ergonomics

| Element | Android Phone (< 600dp) | Android Tablet (≥ 600dp) |
|---------|-------------------------|--------------------------|
| Navigation | Bottom tab bar (labeled icons) | Left rail / permanent drawer |
| Cards & Lists | Full-width scrollable cards (FlatList) | Two-column card grid |
| Forms | Single column with scrolling keyboard avoiding view | Side-by-side grouped fields |
| Modals | Bottom Sheet (slides up from bottom) | Centered Material Dialog |
| Map View | In-line card (240dp height) + fullscreen toggle | Half-screen map with side detail panel |
| Touch Targets | Minimum 48x48dp for all touchable elements | 48x48dp with increased padding |

---

*All terminology in this document follows `00_PROJECT_INDEX.md`.*
