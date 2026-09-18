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
import { colors } from '../theme/colors';

const Tab = createBottomTabNavigator<CitizenTabParamList>();
const Stack = createNativeStackNavigator<CitizenStackParamList>();

// CitizenNotificationsTab placeholder removed — replaced by CitizenNotificationsScreen

// CitizenProfileTab placeholder removed — replaced by CitizenProfileScreen

// ItemTraceabilityModal placeholder removed — replaced by ItemTraceabilityScreen

const CitizenTabs: React.FC = () => {
  return (
    <Tab.Navigator
      initialRouteName="CitizenHome"
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
        name="CitizenHome"
        component={CitizenDashboardScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>🏠</Text>,
        }}
      />
      <Tab.Screen
        name="CitizenSubmit"
        component={SubmitItemScreen}
        options={{
          tabBarLabel: 'Submit',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>📸</Text>,
        }}
      />
      <Tab.Screen
        name="CitizenRequests"
        component={CitizenRequestsScreen}
        options={{
          tabBarLabel: 'Requests',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>📦</Text>,
        }}
      />
      <Tab.Screen
        name="CitizenNotifications"
        component={CitizenNotificationsScreen}
        options={{
          tabBarLabel: 'Alerts',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>🔔</Text>,
        }}
      />
      <Tab.Screen
        name="CitizenProfile"
        component={CitizenProfileScreen}
        options={{
          tabBarLabel: 'Profile',
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
