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

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { useNetwork } from '../../hooks/useNetwork';
import { OfflineBanner } from '../../components/common/OfflineBanner';
import { EcoSetuBackground } from '../../components/glass/EcoSetuBackground';
import { GlassCard } from '../../components/glass/GlassCard';
import { GlassAvatar } from '../../components/glass/GlassAvatar';
import { ReadAloudButton } from '../../components/voice/ReadAloudButton';
import { useI18n } from '../../i18n';

interface Props {
  navigation?: any;
}

export const RecyclerDashboardScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const { isConnected } = useNetwork();
  const { t } = useI18n();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const recyclerName = user?.name || 'Abhishek Singh';

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  }, []);

  const consignments = [
    {
      id: 'CSG-9D861331',
      collector: 'Rajesh Senapati',
      items: '2 items • 4.2 kg',
      status: 'Delivered',
      isDelivered: true,
    },
    {
      id: 'CSG-2F8A910',
      collector: 'Local Collector',
      items: '5 items • 12.6 kg',
      status: 'In Transit',
      isDelivered: false,
    },
    {
      id: 'CSG-1E3C442',
      collector: 'City E-Waste',
      items: '3 items • 6.1 kg',
      status: 'Delivered',
      isDelivered: true,
    },
  ];

  return (
    <EcoSetuBackground>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Top Header Bar */}
        <View style={styles.headerBar}>
          <View style={styles.userInfoRow}>
            <GlassAvatar name={recyclerName} icon="🏭" size={44} online />
            <View style={styles.userTextCol}>
              <Text style={styles.userGreeting}>Good Morning,</Text>
              <Text style={styles.userName}>{recyclerName}</Text>
              <View style={styles.facilityRow}>
                <Text style={styles.facilityPin}>📍</Text>
                <Text style={styles.facilityText}>GreenEarth Hub • Brahmapur</Text>
              </View>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ReadAloudButton
              variant="compact"
              text={() =>
                `${t('recycler.dashboard.title') || 'Recycler Dashboard'}. ${recyclerName}. ${t('recycler.dashboard.authorizedFacility') || 'Authorized Facility'}. ${t('recycler.dashboard.incomingBatches') || 'Incoming'}: 4. ${t('recycler.dashboard.facilityThroughput') || 'Processed'}: 186 kg.`
              }
              accessibilityLabel={t('voice.readAloud') || 'Read Aloud'}
            />
            <TouchableOpacity
              style={styles.settingsBtn}
              onPress={() => navigation?.navigate?.('RecyclerProfile')}
              accessibilityRole="button"
              accessibilityLabel="Settings"
            >
              <Text style={styles.settingsIcon}>⚙️</Text>
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
          {/* 4 Metric Pills Row */}
          <View style={styles.metricsRow}>
            <View style={styles.metricPill}>
              <Text style={styles.metricValue}>4</Text>
              <Text style={styles.metricLabel}>Incoming</Text>
            </View>
            <View style={styles.metricPill}>
              <Text style={styles.metricValue}>2</Text>
              <Text style={styles.metricLabel}>Delivered</Text>
            </View>
            <View style={styles.metricPill}>
              <Text style={styles.metricValue}>3</Text>
              <Text style={styles.metricLabel}>Processing</Text>
            </View>
            <View style={styles.metricPill}>
              <Text style={styles.metricValue}>18</Text>
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
            {consignments.map((item) => (
              <GlassCard
                key={item.id}
                variant="standard"
                style={styles.consignmentCard}
                onPress={() => navigation?.navigate?.('RecyclerIncoming')}
              >
                <View style={styles.consignmentRow}>
                  <View style={styles.boxIconWrapper}>
                    <Text style={styles.boxIcon}>📦</Text>
                  </View>
                  <View style={styles.consignmentInfoCol}>
                    <Text style={styles.consignmentId}>{item.id}</Text>
                    <Text style={styles.collectorText}>From: {item.collector}</Text>
                    <Text style={styles.itemsText}>{item.items}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      item.isDelivered ? styles.statusDelivered : styles.statusTransit,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        item.isDelivered ? styles.statusTextDelivered : styles.statusTextTransit,
                      ]}
                    >
                      {item.status}
                    </Text>
                  </View>
                </View>
              </GlassCard>
            ))}
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
                  <Text style={styles.impactNumber}>186</Text>
                  <Text style={styles.impactKg}>kg</Text>
                  <Text style={styles.impactLabel}>Processed</Text>
                </View>
              </View>

              {/* Impact Breakdown Stats */}
              <View style={styles.impactBreakdownCol}>
                <View style={styles.breakdownItem}>
                  <Text style={styles.breakdownIcon}>♻</Text>
                  <View>
                    <Text style={styles.breakdownValue}>142 kg</Text>
                    <Text style={styles.breakdownLabel}>Materials Recovered</Text>
                  </View>
                </View>

                <View style={styles.breakdownItem}>
                  <Text style={styles.breakdownIcon}>🌱</Text>
                  <View>
                    <Text style={styles.breakdownValue}>89 kg</Text>
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
});

export default RecyclerDashboardScreen;
