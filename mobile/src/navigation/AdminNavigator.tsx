import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { AdminTabParamList } from './types';
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
import { colors } from '../theme/colors';
import { useI18n } from '../i18n';

const Tab = createBottomTabNavigator<AdminTabParamList>();

// AdminVerificationsTab mounts the production AdminVerificationsScreen
const AdminVerificationsTab = AdminVerificationsScreen;

export const AdminNavigator: React.FC = () => {
  const { t } = useI18n();

  return (
    <Tab.Navigator
      initialRouteName="AdminHome"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: 'rgba(7, 30, 34, 0.94)',
          borderTopColor: 'rgba(255, 255, 255, 0.12)',
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
          elevation: 8,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.35,
          shadowRadius: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      }}
    >
      <Tab.Screen
        name="AdminHome"
        component={AdminDashboardScreen}
        options={{
          tabBarLabel: t('navigation.home') || 'Home',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>🛡️</Text>,
        }}
      />
      <Tab.Screen
        name="AdminVerifications"
        component={AdminVerificationsScreen}
        options={{
          tabBarLabel: t('admin.users.reviewVerification') || 'Verify',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>📑</Text>,
        }}
      />
      <Tab.Screen
        name="AdminUsers"
        component={AdminUsersScreen}
        options={{
          tabBarLabel: t('admin.users.title') || 'Users',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>👥</Text>,
        }}
      />
      <Tab.Screen
        name="AdminAuditLogs"
        component={AdminAuditLogsScreen}
        options={{
          tabBarLabel: t('admin.governance.auditTab') || 'Audit',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>📜</Text>,
        }}
      />
      <Tab.Screen
        name="AdminProfile"
        component={AdminProfileScreen}
        options={{
          tabBarLabel: t('navigation.profile') || 'Profile',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>👤</Text>,
        }}
      />
      <Tab.Screen
        name="AdminGeographicAnalytics"
        component={AdminGeographicAnalyticsScreen}
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' },
        }}
      />
      <Tab.Screen
        name="AdminReports"
        component={AdminReportsScreen}
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' },
        }}
      />
      <Tab.Screen
        name="AdminGovernance"
        component={AdminGovernanceScreen}
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' },
        }}
      />
      <Tab.Screen
        name="AdminSystemHealth"
        component={AdminSystemHealthScreen}
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' },
        }}
      />
      <Tab.Screen
        name="AdminNotificationCenter"
        component={AdminNotificationCenterScreen}
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' },
        }}
      />
      <Tab.Screen
        name="AdminHistoricalAnalytics"
        component={AdminHistoricalAnalyticsScreen}
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' },
        }}
      />
      <Tab.Screen
        name="AdminDisputes"
        component={AdminDisputesScreen}
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' },
        }}
      />
      <Tab.Screen
        name="AdminBills"
        component={BillsScreen}
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' },
        }}
      />
      <Tab.Screen
        name="AdminBillDetail"
        component={BillDetailScreen}
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' },
        }}
      />
    </Tab.Navigator>
  );
};

export default AdminNavigator;
