import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import { RecyclerTabParamList, RecyclerStackParamList } from './types';
import { PlaceholderScreen } from '../components/common/PlaceholderScreen';
import { colors } from '../theme/colors';

const Tab = createBottomTabNavigator<RecyclerTabParamList>();
const Stack = createNativeStackNavigator<RecyclerStackParamList>();

import { RecyclerIncomingScreen } from '../screens/recycler/RecyclerIncomingScreen';
import { ConsignmentDetailScreen } from '../screens/recycler/ConsignmentDetailScreen';
import { RecyclerRecordsScreen } from '../screens/recycler/RecyclerRecordsScreen';
import { RecyclingRecordDetailScreen } from '../screens/recycler/RecyclingRecordDetailScreen';
import { RecyclerDashboardScreen } from '../screens/recycler/RecyclerDashboardScreen';
import { RecyclerProfileScreen } from '../screens/recycler/RecyclerProfileScreen';

const RecyclerHomeTab = ({ navigation }: any) => <RecyclerDashboardScreen navigation={navigation} />;
const RecyclerProfileTab = () => <RecyclerProfileScreen />;

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
