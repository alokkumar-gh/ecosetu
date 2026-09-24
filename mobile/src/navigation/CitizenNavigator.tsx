import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import { CitizenTabParamList, CitizenStackParamList } from './types';
import { CitizenDashboardScreen } from '../screens/citizen/CitizenDashboardScreen';
import { CitizenMarketplaceScreen } from '../screens/citizen/CitizenMarketplaceScreen';
import { CitizenMarketplaceItemDetailScreen } from '../screens/citizen/CitizenMarketplaceItemDetailScreen';
import { CitizenOrdersScreen } from '../screens/citizen/CitizenOrdersScreen';
import { SubmitItemScreen } from '../screens/citizen/SubmitItemScreen';
import { RequestDetailScreen } from '../screens/citizen/RequestDetailScreen';
import { ItemTraceabilityScreen } from '../screens/citizen/ItemTraceabilityScreen';
import { CitizenNotificationsScreen } from '../screens/citizen/CitizenNotificationsScreen';
import { CitizenProfileScreen } from '../screens/citizen/CitizenProfileScreen';
import { BillsScreen } from '../screens/billing/BillsScreen';
import { BillDetailScreen } from '../screens/billing/BillDetailScreen';
import { PaymentMethodScreen } from '../screens/payment/PaymentMethodScreen';
import { CashPaymentConfirmationScreen } from '../screens/payment/CashPaymentConfirmationScreen';
import { PaymentResultScreen } from '../screens/payment/PaymentResultScreen';
import { useI18n } from '../i18n';
import { colors } from '../theme/colors';

const Tab = createBottomTabNavigator<CitizenTabParamList>();
const Stack = createNativeStackNavigator<CitizenStackParamList>();

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
          backgroundColor: 'rgba(7, 30, 34, 0.96)',
          borderTopColor: 'rgba(255, 255, 255, 0.10)',
          borderTopWidth: 1,
          height: 68,
          paddingBottom: 10,
          paddingTop: 6,
          elevation: 12,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.4,
          shadowRadius: 12,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 0.2,
        },
      }}
    >
      <Tab.Screen
        name="CitizenHome"
        component={CitizenDashboardScreen}
        options={{
          tabBarLabel: t('navigation.home', 'Home'),
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🏠</Text>,
        }}
      />
      <Tab.Screen
        name="CitizenMarketplace"
        component={CitizenMarketplaceScreen}
        options={{
          tabBarLabel: t('navigation.marketplace', 'Shop'),
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🛍️</Text>,
        }}
      />
      <Tab.Screen
        name="CitizenSubmit"
        component={SubmitItemScreen}
        options={{
          tabBarLabel: t('navigation.submit', 'Give'),
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>♻️</Text>,
        }}
      />
      <Tab.Screen
        name="CitizenRequests"
        component={CitizenOrdersScreen}
        options={{
          tabBarLabel: t('navigation.requests', 'Orders'),
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📋</Text>,
        }}
      />
      <Tab.Screen
        name="CitizenProfile"
        component={CitizenProfileScreen}
        options={{
          tabBarLabel: t('navigation.profile', 'Profile'),
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>👤</Text>,
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
        name="CitizenMarketplace"
        component={CitizenMarketplaceScreen}
      />
      <Stack.Screen
        name="CitizenMarketplaceItemDetail"
        component={CitizenMarketplaceItemDetailScreen}
      />
      {/* CitizenPurchases consolidated into CitizenOrdersScreen */}
      <Stack.Screen
        name="CitizenNotifications"
        component={CitizenNotificationsScreen}
      />
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
      <Stack.Screen
        name="CitizenBills"
        component={BillsScreen}
      />
      <Stack.Screen
        name="CitizenBillDetail"
        component={BillDetailScreen}
      />
      <Stack.Screen
        name="PaymentMethod"
        component={PaymentMethodScreen}
      />
      <Stack.Screen
        name="CashPaymentConfirmation"
        component={CashPaymentConfirmationScreen}
      />
      <Stack.Screen
        name="PaymentResult"
        component={PaymentResultScreen}
      />
    </Stack.Navigator>
  );
};

export default CitizenNavigator;
