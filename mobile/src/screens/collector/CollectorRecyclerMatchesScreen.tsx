/**
 * CollectorRecyclerMatchesScreen.tsx
 * Authenticated INFORMAL_COLLECTOR — Inspect & Compare Suitable Authorized Recyclers
 *
 * Requirements:
 * SIH-MATCH-001: Match lot to recyclers by location + category + rate + availability
 * SIH-MATCH-002: Deterministic ranking/sorting options (Price, Proximity, Freshness)
 * SIH-MATCH-003: Distance to recycler facility
 * SIH-MATCH-004: Pickup availability indicator
 * SIH-MATCH-005: Deterministic rule-based matching baseline
 * SIH-MATCH-006: Compare multiple recycler offers
 * SIH-RATE-003: Offered rates visible in matching results
 *
 * Canonical Reference: docs/25_SIH_26229_REQUIREMENTS.md Module 9
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useI18n } from '../../i18n';
import { TopAppBar } from '../../components/layout/TopAppBar';
import { EcoSetuBackground } from '../../components/eco';
import { AppIcon } from '../../components/ui/AppIcon';
import { EmptyState } from '../../components/common/EmptyState';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { MATERIAL_TAXONOMY } from '../../config/materialTaxonomy';
import {
  recyclerMatchingService,
  LotMatchResponse,
  RecyclerMatchItem,
} from '../../services/recyclerMatchingService';
import { voiceService } from '../../services/voiceService';

const space = {
  xs: spacing.spaceXs,
  sm: spacing.spaceSm,
  md: spacing.spaceMd,
  lg: spacing.spaceLg,
  xl: spacing.spaceXl,
};

type SortMode = 'PRICE' | 'DISTANCE' | 'FRESHNESS';

interface CollectorRecyclerMatchesScreenProps {
  navigation?: any;
  route?: {
    params?: {
      lotId: string;
      lot?: any;
    };
  };
}

export const CollectorRecyclerMatchesScreen: React.FC<CollectorRecyclerMatchesScreenProps> = ({
  navigation,
  route,
}) => {
  const { t, language } = useI18n();
  const lotId = route?.params?.lotId || '';
  const initialLot = route?.params?.lot || null;

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [data, setData] = useState<LotMatchResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('PRICE');
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  const loadMatches = async () => {
    if (!lotId) return;
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const res = await recyclerMatchingService.getMatchesForLot(lotId);
      setData(res);
    } catch (err: any) {
      console.warn('[CollectorRecyclerMatchesScreen] Error:', err);
      setErrorMessage(err.message || t('recyclerMatching.fetchFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMatches();
  }, [lotId]);

  const activeLot = data?.lot || initialLot;
  const categoryTax = activeLot?.category
    ? MATERIAL_TAXONOMY[activeLot.category as keyof typeof MATERIAL_TAXONOMY]
    : null;

  // Deterministic sorting based on user-selected criteria (No "best" label)
  const sortedMatches = useMemo(() => {
    if (!data?.matches) return [];
    const list = [...data.matches];

    return list.sort((a, b) => {
      // Primary grouping: MATCHED first, then PARTIAL_MATCH, then NOT_ELIGIBLE
      const statusOrder = { MATCHED: 0, PARTIAL_MATCH: 1, NOT_ELIGIBLE: 2 };
      if (statusOrder[a.matchStatus] !== statusOrder[b.matchStatus]) {
        return statusOrder[a.matchStatus] - statusOrder[b.matchStatus];
      }

      if (sortMode === 'PRICE') {
        const rateA = a.offeredRate?.amount ?? 0;
        const rateB = b.offeredRate?.amount ?? 0;
        return rateB - rateA;
      }

      if (sortMode === 'DISTANCE') {
        const distA = a.distanceKm ?? 99999;
        const distB = b.distanceKm ?? 99999;
        return distA - distB;
      }

      if (sortMode === 'FRESHNESS') {
        const dateA = a.offeredRate?.effectiveDate
          ? new Date(a.offeredRate.effectiveDate).getTime()
          : 0;
        const dateB = b.offeredRate?.effectiveDate
          ? new Date(b.offeredRate.effectiveDate).getTime()
          : 0;
        return dateB - dateA;
      }

      return 0;
    });
  }, [data?.matches, sortMode]);

  const handleSpeakMatch = async (match: RecyclerMatchItem) => {
    try {
      setSpeakingId(match.recyclerId);
      const categoryLabel = categoryTax?.defaultName || activeLot?.category || 'Material';
      const text = recyclerMatchingService.generateMatchSpeechText(match, categoryLabel, language);
      await voiceService.speak(text, { language });
    } catch (err) {
      console.warn('[CollectorRecyclerMatchesScreen] TTS Error:', err);
    } finally {
      setSpeakingId(null);
    }
  };

  return (
    <EcoSetuBackground>
      <SafeAreaView style={styles.safeArea}>
        <TopAppBar
          title={t('recyclerMatching.title')}
          showBack
          onBack={() => navigation?.goBack()}
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Stale Cache Warning Banner */}
          {data?.isOfflineCached && (
            <View style={[styles.cacheBanner, data.isStale && styles.staleBanner, { flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
              <AppIcon name={data.isStale ? "alert" : "box"} size={14} color="#FBBF24" />
              <Text style={[styles.cacheBannerText, { flex: 1 }]}>
                {data.isStale
                  ? t('recyclerMatching.staleCacheWarning')
                  : t('recyclerMatching.cachedDataNotice')}
                {data.cachedAt ? ` (${new Date(data.cachedAt).toLocaleDateString()})` : ''}
              </Text>
            </View>
          )}

          {/* Lot Overview & Value Context Card */}
          {activeLot && (
            <View style={styles.lotHeaderCard}>
              <View style={styles.lotHeaderTop}>
                <View style={styles.categoryCircle}>
                  <AppIcon name="box" size={22} color="#10B981" />
                </View>
                <View style={styles.lotHeaderTextContainer}>
                  <Text style={styles.lotRefText}>
                    {activeLot.referenceNumber || t('recyclerMatching.lot')}
                  </Text>
                  <Text style={styles.lotCategoryTitle}>
                    {categoryTax?.defaultName || activeLot.category}
                  </Text>
                  {activeLot.approximateTotalWeightKg ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <AppIcon name="box" size={12} color="rgba(255,255,255,0.6)" />
                      <Text style={styles.lotWeightText}>
                        {activeLot.approximateTotalWeightKg} kg
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>

              {/* Baseline Market Estimate Comparison (Section 14) */}
              {data?.marketEstimate && (
                <View style={styles.marketEstimateBox}>
                  <View style={styles.marketEstimateHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <AppIcon name="barChart" size={15} color="#10B981" />
                      <Text style={styles.marketEstimateTitle}>
                        {t('recyclerMatching.marketEstimateTitle')}
                      </Text>
                    </View>
                    <Text style={styles.marketEstimateRange}>
                      ₹{data.marketEstimate.marketRangeLow} – ₹{data.marketEstimate.marketRangeHigh} / kg
                    </Text>
                  </View>
                  <Text style={styles.marketEstimateDisclaimer}>
                    {t('recyclerMatching.marketEstimateNote')}
                  </Text>
                </View>
              )}

              {/* Link to Quotes Screen */}
              <TouchableOpacity
                style={styles.viewQuotesBanner}
                onPress={() => navigation?.navigate('CollectorQuotes', { lotId: lotId, lot: activeLot })}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <AppIcon name="document" size={14} color="#34D399" />
                  <Text style={styles.viewQuotesBannerText}>
                    {t('quotation.quotes')} →
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Deterministic Sort Bar */}
          <View style={styles.sortBarContainer}>
            <Text style={styles.sortBarLabel}>
              {t('recyclerMatching.sortBy')}:
            </Text>
            <View style={styles.sortButtonsRow}>
              <TouchableOpacity
                style={[styles.sortButton, sortMode === 'PRICE' && styles.sortButtonActive]}
                onPress={() => setSortMode('PRICE')}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <AppIcon name="rupee" size={13} color={sortMode === 'PRICE' ? '#FFFFFF' : '#94A3B8'} />
                  <Text style={[styles.sortButtonText, sortMode === 'PRICE' && styles.sortButtonTextActive]}>
                    {t('recyclerMatching.sortPrice')}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sortButton, sortMode === 'DISTANCE' && styles.sortButtonActive]}
                onPress={() => setSortMode('DISTANCE')}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <AppIcon name="location" size={13} color={sortMode === 'DISTANCE' ? '#FFFFFF' : '#94A3B8'} />
                  <Text style={[styles.sortButtonText, sortMode === 'DISTANCE' && styles.sortButtonTextActive]}>
                    {t('recyclerMatching.sortDistance')}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.sortButton, sortMode === 'FRESHNESS' && styles.sortButtonActive]}
                onPress={() => setSortMode('FRESHNESS')}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <AppIcon name="clock" size={13} color={sortMode === 'FRESHNESS' ? '#FFFFFF' : '#94A3B8'} />
                  <Text style={[styles.sortButtonText, sortMode === 'FRESHNESS' && styles.sortButtonTextActive]}>
                    {t('recyclerMatching.sortFreshness')}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Loading Indicator */}
          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary || '#14B8A6'} />
              <Text style={styles.loadingText}>
                {t('recyclerMatching.matchingEligibleRecyclers')}
              </Text>
            </View>
          )}

          {/* Error Banner */}
          {errorMessage && !isLoading && (
            <View style={[styles.errorContainer, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
              <AppIcon name="alert" size={18} color="#EF4444" />
              <Text style={[styles.errorText, { flex: 1 }]}>{errorMessage}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={loadMatches}>
                <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Empty State */}
          {!isLoading && !errorMessage && sortedMatches.length === 0 && (
            <EmptyState
              icon="factory"
              title={t('recyclerMatching.noEligibleFound')}
              description={t('recyclerMatching.noEligibleDescription')}
            />
          )}

          {/* Match Results List */}
          {!isLoading && !errorMessage && sortedMatches.map((match) => {
            const isMatched = match.matchStatus === 'MATCHED';
            const isPartial = match.matchStatus === 'PARTIAL_MATCH';
            const isSpeaking = speakingId === match.recyclerId;

            return (
              <View
                key={match.recyclerId}
                style={[
                  styles.matchCard,
                  isMatched && styles.matchCardMatched,
                  isPartial && styles.matchCardPartial,
                ]}
              >
                {/* Top Row: Facility & Status Badges */}
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cardTitleContainer}>
                    <Text style={styles.facilityNameText}>
                      {match.facilityName}
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <AppIcon name="location" size={12} color="rgba(255,255,255,0.6)" />
                      <Text style={styles.locationSubText}>
                        {match.city ? `${match.city}, ${match.state || ''}` : match.serviceArea}
                        {match.distanceKm !== null ? ` • ~${match.distanceKm} km` : ''}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.badgesColumn}>
                    {/* Match Status Badge */}
                    <View
                      style={[
                        styles.statusBadge,
                        isMatched
                          ? styles.statusBadgeMatched
                          : isPartial
                          ? styles.statusBadgePartial
                          : styles.statusBadgeIneligible,
                      ]}
                    >
                      <Text style={styles.statusBadgeText}>
                        {isMatched
                          ? t('recyclerMatching.match')
                          : isPartial
                          ? t('recyclerMatching.partialMatch')
                          : t('recyclerMatching.notEligible')}
                      </Text>
                    </View>

                    {/* Authorization Status Badge */}
                    <View style={[styles.authBadge, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
                      <AppIcon name="shieldCheck" size={11} color="#10B981" />
                      <Text style={styles.authBadgeText}>
                        {t('recyclerMatching.authorized')}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Middle: Offered Rate & Pickup Indicator */}
                <View style={styles.rateAndPickupSection}>
                  <View style={styles.rateBox}>
                    <Text style={styles.rateLabel}>
                      {t('recyclerMatching.offeredRate')}:
                    </Text>
                    {match.offeredRate ? (
                      <View style={styles.rateValueRow}>
                        <Text style={styles.rateAmount}>
                          ₹{match.offeredRate.amount}
                        </Text>
                        <Text style={styles.rateUnit}>
                          / {match.offeredRate.unit.replace('PER_', '').toLowerCase()}
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.rateUnavailableText}>
                        {t('recyclerMatching.offerUnavailable')}
                      </Text>
                    )}
                  </View>

                  {/* Pickup Badge */}
                  <View
                    style={[
                      styles.pickupBadge,
                      match.pickupAvailability === 'AVAILABLE'
                        ? styles.pickupBadgeAvailable
                        : match.pickupAvailability === 'NOT_AVAILABLE'
                        ? styles.pickupBadgeDropoff
                        : styles.pickupBadgeUnknown,
                      { flexDirection: 'row', alignItems: 'center', gap: 4 }
                    ]}
                  >
                    <AppIcon
                      name={match.pickupAvailability === 'AVAILABLE' ? 'truck' : 'factory'}
                      size={12}
                      color="#FFFFFF"
                    />
                    <Text style={styles.pickupBadgeText}>
                      {match.pickupAvailability === 'AVAILABLE'
                        ? t('recyclerMatching.pickupAvailable')
                        : match.pickupAvailability === 'NOT_AVAILABLE'
                        ? t('recyclerMatching.pickupUnavailable')
                        : t('recyclerMatching.pickupUnknown')}
                    </Text>
                  </View>
                </View>

                {/* Match Reasons Checklist */}
                <View style={styles.reasonsContainer}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <AppIcon name="document" size={13} color="#10B981" />
                    <Text style={styles.reasonsHeader}>
                      {t('recyclerMatching.matchReasons')}:
                    </Text>
                  </View>
                  {match.matchReasons.map((reason, idx) => (
                    <Text key={idx} style={styles.reasonText}>
                      {reason}
                    </Text>
                  ))}
                </View>

                {/* Card Actions: Speak Audio & View Recycler Details */}
                <View style={styles.cardActionsRow}>
                  <TouchableOpacity
                    style={styles.viewDetailButton}
                    onPress={() => navigation?.navigate('CollectorRecyclerDetail', {
                      recyclerId: match.recyclerId,
                      lotId: lotId,
                      preselectedCategory: activeLot?.category,
                    })}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={t('recyclerDirectory.viewDetails') || 'View Recycler Details'}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <AppIcon name="factory" size={14} color="#10B981" />
                      <Text style={styles.viewDetailButtonText}>
                        {t('recyclerDirectory.viewDetails') || 'View Recycler Details'}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.speakButton}
                    onPress={() => handleSpeakMatch(match)}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={t('recyclerMatching.speakMatch')}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <AppIcon name="volume" size={14} color="#34D399" />
                      <Text style={styles.speakButtonText}>
                        {isSpeaking ? 'Speaking...' : t('recyclerMatching.speakMatch')}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          {/* Methodology Disclosure & Disclaimer */}
          <View style={styles.methodologyFooter}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <AppIcon name="info" size={13} color="#94A3B8" />
              <Text style={styles.methodologyText}>
                {t('recyclerMatching.methodologyDisclosure')}
              </Text>
            </View>
            <Text style={styles.disclaimerText}>
              {t('recyclerMatching.nonGuaranteeDisclaimer')}
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
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: space.md,
    paddingBottom: space.xl * 2,
  },
  cacheBanner: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderColor: '#3B82F6',
    borderWidth: 1,
    borderRadius: 10,
    padding: space.sm,
    marginBottom: space.sm,
  },
  staleBanner: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderColor: '#F59E0B',
  },
  cacheBannerText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  lotHeaderCard: {
    backgroundColor: 'rgba(15, 35, 40, 0.85)',
    borderRadius: 18,
    padding: space.md,
    marginBottom: space.md,
    borderWidth: 1.5,
    borderColor: 'rgba(20, 184, 166, 0.35)',
  },
  lotHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(20, 184, 166, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: space.sm,
  },
  categoryIcon: {
    fontSize: 26,
  },
  lotHeaderTextContainer: {
    flex: 1,
  },
  lotRefText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  lotCategoryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary || '#14B8A6',
    marginTop: 2,
  },
  lotWeightText: {
    fontSize: 12,
    color: colors.textSecondary || '#94A3B8',
    marginTop: 2,
  },
  marketEstimateBox: {
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    borderRadius: 12,
    padding: space.sm,
    marginTop: space.sm,
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.25)',
  },
  marketEstimateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  marketEstimateTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  marketEstimateRange: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary || '#14B8A6',
  },
  marketEstimateDisclaimer: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.65)',
    marginTop: 3,
    lineHeight: 14,
  },
  viewQuotesBanner: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10B981',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: space.sm,
    alignItems: 'center',
  },
  viewQuotesBannerText: {
    color: '#34D399',
    fontSize: 13,
    fontWeight: '700',
  },
  sortBarContainer: {

    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: space.md,
  },
  sortBarLabel: {
    fontSize: 13,
    color: colors.textSecondary || '#94A3B8',
    marginRight: space.xs,
    fontWeight: '600',
  },
  sortButtonsRow: {
    flexDirection: 'row',
    flex: 1,
    gap: 6,
  },
  sortButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    paddingVertical: 8,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  sortButtonActive: {
    backgroundColor: 'rgba(20, 184, 166, 0.25)',
    borderColor: colors.primary || '#14B8A6',
  },
  sortButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.75)',
  },
  sortButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  loadingContainer: {
    padding: space.xl,
    alignItems: 'center',
  },
  loadingText: {
    color: colors.textSecondary || '#94A3B8',
    fontSize: 13,
    marginTop: space.sm,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: 12,
    padding: space.md,
    marginBottom: space.md,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: space.sm,
  },
  retryButton: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: space.md,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: 'rgba(15, 35, 40, 0.75)',
    borderRadius: 16,
    padding: space.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: space.sm,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: space.xs,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 13,
    color: colors.textSecondary || '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
  },
  matchCard: {
    backgroundColor: 'rgba(15, 35, 40, 0.85)',
    borderRadius: 16,
    padding: space.md,
    marginBottom: space.md,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  matchCardMatched: {
    borderColor: 'rgba(16, 185, 129, 0.5)',
  },
  matchCardPartial: {
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: space.sm,
  },
  cardTitleContainer: {
    flex: 1,
    marginRight: space.xs,
  },
  facilityNameText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  locationSubText: {
    fontSize: 12,
    color: colors.textSecondary || '#94A3B8',
    marginTop: 2,
  },
  badgesColumn: {
    alignItems: 'flex-end',
    gap: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusBadgeMatched: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: '#10B981',
    borderWidth: 1,
  },
  statusBadgePartial: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderColor: '#F59E0B',
    borderWidth: 1,
  },
  statusBadgeIneligible: {
    backgroundColor: 'rgba(148, 163, 184, 0.2)',
    borderColor: '#94A3B8',
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  authBadge: {
    backgroundColor: 'rgba(20, 184, 166, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  authBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary || '#14B8A6',
  },
  rateAndPickupSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: space.sm,
    marginBottom: space.sm,
  },
  rateBox: {
    flex: 1,
  },
  rateLabel: {
    fontSize: 11,
    color: colors.textSecondary || '#94A3B8',
  },
  rateValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 2,
  },
  rateAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary || '#14B8A6',
  },
  rateUnit: {
    fontSize: 12,
    color: colors.textSecondary || '#94A3B8',
    marginLeft: 4,
  },
  rateUnavailableText: {
    fontSize: 13,
    color: '#F59E0B',
    fontWeight: '600',
    marginTop: 2,
  },
  pickupBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  pickupBadgeAvailable: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: '#10B981',
    borderWidth: 1,
  },
  pickupBadgeDropoff: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: '#F59E0B',
    borderWidth: 1,
  },
  pickupBadgeUnknown: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
  },
  pickupBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  reasonsContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 10,
    padding: space.sm,
    marginBottom: space.sm,
  },
  reasonsHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 16,
  },
  cardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  viewDetailButton: {
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    borderColor: '#38BDF8',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewDetailButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38BDF8',
  },
  speakButton: {
    backgroundColor: 'rgba(20, 184, 166, 0.2)',
    borderColor: colors.primary || '#14B8A6',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  speakButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary || '#14B8A6',
  },
  methodologyFooter: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: space.md,
    marginTop: space.sm,
  },
  methodologyText: {
    fontSize: 11,
    color: colors.textSecondary || '#94A3B8',
    lineHeight: 16,
    marginBottom: 4,
  },
  disclaimerText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.5)',
    fontStyle: 'italic',
    lineHeight: 14,
  },
});
