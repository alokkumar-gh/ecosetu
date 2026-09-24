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
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useI18n } from '../../i18n';
import { useNetwork } from '../../hooks/useNetwork';
import { TopAppBar } from '../../components/layout/TopAppBar';
import { EcoSetuBackground } from '../../components/glass/EcoSetuBackground';
import { colors } from '../../theme/colors';
import {
  priceService,
  PriceRecord,
  PriceBoardData,
  PriceHistoryResponse,
} from '../../services/priceService';
import { voiceService } from '../../services/voiceService';
import { MATERIAL_TAXONOMY } from '../../config/materialTaxonomy';

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
  const [selectedLocation] = useState<string>(
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
            <View style={styles.symbolBadge}>
              <Text style={styles.categorySymbol}>{symbol}</Text>
            </View>
            <View style={styles.categoryTextCol}>
              <Text style={styles.categoryTitle} numberOfLines={1}>{categoryName}</Text>
              {item.subcategory ? (
                <Text style={styles.subcategorySubtitle} numberOfLines={1}>{item.subcategory}</Text>
              ) : null}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.speakButton, isSpeakingThis && styles.speakButtonActive]}
            onPress={() => handleSpeakPrice(item)}
            accessibilityRole="button"
            accessibilityLabel={`${t('priceBoard.speakPrice') || 'Speak Price'} ${categoryName}`}
            activeOpacity={0.7}
          >
            <Text style={[styles.speakButtonText, isSpeakingThis && styles.speakButtonTextActive]}>
              {isSpeakingThis ? '🔊 ...' : '🔊 ' + (t('priceBoard.speakPriceButton') || 'Speak')}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.priceRow}>
          <View style={styles.priceContainer}>
            {hasRange ? (
              <View>
                <Text style={styles.priceRangeLabel}>{t('priceBoard.marketRange') || 'Market Range'}</Text>
                <View style={styles.priceValueRow}>
                  <Text style={styles.priceRangeText}>₹{item.marketRangeLow} – ₹{item.marketRangeHigh}</Text>
                  <Text style={styles.unitText}> {renderUnitLabel(item.unit)}</Text>
                </View>
              </View>
            ) : (
              <View>
                <Text style={styles.priceRangeLabel}>{t('priceBoard.buyingPrice') || 'Buying Price'}</Text>
                <View style={styles.priceValueRow}>
                  <Text style={styles.priceValueText}>₹{item.buyingPrice}</Text>
                  <Text style={styles.unitText}> {renderUnitLabel(item.unit)}</Text>
                </View>
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
          <ActivityIndicator size="large" color="#10B981" />
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
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#10B981"
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
              <Text style={[styles.speakButtonText, speakingId === 'TREND' && styles.speakButtonTextActive]}>
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
                <Text style={styles.metricUnitSmall}> / kg</Text>
              </Text>
            </View>

            <View style={styles.trendMetricCol}>
              <Text style={styles.trendMetricLabel}>{t('priceBoard.priceChange') || 'Change'}</Text>
              <Text
                style={[
                  styles.trendMetricValue,
                  trends?.trendDirection === 'UP' && { color: '#34d399' },
                  trends?.trendDirection === 'DOWN' && { color: '#f87171' },
                ]}
              >
                {trends?.absoluteChange !== null
                  ? `${trends?.absoluteChange && trends.absoluteChange > 0 ? '+' : ''}₹${trends?.absoluteChange}`
                  : '—'}
              </Text>
            </View>
          </View>

          {/* Historical Methodology Disclaimer */}
          <View style={styles.methodologyBox}>
            <Text style={styles.methodologyText}>
              ℹ️ {t('priceBoard.methodologyNotice') ||
                'Observed historical averages calculated from settled marketplace transactions. Not a forward price forecast.'}
            </Text>
          </View>
        </View>

        {/* Chart Breakdown Section */}
        <View style={styles.chartSection}>
          <Text style={styles.chartTitle}>{t('priceBoard.chartTitle') || 'Observed Price History'}</Text>

          {periods.length === 0 ? (
            <View style={styles.insufficientCard}>
              <Text style={{ fontSize: 36, marginBottom: 8 }}>📊</Text>
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
    <EcoSetuBackground>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
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
                ? (t('priceBoard.allCategories') || 'All')
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
                <ActivityIndicator size="large" color="#10B981" />
                <Text style={styles.loadingText}>{t('common.loading') || 'Loading rates...'}</Text>
              </View>
            ) : priceData.prices.length === 0 ? (
              <ScrollView
                contentContainerStyle={styles.emptyContainer}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#10B981" />}
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
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={isRefreshing}
                    onRefresh={onRefresh}
                    tintColor="#10B981"
                  />
                }
              />
            )}
          </View>
        )}
      </SafeAreaView>
    </EcoSetuBackground>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 6,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 10,
  },
  segmentBtnActive: {
    backgroundColor: '#10B981',
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  segmentTextActive: {
    color: '#030C12',
    fontWeight: '800',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
  staleBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.5)',
    borderWidth: 1,
    marginHorizontal: 16,
    marginTop: 8,
    padding: 10,
    borderRadius: 10,
  },
  staleBannerText: {
    color: '#fca5a5',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  cachedBanner: {
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    borderColor: 'rgba(234, 179, 8, 0.4)',
    borderWidth: 1,
    marginHorizontal: 16,
    marginTop: 8,
    padding: 10,
    borderRadius: 10,
  },
  cachedBannerText: {
    color: '#fde047',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  filterSection: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  categoryScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    minHeight: 38,
    justifyContent: 'center',
  },
  categoryChipSelected: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
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
    color: '#030C12',
    fontWeight: '800',
  },
  locationBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  locationBarText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  liveBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  liveBadgeText: {
    fontSize: 10,
    color: '#4ade80',
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  priceCard: {
    backgroundColor: 'rgba(16, 42, 46, 0.65)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.18)',
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  symbolBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(34, 211, 238, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  categorySymbol: {
    fontSize: 20,
  },
  categoryTextCol: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  subcategorySubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.55)',
    marginTop: 2,
  },
  speakButton: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.4)',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    minHeight: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  speakButtonActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  speakButtonText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '700',
  },
  speakButtonTextActive: {
    color: '#030C12',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginVertical: 4,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  priceContainer: {
    flex: 1,
  },
  priceValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceRangeLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.45)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
    fontWeight: '700',
  },
  priceRangeText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#34d399',
  },
  priceValueText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#34d399',
  },
  unitText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.65)',
  },
  sourceBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sourceBadgeText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  footerMetaText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.45)',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  emptySpeakButton: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10B981',
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 12,
  },
  emptySpeakButtonText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '700',
  },
  refreshButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  refreshButtonText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
    fontWeight: '600',
  },
  historyScrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  periodToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  periodLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600',
  },
  periodBtnGroup: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    padding: 3,
  },
  periodBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  periodBtnActive: {
    backgroundColor: '#10B981',
  },
  periodBtnText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '600',
  },
  periodBtnTextActive: {
    color: '#030C12',
    fontWeight: '800',
  },
  trendSummaryCard: {
    backgroundColor: 'rgba(16, 42, 46, 0.7)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.2)',
    padding: 16,
    marginBottom: 16,
  },
  trendHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  trendCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  trendCardSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.55)',
    marginTop: 2,
  },
  trendBadgeRow: {
    marginBottom: 14,
  },
  trendBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  trendBadgeUp: {
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    borderColor: 'rgba(52, 211, 153, 0.4)',
    borderWidth: 1,
  },
  trendBadgeDown: {
    backgroundColor: 'rgba(248, 113, 113, 0.15)',
    borderColor: 'rgba(248, 113, 113, 0.4)',
    borderWidth: 1,
  },
  trendBadgeStable: {
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
    borderColor: 'rgba(148, 163, 184, 0.4)',
    borderWidth: 1,
  },
  trendBadgeInsufficient: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  trendBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  trendMetricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  trendMetricCol: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  trendMetricLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  trendMetricValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  metricUnitSmall: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  methodologyBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    padding: 10,
    borderRadius: 8,
  },
  methodologyText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.45)',
    lineHeight: 15,
  },
  chartSection: {
    backgroundColor: 'rgba(16, 42, 46, 0.7)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.2)',
    padding: 16,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 14,
  },
  insufficientCard: {
    alignItems: 'center',
    padding: 24,
  },
  insufficientTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 6,
  },
  insufficientMessage: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    lineHeight: 16,
  },
  chartRow: {
    marginBottom: 16,
  },
  chartRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  periodNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  periodAvgPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#34d399',
  },
  barTrack: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  barFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  chartRowFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  minMaxText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.45)',
  },
  observationCountText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.45)',
  },
});

export default CollectorPriceBoardScreen;
