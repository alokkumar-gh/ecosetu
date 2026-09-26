/**
 * RecyclerDashboardScreen — Premium SaaS Glassmorphism Edition
 *
 * Visual design matching EcoSetu mockup:
 * - Top header with facility avatar, name, facility location, and settings gear
 * - 4-column metric pills: Incoming, Delivered, Processing, Completed
 * - Incoming consignments list cards with status pills and collector info
 * - Recycling Impact section with circular progress ring (186 kg Processed) and recovery stats
 * - Preserves all navigation and role capabilities
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { useNetwork } from '../../hooks/useNetwork';
import { OfflineBanner } from '../../components/common/OfflineBanner';
import { EcoSetuBackground } from '../../components/glass/EcoSetuBackground';
import { GlassCard } from '../../components/glass/GlassCard';
import { GlassAvatar } from '../../components/glass/GlassAvatar';
import { ReadAloudButton } from '../../components/voice/ReadAloudButton';
import { AppIcon } from '../../components/ui/AppIcon';
import { useI18n } from '../../i18n';
import { recyclingService } from '../../services/recyclingService';

interface Props {
  navigation?: any;
}

export const RecyclerDashboardScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const { isConnected } = useNetwork();
  const { t } = useI18n();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [consignments, setConsignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const recyclerName = profile?.facilityName || user?.name || 'Recycler Facility';
  const facilityLocation = profile?.city ? `${profile.city}${profile.state ? `, ${profile.state}` : ''}` : 'Location on file';

  const loadData = useCallback(async () => {
    try {
      const [profResult, consResult] = await Promise.allSettled([
        recyclingService.getProfile(),
        recyclingService.getConsignments(),
      ]);

      if (profResult.status === 'fulfilled' && profResult.value?.profile) {
        setProfile(profResult.value.profile);
      }
      if (consResult.status === 'fulfilled') {
        const consVal = consResult.value as any;
        const consData = consVal?.consignments || consVal?.data || (Array.isArray(consVal) ? consVal : []);
        setConsignments(consData);
      }
    } catch (err) {
      console.warn('Dashboard data fetch warning:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadData();
  }, [loadData]);

  // Dynamic impact metrics strictly computed from actual processed consignments
  const processedKg = consignments
    .filter(c => c.status === 'PROCESSED' || c.status === 'COMPLETED')
    .reduce((sum, c) => sum + (c.weightKg || c.materialLot?.approximateTotalWeightKg || 0), 0);
  const recoveredKg = Math.round(processedKg * 0.75 * 10) / 10;
  const co2SavedKg = Math.round(processedKg * 0.48 * 10) / 10;

  return (
    <EcoSetuBackground>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Top Header Bar */}
        <View style={styles.headerBar}>
          <View style={styles.userInfoRow}>
            <GlassAvatar name={recyclerName} size={44} online />
            <View style={styles.userTextCol}>
              <Text style={styles.userGreeting}>Good Morning,</Text>
              <Text style={styles.userName}>{recyclerName}</Text>
              <View style={styles.facilityRow}>
                <AppIcon name="mapPin" size={12} color="#10B981" />
                <Text style={styles.facilityText}>{facilityLocation}</Text>
              </View>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ReadAloudButton
              variant="compact"
              text={() =>
                `${t('recycler.dashboard.title') || 'Recycler Dashboard'}. ${recyclerName}. ${t('recycler.dashboard.authorizedFacility') || 'Authorized Facility'}.`
              }
              accessibilityLabel={t('voice.readAloud') || 'Read Aloud'}
            />
            <TouchableOpacity
              style={styles.settingsBtn}
              onPress={() => navigation?.navigate?.('RecyclerProfile')}
              accessibilityRole="button"
              accessibilityLabel="Settings"
            >
              <AppIcon name="settings" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {!isConnected && <OfflineBanner />}

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={['#10B981']}
              tintColor="#10B981"
            />
          }
        >
          {/* Marketplace Sourcing Callout Card */}
          <GlassCard variant="elevated" style={styles.marketplaceCard}>
            <View style={styles.marketplaceRow}>
              <View style={styles.marketplaceIconWrap}>
                <AppIcon name="search" size={22} color="#10B981" />
              </View>
              <View style={styles.marketplaceInfo}>
                <Text style={styles.marketplaceTitle}>E-Waste Sourcing Marketplace</Text>
                <Text style={styles.marketplaceSubtitle}>
                  Discover open material lots from collectors and submit formal purchase offers.
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.marketplaceCta}
              onPress={() => navigation?.navigate?.('RecyclerMarketplace')}
              accessibilityRole="button"
            >
              <Text style={styles.marketplaceCtaText}>Find Material Lots ›</Text>
            </TouchableOpacity>
          </GlassCard>

          {/* Logistics & Multi-Lot Consolidation Card */}
          <GlassCard variant="elevated" style={[styles.marketplaceCard, { marginTop: 10, borderColor: 'rgba(0, 168, 150, 0.4)' }]}>
            <View style={styles.marketplaceRow}>
              <View style={styles.marketplaceIconWrap}>
                <AppIcon name="truck" size={22} color="#00A896" />
              </View>
              <View style={styles.marketplaceInfo}>
                <Text style={styles.marketplaceTitle}>Logistics & Multi-Lot Pickups</Text>
                <Text style={styles.marketplaceSubtitle}>
                  Consolidate accepted lots into scheduled batches and manage collection journeys.
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.marketplaceCta, { backgroundColor: 'rgba(0, 168, 150, 0.2)' }]}
              onPress={() => navigation?.navigate?.('RecyclerPickupManagement')}
              accessibilityRole="button"
            >
              <Text style={[styles.marketplaceCtaText, { color: '#00A896' }]}>Manage Pickups & Batches ›</Text>
            </TouchableOpacity>
          </GlassCard>

          {/* 4 Metric Pills Row */}
          <View style={styles.metricsRow}>
            <View style={styles.metricPill}>
              <Text style={styles.metricValue}>{consignments.filter(c => c.status === 'IN_TRANSIT').length}</Text>
              <Text style={styles.metricLabel}>In Transit</Text>
            </View>
            <View style={styles.metricPill}>
              <Text style={styles.metricValue}>{consignments.filter(c => c.status === 'DELIVERED').length}</Text>
              <Text style={styles.metricLabel}>Delivered</Text>
            </View>
            <View style={styles.metricPill}>
              <Text style={styles.metricValue}>{consignments.filter(c => c.status === 'PROCESSING').length}</Text>
              <Text style={styles.metricLabel}>Processing</Text>
            </View>
            <View style={styles.metricPill}>
              <Text style={styles.metricValue}>{consignments.filter(c => c.status === 'PROCESSED' || c.status === 'COMPLETED').length}</Text>
              <Text style={styles.metricLabel}>Completed</Text>
            </View>
          </View>

          {/* Section: Incoming Consignments */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Incoming Consignments</Text>
            <TouchableOpacity onPress={() => navigation?.navigate?.('RecyclerIncoming')}>
              <Text style={styles.viewAllLink}>View All ›</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.consignmentsList}>
            {loading && !isRefreshing ? (
              <ActivityIndicator color="#10B981" style={{ marginVertical: 16 }} />
            ) : consignments.length === 0 ? (
              <View style={styles.emptyConsignmentsBox}>
                <AppIcon name="box" size={32} color="#10B981" style={{ marginBottom: 8 }} />
                <Text style={styles.emptyConsignmentsTitle}>No incoming consignments yet</Text>
                <Text style={styles.emptyConsignmentsDesc}>
                  Make offers on available lots in the marketplace. Once a collector accepts, consignments will appear here.
                </Text>
              </View>
            ) : (
              consignments.slice(0, 5).map((item) => (
                <GlassCard
                  key={item.id || item.manifestNumber}
                  variant="standard"
                  style={styles.consignmentCard}
                  onPress={() => navigation?.navigate?.('ConsignmentDetail', { consignmentId: item.id, consignment: item })}
                >
                  <View style={styles.consignmentRow}>
                    <View style={styles.boxIconWrapper}>
                      <AppIcon name="box" size={18} color="#10B981" />
                    </View>
                    <View style={styles.consignmentInfoCol}>
                      <Text style={styles.consignmentId}>{item.manifestNumber || item.id}</Text>
                      <Text style={styles.collectorText}>From: {item.collector?.user?.name || item.collectorName || 'Collector'}</Text>
                      <Text style={styles.itemsText}>{item.weightKg ? `${item.weightKg} kg` : (item.materialLot?.approximateTotalWeightKg ? `${item.materialLot.approximateTotalWeightKg} kg` : '—')}</Text>
                    </View>
                    <View
                      style={[
                        styles.statusPill,
                        item.status === 'DELIVERED' ? styles.statusDelivered : styles.statusTransit,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          item.status === 'DELIVERED' ? styles.statusTextDelivered : styles.statusTextTransit,
                        ]}
                      >
                        {item.status}
                      </Text>
                    </View>
                  </View>
                </GlassCard>
              ))
            )}
          </View>

          {/* Section: Recycling Impact */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Recycling Impact</Text>
            <Text style={styles.timeFilterText}>This Month ›</Text>
          </View>

          <GlassCard variant="standard" style={styles.impactCard}>
            <View style={styles.impactRow}>
              {/* Circular Progress Ring */}
              <View style={styles.impactCircleRing}>
                <View style={styles.impactCircleInner}>
                  <Text style={styles.impactNumber}>{processedKg}</Text>
                  <Text style={styles.impactKg}>kg</Text>
                  <Text style={styles.impactLabel}>Processed</Text>
                </View>
              </View>

              {/* Impact Breakdown Stats */}
              <View style={styles.impactBreakdownCol}>
                <View style={styles.breakdownItem}>
                  <AppIcon name="recycle" size={18} color="#10B981" style={{ marginRight: 8 }} />
                  <View>
                    <Text style={styles.breakdownValue}>{recoveredKg} kg</Text>
                    <Text style={styles.breakdownLabel}>Materials Recovered</Text>
                  </View>
                </View>

                <View style={styles.breakdownItem}>
                  <AppIcon name="leaf" size={18} color="#10B981" style={{ marginRight: 8 }} />
                  <View>
                    <Text style={styles.breakdownValue}>{co2SavedKg} kg</Text>
                    <Text style={styles.breakdownLabel}>CO₂ Saved</Text>
                  </View>
                </View>
              </View>
            </View>
          </GlassCard>

          {/* Closed loop custody banner */}
          <View style={styles.chainFooter}>
            <Text style={styles.chainText}>
              EcoSetu Closed Loop: CITIZEN → KABADIWALA → RECYCLER
            </Text>
          </View>
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
  userInfoRow: {
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
  facilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  facilityPin: {
    fontSize: 11,
    marginRight: 4,
  },
  facilityText: {
    fontSize: 11,
    color: '#34D399',
    fontWeight: '600',
  },
  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsIcon: {
    fontSize: 18,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 80,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 10,
  },
  metricPill: {
    flex: 1,
    backgroundColor: 'rgba(16, 44, 48, 0.70)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    paddingVertical: 12,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  metricLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.65)',
    marginTop: 2,
    fontWeight: '600',
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
  timeFilterText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.60)',
    fontWeight: '500',
  },
  consignmentsList: {
    gap: 8,
  },
  consignmentCard: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  consignmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  boxIconWrapper: {
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
  boxIcon: {
    fontSize: 20,
  },
  consignmentInfoCol: {
    flex: 1,
  },
  consignmentId: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  collectorText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.70)',
    marginTop: 2,
  },
  itemsText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.55)',
    marginTop: 1,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusDelivered: {
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
    borderColor: '#F59E0B',
  },
  statusTransit: {
    backgroundColor: 'rgba(14, 165, 233, 0.18)',
    borderColor: '#0EA5E9',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusTextDelivered: {
    color: '#FBBF24',
  },
  statusTextTransit: {
    color: '#38BDF8',
  },
  impactCard: {
    padding: 16,
  },
  impactRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  impactCircleRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 6,
    borderColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  impactCircleInner: {
    alignItems: 'center',
  },
  impactNumber: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 26,
  },
  impactKg: {
    fontSize: 12,
    fontWeight: '700',
    color: '#34D399',
  },
  impactLabel: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.65)',
    fontWeight: '600',
  },
  impactBreakdownCol: {
    flex: 1,
    gap: 14,
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breakdownIcon: {
    fontSize: 22,
    marginRight: 10,
  },
  breakdownValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  breakdownLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.65)',
    fontWeight: '500',
  },
  chainFooter: {
    marginTop: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  chainText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.50)',
    fontStyle: 'italic',
  },
  marketplaceCard: {
    padding: 16,
    marginVertical: 10,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  marketplaceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  marketplaceIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  marketplaceIcon: {
    fontSize: 22,
  },
  marketplaceInfo: {
    flex: 1,
  },
  marketplaceTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  marketplaceSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 16,
  },
  marketplaceCta: {
    backgroundColor: '#10B981',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marketplaceCtaText: {
    color: '#071E22',
    fontSize: 13,
    fontWeight: '800',
  },
  emptyConsignmentsBox: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  emptyIconText: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyConsignmentsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  emptyConsignmentsDesc: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default RecyclerDashboardScreen;
