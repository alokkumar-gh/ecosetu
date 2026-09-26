/**
 * RecyclerNavigator — COMPLETELY REBUILT
 *
 * New 5-tab structure:
 *  MARKET     — Find material (procurement home)
 *  ORDERS     — Active procurement pipeline
 *  INVENTORY  — Received material
 *  MONEY      — Spend / payments / bills
 *  PROFILE    — Business / compliance / settings
 *
 * All existing stack screens preserved.
 * Legacy tab screens (RecyclerDashboard, RecyclerIncoming, RecyclerRecords)
 * remain importable for deep-link compatibility but are replaced as primary tabs.
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, View, StyleSheet } from 'react-native';
import { AppIcon } from '../components/ui/AppIcon';
import { RecyclerTabParamList, RecyclerStackParamList } from './types';
import { PlaceholderScreen } from '../components/common/PlaceholderScreen';
import { colors } from '../theme/colors';

// ── NEW PRIMARY SCREENS ────────────────────────────────────────────────────────
import { RecyclerMarketScreen }    from '../screens/recycler/RecyclerMarketScreen';
import { RecyclerOrdersScreen }    from '../screens/recycler/RecyclerOrdersScreen';
import { RecyclerInventoryScreen } from '../screens/recycler/RecyclerInventoryScreen';
import { RecyclerMoneyScreen }     from '../screens/recycler/RecyclerMoneyScreen';
import { RecyclerNewProfileScreen } from '../screens/recycler/RecyclerNewProfileScreen';

// ── EXISTING STACK SCREENS (preserved) ────────────────────────────────────────
import { ConsignmentDetailScreen }          from '../screens/recycler/ConsignmentDetailScreen';
import { RecyclingRecordDetailScreen }      from '../screens/recycler/RecyclingRecordDetailScreen';
import { RecyclerLotDetailScreen }          from '../screens/recycler/RecyclerLotDetailScreen';
import { RecyclerCreateQuoteScreen }        from '../screens/recycler/RecyclerCreateQuoteScreen';
import { RecyclerHandoverConfirmScreen }    from '../screens/recycler/RecyclerHandoverConfirmScreen';
import { CollectorHandoverReceiptScreen }   from '../screens/collector/CollectorHandoverReceiptScreen';
import { CollectorTransactionsScreen }      from '../screens/collector/CollectorTransactionsScreen';
import { CollectorTransactionDetailScreen } from '../screens/collector/CollectorTransactionDetailScreen';
import { CollectorLotTraceScreen }          from '../screens/collector/CollectorLotTraceScreen';
import { RecyclerPickupManagementScreen }   from '../screens/recycler/RecyclerPickupManagementScreen';
import { RecyclerCreateBatchScreen }        from '../screens/recycler/RecyclerCreateBatchScreen';
import { RecyclerBatchDetailScreen }        from '../screens/recycler/RecyclerBatchDetailScreen';
import { RecyclerSourcingScreen }           from '../screens/recycler/RecyclerSourcingScreen';
import { RecyclerCreateSourcingRequestScreen } from '../screens/recycler/RecyclerCreateSourcingRequestScreen';
import { RecyclerSourcingDetailScreen }     from '../screens/recycler/RecyclerSourcingDetailScreen';
import { RecyclerDisputesScreen }           from '../screens/recycler/RecyclerDisputesScreen';
import { RecyclerDisputeDetailScreen }      from '../screens/recycler/RecyclerDisputeDetailScreen';
import { PaymentMethodScreen }              from '../screens/payment/PaymentMethodScreen';
import { CashPaymentConfirmationScreen }    from '../screens/payment/CashPaymentConfirmationScreen';
import { PaymentResultScreen }              from '../screens/payment/PaymentResultScreen';
import { BillsScreen }                      from '../screens/billing/BillsScreen';
import { BillDetailScreen }                 from '../screens/billing/BillDetailScreen';
// Legacy RecyclerMarketplaceScreen still accessible via stack
import { RecyclerMarketplaceScreen }        from '../screens/recycler/RecyclerMarketplaceScreen';

const Tab   = createBottomTabNavigator<RecyclerTabParamList>();
const Stack = createNativeStackNavigator<RecyclerStackParamList>();

// ── TAB STYLES ────────────────────────────────────────────────────────────────
const tabStyles = StyleSheet.create({
  buyIcon: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(34,211,238,0.15)',
    borderWidth: 1.5, borderColor: 'rgba(34,211,238,0.4)',
    justifyContent: 'center', alignItems: 'center',
  },
  buyIconActive: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: '#22D3EE',
    justifyContent: 'center', alignItems: 'center',
  },
});

// ── MODALS ────────────────────────────────────────────────────────────────────
const RecyclerVerificationModal = ({ navigation }: any) => (
  <PlaceholderScreen
    title="Recycler Authorization"
    role="RECYCLER"
    description="Submit CPCB/SPCB recycling authorization licenses and facility certifications."
    apiEndpoints={['GET /api/v1/verifications/me', 'POST /api/v1/verifications']}
    onBack={() => navigation.goBack()}
  />
);

const RecyclerRatesPlaceholder = ({ navigation }: any) => (
  <PlaceholderScreen
    title="My Buying Rates"
    role="RECYCLER"
    description="Manage your buying rates per material category. Collectors can see what you pay."
    apiEndpoints={['GET /api/v1/recyclers/rates', 'POST /api/v1/recyclers/rates']}
    onBack={() => navigation.goBack()}
  />
);

import { useI18n } from '../i18n';

// ── TABS ──────────────────────────────────────────────────────────────────────
const RecyclerTabs: React.FC = () => {
  const { t } = useI18n();

  return (
    <Tab.Navigator
      initialRouteName="RecyclerMarket"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#22D3EE',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.38)',
        tabBarStyle: {
          backgroundColor: '#030C12',
          borderTopColor: 'rgba(255,255,255,0.08)',
          borderTopWidth: 1,
          height: 68,
          paddingBottom: 10,
          paddingTop: 8,
          elevation: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.45,
          shadowRadius: 12,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '800',
          letterSpacing: 0.3,
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="RecyclerMarket"
        component={RecyclerMarketScreen}
        options={{
          tabBarLabel: t('navigation.marketplace', 'Market'),
          tabBarIcon: ({ color }) => (
            <AppIcon name="search" size={20} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tab.Screen
        name="RecyclerOrders"
        component={RecyclerOrdersScreen}
        options={{
          tabBarLabel: t('navigation.requests', 'Orders'),
          tabBarIcon: ({ focused }) => (
            <View style={focused ? tabStyles.buyIconActive : tabStyles.buyIcon}>
              <AppIcon name="clipboard" size={18} color={focused ? '#071E22' : '#22D3EE'} strokeWidth={2.4} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="RecyclerInventory"
        component={RecyclerInventoryScreen}
        options={{
          tabBarLabel: t('navigation.inventory', 'Stock'),
          tabBarIcon: ({ color }) => (
            <AppIcon name="box" size={20} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tab.Screen
        name="RecyclerMoney"
        component={RecyclerMoneyScreen}
        options={{
          tabBarLabel: t('navigation.money', 'Money'),
          tabBarIcon: ({ color }) => (
            <AppIcon name="rupee" size={18} color={color} strokeWidth={2} />
          ),
        }}
      />
      <Tab.Screen
        name="RecyclerProfile"
        component={RecyclerNewProfileScreen}
        options={{
          tabBarLabel: t('navigation.profile', 'Profile'),
          tabBarIcon: ({ color }) => (
            <AppIcon name="factory" size={20} color={color} strokeWidth={2} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

// ── NAVIGATOR ─────────────────────────────────────────────────────────────────
export const RecyclerNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="RecyclerTabs"             component={RecyclerTabs} />
      <Stack.Screen name="Verification"             component={RecyclerVerificationModal}        options={{ presentation: 'modal' }} />
      <Stack.Screen name="RecyclerMarketplace"      component={RecyclerMarketplaceScreen}        options={{ presentation: 'card' }} />
      <Stack.Screen name="ConsignmentDetail"        component={ConsignmentDetailScreen}          options={{ presentation: 'card' }} />
      <Stack.Screen name="RecyclingRecordDetail"    component={RecyclingRecordDetailScreen}      options={{ presentation: 'card' }} />
      <Stack.Screen name="RecyclerLotDetail"        component={RecyclerLotDetailScreen}          options={{ presentation: 'card' }} />
      <Stack.Screen name="RecyclerCreateQuote"      component={RecyclerCreateQuoteScreen}        options={{ presentation: 'card' }} />
      <Stack.Screen name="RecyclerHandoverConfirm"  component={RecyclerHandoverConfirmScreen}    options={{ presentation: 'card' }} />
      <Stack.Screen name="RecyclerHandoverReceipt"  component={CollectorHandoverReceiptScreen}   options={{ presentation: 'card' }} />
      <Stack.Screen name="RecyclerTransactions"     component={CollectorTransactionsScreen}      options={{ presentation: 'card' }} />
      <Stack.Screen name="RecyclerTransactionDetail"component={CollectorTransactionDetailScreen} options={{ presentation: 'card' }} />
      <Stack.Screen name="RecyclerLotTrace"         component={CollectorLotTraceScreen}          options={{ presentation: 'card' }} />
      <Stack.Screen name="RecyclerPickupManagement" component={RecyclerPickupManagementScreen}   options={{ presentation: 'card' }} />
      <Stack.Screen name="RecyclerCreateBatch"      component={RecyclerCreateBatchScreen}        options={{ presentation: 'card' }} />
      <Stack.Screen name="RecyclerBatchDetail"      component={RecyclerBatchDetailScreen}        options={{ presentation: 'card' }} />
      <Stack.Screen name="RecyclerSourcing"         component={RecyclerSourcingScreen}           options={{ presentation: 'card' }} />
      <Stack.Screen name="RecyclerCreateSourcingRequest" component={RecyclerCreateSourcingRequestScreen} options={{ presentation: 'card' }} />
      <Stack.Screen name="RecyclerSourcingDetail"   component={RecyclerSourcingDetailScreen}     options={{ presentation: 'card' }} />
      <Stack.Screen name="RecyclerDisputes"         component={RecyclerDisputesScreen}           options={{ presentation: 'card' }} />
      <Stack.Screen name="RecyclerDisputeDetail"    component={RecyclerDisputeDetailScreen}      options={{ presentation: 'card' }} />
      <Stack.Screen name="PaymentMethod"            component={PaymentMethodScreen}              options={{ presentation: 'card' }} />
      <Stack.Screen name="CashPaymentConfirmation"  component={CashPaymentConfirmationScreen}    options={{ presentation: 'card' }} />
      <Stack.Screen name="PaymentResult"            component={PaymentResultScreen}              options={{ presentation: 'card' }} />
      <Stack.Screen name="RecyclerBills"            component={BillsScreen}                      options={{ presentation: 'card' }} />
      <Stack.Screen name="RecyclerBillDetail"       component={BillDetailScreen}                 options={{ presentation: 'card' }} />
      <Stack.Screen name="RecyclerRates"            component={RecyclerRatesPlaceholder}         options={{ presentation: 'card' }} />
    </Stack.Navigator>
  );
};

export default RecyclerNavigator;
