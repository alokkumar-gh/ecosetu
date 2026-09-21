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
import { CollectorPickupDetailScreen } from '../screens/collector/CollectorPickupDetailScreen';
import { CollectorRecyclerDetailScreen } from '../screens/collector/CollectorRecyclerDetailScreen';
import { RecyclerFacilityDetailScreen } from '../screens/collector/RecyclerFacilityDetailScreen';
import { CollectorMaterialCaptureScreen } from '../screens/collector/CollectorMaterialCaptureScreen';
import { CollectorCreateLotScreen } from '../screens/collector/CollectorCreateLotScreen';
import { CollectorLotsScreen } from '../screens/collector/CollectorLotsScreen';
import { CollectorLotDetailScreen } from '../screens/collector/CollectorLotDetailScreen';
import { CollectorPriceBoardScreen } from '../screens/collector/CollectorPriceBoardScreen';
import { CollectorRecyclerMatchesScreen } from '../screens/collector/CollectorRecyclerMatchesScreen';
import { CollectorQuotesScreen } from '../screens/collector/CollectorQuotesScreen';
import { CollectorHandoverScreen } from '../screens/collector/CollectorHandoverScreen';
import { CollectorHandoverReceiptScreen } from '../screens/collector/CollectorHandoverReceiptScreen';
import { CollectorRecordSaleScreen } from '../screens/collector/CollectorRecordSaleScreen';
import { CollectorTransactionsScreen } from '../screens/collector/CollectorTransactionsScreen';
import { CollectorTransactionDetailScreen } from '../screens/collector/CollectorTransactionDetailScreen';
import { CollectorEarningsScreen } from '../screens/collector/CollectorEarningsScreen';
import { CollectorSafetyCenterScreen } from '../screens/collector/CollectorSafetyCenterScreen';
import { CollectorSafetyDetailScreen } from '../screens/collector/CollectorSafetyDetailScreen';
import { CollectorLotTraceScreen } from '../screens/collector/CollectorLotTraceScreen';
import { CollectorVoiceProvider } from '../context/CollectorVoiceContext';
import { CollectorVoiceButton } from '../components/voice/CollectorVoiceButton';
import { CollectorVoiceModal } from '../components/voice/CollectorVoiceModal';
import { colors } from '../theme/colors';
import { useI18n } from '../i18n';

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
  const { t } = useI18n();

  return (
    <Tab.Navigator
      initialRouteName="CollectorHome"
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
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.2,
        },
      }}
    >
      <Tab.Screen
        name="CollectorHome"
        component={CollectorDashboardScreen}
        options={{
          tabBarLabel: t('navigation.home') || 'Home',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>🏠</Text>,
        }}
      />
      <Tab.Screen
        name="CollectorBrowse"
        component={CollectorBrowseScreen}
        options={{
          tabBarLabel: t('navigation.requests') || 'Browse',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>🔍</Text>,
        }}
      />
      <Tab.Screen
        name="CollectorPickups"
        component={CollectorPickupsScreen}
        options={{
          tabBarLabel: t('navigation.pickups') || 'Pickups',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>🚚</Text>,
        }}
      />
      <Tab.Screen
        name="CollectorConsign"
        component={CollectorRecyclerDirectoryScreen}
        options={{
          tabBarLabel: t('collector.recyclers.title') || 'Recyclers',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>🏭</Text>,
        }}
      />
      <Tab.Screen
        name="CollectorProfile"
        component={CollectorProfileScreen}
        options={{
          tabBarLabel: t('navigation.profile') || 'Profile',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 18 }}>👤</Text>,
        }}
      />
    </Tab.Navigator>
  );
};

export const CollectorNavigator: React.FC = () => {
  return (
    <CollectorVoiceProvider>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="CollectorTabs" component={CollectorTabs} />
        <Stack.Screen
          name="PickupDetail"
          component={CollectorPickupDetailScreen}
        />
        <Stack.Screen
          name="PickupExecution"
          component={CollectorPickupDetailScreen}
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
        <Stack.Screen
          name="CollectorRecyclerDirectory"
          component={CollectorRecyclerDirectoryScreen}
        />
        <Stack.Screen
          name="CollectorRecyclerDetail"
          component={CollectorRecyclerDetailScreen}
        />
        <Stack.Screen
          name="RecyclerFacilityDetail"
          component={RecyclerFacilityDetailScreen}
        />
        <Stack.Screen
          name="CollectorMaterialCapture"
          component={CollectorMaterialCaptureScreen}
        />
        <Stack.Screen
          name="CollectorCreateLot"
          component={CollectorCreateLotScreen}
        />
        <Stack.Screen
          name="CollectorLots"
          component={CollectorLotsScreen}
        />
        <Stack.Screen
          name="CollectorLotDetail"
          component={CollectorLotDetailScreen}
        />
        <Stack.Screen
          name="CollectorPriceBoard"
          component={CollectorPriceBoardScreen}
        />
        <Stack.Screen
          name="CollectorRecyclerMatches"
          component={CollectorRecyclerMatchesScreen}
        />
        <Stack.Screen
          name="CollectorQuotes"
          component={CollectorQuotesScreen}
        />
        <Stack.Screen
          name="CollectorHandover"
          component={CollectorHandoverScreen}
        />
        <Stack.Screen
          name="CollectorHandoverReceipt"
          component={CollectorHandoverReceiptScreen}
        />
        <Stack.Screen
          name="CollectorRecordSale"
          component={CollectorRecordSaleScreen}
        />
        <Stack.Screen
          name="CollectorTransactions"
          component={CollectorTransactionsScreen}
        />
        <Stack.Screen
          name="CollectorTransactionDetail"
          component={CollectorTransactionDetailScreen}
        />
        <Stack.Screen
          name="CollectorEarnings"
          component={CollectorEarningsScreen}
        />
        <Stack.Screen
          name="CollectorSafetyCenter"
          component={CollectorSafetyCenterScreen}
        />
        <Stack.Screen
          name="CollectorSafetyDetail"
          component={CollectorSafetyDetailScreen}
        />
        <Stack.Screen
          name="CollectorLotTrace"
          component={CollectorLotTraceScreen}
        />
      </Stack.Navigator>

      <CollectorVoiceButton />
      <CollectorVoiceModal />
    </CollectorVoiceProvider>
  );
};

export default CollectorNavigator;
