/**
 * RecyclerDashboardScreen
 * Authenticated FORMAL_RECYCLER — Home / Dashboard screen.
 *
 * Displays:
 *   - Recycler facility greeting and authorized badge
 *   - Quick facility metrics (incoming consignments, processing, material recovery, total weight)
 *   - Quick navigation cards to Incoming Consignments and Recycling Records
 *   - Facility throughput and environmental compliance indicator
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { useNetwork } from '../../hooks/useNetwork';
import { TopAppBar } from '../../components/layout/TopAppBar';
import { OfflineBanner } from '../../components/common/OfflineBanner';
import { GradientBackground } from '../../components/glass/GradientBackground';
import { GlassCard } from '../../components/glass/GlassCard';
import { GlassMetricCard } from '../../components/glass/GlassMetricCard';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

interface Props {
  navigation?: any;
}

export const RecyclerDashboardScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const { isConnected } = useNetwork();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const facilityName = user?.name || 'Recycling Center';

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  }, []);

  return (
    <GradientBackground>
      <TopAppBar
        title="Recycler Dashboard"
        roleBadge="RECYCLER"
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {!isConnected && <OfflineBanner />}

        {/* Facility Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarIcon}>🏭</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.greetingText}>Authorized Facility</Text>
            <Text style={styles.facilityName} numberOfLines={1}>
              {facilityName}
            </Text>
            <View style={styles.badgeRow}>
              <View style={styles.complianceBadge}>
                <Text style={styles.complianceText}>CPCB AUTHORIZED</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Key Metrics Grid */}
        <Text style={styles.sectionTitle}>Facility Throughput</Text>
        <View style={styles.metricsGrid}>
          <GlassMetricCard
            value="12"
            label="Incoming Batches"
            icon="📦"
            accentColor={colors.secondary}
            onPress={() => navigation?.navigate?.('RecyclerIncoming')}
          />
          <GlassMetricCard
            value="4"
            label="In Processing"
            icon="⚙️"
            accentColor={colors.warning}
            onPress={() => navigation?.navigate?.('RecyclerRecords')}
          />
        </View>
        <View style={[styles.metricsGrid, { marginTop: spacing.spaceSm }]}>
          <GlassMetricCard
            value="1,420 kg"
            label="Total Recovered"
            icon="⚖️"
            accentColor={colors.primary}
          />
          <GlassMetricCard
            value="94.2%"
            label="Recovery Rate"
            icon="🌱"
            accentColor={colors.accentMint}
          />
        </View>

        {/* Quick Operations Section */}
        <Text style={styles.sectionTitle}>Facility Operations</Text>

        <GlassCard
          style={styles.actionCard}
          onPress={() => navigation?.navigate?.('RecyclerIncoming')}
          variant="elevated"
        >
          <View style={styles.actionRow}>
            <View style={[styles.actionIconCircle, { backgroundColor: 'rgba(96, 165, 250, 0.18)' }]}>
              <Text style={styles.actionIcon}>🚚</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>Review Incoming Consignments</Text>
              <Text style={styles.actionDesc}>
                Inspect and accept e-waste consignments delivered by authorized collectors.
              </Text>
            </View>
            <Text style={styles.arrowIcon}>→</Text>
          </View>
        </GlassCard>

        <GlassCard
          style={styles.actionCard}
          onPress={() => navigation?.navigate?.('RecyclerRecords')}
          variant="elevated"
        >
          <View style={styles.actionRow}>
            <View style={[styles.actionIconCircle, { backgroundColor: 'rgba(74, 222, 128, 0.18)' }]}>
              <Text style={styles.actionIcon}>📋</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>Recycling Processing Records</Text>
              <Text style={styles.actionDesc}>
                Log material breakdown, hazardous recovery, and weight verification certificates.
              </Text>
            </View>
            <Text style={styles.arrowIcon}>→</Text>
          </View>
        </GlassCard>

        {/* Custody Chain Banner */}
        <View style={styles.chainFooter}>
          <Text style={styles.chainText}>
            EcoSetu Closed Loop: CITIZEN → KABADIWALA → RECYCLER
          </Text>
        </View>

        <View style={{ height: spacing.spaceXl }} />
      </ScrollView>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    padding: spacing.spaceMd,
    paddingBottom: spacing.spaceXl + 20,
  },
  headerCard: {
    backgroundColor: colors.glassSurface,
    borderRadius: 16,
    padding: spacing.spaceMd,
    marginBottom: spacing.spaceMd,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    elevation: 3,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(96, 165, 250, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.spaceSm + 2,
  },
  avatarIcon: {
    fontSize: 24,
  },
  greetingText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  facilityName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 3,
  },
  complianceBadge: {
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.35)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  complianceText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
    marginBottom: spacing.spaceSm,
    marginTop: spacing.spaceSm,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.spaceSm,
  },
  actionCard: {
    marginBottom: spacing.spaceSm,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.spaceSm,
  },
  actionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIcon: {
    fontSize: 20,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  actionDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  arrowIcon: {
    fontSize: 18,
    color: colors.textTertiary,
    fontWeight: '700',
  },
  chainFooter: {
    marginTop: spacing.spaceMd,
    paddingHorizontal: spacing.spaceMd,
  },
  chainText: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 18,
  },
});

export default RecyclerDashboardScreen;
