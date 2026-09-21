/**
 * CollectorPriceBoardScreen.tsx
 * Authenticated INFORMAL_COLLECTOR — Price Discovery & Price History Board
 *
 * Requirements:
 * SIH-PRICE-001: Price Board showing buying rates per material category and location
 * SIH-PRICE-002: Offline Price Board with cached prices and 24h staleness detection
 * SIH-PRICE-006: Accessible Voice/TTS price readout for low-literacy collectors
 * SIH-PRICE-007: Clear unit badges (/ kg, / unit, / lot)
 * SIH-PRICE-008: Freshness metadata & update timestamp indicators
 * SIH-PRICE-009: Strict Anti-Fabrication: Displays legitimate empty state when no data exists
 * SIH-PRICE-010: Historical price records retention and querying
 * SIH-PRICE-011: Historical price queries with filtering & pagination
 * SIH-PRICE-012: Basic deterministic trend calculation (weekly/monthly, average, min, max, change)
 * SIH-PRICE-013: Transparent trend methodology disclosure (explicit non-prediction declaration)
 * SIH-PRICE-014: Visual chart breakdown, offline history caching & accessible trend voice readout
 *
 * Canonical Reference: docs/25_SIH_26229_REQUIREMENTS.md Section 4 Modules 3 & 4
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useI18n } from '../../i18n';
import { useNetwork } from '../../hooks/useNetwork';
import { TopAppBar } from '../../components/layout/TopAppBar';
import { EcoSetuBackground } from '../../components/eco';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import {
  priceService,
  PriceRecord,
  PriceBoardData,
  PriceHistoryResponse,
  PricePeriodTrend,
} from '../../services/priceService';
import { voiceService } from '../../services/voiceService';
import { MATERIAL_TAXONOMY, MaterialCategoryDef } from '../../config/materialTaxonomy';

const space = {
  xs: spacing.spaceXs,
  sm: spacing.spaceSm,
  md: spacing.spaceMd,
  lg: spacing.spaceLg,
  xl: spacing.spaceXl,
};

interface CollectorPriceBoardScreenProps {
  navigation?: any;
  route?: any;
}

export const CollectorPriceBoardScreen: React.FC<CollectorPriceBoardScreenProps> = ({
  navigation,
  route,
}) => {
  const { t, language } = useI18n();
  const { isConnected } = useNetwork();

  // Active Tab: Current Rates vs Price History
  const [activeTab, setActiveTab] = useState<'CURRENT' | 'HISTORY'>('CURRENT');

  // Common Filter State
  const [selectedCategory, setSelectedCategory] = useState<string>(
    route?.params?.preselectedCategory || 'ALL'
  );
  const [selectedLocation, setSelectedLocation] = useState<string>(
    route?.params?.preselectedLocation || 'ALL'
  );

  // ── CURRENT RATES STATE ──
  const [priceData, setPriceData] = useState<PriceBoardData>({
    location: 'ALL',
    prices: [],
    count: 0,
    lastUpdatedAt: new Date().toISOString(),
    isCached: false,
    isStale: false,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  // ── PRICE HISTORY STATE (SIH-PRICE-010..014) ──
  const [historyPeriod, setHistoryPeriod] = useState<'MONTHLY' | 'WEEKLY'>('MONTHLY');
  const [historyData, setHistoryData] = useState<PriceHistoryResponse | null>(null);
  const [isHistoryLoading, setIsHistoryLoading] = useState<boolean>(false);

  // Category keys for horizontal chip bar
  const categoryKeys = useMemo(() => {
    return ['ALL', ...Object.keys(MATERIAL_TAXONOMY)];
  }, []);

  // Fetch Current Prices
  const fetchPrices = useCallback(async () => {
    try {
      const data = await priceService.getPriceBoard({
        category: selectedCategory === 'ALL' ? undefined : selectedCategory,
        location: selectedLocation === 'ALL' ? undefined : selectedLocation,
      });
      setPriceData(data);
    } catch (err) {
      console.warn('[CollectorPriceBoard] Fetch failed:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedCategory, selectedLocation]);

  // Fetch Price History & Trends
  const fetchHistory = useCallback(async () => {
    try {
      setIsHistoryLoading(true);
      const histCategory = selectedCategory === 'ALL' ? undefined : selectedCategory;
      const data = await priceService.getHistoricalPrices({
        category: histCategory,
        location: selectedLocation === 'ALL' ? undefined : selectedLocation,
        period: historyPeriod,
        limit: 30,
      });
      setHistoryData(data);
    } catch (err) {
      console.warn('[CollectorPriceBoard] History fetch failed:', err);
    } finally {
      setIsHistoryLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedCategory, selectedLocation, historyPeriod]);

  useEffect(() => {
    if (activeTab === 'CURRENT') {
      setIsLoading(true);
      fetchPrices();
    } else {
      fetchHistory();
    }
  }, [activeTab, fetchPrices, fetchHistory]);

  const onRefresh = () => {
    setIsRefreshing(true);
    if (activeTab === 'CURRENT') {
      fetchPrices();
    } else {
      fetchHistory();
    }
  };

  // ── TTS SPEAK HANDLERS ──
  const handleSpeakPrice = async (item: PriceRecord) => {
    try {
      setSpeakingId(item.id);
      const categoryConfig = MATERIAL_TAXONOMY[item.category];
      const categoryName = categoryConfig
        ? (t(categoryConfig.i18nKey as any) || categoryConfig.defaultName)
        : item.category;

      const speechText = priceService.generateSpeechText(categoryName, item, language);
      await voiceService.speak(speechText, { force: true, language });
    } catch (err) {
      console.warn('[CollectorPriceBoard] TTS failed:', err);
    } finally {
      setTimeout(() => setSpeakingId(null), 1500);
    }
  };

  const handleSpeakHistoryTrend = async () => {
    try {
      setSpeakingId('TREND');
      const categoryConfig = MATERIAL_TAXONOMY[selectedCategory];
      const categoryName = categoryConfig
        ? (t(categoryConfig.i18nKey as any) || categoryConfig.defaultName)
        : (t('priceBoard.allCategories') || 'All Materials');

      const speechText = priceService.generateHistorySpeechText(categoryName, historyData, language);
      await voiceService.speak(speechText, { force: true, language });
    } catch (err) {
      console.warn('[CollectorPriceBoard] History TTS failed:', err);
    } finally {
      setTimeout(() => setSpeakingId(null), 1500);
    }
  };

  const handleSpeakEmpty = async () => {
    try {
      setSpeakingId('EMPTY');
      const speechText = priceService.generateSpeechText(
        t('priceBoard.noDataTitle') || 'No Price Data',
        null,
        language
      );
      await voiceService.speak(speechText, { force: true, language });
    } catch (err) {
      console.warn('[CollectorPriceBoard] TTS failed:', err);
    } finally {
      setTimeout(() => setSpeakingId(null), 1500);
    }
  };

  // Unit string
  const renderUnitLabel = (unit: string) => {
    switch (unit) {
      case 'PER_KG':
        return t('priceBoard.unitPerKg') || '/ kg';
      case 'PER_UNIT':
        return t('priceBoard.unitPerUnit') || '/ unit';
      case 'PER_LOT':
        return t('priceBoard.unitPerLot') || '/ lot';
      default:
        return '/ kg';
    }
  };

  // Freshness string
  const renderFreshnessText = (isoDate: string) => {
    if (!isoDate) return '';
    try {
      const diffMs = Date.now() - new Date(isoDate).getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours < 1) return t('priceBoard.updatedToday') || 'Updated today';
      if (diffHours < 24) return (t('priceBoard.updatedHoursAgo') || 'Updated {{hours}}h ago').replace('{{hours}}', String(diffHours));
      const diffDays = Math.floor(diffHours / 24);
      return (t('priceBoard.updatedDaysAgo') || 'Updated {{days}}d ago').replace('{{days}}', String(diffDays));
    } catch {
      return '';
    }
  };

  // ── RENDER CURRENT PRICE CARD ──
  const renderPriceCard = ({ item }: { item: PriceRecord }) => {
    const categoryConfig = MATERIAL_TAXONOMY[item.category];
    const categoryName = categoryConfig
      ? (t(categoryConfig.i18nKey as any) || categoryConfig.defaultName)
      : item.category;
    const symbol = categoryConfig?.symbol || '📦';
    const isSpeakingThis = speakingId === item.id;

    const hasRange =
      item.marketRangeLow !== null &&
      item.marketRangeHigh !== null &&
      item.marketRangeLow !== item.marketRangeHigh;

    return (
      <View style={styles.priceCard}>
        <View style={styles.cardHeader}>
          <View style={styles.categoryInfo}>
            <Text style={styles.categorySymbol}>{symbol}</Text>
            <View style={styles.categoryTextCol}>
              <Text style={styles.categoryTitle}>{categoryName}</Text>
              {item.subcategory && (
                <Text style={styles.subcategorySubtitle}>{item.subcategory}</Text>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.speakButton, isSpeakingThis && styles.speakButtonActive]}
            onPress={() => handleSpeakPrice(item)}
            accessibilityRole="button"
            accessibilityLabel={`${t('priceBoard.speakPrice') || 'Speak Price'} ${categoryName}`}
            activeOpacity={0.7}
          >
            <Text style={styles.speakButtonText}>
              {isSpeakingThis ? '🔊 ...' : '🔊 ' + (t('priceBoard.speakPriceButton') || 'Speak')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.priceRow}>
          <View style={styles.priceContainer}>
            {hasRange ? (
              <View>
                <Text style={styles.priceRangeLabel}>{t('priceBoard.marketRange') || 'Market Range'}</Text>
                <Text style={styles.priceRangeText}>
                  ₹{item.marketRangeLow} – ₹{item.marketRangeHigh}
                  <Text style={styles.unitText}> {renderUnitLabel(item.unit)}</Text>
                </Text>
              </View>
            ) : (
              <View>
                <Text style={styles.priceRangeLabel}>{t('priceBoard.buyingPrice') || 'Buying Price'}</Text>
                <Text style={styles.priceValueText}>
                  ₹{item.buyingPrice}
                  <Text style={styles.unitText}> {renderUnitLabel(item.unit)}</Text>
                </Text>
              </View>
            )}
          </View>

          <View style={styles.sourceBadge}>
            <Text style={styles.sourceBadgeText}>
              {item.source === 'ADMIN_VERIFIED'
                ? '🏛️ ' + (t('priceBoard.dataSourceAdmin') || 'Verified')
                : item.source === 'RECYCLER_OFFER'
                ? '🏭 ' + (t('priceBoard.dataSourceRecycler') || 'Recycler')
                : '📊 ' + (t('priceBoard.dataSourceImported') || 'Market')}
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.footerMetaText}>
            📍 {item.location === 'ALL' ? 'All India' : item.location}
          </Text>
          <Text style={styles.footerMetaText}>
            ⏱️ {renderFreshnessText(item.lastUpdatedAt || item.effectiveDate)}
          </Text>
        </View>
      </View>
    );
  };

  // ── RENDER PRICE HISTORY VIEW (SIH-PRICE-010..014) ──
  const renderHistoryView = () => {
    if (isHistoryLoading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{t('common.loading') || 'Loading historical data...'}</Text>
        </View>
      );
    }

    const trends = historyData?.trends;
    const periods = trends?.periods || [];
    const hasData = trends?.hasSufficientData || false;
    const maxAvg = periods.length > 0 ? Math.max(...periods.map((p) => p.averagePrice)) : 1;

    return (
      <ScrollView
        contentContainerStyle={styles.historyScrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Offline / Stale Banner for History */}
        {historyData?.isStale && (
          <View style={styles.staleBanner}>
            <Text style={styles.staleBannerText}>
              ⚠️ {t('priceBoard.staleDataBanner') || 'Price data is more than 24 hours old'}.{' '}
              {t('priceBoard.staleDataWarning') || 'Please refresh when online.'}
            </Text>
          </View>
        )}
        {!isConnected && historyData?.isCached && !historyData?.isStale && (
          <View style={styles.cachedBanner}>
            <Text style={styles.cachedBannerText}>
              📱 {t('priceBoard.offlineBanner') || 'You are offline. Showing cached historical rates.'}
            </Text>
          </View>
        )}

        {/* Period Selector (Weekly vs Monthly) */}
        <View style={styles.periodToggleRow}>
          <Text style={styles.periodLabel}>{t('priceBoard.periodSelector') || 'Time Period'}:</Text>
          <View style={styles.periodBtnGroup}>
            <TouchableOpacity
              style={[styles.periodBtn, historyPeriod === 'WEEKLY' && styles.periodBtnActive]}
              onPress={() => setHistoryPeriod('WEEKLY')}
              activeOpacity={0.8}
            >
              <Text style={[styles.periodBtnText, historyPeriod === 'WEEKLY' && styles.periodBtnTextActive]}>
                {t('priceBoard.periodWeekly') || 'Weekly'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.periodBtn, historyPeriod === 'MONTHLY' && styles.periodBtnActive]}
              onPress={() => setHistoryPeriod('MONTHLY')}
              activeOpacity={0.8}
            >
              <Text style={[styles.periodBtnText, historyPeriod === 'MONTHLY' && styles.periodBtnTextActive]}>
                {t('priceBoard.periodMonthly') || 'Monthly'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Trend Summary Card */}
        <View style={styles.trendSummaryCard}>
          <View style={styles.trendHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.trendCardTitle}>
                {t('priceBoard.historyTitle') || 'Historical Trend'}
              </Text>
              <Text style={styles.trendCardSubtitle}>
                {t('priceBoard.historySubtitle') || 'Observed scrap buying rates over time'}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.speakButton, speakingId === 'TREND' && styles.speakButtonActive]}
              onPress={handleSpeakHistoryTrend}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t('priceBoard.speakTrendButton') || 'Speak Trend'}
            >
              <Text style={styles.speakButtonText}>
                {speakingId === 'TREND' ? '🔊 ...' : t('priceBoard.speakTrendButton') || '🔊 Speak Trend'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Trend Direction Badge */}
          <View style={styles.trendBadgeRow}>
            {hasData ? (
              <View
                style={[
                  styles.trendBadge,
                  trends?.trendDirection === 'UP' && styles.trendBadgeUp,
                  trends?.trendDirection === 'DOWN' && styles.trendBadgeDown,
                  trends?.trendDirection === 'STABLE' && styles.trendBadgeStable,
                ]}
              >
                <Text style={styles.trendBadgeText}>
                  {trends?.trendDirection === 'UP'
                    ? `📈 ${t('priceBoard.trendUp') || 'Trending Up'} (+₹${trends.absoluteChange} / ${trends.percentageChange}%)`
                    : trends?.trendDirection === 'DOWN'
                    ? `📉 ${t('priceBoard.trendDown') || 'Trending Down'} (-₹${Math.abs(trends.absoluteChange || 0)} / ${trends.percentageChange}%)`
                    : `➡️ ${t('priceBoard.trendStable') || 'Stable Price'}`}
                </Text>
              </View>
            ) : (
              <View style={[styles.trendBadge, styles.trendBadgeInsufficient]}>
                <Text style={styles.trendBadgeText}>
                  ℹ️ {t('priceBoard.trendInsufficient') || 'Insufficient Data for Trend'}
                </Text>
              </View>
            )}
          </View>

          {/* Metric Stats Grid */}
          <View style={styles.trendMetricsRow}>
            <View style={styles.trendMetricCol}>
              <Text style={styles.trendMetricLabel}>{t('priceBoard.latestAverage') || 'Latest Avg'}</Text>
              <Text style={styles.trendMetricValue}>
                {trends?.latestPeriodAverage !== null ? `₹${trends?.latestPeriodAverage}` : '—'}
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}> / kg</Text>
              </Text>
            </View>

            <View style={styles.trendMetricCol}>
              <Text style={styles.trendMetricLabel}>{t('priceBoard.previousAverage') || 'Prev Avg'}</Text>
              <Text style={styles.trendMetricValue}>
                {trends?.previousPeriodAverage !== null ? `₹${trends?.previousPeriodAverage}` : '—'}
                <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}> / kg</Text>
              </Text>
            </View>

            <View style={styles.trendMetricCol}>
              <Text style={styles.trendMetricLabel}>{t('priceBoard.totalObservations') || 'Data Points'}</Text>
              <Text style={styles.trendMetricValue}>{trends?.totalObservations ?? 0}</Text>
            </View>
          </View>

          {/* Strict Non-Prediction Methodology Disclosure (SIH-PRICE-013) */}
          <View style={styles.methodologyBox}>
            <Text style={styles.methodologyBadge}>
              ℹ️ {t('priceBoard.methodologyLabel') || 'HISTORICAL TREND'}
            </Text>
            <Text style={styles.methodologyText}>
              {t('priceBoard.methodologyNotice') ||
                'Based on actual observed market prices. This is not a future price forecast or guarantee.'}
            </Text>
          </View>
        </View>

        {/* Lightweight Visual Chart Breakdown (SIH-PRICE-014) */}
        <View style={styles.chartSection}>
          <Text style={styles.chartTitle}>{t('priceBoard.chartTitle') || 'Observed Price History'}</Text>

          {periods.length === 0 ? (
            /* Explicit empty / insufficient-data state (SIH-PRICE-011, SIH-PRICE-013) */
            <View style={styles.insufficientCard}>
              <Text style={{ fontSize: 36, marginBottom: space.sm }}>📊</Text>
              <Text style={styles.insufficientTitle}>
                {t('priceBoard.insufficientDataTitle') || 'Not Enough Historical Data'}
              </Text>
              <Text style={styles.insufficientMessage}>
                {t('priceBoard.insufficientDataMessage') ||
                  'Historical trends appear when multiple verified market records exist over time.'}
              </Text>
            </View>
          ) : (
            periods.map((p) => {
              const fillPct = Math.max(15, Math.min(100, Math.round((p.averagePrice / maxAvg) * 100)));

              return (
                <View key={p.periodKey} style={styles.chartRow}>
                  <View style={styles.chartRowHeader}>
                    <Text style={styles.periodNameText}>{p.label}</Text>
                    <Text style={styles.periodAvgPrice}>₹{p.averagePrice} / kg</Text>
                  </View>

                  {/* Proportional visual bar */}
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${fillPct}%` }]} />
                  </View>

                  <View style={styles.chartRowFooter}>
                    <Text style={styles.minMaxText}>
                      {(t('priceBoard.chartMinMax') || 'Min: ₹{{min}} · Max: ₹{{max}}')
                        .replace('{{min}}', String(p.minPrice))
                        .replace('{{max}}', String(p.maxPrice))}
                    </Text>
                    <Text style={styles.observationCountText}>
                      {p.observationCount} {t('priceBoard.totalObservations') || 'points'}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <EcoSetuBackground />
      <TopAppBar
        title={t('priceBoard.title') || 'Price Board'}
        subtitle={
          activeTab === 'CURRENT'
            ? t('priceBoard.subtitle') || 'Current scrap buying rates'
            : t('priceBoard.historySubtitle') || 'Observed scrap buying rates over time'
        }
        showBack={true}
        onBack={() => navigation?.goBack()}
      />

      {/* Segmented Tab Switcher: Current Rates vs Price History */}
      <View style={styles.segmentContainer}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'CURRENT' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('CURRENT')}
          activeOpacity={0.8}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'CURRENT' }}
        >
          <Text style={[styles.segmentText, activeTab === 'CURRENT' && styles.segmentTextActive]}>
            📊 {t('priceBoard.tabCurrent') || 'Current Rates'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'HISTORY' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('HISTORY')}
          activeOpacity={0.8}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'HISTORY' }}
        >
          <Text style={[styles.segmentText, activeTab === 'HISTORY' && styles.segmentTextActive]}>
            📈 {t('priceBoard.tabHistory') || 'Price History'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Horizontal Category Filter */}
      <View style={styles.filterSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {categoryKeys.map((catKey) => {
            const isSelected = selectedCategory === catKey;
            const config = catKey === 'ALL' ? null : MATERIAL_TAXONOMY[catKey];
            const name = catKey === 'ALL'
              ? (t('priceBoard.allCategories') || 'All Categories')
              : config
              ? (t(config.i18nKey as any) || config.defaultName)
              : catKey;
            const symbol = catKey === 'ALL' ? '🌐' : config?.symbol || '📦';

            return (
              <TouchableOpacity
                key={catKey}
                style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
                onPress={() => setSelectedCategory(catKey)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={name}
              >
                <Text style={styles.chipSymbol}>{symbol}</Text>
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                  {name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main View Router */}
      {activeTab === 'HISTORY' ? (
        renderHistoryView()
      ) : (
        /* CURRENT RATES VIEW */
        <View style={{ flex: 1 }}>
          {/* Offline Stale Warning Banner (SIH-PRICE-002) */}
          {priceData.isStale && (
            <View style={styles.staleBanner}>
              <Text style={styles.staleBannerText}>
                ⚠️ {t('priceBoard.staleDataBanner') || 'Price data is more than 24 hours old'}.{' '}
                {t('priceBoard.staleDataWarning') || 'Please refresh when online.'}
              </Text>
            </View>
          )}

          {/* Cached Data (Non-stale) Banner */}
          {!isConnected && !priceData.isStale && priceData.isCached && (
            <View style={styles.cachedBanner}>
              <Text style={styles.cachedBannerText}>
                📱 {t('priceBoard.offlineBanner') || 'You are offline. Showing last known prices.'}
              </Text>
            </View>
          )}

          {/* Location Bar / Info */}
          <View style={styles.locationBar}>
            <Text style={styles.locationBarText}>
              📍 {t('priceBoard.location') || 'Location'}: {selectedLocation === 'ALL' ? 'All India (National Baseline)' : selectedLocation}
            </Text>
            {isConnected && !priceData.isCached && (
              <View style={styles.liveBadge}>
                <Text style={styles.liveBadgeText}>🟢 {t('priceBoard.freshDataLabel') || 'Live'}</Text>
              </View>
            )}
          </View>

          {/* Rates List / State Display */}
          {isLoading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>{t('common.loading') || 'Loading rates...'}</Text>
            </View>
          ) : priceData.prices.length === 0 ? (
            <ScrollView
              contentContainerStyle={styles.emptyContainer}
              refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            >
              <Text style={styles.emptyIcon}>📊</Text>
              <Text style={styles.emptyTitle}>
                {t('priceBoard.noDataTitle') || 'No Price Data Available'}
              </Text>
              <Text style={styles.emptyMessage}>
                {t('priceBoard.noDataMessage') ||
                  'Price information will appear when verified market data is available.'}
              </Text>

              <TouchableOpacity
                style={styles.emptySpeakButton}
                onPress={handleSpeakEmpty}
                accessibilityRole="button"
                accessibilityLabel={t('priceBoard.speakPrice') || 'Speak'}
                activeOpacity={0.7}
              >
                <Text style={styles.emptySpeakButtonText}>
                  🔊 {t('priceBoard.speakPrice') || 'Speak Announcement'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.refreshButton}
                onPress={onRefresh}
                activeOpacity={0.8}
              >
                <Text style={styles.refreshButtonText}>
                  🔄 {t('priceBoard.refreshPrices') || 'Refresh Prices'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          ) : (
            <FlatList
              data={priceData.prices}
              keyExtractor={(item) => item.id}
              renderItem={renderPriceCard}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={onRefresh}
                  tintColor={colors.primary}
                />
              }
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#041316',
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginHorizontal: space.md,
    marginTop: space.sm,
    marginBottom: space.xs,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentBtnActive: {
    backgroundColor: colors.primary,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  segmentTextActive: {
    color: '#041316',
    fontWeight: '700',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: space.xl,
  },
  loadingText: {
    marginTop: space.md,
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
  staleBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: '#ef4444',
    borderWidth: 1,
    marginHorizontal: space.md,
    marginTop: space.sm,
    padding: space.sm,
    borderRadius: 8,
  },
  staleBannerText: {
    color: '#fca5a5',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  cachedBanner: {
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    borderColor: '#eab308',
    borderWidth: 1,
    marginHorizontal: space.md,
    marginTop: space.sm,
    padding: space.sm,
    borderRadius: 8,
  },
  cachedBannerText: {
    color: '#fde047',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  filterSection: {
    paddingVertical: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  categoryScroll: {
    paddingHorizontal: space.md,
    gap: space.xs,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.md,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    marginRight: 6,
    minHeight: 48,
    justifyContent: 'center',
  },
  categoryChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipSymbol: {
    fontSize: 14,
    marginRight: 6,
  },
  chipText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#041316',
    fontWeight: '700',
  },
  locationBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  locationBarText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  liveBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  liveBadgeText: {
    fontSize: 10,
    color: '#4ade80',
    fontWeight: '600',
  },
  listContent: {
    padding: space.md,
    paddingBottom: space.xl * 2,
  },
  priceCard: {
    backgroundColor: 'rgba(16, 42, 46, 0.75)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: space.md,
    marginBottom: space.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: space.sm,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categorySymbol: {
    fontSize: 28,
    marginRight: space.sm,
  },
  categoryTextCol: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  subcategorySubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 1,
  },
  speakButton: {
    backgroundColor: 'rgba(0, 201, 167, 0.15)',
    borderColor: colors.primary,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    minHeight: 48,
    minWidth: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  speakButtonActive: {
    backgroundColor: colors.primary,
  },
  speakButtonText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginVertical: space.xs,
    paddingVertical: space.xs,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  priceContainer: {
    flex: 1,
  },
  priceRangeLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  priceRangeText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#34d399',
  },
  priceValueText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#34d399',
  },
  unitText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  sourceBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sourceBadgeText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: space.sm,
  },
  footerMetaText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: space.xl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: space.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: space.sm,
  },
  emptyMessage: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: space.xl,
  },
  emptySpeakButton: {
    backgroundColor: 'rgba(0, 201, 167, 0.15)',
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: 24,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: space.md,
  },
  emptySpeakButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  refreshButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: 24,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },

  // ── HISTORY STYLES ──
  historyScrollContent: {
    padding: space.md,
    paddingBottom: space.xl * 2,
  },
  periodToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.md,
  },
  periodLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    fontWeight: '600',
  },
  periodBtnGroup: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    padding: 3,
  },
  periodBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  periodBtnActive: {
    backgroundColor: colors.primary,
  },
  periodBtnText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
  },
  periodBtnTextActive: {
    color: '#041316',
    fontWeight: '700',
  },
  trendSummaryCard: {
    backgroundColor: 'rgba(16, 42, 46, 0.85)',
    borderRadius: 14,
    padding: space.md,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.3)',
    marginBottom: space.md,
  },
  trendHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: space.sm,
  },
  trendCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  trendCardSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 2,
  },
  trendBadgeRow: {
    marginVertical: space.xs,
  },
  trendBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  trendBadgeUp: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  trendBadgeDown: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  trendBadgeStable: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  trendBadgeInsufficient: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  trendBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  trendMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 10,
    padding: space.sm,
    marginVertical: space.sm,
  },
  trendMetricCol: {
    flex: 1,
    alignItems: 'center',
  },
  trendMetricLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.5)',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  trendMetricValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#34d399',
  },
  methodologyBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 8,
    padding: space.xs + 2,
    marginTop: space.xs,
  },
  methodologyBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FBBF24',
    marginBottom: 2,
  },
  methodologyText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 14,
  },
  chartSection: {
    backgroundColor: 'rgba(16, 42, 46, 0.65)',
    borderRadius: 14,
    padding: space.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: space.sm,
  },
  chartRow: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 10,
    padding: space.sm,
    marginBottom: space.sm,
  },
  chartRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  periodNameText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  periodAvgPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#34d399',
  },
  barTrack: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: 4,
  },
  barFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  chartRowFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  minMaxText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  observationCountText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  insufficientCard: {
    padding: space.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insufficientTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: space.xs,
  },
  insufficientMessage: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default CollectorPriceBoardScreen;
