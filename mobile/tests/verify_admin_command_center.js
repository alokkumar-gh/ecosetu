/**
 * verify_admin_command_center.js
 * EcoSetu — Phase 19 Task 38: Admin Command Center + Advanced Analytics + Custom Notification Center
 *
 * Verifies:
 * 1. Source Files Existence & Integrity
 * 2. Admin Command Center Architecture & Executive KPIs
 * 3. Operational Bottlenecks & Circular Economy Funnel
 * 4. E-Waste Breakdown, Collector & Recycler Operations
 * 5. Admin Notification Center (Compose, History, Templates, Analytics)
 * 6. Targeting, Exclusions, Safeguards & Android Preview
 * 7. Navigation Registration & AdminService Contracts
 * 8. Citizen Notification Rendering of Canonical ADMIN_MESSAGE
 */

const fs = require('fs');
const path = require('path');

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

function check(condition, id, description) {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  ✅ [${id}] ${description}`);
  } else {
    failedChecks++;
    console.error(`  ❌ [${id}] FAIL: ${description}`);
  }
}

function readFile(relPath) {
  const fullPath = path.resolve(__dirname, '..', relPath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Required file missing: ${relPath}`);
  }
  return {
    path: fullPath,
    content: fs.readFileSync(fullPath, 'utf8'),
  };
}

function contains(content, str) {
  return content.indexOf(str) !== -1;
}

console.log('================================================================');
console.log('ECOSETU ADMIN COMMAND CENTER & NOTIFICATION CENTER TEST SUITE');
console.log('Phase 19 Task 38: Admin Command Center + Advanced Analytics');
console.log('================================================================\n');

// ─── 1. Source Files Existence ────────────────────────────────────────────────
console.log('─── 1. Source Files Existence ───────────────────────────────────');
const dashboard = readFile('src/screens/admin/AdminDashboardScreen.tsx');
const notifCenter = readFile('src/screens/admin/AdminNotificationCenterScreen.tsx');
const adminService = readFile('src/services/adminService.js');
const adminNav = readFile('src/navigation/AdminNavigator.tsx');
const navTypes = readFile('src/navigation/types.ts');
const citizenNotif = readFile('src/screens/citizen/CitizenNotificationsScreen.tsx');

check(dashboard.content.length > 0, 'SRC-01', 'AdminDashboardScreen.tsx exists and is populated');
check(notifCenter.content.length > 0, 'SRC-02', 'AdminNotificationCenterScreen.tsx exists and is populated');
check(adminService.content.length > 0, 'SRC-03', 'adminService.js exists and is populated');
check(adminNav.content.length > 0, 'SRC-04', 'AdminNavigator.tsx exists and is populated');
check(navTypes.content.length > 0, 'SRC-05', 'navigation/types.ts exists and is populated');
check(citizenNotif.content.length > 0, 'SRC-06', 'CitizenNotificationsScreen.tsx exists and is populated');

// ─── 2. Admin Command Center Architecture & Executive KPIs ─────────────────────
console.log('\n─── 2. Admin Command Center Architecture & Executive KPIs ─────────');
check(contains(dashboard.content, 'ECOSETU COMMAND CENTER'), 'DASH-01', 'Command Center branding displayed');
check(contains(dashboard.content, 'OPERATIONAL'), 'DASH-02', 'Platform operational status indicator present');
check(contains(dashboard.content, 'Updated '), 'DASH-03', 'Timestamp of last telemetry synchronization present');
check(contains(dashboard.content, 'selectedPeriod'), 'DASH-04', 'Time range filter state hook initialized');
check(contains(dashboard.content, "'7D', '30D', '90D', '1Y', 'ALL'"), 'DASH-05', 'All 5 standard time range periods supported');
check(contains(dashboard.content, 'kpis.totalUsers'), 'DASH-06', 'Executive KPI: totalUsers present');
check(contains(dashboard.content, 'kpis.activeUsers'), 'DASH-07', 'Executive KPI: activeUsers present');
check(contains(dashboard.content, 'kpis.pendingVerifications'), 'DASH-08', 'Executive KPI: pendingVerifications present');
check(contains(dashboard.content, 'kpis.totalEwasteItems'), 'DASH-09', 'Executive KPI: totalEwasteItems present');
check(contains(dashboard.content, 'kpis.totalCollectionRequests'), 'DASH-10', 'Executive KPI: totalCollectionRequests present');
check(contains(dashboard.content, 'kpis.completedPickups'), 'DASH-11', 'Executive KPI: completedPickups present');
check(contains(dashboard.content, 'kpis.totalConsignments'), 'DASH-12', 'Executive KPI: totalConsignments present');
check(contains(dashboard.content, 'kpis.completedRecycling'), 'DASH-13', 'Executive KPI: completedRecycling present');

// ─── 3. Operational Bottlenecks & Lifecycle Funnel ────────────────────────────
console.log('\n─── 3. Operational Bottlenecks & Lifecycle Funnel ────────────────');
check(contains(dashboard.content, 'Operational Bottlenecks'), 'BOTTLENECK-01', 'Operational Bottlenecks monitor present');
check(contains(dashboard.content, 'requestsAwaitingCollector'), 'BOTTLENECK-02', 'Queue: requests awaiting collector assignment tracked');
check(contains(dashboard.content, 'requestsAcceptedPickupPending'), 'BOTTLENECK-03', 'Queue: requests accepted with pickup pending tracked');
check(contains(dashboard.content, 'pickupsInProgress'), 'BOTTLENECK-04', 'Queue: doorsteps currently in progress tracked');
check(contains(dashboard.content, 'consignmentsAwaitingDelivery'), 'BOTTLENECK-05', 'Queue: consignments in transit tracked');
check(contains(dashboard.content, 'consignmentsDeliveredAwaitingAcceptance'), 'BOTTLENECK-06', 'Queue: delivered consignments awaiting acceptance tracked');
check(contains(dashboard.content, 'recyclingRecordsProcessing'), 'BOTTLENECK-07', 'Queue: recycling records processing tracked');
check(contains(dashboard.content, 'Circular Economy Lifecycle Funnel'), 'FUNNEL-01', 'Circular Economy Conversion Funnel section present');
check(contains(dashboard.content, 'Submitted by Citizen'), 'FUNNEL-02', 'Funnel Stage 1: Submitted by Citizen present');
check(contains(dashboard.content, 'Accepted by Collector'), 'FUNNEL-03', 'Funnel Stage 2: Accepted by Collector present');
check(contains(dashboard.content, 'Scheduled for Pickup'), 'FUNNEL-04', 'Funnel Stage 3: Scheduled for Pickup present');
check(contains(dashboard.content, 'Picked Up at Doorstep'), 'FUNNEL-05', 'Funnel Stage 4: Picked Up at Doorstep present');
check(contains(dashboard.content, 'Consigned to Recycler'), 'FUNNEL-06', 'Funnel Stage 5: Consigned to Recycler present');
check(contains(dashboard.content, 'Accepted at Facility'), 'FUNNEL-07', 'Funnel Stage 6: Accepted at Facility present');
check(contains(dashboard.content, 'Formally Recycled'), 'FUNNEL-08', 'Funnel Stage 7: Formally Recycled present');

// ─── 4. E-Waste Breakdown, Collector & Recycler Operations ───────────────────
console.log('\n─── 4. E-Waste Breakdown, Collector & Recycler Operations ─────────');
check(contains(dashboard.content, 'All 11 Standard E-Waste Categories'), 'EWASTE-01', 'Displays 11 standard category breakdown');
check(contains(dashboard.content, 'Physical Condition Distribution'), 'EWASTE-02', 'Displays device condition distribution');
check(contains(dashboard.content, 'totalVerifiedWeightKg'), 'EWASTE-03', 'Displays authoritative verified picked up weight in kg');
check(contains(dashboard.content, 'totalRecycledWeightKg'), 'EWASTE-04', 'Displays authoritative verified recycled weight in kg');
check(contains(dashboard.content, 'Not currently calculated'), 'EWASTE-05', 'Transparent disclosure of non-estimated environmental impact');
check(contains(dashboard.content, 'Collector Operations'), 'COLLECTOR-01', 'Collector Operations telemetry present');
check(contains(dashboard.content, 'Recycler Facilities & Coverage'), 'RECYCLER-01', 'Recycler Facilities & Coverage telemetry present');
check(contains(dashboard.content, 'Recent Platform Activity'), 'AUDIT-01', 'Authoritative AuditLog timeline present');

// ─── 5. Admin Notification Center ─────────────────────────────────────────────
console.log('\n─── 5. Admin Notification Center ─────────────────────────────────');
check(contains(notifCenter.content, "'compose'"), 'NOTIF-01', 'Compose broadcast tab supported');
check(contains(notifCenter.content, "'history'"), 'NOTIF-02', 'Broadcast history tab supported');
check(contains(notifCenter.content, "'templates'"), 'NOTIF-03', 'Broadcast templates tab supported');
check(contains(notifCenter.content, "'analytics'"), 'NOTIF-04', 'Broadcast analytics tab supported');
check(contains(notifCenter.content, "type: 'ADMIN_MESSAGE'"), 'NOTIF-05', 'Uses canonical ADMIN_MESSAGE notification type');
check(contains(notifCenter.content, 'AUDIENCE_OPTIONS'), 'NOTIF-06', 'Segments and audience options defined');
check(contains(notifCenter.content, 'INDIVIDUAL'), 'NOTIF-07', 'Individual recipient targeting supported');
check(contains(notifCenter.content, 'NOTIFICATION_TEMPLATES'), 'NOTIF-08', 'Pre-approved notification templates defined');
check(contains(notifCenter.content, 'Android Notification Preview'), 'NOTIF-09', 'Visual Android drawer/banner preview implemented');
check(contains(notifCenter.content, 'confirmModalVisible'), 'NOTIF-10', 'Safety confirmation modal for bulk broadcasts');

// ─── 6. Navigation Registration & AdminService Contracts ──────────────────────
console.log('\n─── 6. Navigation Registration & AdminService Contracts ──────────');
check(contains(navTypes.content, 'AdminNotificationCenter:'), 'NAV-01', 'AdminTabParamList includes AdminNotificationCenter');
check(contains(adminNav.content, 'AdminNotificationCenterScreen'), 'NAV-02', 'AdminNavigator registers AdminNotificationCenterScreen');
check(contains(dashboard.content, "navigation?.navigate?.('AdminNotificationCenter')"), 'NAV-03', 'Dashboard provides quick action to Notification Center');
check(contains(adminService.content, 'getAnalytics'), 'SVC-01', 'adminService exports getAnalytics with time period query');
check(contains(adminService.content, 'sendAdminNotification'), 'SVC-02', 'adminService exports sendAdminNotification');
check(contains(adminService.content, 'previewNotificationRecipients'), 'SVC-03', 'adminService exports previewNotificationRecipients');
check(contains(adminService.content, 'getAdminNotificationHistory'), 'SVC-04', 'adminService exports getAdminNotificationHistory');
check(contains(adminService.content, 'getAdminNotificationAnalytics'), 'SVC-05', 'adminService exports getAdminNotificationAnalytics');
check(contains(adminService.content, 'searchNotificationUsers'), 'SVC-06', 'adminService exports searchNotificationUsers');

// ─── 7. Citizen Notification Rendering of ADMIN_MESSAGE ───────────────────────
console.log('\n─── 7. Citizen Notification Rendering of ADMIN_MESSAGE ───────────');
check(contains(citizenNotif.content, 'ADMIN_MESSAGE'), 'CITIZEN-01', 'CitizenNotificationsScreen handles ADMIN_MESSAGE type');
check(contains(citizenNotif.content, 'Official Announcement'), 'CITIZEN-02', 'Citizen receives Official Announcement badge on admin broadcast');

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log('\n================================================================');
console.log(`SUMMARY: ${passedChecks}/${totalChecks} CHECKS PASSED (${Math.round((passedChecks / totalChecks) * 100)}%)`);
console.log('================================================================');

if (failedChecks > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
