import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import { CollectorTabParamList, CollectorStackParamList } from './types';
import { PlaceholderScreen } from '../components/common/PlaceholderScreen';
import { CollectorDashboardScreen } from '../screens/collector/CollectorDashboardScreen';
import { CollectorBrowseScreen } from '../screens/collector/CollectorBrowseScreen';
import { CollectorPickupsScreen } from '../screens/collector/CollectorPickupsScreen';
import { CollectorProfileScreen } from '../screens/collector/CollectorProfileScreen';
import { CollectorRecyclerDirectoryScreen } from '../screens/collector/CollectorRecyclerDirectoryScreen';
import { CreateConsignmentScreen } from '../screens/collector/CreateConsignmentScreen';
import { CollectorConsignmentsScreen } from '../screens/collector/CollectorConsignmentsScreen';
import { CollectorConsignmentStatusScreen } from '../screens/collector/CollectorConsignmentStatusScreen';
import { colors } from '../theme/colors';

const Tab = createBottomTabNavigator<CollectorTabParamList>();
const Stack = createNativeStackNavigator<CollectorStackParamList>();

const CollectorHomeTab = () => (
  <PlaceholderScreen
    title="Collector Dashboard"
    role="INFORMAL_COLLECTOR"
    description="Daily pickup statistics, today's routes, and online availability toggle."
    apiEndpoints={['GET /api/v1/collectors/stats', 'PATCH /api/v1/collectors/availability']}
    showSignOut
  />
);

const CollectorBrowseTab = () => (
  <PlaceholderScreen
    title="Available Requests"
    role="INFORMAL_COLLECTOR"
    description="Browse nearby citizen collection requests on an interactive map or filterable list."
    apiEndpoints={['GET /api/v1/collection-requests/available']}
  />
);

const CollectorPickupsTab = () => (
  <PlaceholderScreen
    title="My Pickups"
    role="INFORMAL_COLLECTOR"
    description="Manage your accepted pickups, active routes, and completed pickup history."
    apiEndpoints={['GET /api/v1/pickups/my-pickups']}
  />
);

// CollectorConsignTab placeholder replaced by CollectorRecyclerDirectoryScreen

const CollectorProfileTab = () => (
  <PlaceholderScreen
    title="Collector Profile"
    role="INFORMAL_COLLECTOR"
    description="Manage service area, identity verification status, and contact information."
    apiEndpoints={['GET /api/v1/collectors/profile', 'POST /api/v1/verifications']}
    showSignOut
  />
);

const PickupExecutionModal = ({ navigation }: any) => (
  <PlaceholderScreen
    title="Pickup Execution"
    role="INFORMAL_COLLECTOR"
    description="Record actual collected weights, take proof photo, and finalize doorstep pickup."
    apiEndpoints={['PATCH /api/v1/pickups/:id/complete']}
    onBack={() => navigation.goBack()}
  />
);

const CollectorRequestDetailModal = ({ navigation }: any) => (
  <PlaceholderScreen
    title="Request Details"
    role="INFORMAL_COLLECTOR"
    description="View e-waste items and pickup address, with action to accept request."
    apiEndpoints={[
      'GET /api/v1/collection-requests/:id',
      'POST /api/v1/collection-requests/:id/accept',
    ]}
    onBack={() => navigation.goBack()}
  />
);

const CollectorVerificationModal = ({ navigation }: any) => (
  <PlaceholderScreen
    title="Collector Verification"
    role="INFORMAL_COLLECTOR"
    description="Upload government ID and verification documents for administrative approval."
    apiEndpoints={['GET /api/v1/verifications/me', 'POST /api/v1/verifications']}
    onBack={() => navigation.goBack()}
  />
);

const CollectorTabs: React.FC = () => {
  return (
    <Tab.Navigator
      initialRouteName="CollectorHome"
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
        name="CollectorHome"
        component={CollectorDashboardScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>🏠</Text>,
        }}
      />
      <Tab.Screen
        name="CollectorBrowse"
        component={CollectorBrowseScreen}
        options={{
          tabBarLabel: 'Browse',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>🔍</Text>,
        }}
      />
      <Tab.Screen
        name="CollectorPickups"
        component={CollectorPickupsScreen}
        options={{
          tabBarLabel: 'Pickups',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>🚚</Text>,
        }}
      />
      <Tab.Screen
        name="CollectorConsign"
        component={CollectorRecyclerDirectoryScreen}
        options={{
          tabBarLabel: 'Recyclers',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>🏭</Text>,
        }}
      />
      <Tab.Screen
        name="CollectorProfile"
        component={CollectorProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>👤</Text>,
        }}
      />
    </Tab.Navigator>
  );
};

export const CollectorNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CollectorTabs" component={CollectorTabs} />
      <Stack.Screen
        name="PickupExecution"
        component={PickupExecutionModal}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="RequestDetail"
        component={CollectorRequestDetailModal}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="Verification"
        component={CollectorVerificationModal}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="CreateConsignment"
        component={CreateConsignmentScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="CollectorConsignments"
        component={CollectorConsignmentsScreen}
      />
      <Stack.Screen
        name="CollectorConsignmentStatus"
        component={CollectorConsignmentStatusScreen}
      />
    </Stack.Navigator>
  );
};

export default CollectorNavigator;
