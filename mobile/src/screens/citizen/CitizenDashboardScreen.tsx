/**
 * CitizenDashboardScreen — Premium SaaS Glassmorphism Edition
 *
 * Visual design matching EcoSetu mockup:
 * - Top header with profile avatar, name, location, and notification bell
 * - "Your E-Waste Impact" hero glass card with glowing leaf and impact metrics
 * - 4-grid quick action glass buttons: Submit (+), My Requests, Traceability, Notifications
 * - Recent requests glass cards with status pill and glowing accents
 * - 100% preserves all business logic, data fetching, and navigation
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
import { GlassHeroCard } from '../../components/glass/GlassHeroCard';
import { GlassAvatar } from '../../components/glass/GlassAvatar';
import { OfflineBanner } from '../../components/common/OfflineBanner';
import { Skeleton } from '../../components/common/Skeleton';
import { ReadAloudButton } from '../../components/voice/ReadAloudButton';
import { ewasteService } from '../../services/ewasteService';
import { requestService } from '../../services/requestService';

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

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);

  const loadDashboardData = useCallback(async () => {
    setErrorMessage(null);
    try {
      const [fetchedItems, fetchedRequests] = await Promise.all([
        ewasteService.getItems(),
        requestService.getRequests(),
      ]);
      setItems(Array.isArray(fetchedItems) ? fetchedItems : []);
      setRequests(Array.isArray(fetchedRequests) ? fetchedRequests : []);
    } catch (err: any) {
      console.warn('[CitizenDashboard] Data fetch error:', err?.message || err);
      setErrorMessage(
        err?.message || 'Unable to load your e-waste activity. Please pull down to retry.'
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadDashboardData();
  }, [loadDashboardData]);

  // Derived metrics
  const itemsSubmittedCount = items.length;
  const activeRequestsCount = requests.filter((r) =>
    ['SUBMITTED', 'ACCEPTED', 'IN_PROGRESS'].includes((r.status || '').toUpperCase())
  ).length;
  const completedPickupsCount = requests.filter(
    (r) => (r.status || '').toUpperCase() === 'COMPLETED'
  ).length;

  const estimatedWeightKg = (itemsSubmittedCount * 2.1).toFixed(1);
  const estimatedCo2Kg = (itemsSubmittedCount * 1.5).toFixed(1);

  const recentRequests = [...requests]
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 5);

  // Navigation handlers
  const handleOpenNotifications = () => navigation.navigate('CitizenNotifications');
  const handleOpenSubmit = () => navigation.navigate('CitizenSubmit');
  const handleOpenRequests = () => navigation.navigate('CitizenRequests');
  const handleOpenTraceability = () => (navigation as any).navigate('ItemTraceability');
  const handleOpenRequestDetail = (requestId: string) =>
    (navigation as any).navigate('RequestDetail', { requestId });

  return (
    <EcoSetuBackground>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Top Header Row with Avatar, Info & Notification Bell */}
        <View style={styles.headerBar}>
          <View style={styles.headerUserInfo}>
            <GlassAvatar name={user?.name || 'Citizen'} size={44} online />
            <View style={styles.userTextCol}>
              <Text style={styles.userGreeting}>Good Morning,</Text>
              <Text style={styles.userName} accessibilityRole="header">
                {user?.name || 'Citizen User'}
              </Text>
              <View style={styles.locationRow}>
                <Text style={styles.locationPin}>📍</Text>
                <Text style={styles.locationText}>Odisha, India</Text>
              </View>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ReadAloudButton
              text={`${t('citizen.dashboard.welcomeBack')}. ${user?.name || 'Citizen'}. ${itemsSubmittedCount} ${t('citizen.dashboard.itemsSubmitted')}. ${activeRequestsCount} ${t('citizen.dashboard.activeRequests')}.`}
              size="small"
            />
            <TouchableOpacity
              style={styles.notificationBtn}
              onPress={handleOpenNotifications}
              accessibilityRole="button"
              accessibilityLabel="Notifications"
            >
              <Text style={styles.notificationBellIcon}>🔔</Text>
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>1</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <OfflineBanner />

        <ScrollView
          contentContainerStyle={styles.container}
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
            <View style={styles.errorBox} accessibilityRole="alert">
              <Text style={styles.errorText}>⚠ {errorMessage}</Text>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={loadDashboardData}
                accessibilityRole="button"
                accessibilityLabel="Retry loading dashboard"
              >
                <Text style={styles.retryBtnText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Loading Skeletons */}
          {isLoading ? (
            <View style={styles.skeletonWrapper}>
              <Skeleton height={180} style={{ borderRadius: 24, marginBottom: 16 }} />
              <View style={styles.quickActionsGrid}>
                <Skeleton height={80} style={{ flex: 1, borderRadius: 16, marginRight: 8 }} />
                <Skeleton height={80} style={{ flex: 1, borderRadius: 16, marginRight: 8 }} />
                <Skeleton height={80} style={{ flex: 1, borderRadius: 16, marginRight: 8 }} />
                <Skeleton height={80} style={{ flex: 1, borderRadius: 16 }} />
              </View>
              <Skeleton height={100} style={{ borderRadius: 20, marginTop: 16 }} />
            </View>
          ) : (
            <>
              {/* Hero Glass Card */}
              <GlassHeroCard
                title={t('citizen.dashboard.welcomeBack')}
                subtitle={t('citizen.dashboard.greetingSubtitle')}
                icon={<Text style={styles.leafIcon}>🍃</Text>}
                style={styles.heroCard}
              >
                {/* 3 Metric Pills */}
                <View style={styles.metricsPillsRow}>
                  <View style={styles.metricPill}>
                    <Text style={styles.metricPillValue}>{itemsSubmittedCount}</Text>
                    <Text style={styles.metricPillLabel}>{t('citizen.dashboard.itemsSubmitted')}</Text>
                  </View>
                  <View style={styles.metricPill}>
                    <Text style={styles.metricPillValue}>{activeRequestsCount}</Text>
                    <Text style={styles.metricPillLabel}>{t('status.pickedUp')}</Text>
                  </View>
                  <View style={styles.metricPill}>
                    <Text style={styles.metricPillValue}>{completedPickupsCount}</Text>
                    <Text style={styles.metricPillLabel}>{t('status.recycled')}</Text>
                  </View>
                </View>

                {/* Environmental Badges Row */}
                <View style={styles.impactBadgesRow}>
                  <View style={styles.impactBadge}>
                    <Text style={styles.impactIcon}>🌱</Text>
                    <View>
                      <Text style={styles.impactValue}>{estimatedWeightKg} kg</Text>
                      <Text style={styles.impactLabel}>{t('citizen.submit.estimatedWeight')}</Text>
                    </View>
                  </View>
                  <View style={styles.impactBadge}>
                    <Text style={styles.impactIcon}>☁</Text>
                    <View>
                      <Text style={styles.impactValue}>{estimatedCo2Kg} kg</Text>
                      <Text style={styles.impactLabel}>{t('citizen.traceability.co2Saved') || 'CO₂ Saved'}</Text>
                    </View>
                  </View>
                </View>
              </GlassHeroCard>

              {/* Quick Actions Title */}
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>{t('citizen.dashboard.activityOverview')}</Text>
              </View>

              {/* 4-Grid Quick Actions */}
              <View style={styles.quickActionsGrid}>
                {/* Submit Action (Featured Emerald CTA) */}
                <TouchableOpacity
                  style={[styles.quickActionTile, styles.quickActionSubmit]}
                  onPress={handleOpenSubmit}
                  accessibilityRole="button"
                  accessibilityLabel={t('citizen.dashboard.submitNewEwaste')}
                  activeOpacity={0.8}
                >
                  <View style={styles.submitIconCircle}>
                    <Text style={styles.submitPlusIcon}>+</Text>
                  </View>
                  <Text style={styles.quickActionSubmitText}>{t('nav.submit')}</Text>
                  <Text style={styles.quickActionSubmitSubtext}>{t('ewaste.ewaste')}</Text>
                </TouchableOpacity>

                {/* My Requests Action */}
                <TouchableOpacity
                  style={styles.quickActionTile}
                  onPress={handleOpenRequests}
                  accessibilityRole="button"
                  accessibilityLabel={t('citizen.requests.title')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.quickActionIcon}>📄</Text>
                  <Text style={styles.quickActionLabel}>{t('nav.requests')}</Text>
                </TouchableOpacity>

                {/* Traceability Action */}
                <TouchableOpacity
                  style={styles.quickActionTile}
                  onPress={handleOpenTraceability}
                  accessibilityRole="button"
                  accessibilityLabel={t('citizen.traceability.title')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.quickActionIcon}>🔍</Text>
                  <Text style={styles.quickActionLabel}>{t('citizen.traceability.title')}</Text>
                </TouchableOpacity>

                {/* Notifications Action */}
                <TouchableOpacity
                  style={styles.quickActionTile}
                  onPress={handleOpenNotifications}
                  accessibilityRole="button"
                  accessibilityLabel={t('nav.alerts')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.quickActionIcon}>🔔</Text>
                  <Text style={styles.quickActionLabel}>{t('nav.alerts')}</Text>
                </TouchableOpacity>
              </View>

              {/* Recent Requests Section */}
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>{t('citizen.dashboard.recentRequests')}</Text>
                {requests.length > 0 && (
                  <TouchableOpacity onPress={handleOpenRequests}>
                    <Text style={styles.viewAllLink}>{t('citizen.dashboard.viewAll')} ({requests.length}) ›</Text>
                  </TouchableOpacity>
                )}
              </View>

              {requests.length === 0 ? (
                <GlassCard variant="standard" style={styles.emptyCard}>
                  <Text style={styles.emptyIcon}>♻</Text>
                  <Text style={styles.emptyTitle}>{t('citizen.dashboard.noActivityMessage')}</Text>
                  <Text style={styles.emptySubtitle}>
                    {t('citizen.dashboard.greetingSubtitle')}
                  </Text>
                  <TouchableOpacity
                    style={[styles.emptySubmitBtn, styles.primaryActionButton]}
                    onPress={handleOpenSubmit}
                    accessibilityRole="button"
                    accessibilityLabel={t('citizen.dashboard.submitFirstItem')}
                  >
                    <Text style={styles.emptySubmitBtnText}>+ {t('citizen.dashboard.submitFirstItem')}</Text>
                  </TouchableOpacity>
                </GlassCard>
              ) : (
                <View style={styles.requestsList}>
                  {recentRequests.map((req, index) => {
                    const itemCount = req.ewasteItems?.length || req.itemIds?.length || 1;
                    const status = (req.status || 'SUBMITTED').toUpperCase();
                    const isCompleted = status === 'COMPLETED';

                    return (
                      <GlassCard
                        key={req.id}
                        variant="standard"
                        onPress={() => handleOpenRequestDetail(req.id)}
                        style={styles.requestCard}
                      >
                        <View style={styles.requestRowTop}>
                          <View style={styles.requestIconBox}>
                            <Text style={styles.requestBoxIcon}>📦</Text>
                          </View>
                          <View style={styles.requestInfoCol}>
                            <Text style={styles.requestId}>
                              REQ-{req.id ? req.id.slice(0, 8).toUpperCase() : 'NEW'}
                            </Text>
                            <Text style={styles.requestSubDetails}>
                              {itemCount} {itemCount === 1 ? 'item' : 'items'} • Doorstep Pickup
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.statusPill,
                              isCompleted ? styles.statusCompleted : styles.statusActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusPillText,
                                isCompleted ? styles.statusTextCompleted : styles.statusTextActive,
                              ]}
                            >
                              {status}
                            </Text>
                          </View>
                        </View>
                      </GlassCard>
                    );
                  })}
                </View>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </EcoSetuBackground>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  headerUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userTextCol: {
    marginLeft: 12,
  },
  userGreeting: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.65)',
  },
  userName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  locationPin: {
    fontSize: 11,
    marginRight: 4,
  },
  locationText: {
    fontSize: 11,
    color: '#34D399',
    fontWeight: '600',
  },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notificationBellIcon: {
    fontSize: 18,
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 80,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.4)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorText: {
    fontSize: 13,
    color: '#FCA5A5',
    flex: 1,
  },
  retryBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  skeletonWrapper: {
    marginTop: 10,
  },
  heroCard: {
    marginVertical: 6,
  },
  leafIcon: {
    fontSize: 28,
  },
  metricsPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  metricPill: {
    flex: 1,
    backgroundColor: 'rgba(7, 30, 34, 0.70)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  metricPillValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  metricPillLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.65)',
    marginTop: 2,
    fontWeight: '600',
  },
  impactBadgesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  impactBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.3)',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  impactIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  impactValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  impactLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.65)',
    fontWeight: '500',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  viewAllLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#34D399',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  quickActionTile: {
    flex: 1,
    backgroundColor: 'rgba(16, 44, 48, 0.65)',
    borderRadius: 18,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionSubmit: {
    backgroundColor: 'rgba(16, 185, 129, 0.20)',
    borderColor: '#34D399',
  },
  submitIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  submitPlusIcon: {
    fontSize: 20,
    fontWeight: '900',
    color: '#051417',
    lineHeight: 22,
  },
  quickActionSubmitText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#34D399',
  },
  quickActionSubmitSubtext: {
    fontSize: 10,
    color: '#A7F3D0',
  },
  quickActionIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  quickActionLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '600',
  },
  requestsList: {
    gap: 8,
  },
  requestCard: {
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  requestRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requestIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  requestBoxIcon: {
    fontSize: 20,
  },
  requestInfoCol: {
    flex: 1,
  },
  requestId: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  requestSubDetails: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.60)',
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusCompleted: {
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
    borderColor: '#10B981',
  },
  statusActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    borderColor: '#F59E0B',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusTextCompleted: {
    color: '#34D399',
  },
  statusTextActive: {
    color: '#FBBF24',
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.60)',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  emptySubmitBtn: {
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  emptySubmitBtnText: {
    color: '#051417',
    fontSize: 14,
    fontWeight: '800',
  },
  primaryActionButton: {
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default CitizenDashboardScreen;
