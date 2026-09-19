import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import { CitizenTabParamList, CitizenStackParamList } from './types';
import { PlaceholderScreen } from '../components/common/PlaceholderScreen';
import { CitizenDashboardScreen } from '../screens/citizen/CitizenDashboardScreen';
import { SubmitItemScreen } from '../screens/citizen/SubmitItemScreen';
import { CitizenRequestsScreen } from '../screens/citizen/CitizenRequestsScreen';
import { RequestDetailScreen } from '../screens/citizen/RequestDetailScreen';
import { ItemTraceabilityScreen } from '../screens/citizen/ItemTraceabilityScreen';
import { CitizenNotificationsScreen } from '../screens/citizen/CitizenNotificationsScreen';
import { CitizenProfileScreen } from '../screens/citizen/CitizenProfileScreen';
import { useI18n } from '../i18n';
import { colors } from '../theme/colors';

const Tab = createBottomTabNavigator<CitizenTabParamList>();
const Stack = createNativeStackNavigator<CitizenStackParamList>();

// CitizenNotificationsTab placeholder removed — replaced by CitizenNotificationsScreen

// CitizenProfileTab placeholder removed — replaced by CitizenProfileScreen

// ItemTraceabilityModal placeholder removed — replaced by ItemTraceabilityScreen

const CitizenTabs: React.FC = () => {
  const { t } = useI18n();

  return (
    <Tab.Navigator
      initialRouteName="CitizenHome"
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
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.2,
        },
      }}
    >
      <Tab.Screen
        name="CitizenHome"
        component={CitizenDashboardScreen}
        options={{
          tabBarLabel: t('navigation.home') || 'Home',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>🏠</Text>,
        }}
      />
      <Tab.Screen
        name="CitizenSubmit"
        component={SubmitItemScreen}
        options={{
          tabBarLabel: t('navigation.submit') || 'Submit',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>📸</Text>,
        }}
      />
      <Tab.Screen
        name="CitizenRequests"
        component={CitizenRequestsScreen}
        options={{
          tabBarLabel: t('navigation.requests') || 'Requests',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>📦</Text>,
        }}
      />
      <Tab.Screen
        name="CitizenNotifications"
        component={CitizenNotificationsScreen}
        options={{
          tabBarLabel: t('navigation.alerts') || 'Alerts',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>🔔</Text>,
        }}
      />
      <Tab.Screen
        name="CitizenProfile"
        component={CitizenProfileScreen}
        options={{
          tabBarLabel: t('navigation.profile') || 'Profile',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>👤</Text>,
        }}
      />
    </Tab.Navigator>
  );
};

export const CitizenNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CitizenTabs" component={CitizenTabs} />
      <Stack.Screen
        name="RequestDetail"
        component={RequestDetailScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="ItemTraceability"
        component={ItemTraceabilityScreen}
        options={{ presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
};

export default CitizenNavigator;
