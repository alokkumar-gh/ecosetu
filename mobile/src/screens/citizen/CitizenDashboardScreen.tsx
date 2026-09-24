/**
 * CitizenDashboardScreen — EcoSetu Consumer Home (Complete Redesign)
 *
 * Consumer Marketplace experience. Two clear journeys:
 *   A. SELL/GIVE E-WASTE  — "Schedule a free pickup"
 *   B. SHOP REUSABLES     — "Browse tested electronics"
 *
 * Design: Consumer-first, dark emerald glass, warm accent tones.
 * Preserves all business logic & data fetching via citizenSyncService.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CitizenTabParamList, CitizenStackParamList } from '../../navigation/types';
import { useAuth } from '../../hooks/useAuth';
import { useNetwork } from '../../hooks/useNetwork';
import { useI18n } from '../../i18n';
import { EcoSetuBackground } from '../../components/glass/EcoSetuBackground';
import { GlassCard } from '../../components/glass/GlassCard';
import { GlassAvatar } from '../../components/glass/GlassAvatar';
import { citizenSyncService, CitizenCriticalData, CitizenSyncState } from '../../services/citizenSyncService';

type CitizenDashboardNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<CitizenTabParamList, 'CitizenHome'>,
  NativeStackNavigationProp<CitizenStackParamList>
>;

interface Props {
  navigation: CitizenDashboardNavigationProp;
}

export const CitizenDashboardScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const { isConnected } = useNetwork();
  const { t } = useI18n();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    const unsubscribe = citizenSyncService.subscribe(
      (data: CitizenCriticalData, state: CitizenSyncState) => {
        if (data.items) setItems(data.items);
        if (data.requests) setRequests(data.requests);
        if (typeof data.unreadNotificationCount === 'number') {
          setUnreadCount(data.unreadNotificationCount);
        }
        if (state.error) setErrorMessage(state.error);
        else setErrorMessage(null);
      }
    );
    citizenSyncService.bootstrap().catch(() => {});
    return () => { unsubscribe(); };
  }, []);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setErrorMessage(null);
    try {
      await citizenSyncService.bootstrap(true);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Unable to refresh.');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Derived metrics
  const itemsSubmittedCount = items.length;
  const activeRequestsCount = requests.filter((r) =>
    ['SUBMITTED', 'ACCEPTED', 'IN_PROGRESS', 'PICKUP_SCHEDULED'].includes((r.status || '').toUpperCase())
  ).length;
  const completedPickupsCount = requests.filter(
    (r) => ['COMPLETED', 'PICKED_UP'].includes((r.status || '').toUpperCase())
  ).length;
  // No fabricated metrics — only real data shown to user

  const recentRequests = [...requests]
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 3);

  const handleOpenNotifications = () => navigation.navigate('CitizenNotifications');
  const handleOpenSubmit = () => navigation.navigate('CitizenSubmit');
  const handleOpenRequests = () => navigation.navigate('CitizenRequests');
  const handleOpenMarketplace = () => (navigation as any).navigate('CitizenMarketplace');
  const handleOpenRequestDetail = (requestId: string) =>
    (navigation as any).navigate('RequestDetail', { requestId });

  const firstName = (user?.name || 'there').split(' ')[0];
  const timeGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return t('collector.dashboard.greetingMorning', 'Good morning');
    if (h < 17) return t('collector.dashboard.greetingAfternoon', 'Good afternoon');
    return t('collector.dashboard.greetingEvening', 'Good evening');
  };

  const getStatusLabel = (status: string) => {
    switch (status.toUpperCase()) {
      case 'SUBMITTED': return t('status.submitted', 'Submitted');
      case 'ACCEPTED': return t('status.accepted', 'Accepted');
      case 'PICKUP_SCHEDULED': return t('status.pickupScheduled', 'Scheduled');
      case 'IN_PROGRESS': return t('status.inProgress', 'In Progress');
      case 'PICKED_UP':
      case 'COMPLETED': return t('status.pickedUp', 'Collected');
      case 'CANCELLED': return t('status.cancelled', 'Cancelled');
      case 'EXPIRED': return t('status.rejected', 'Expired');
      default: return status.replace(/_/g, ' ');
    }
  };

  return (
    <EcoSetuBackground>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* ─── Top Header ─── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <GlassAvatar name={user?.name || 'Citizen'} size={42} online={isConnected} />
            <View style={styles.headerText}>
              <Text style={styles.headerGreeting}>{timeGreeting()},</Text>
              <Text style={styles.headerName} numberOfLines={1}>{firstName} 👋</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.notifBtn}
            onPress={handleOpenNotifications}
            accessibilityRole="button"
            accessibilityLabel={t('citizen.dashboard.alerts', 'Notifications')}
          >
            <Text style={styles.notifIcon}>🔔</Text>
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={['#10B981']}
              tintColor="#10B981"
            />
          }
        >
          {/* Error Banner */}
          {Boolean(errorMessage) && (
            <View style={styles.errorBanner} accessibilityRole="alert">
              <Text style={styles.errorText}>⚠ {errorMessage}</Text>
              <TouchableOpacity onPress={onRefresh} style={styles.retryBtn}>
                <Text style={styles.retryText}>{t('common.retry', 'Retry')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ─── Activity Summary (real data only) ─── */}
          <View style={styles.heroCard}>
            <Text style={styles.heroLabel}>{t('citizen.dashboard.activityOverview', 'Your Activity')}</Text>
            <View style={styles.metricsRow}>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>{itemsSubmittedCount}</Text>
                <Text style={styles.metricLabel}>{t('citizen.dashboard.itemsSubmitted', 'Items Submitted')}</Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricItem}>
                <Text style={styles.metricValueAmber}>{activeRequestsCount}</Text>
                <Text style={styles.metricLabel}>{t('citizen.dashboard.activeRequests', 'Active Pickups')}</Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricItem}>
                <Text style={styles.metricValueGreen}>{completedPickupsCount}</Text>
                <Text style={styles.metricLabel}>{t('citizen.dashboard.completed', 'Completed')}</Text>
              </View>
            </View>
          </View>

          {/* ─── Primary Journeys ─── */}
          <Text style={styles.sectionTitle}>{t('citizen.dashboard.whatWouldYouLike', 'What would you like to do?')}</Text>
          <View style={styles.journeyRow}>
            <TouchableOpacity
              style={[styles.journeyCard, styles.journeyCardSell]}
              onPress={handleOpenSubmit}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={t('citizen.dashboard.giveSellEwaste', 'Schedule E-Waste Pickup')}
            >
              <Text style={styles.journeyEmoji}>♻️</Text>
              <Text style={styles.journeyTitle}>{t('citizen.dashboard.submitNewEwaste', 'Give / Sell E-Waste')}</Text>
              <Text style={styles.journeyDesc}>{t('citizen.dashboard.freeDoorstepPickup', 'Free doorstep pickup')}</Text>
              <View style={styles.journeyCTA}>
                <Text style={styles.journeyCTAText}>{t('common.next', 'Schedule ➜')}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.journeyCard, styles.journeyCardShop]}
              onPress={handleOpenMarketplace}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={t('navigation.marketplace', 'Browse Reusable Electronics')}
            >
              <Text style={styles.journeyEmoji}>🛍️</Text>
              <Text style={styles.journeyTitle}>{t('navigation.marketplace', 'Buy Reusables')}</Text>
              <Text style={styles.journeyDesc}>{t('marketplace.bannerDesc', 'Tested & verified items')}</Text>
              <View style={[styles.journeyCTA, styles.journeyCTAShop]}>
                <Text style={[styles.journeyCTAText, styles.journeyCTATextShop]}>{t('marketplace.exploreNow', 'Shop ➜')}</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* ─── Quick Nav Grid ─── */}
          <View style={styles.quickGrid}>
            <TouchableOpacity style={styles.quickTile} onPress={handleOpenRequests} accessibilityRole="button">
              <Text style={styles.quickIcon}>📋</Text>
              <Text style={styles.quickLabel}>{t('citizen.requests.title', 'My Requests')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickTile}
              onPress={() => (navigation as any).navigate('CitizenPurchases')}
              accessibilityRole="button"
            >
              <Text style={styles.quickIcon}>🛒</Text>
              <Text style={styles.quickLabel}>{t('marketplace.myPurchases', 'Purchases')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickTile}
              onPress={() => {
                if (items[0]?.id) {
                  (navigation as any).navigate('ItemTraceability', { itemId: items[0].id });
                } else {
                  handleOpenRequests();
                }
              }}
              accessibilityRole="button"
            >
              <Text style={styles.quickIcon}>🔍</Text>
              <Text style={styles.quickLabel}>{t('citizen.traceability.title', 'Track Item')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickTile} onPress={handleOpenNotifications} accessibilityRole="button">
              <Text style={styles.quickIcon}>🔔</Text>
              <Text style={styles.quickLabel}>{t('navigation.alerts', 'Alerts')}{unreadCount > 0 ? ` (${unreadCount})` : ''}</Text>
            </TouchableOpacity>
          </View>

          {/* ─── Recent Activity ─── */}
          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>{t('citizen.dashboard.recentRequests', 'Recent Activity')}</Text>
            {requests.length > 0 && (
              <TouchableOpacity onPress={handleOpenRequests}>
                <Text style={styles.viewAll}>{t('citizen.dashboard.viewAll', 'View All')} ({requests.length}) ›</Text>
              </TouchableOpacity>
            )}
          </View>

          {requests.length === 0 ? (
            <GlassCard variant="standard" style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>♻️</Text>
              <Text style={styles.emptyTitle}>{t('citizen.dashboard.noActivityTitle', 'No Activity Yet')}</Text>
              <Text style={styles.emptySubtitle}>
                {t('citizen.dashboard.noActivityMessage', 'Schedule your first free e-waste pickup and start making an impact.')}
              </Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={handleOpenSubmit} accessibilityRole="button">
                <Text style={styles.emptyBtnText}>+ {t('citizen.dashboard.submitNewEwaste', 'Schedule Pickup')}</Text>
              </TouchableOpacity>
            </GlassCard>
          ) : (
            <View style={styles.activityList}>
              {recentRequests.map((req) => {
                const itemCount = req.ewasteItems?.length || req.itemIds?.length || 1;
                const rawStatus = (req.status || 'SUBMITTED').toUpperCase();
                const isCompleted = ['COMPLETED', 'PICKED_UP'].includes(rawStatus);
                const isCancelled = ['CANCELLED', 'EXPIRED'].includes(rawStatus);
                const statusColor = isCompleted ? '#10B981' : isCancelled ? '#EF4444' : '#F59E0B';
                const statusBg = isCompleted
                  ? 'rgba(16,185,129,0.12)'
                  : isCancelled
                  ? 'rgba(239,68,68,0.12)'
                  : 'rgba(245,158,11,0.12)';
                return (
                  <TouchableOpacity
                    key={req.id}
                    style={styles.activityCard}
                    onPress={() => handleOpenRequestDetail(req.id)}
                    activeOpacity={0.82}
                  >
                    <View style={styles.activityIconBox}>
                      <Text style={styles.activityIcon}>📦</Text>
                    </View>
                    <View style={styles.activityInfo}>
                      <Text style={styles.activityId} numberOfLines={1}>
                        REQ-{req.id ? req.id.slice(0, 8).toUpperCase() : 'NEW'}
                      </Text>
                      <Text style={styles.activitySub} numberOfLines={1}>
                        {itemCount} {itemCount === 1 ? t('collector.browse.item', 'item') : t('collector.browse.items', 'items')} • {t('citizen.requestDetail.doorstepAddress', 'Doorstep Pickup')}
                      </Text>
                    </View>
                    <View style={[styles.statusChip, { backgroundColor: statusBg, borderColor: statusColor }]}>
                      <Text style={[styles.statusChipText, { color: statusColor }]}>
                        {getStatusLabel(rawStatus)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </EcoSetuBackground>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent' },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  headerText: { marginLeft: 12, flex: 1 },
  headerGreeting: { fontSize: 12, color: 'rgba(255,255,255,0.55)', fontWeight: '500' },
  headerName: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3 },
  notifBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
    justifyContent: 'center', alignItems: 'center', position: 'relative',
  },
  notifIcon: { fontSize: 18 },
  badge: {
    position: 'absolute', top: 6, right: 6,
    minWidth: 17, height: 17, borderRadius: 9,
    backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3,
  },
  badgeText: { fontSize: 9, fontWeight: '800', color: '#FFFFFF' },

  scroll: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 32 },

  errorBanner: {
    backgroundColor: 'rgba(239,68,68,0.14)', borderWidth: 1, borderColor: 'rgba(248,113,113,0.35)',
    borderRadius: 14, padding: 12, marginBottom: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  errorText: { fontSize: 13, color: '#FCA5A5', flex: 1, marginRight: 8 },
  retryBtn: {
    backgroundColor: 'rgba(239,68,68,0.25)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
  },
  retryText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },

  // Hero Card
  heroCard: {
    backgroundColor: 'rgba(16,44,48,0.75)', borderRadius: 24,
    borderWidth: 1.5, borderColor: 'rgba(52,211,153,0.22)',
    padding: 20, marginBottom: 22,
    shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 16, elevation: 5,
  },
  heroTopRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 18,
  },
  heroLabel: { fontSize: 17, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3 },
  heroSubLabel: { fontSize: 12, color: 'rgba(255,255,255,0.50)', marginTop: 3, fontWeight: '500' },
  co2Badge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(16,185,129,0.18)', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(52,211,153,0.35)',
    paddingHorizontal: 12, paddingVertical: 8,
  },
  co2Icon: { fontSize: 20 },
  co2Value: { fontSize: 15, fontWeight: '800', color: '#34D399' },
  co2Label: { fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: '500' },
  metricsRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.20)', borderRadius: 16, padding: 16,
  },
  metricItem: { flex: 1, alignItems: 'center' },
  metricValue: { fontSize: 26, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.5 },
  metricValueAmber: { fontSize: 26, fontWeight: '900', color: '#FBBF24', letterSpacing: -0.5 },
  metricValueGreen: { fontSize: 26, fontWeight: '900', color: '#34D399', letterSpacing: -0.5 },
  metricLabel: { fontSize: 11, color: 'rgba(255,255,255,0.55)', textAlign: 'center', marginTop: 4 },
  metricDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.10)' },

  sectionTitle: {
    fontSize: 15, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.2, marginBottom: 12,
  },
  sectionRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 22, marginBottom: 12,
  },
  viewAll: { fontSize: 12, fontWeight: '700', color: '#34D399' },

  // Journey Cards
  journeyRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  journeyCard: {
    flex: 1, borderRadius: 22, padding: 20, minHeight: 190,
    justifyContent: 'space-between', borderWidth: 1.5,
  },
  journeyCardSell: {
    backgroundColor: 'rgba(16,185,129,0.14)', borderColor: 'rgba(52,211,153,0.35)',
  },
  journeyCardShop: {
    backgroundColor: 'rgba(139,92,246,0.13)', borderColor: 'rgba(167,139,250,0.35)',
  },
  journeyEmoji: { fontSize: 32, marginBottom: 8 },
  journeyTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3 },
  journeyDesc: { fontSize: 12, color: 'rgba(255,255,255,0.60)', lineHeight: 17, marginTop: 4 },
  journeyCTA: {
    backgroundColor: '#10B981', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 14,
    alignSelf: 'flex-start', marginTop: 12,
  },
  journeyCTAShop: { backgroundColor: '#8B5CF6' },
  journeyCTAText: { fontSize: 12, fontWeight: '800', color: '#051417' },
  journeyCTATextShop: { color: '#FFFFFF' },

  // Quick Grid
  quickGrid: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  quickTile: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
    paddingVertical: 14, paddingHorizontal: 4,
    alignItems: 'center', justifyContent: 'center', minHeight: 72,
  },
  quickIcon: { fontSize: 20, marginBottom: 5 },
  quickLabel: { fontSize: 10, color: 'rgba(255,255,255,0.75)', fontWeight: '600', textAlign: 'center' },

  // Activity
  activityList: { gap: 10 },
  activityCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 18,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', padding: 14,
  },
  activityIconBox: {
    width: 44, height: 44, borderRadius: 13,
    backgroundColor: 'rgba(16,185,129,0.12)', borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.25)', justifyContent: 'center',
    alignItems: 'center', marginRight: 12,
  },
  activityIcon: { fontSize: 20 },
  activityInfo: { flex: 1, marginRight: 10 },
  activityId: { fontSize: 14, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.3 },
  activitySub: { fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  statusChip: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  statusChipText: { fontSize: 10, fontWeight: '700' },

  // Empty
  emptyCard: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 20 },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', marginBottom: 6, textAlign: 'center' },
  emptySubtitle: {
    fontSize: 13, color: 'rgba(255,255,255,0.55)', textAlign: 'center',
    lineHeight: 19, marginBottom: 20,
  },
  emptyBtn: {
    backgroundColor: '#10B981', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 24,
  },
  emptyBtnText: { color: '#051417', fontSize: 14, fontWeight: '800' },
});

export default CitizenDashboardScreen;
