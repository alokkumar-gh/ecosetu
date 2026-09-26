/**
 * AdminNavigator — ECOSETU Admin Control Center Navigation
 *
 * ARCHITECTURE CHANGE (Redesign):
 * Previous: BottomTabNavigator with 5 visible tabs + 9 hidden screens
 * New: NativeStackNavigator — navigation is handled by the AdminShell sidebar.
 *      All 12 admin screens accessible from sidebar. No bottom tab bar.
 *
 * The AdminShell provides:
 * - Collapsible sidebar navigation (expanded 220px / collapsed 60px)
 * - Top bar with breadcrumbs, search, notifications, profile
 * - Global search palette (Ctrl/Cmd+K)
 *
 * All screens that used AdminTabParamList now use AdminStackParamList.
 * The AdminTabParamList type is preserved for backward compatibility with
 * any existing navigation.navigate('AdminHome') calls.
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AdminTabParamList } from './types'; // reuse existing type

// ─── Admin screens ────────────────────────────────────────────────────────────
import { AdminDashboardScreen } from '../screens/admin/AdminDashboardScreen';
import { AdminVerificationsScreen } from '../screens/admin/AdminVerificationsScreen';
import { AdminUsersScreen } from '../screens/admin/AdminUsersScreen';
import { AdminAuditLogsScreen } from '../screens/admin/AdminAuditLogsScreen';
import { AdminProfileScreen } from '../screens/admin/AdminProfileScreen';
import { AdminGeographicAnalyticsScreen } from '../screens/admin/AdminGeographicAnalyticsScreen';
import { AdminReportsScreen } from '../screens/admin/AdminReportsScreen';
import { AdminGovernanceScreen } from '../screens/admin/AdminGovernanceScreen';
import { AdminSystemHealthScreen } from '../screens/admin/AdminSystemHealthScreen';
import { AdminNotificationCenterScreen } from '../screens/admin/AdminNotificationCenterScreen';
import { AdminHistoricalAnalyticsScreen } from '../screens/admin/AdminHistoricalAnalyticsScreen';
import { AdminDisputesScreen } from '../screens/admin/AdminDisputesScreen';
import { BillsScreen } from '../screens/billing/BillsScreen';
import { BillDetailScreen } from '../screens/billing/BillDetailScreen';
import { BhashiniTestScreen } from '../screens/admin/BhashiniTestScreen';

// Using the existing AdminTabParamList so navigation.navigate() calls throughout
// the codebase continue to work without changes.
const Stack = createNativeStackNavigator<AdminTabParamList>();

export const AdminNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="AdminHome"
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      {/* ── Overview ─────────────────────────────────────────────────────── */}
      <Stack.Screen name="AdminHome" component={AdminDashboardScreen} />

      {/* ── Operations ───────────────────────────────────────────────────── */}
      <Stack.Screen name="AdminVerifications" component={AdminVerificationsScreen} />
      <Stack.Screen name="AdminDisputes" component={AdminDisputesScreen} />
      <Stack.Screen name="AdminReports" component={AdminReportsScreen} />

      {/* ── Ecosystem ────────────────────────────────────────────────────── */}
      <Stack.Screen name="AdminUsers" component={AdminUsersScreen} />
      <Stack.Screen name="AdminGovernance" component={AdminGovernanceScreen} />

      {/* ── Insights ─────────────────────────────────────────────────────── */}
      <Stack.Screen name="AdminHistoricalAnalytics" component={AdminHistoricalAnalyticsScreen} />
      <Stack.Screen name="AdminGeographicAnalytics" component={AdminGeographicAnalyticsScreen} />

      {/* ── System ───────────────────────────────────────────────────────── */}
      <Stack.Screen name="AdminNotificationCenter" component={AdminNotificationCenterScreen} />
      <Stack.Screen name="AdminAuditLogs" component={AdminAuditLogsScreen} />
      <Stack.Screen name="AdminSystemHealth" component={AdminSystemHealthScreen} />
      <Stack.Screen name="AdminProfile" component={AdminProfileScreen} />

      {/* ── Billing (preserved) ──────────────────────────────────────────── */}
      <Stack.Screen name="AdminBills" component={BillsScreen} />
      <Stack.Screen name="AdminBillDetail" component={BillDetailScreen} />

      {/* ── BHASHINI Vernacular Diagnostics (Phase 20) ────────────────── */}
      <Stack.Screen name="BhashiniTest" component={BhashiniTestScreen} />
    </Stack.Navigator>
  );
};

export default AdminNavigator;
