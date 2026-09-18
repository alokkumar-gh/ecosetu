import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import { RecyclerTabParamList, RecyclerStackParamList } from './types';
import { PlaceholderScreen } from '../components/common/PlaceholderScreen';
import { colors } from '../theme/colors';

const Tab = createBottomTabNavigator<RecyclerTabParamList>();
const Stack = createNativeStackNavigator<RecyclerStackParamList>();

const RecyclerHomeTab = () => (
  <PlaceholderScreen
    title="Recycler Dashboard"
    role="RECYCLER"
    description="Overview of incoming consignments, material recovery rates, and processing throughput."
    apiEndpoints={['GET /api/v1/consignments', 'GET /api/v1/recycling-records']}
    showSignOut
  />
);

import { RecyclerIncomingScreen } from '../screens/recycler/RecyclerIncomingScreen';
import { ConsignmentDetailScreen } from '../screens/recycler/ConsignmentDetailScreen';
import { RecyclerRecordsScreen } from '../screens/recycler/RecyclerRecordsScreen';
import { RecyclingRecordDetailScreen } from '../screens/recycler/RecyclingRecordDetailScreen';

const RecyclerProfileTab = () => (
  <PlaceholderScreen
    title="Facility Profile"
    role="RECYCLER"
    description="Manage recycling facility license, accepted categories, capacity, and coordinates."
    apiEndpoints={['GET /api/v1/recyclers/profile', 'PUT /api/v1/recyclers/profile']}
    showSignOut
  />
);

const RecyclerVerificationModal = ({ navigation }: any) => (
  <PlaceholderScreen
    title="Recycler Verification"
    role="RECYCLER"
    description="Submit CPCB/SPCB recycling authorization licenses and facility certifications."
    apiEndpoints={['GET /api/v1/verifications/me', 'POST /api/v1/verifications']}
    onBack={() => navigation.goBack()}
  />
);

const RecyclerTabs: React.FC = () => {
  return (
    <Tab.Navigator
      initialRouteName="RecyclerHome"
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
        name="RecyclerHome"
        component={RecyclerHomeTab}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>🏭</Text>,
        }}
      />
      <Tab.Screen
        name="RecyclerIncoming"
        component={RecyclerIncomingScreen}
        options={{
          tabBarLabel: 'Incoming',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>📥</Text>,
        }}
      />
      <Tab.Screen
        name="RecyclerRecords"
        component={RecyclerRecordsScreen}
        options={{
          tabBarLabel: 'Records',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>📋</Text>,
        }}
      />
      <Tab.Screen
        name="RecyclerProfile"
        component={RecyclerProfileTab}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>🏢</Text>,
        }}
      />
    </Tab.Navigator>
  );
};

export const RecyclerNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="RecyclerTabs" component={RecyclerTabs} />
      <Stack.Screen
        name="Verification"
        component={RecyclerVerificationModal}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="ConsignmentDetail"
        component={ConsignmentDetailScreen}
        options={{ presentation: 'card' }}
      />
      <Stack.Screen
        name="RecyclingRecordDetail"
        component={RecyclingRecordDetailScreen}
        options={{ presentation: 'card' }}
      />
    </Stack.Navigator>
  );
};

export default RecyclerNavigator;
