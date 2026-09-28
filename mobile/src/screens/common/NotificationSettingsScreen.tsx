/**
 * NotificationSettingsScreen.tsx
 * Functional, Role-Aware Notification Settings Screen for EcoSetu
 *
 * Provides real backend-persisted toggles that control push notification
 * delivery for supported events based on user role.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import { useI18n } from '../../i18n';
import { useNetwork } from '../../hooks/useNetwork';
import { TopAppBar } from '../../components/layout/TopAppBar';
import { notificationService } from '../../services/notificationService';
import { AppIcon } from '../../components/ui/AppIcon';
import { spacing } from '../../theme/spacing';

interface CategoryConfig {
  key: string;
  title: string;
  description: string;
  icon: string;
}

export const NotificationSettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { t } = useI18n();
  const { isConnected } = useNetwork();

  const [loading, setLoading] = useState(true);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<Record<string, boolean>>({
    pickups: true,
    offersAndBids: true,
    sourcingAndBids: true,
    negotiations: true,
    verifications: true,
    handovers: true,
    traceability: true,
    consignments: true,
    transactions: true,
    systemAlerts: true,
  });

  const loadPreferences = useCallback(async () => {
    setLoading(true);
    try {
      const data = await notificationService.getPreferences();
      if (data && typeof data === 'object') {
        setPreferences((prev) => ({ ...prev, ...data }));
      }
    } catch (err: any) {
      console.warn('[NotificationSettings] Failed to load preferences:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const handleToggle = async (key: string, currentValue: boolean) => {
    if (!isConnected) {
      Alert.alert(
        t('common.offline', 'Offline'),
        t(
          'settings.offlineError',
          'Network unavailable. Please connect to the internet to update notification settings.'
        )
      );
      return;
    }

    const newValue = !currentValue;
    setPreferences((prev) => ({ ...prev, [key]: newValue }));
    setUpdatingKey(key);

    try {
      const updated = await notificationService.updatePreferences({ [key]: newValue });
      if (updated && typeof updated === 'object') {
        setPreferences((prev) => ({ ...prev, ...updated }));
      }
    } catch (err: any) {
      setPreferences((prev) => ({ ...prev, [key]: currentValue }));
      Alert.alert(
        t('common.error', 'Error'),
        err?.message || t('settings.updateFailed', 'Failed to save notification preference.')
      );
    } finally {
      setUpdatingKey(null);
    }
  };

  const getRoleCategories = (): CategoryConfig[] => {
    const role = (user?.role || 'CITIZEN').toUpperCase();

    if (role === 'CITIZEN') {
      return [
        {
          key: 'pickups',
          title: t('settings.catPickupsCitizenTitle', 'Pickup Updates'),
          description: t('settings.catPickupsCitizenDesc', 'Schedule confirmations, collector arrival, and completion alerts'),
          icon: 'calendar',
        },
        {
          key: 'offersAndBids',
          title: t('settings.catOffersCitizenTitle', 'Offers & Pricing'),
          description: t('settings.catOffersCitizenDesc', 'Collector offer arrivals, price updates, and accepted offers'),
          icon: 'tag',
        },
        {
          key: 'traceability',
          title: t('settings.catTraceCitizenTitle', 'Recycling & Impact'),
          description: t('settings.catTraceCitizenDesc', 'Certificates of recycling and environmental impact updates'),
          icon: 'leaf',
        },
        {
          key: 'verifications',
          title: t('settings.catVerifCitizenTitle', 'Account & Verification'),
          description: t('settings.catVerifCitizenDesc', 'Identity status updates, security notifications, and alerts'),
          icon: 'shieldCheck',
        },
      ];
    }

    if (role === 'INFORMAL_COLLECTOR') {
      return [
        {
          key: 'pickups',
          title: t('settings.catPickupsCollectorTitle', 'Pickup Requests'),
          description: t('settings.catPickupsCollectorDesc', 'New nearby scrap requests and pickup schedule updates'),
          icon: 'truck',
        },
        {
          key: 'offersAndBids',
          title: t('settings.catOffersCollectorTitle', 'Offers & Bids'),
          description: t('settings.catOffersCollectorDesc', 'Citizen offer responses and recycler bids on material lots'),
          icon: 'dollarSign',
        },
        {
          key: 'handovers',
          title: t('settings.catHandoversCollectorTitle', 'Custody Handovers'),
          description: t('settings.catHandoversCollectorDesc', 'Recycler lot receipts, weight confirmations, and receipts'),
          icon: 'checkCircle',
        },
        {
          key: 'transactions',
          title: t('settings.catTxCollectorTitle', 'Transactions & Earnings'),
          description: t('settings.catTxCollectorDesc', 'Sale completions, payment confirmations, and bill receipts'),
          icon: 'creditCard',
        },
      ];
    }

    if (role === 'RECYCLER') {
      return [
        {
          key: 'sourcingAndBids',
          title: t('settings.catSourcingRecyclerTitle', 'Sourcing & Quotes'),
          description: t('settings.catSourcingRecyclerDesc', 'Collector responses to sourcing requests and quote acceptances'),
          icon: 'shoppingBag',
        },
        {
          key: 'handovers',
          title: t('settings.catHandoversRecyclerTitle', 'Custody Handovers'),
          description: t('settings.catHandoversRecyclerDesc', 'Collector arrivals, material lot handovers, and batch receipts'),
          icon: 'package',
        },
        {
          key: 'consignments',
          title: t('settings.catConsignRecyclerTitle', 'Consignments'),
          description: t('settings.catConsignRecyclerDesc', 'Incoming bulk collector consignments and delivery alerts'),
          icon: 'truck',
        },
        {
          key: 'verifications',
          title: t('settings.catVerifRecyclerTitle', 'Authorization & Papers'),
          description: t('settings.catVerifRecyclerDesc', 'State Pollution Board authorization updates and document verification'),
          icon: 'fileText',
        },
      ];
    }

    return [
      {
        key: 'pickups',
        title: t('settings.catPickupsTitle', 'Pickup Updates'),
        description: t('settings.catPickupsDesc', 'Pickup request creation, assignment, and status transitions'),
        icon: 'truck',
      },
      {
        key: 'offersAndBids',
        title: t('settings.catOffersTitle', 'Offers & Bids'),
        description: t('settings.catOffersDesc', 'Marketplace offers, bids, and price negotiations'),
        icon: 'tag',
      },
      {
        key: 'verifications',
        title: t('settings.catVerifTitle', 'Verifications'),
        description: t('settings.catVerifDesc', 'User verification updates and compliance notifications'),
        icon: 'shieldCheck',
      },
      {
        key: 'systemAlerts',
        title: t('settings.catSystemTitle', 'System & Account Alerts'),
        description: t('settings.catSystemDesc', 'Account security, dispute updates, and platform announcements'),
        icon: 'bell',
      },
    ];
  };

  const categories = getRoleCategories();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <TopAppBar
        title={t('settings.notificationsTitle', 'Notification Settings')}
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Device & System Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeaderRow}>
            <View style={styles.statusIconWrap}>
              <AppIcon name="bell" size={20} color="#10B981" />
            </View>
            <View style={styles.statusTextWrap}>
              <Text style={styles.statusTitle}>
                {t('settings.pushStatusTitle', 'Push Notifications Enabled')}
              </Text>
              <Text style={styles.statusSub}>
                {t('settings.pushStatusSub', 'Device notifications are active on this phone.')}
              </Text>
            </View>
          </View>
          <View style={styles.statusDivider} />
          <Text style={styles.statusDisclaimer}>
            {t(
              'settings.pushDisclaimer',
              'Note: Category toggles control push notification delivery for specific app events. System notification permissions must also be enabled in Android OS settings.'
            )}
          </Text>
        </View>

        <Text style={styles.sectionHeader}>
          {t('settings.preferenceSectionHeader', 'NOTIFICATION CATEGORIES')}
        </Text>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={styles.loadingText}>
              {t('settings.loadingPreferences', 'Loading preferences...')}
            </Text>
          </View>
        ) : (
          <View style={styles.cardGroup}>
            {categories.map((cat, index) => {
              const isEnabled = preferences[cat.key] !== false;
              const isUpdating = updatingKey === cat.key;

              return (
                <React.Fragment key={cat.key}>
                  {index > 0 && <View style={styles.rowDivider} />}
                  <View style={styles.categoryRow}>
                    <View style={styles.catIconBox}>
                      <AppIcon name={cat.icon} size={18} color="#10B981" />
                    </View>
                    <View style={styles.catTextWrap}>
                      <Text style={styles.catTitle}>{cat.title}</Text>
                      <Text style={styles.catDesc}>{cat.description}</Text>
                    </View>
                    <View style={styles.switchWrap}>
                      {isUpdating ? (
                        <ActivityIndicator size="small" color="#10B981" />
                      ) : (
                        <Switch
                          value={isEnabled}
                          onValueChange={() => handleToggle(cat.key, isEnabled)}
                          trackColor={{ false: '#334155', true: '#059669' }}
                          thumbColor={isEnabled ? '#10B981' : '#94A3B8'}
                        />
                      )}
                    </View>
                  </View>
                </React.Fragment>
              );
            })}
          </View>
        )}

        <View style={styles.infoBox}>
          <AppIcon name="info" size={16} color="#64748B" style={{ marginRight: 8 }} />
          <Text style={styles.infoText}>
            {t(
              'settings.historyNote',
              'Turning OFF a category suppresses future push alerts. Your existing notification history is preserved in your Notification Center.'
            )}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  container: {
    padding: spacing.spaceMd,
    paddingBottom: 40,
  },
  statusCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: spacing.spaceMd,
    marginBottom: spacing.spaceLg,
    borderWidth: 1,
    borderColor: '#334155',
  },
  statusHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.spaceSm,
  },
  statusTextWrap: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  statusSub: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  statusDivider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: spacing.spaceSm,
  },
  statusDisclaimer: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 1,
    marginBottom: spacing.spaceXs,
    marginLeft: spacing.spaceXs,
  },
  cardGroup: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.spaceMd,
  },
  catIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.spaceSm,
  },
  catTextWrap: {
    flex: 1,
    marginRight: spacing.spaceXs,
  },
  catTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  catDesc: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
    lineHeight: 16,
  },
  switchWrap: {
    width: 50,
    alignItems: 'flex-end',
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#334155',
    marginLeft: 56,
  },
  loadingBox: {
    padding: spacing.spaceXl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: spacing.spaceSm,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(51, 65, 85, 0.5)',
    borderRadius: 8,
    padding: spacing.spaceSm,
    marginTop: spacing.spaceLg,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 16,
  },
});

export default NotificationSettingsScreen;
