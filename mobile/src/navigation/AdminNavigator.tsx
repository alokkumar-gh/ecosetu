import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { AdminTabParamList } from './types';
import { AdminDashboardScreen } from '../screens/admin/AdminDashboardScreen';
import { AdminVerificationsScreen } from '../screens/admin/AdminVerificationsScreen';
import { AdminUsersScreen } from '../screens/admin/AdminUsersScreen';
import { AdminAuditLogsScreen } from '../screens/admin/AdminAuditLogsScreen';
import { AdminProfileScreen } from '../screens/admin/AdminProfileScreen';
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
          backgroundColor: colors.surface,
          borderTopColor: colors.divider,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
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
    </Tab.Navigator>
  );
};

export default AdminNavigator;
