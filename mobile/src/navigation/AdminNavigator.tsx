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
import { colors } from '../theme/colors';

const Tab = createBottomTabNavigator<AdminTabParamList>();

// AdminVerificationsTab mounts the production AdminVerificationsScreen
const AdminVerificationsTab = AdminVerificationsScreen;

export const AdminNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      initialRouteName="AdminHome"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderTopColor: colors.divider,
          borderTopWidth: 1,
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
          elevation: 4,
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
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
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>🛡️</Text>,
        }}
      />
      <Tab.Screen
        name="AdminVerifications"
        component={AdminVerificationsScreen}
        options={{
          tabBarLabel: 'Verify',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>📑</Text>,
        }}
      />
      <Tab.Screen
        name="AdminUsers"
        component={AdminUsersScreen}
        options={{
          tabBarLabel: 'Users',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>👥</Text>,
        }}
      />
      <Tab.Screen
        name="AdminAuditLogs"
        component={AdminAuditLogsScreen}
        options={{
          tabBarLabel: 'Audit',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>📜</Text>,
        }}
      />
      <Tab.Screen
        name="AdminProfile"
        component={AdminProfileScreen}
        options={{
          tabBarLabel: 'Profile',
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
    </Tab.Navigator>
  );
};

export default AdminNavigator;
