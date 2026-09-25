/**
 * AdminHistoricalAnalyticsScreen.tsx
 * EcoSetu — SIH 26229: Historical Analytics & Dataset Insights (Prompt 17)
 *
 * Requirements:
 * - Administrator role only (ROLES.ADMIN)
 * - Factual dataset-driven metrics strictly aggregated from PostgreSQL records
 * - 6 Analytical Dimensions:
 *   1. Historical Prices (Min, Max, Avg, Delta, Provenance, Honest Insufficient Data)
 *   2. Material Activity (Lots by status, category, weight, time-series)
 *   3. Transaction Activity (Quoted vs Final Sale Value vs Amount Paid vs Due, Units)
 *   4. Recycler Activity (Factual counts, Authorization status, Category coverage — NO RANKING)
 *   5. Traceability & Lifecycle (Funnel progression from lots to recycling)
 *   6. Dataset Quality (Empirical completeness percentages)
 * - Zero AI/ML forecasting, zero price predictions, zero synthetic data
 * - Offline-first with AsyncStorage cache and 24h staleness warning
 * - Full vernacular localization (en, hi, mr, or) and TTS integration
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { TopAppBar } from '../../components/layout/TopAppBar';
import { AdminShell } from '../../components/admin/AdminShell';
import { MetricCard } from '../../components/common/MetricCard';
import { OfflineBanner } from '../../components/common/OfflineBanner';
import { analyticsService } from '../../services/analyticsService';
import { useAuth } from '../../hooks/useAuth';
import { useI18n } from '../../i18n';
import { ROLES, MATERIAL_CATEGORIES } from '../../utils/constants';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { ReadAloudButton } from '../../components/voice/ReadAloudButton';

interface Props {
  navigation?: any;
  route?: any;
}

type TabType = 'prices' | 'materials' | 'transactions' | 'recyclers' | 'traceability' | 'quality';
type PeriodType = '7d' | '30d' | '90d' | '1y' | 'all';

export const AdminHistoricalAnalyticsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { user } = useAuth();
  const { t } = useI18n();

  const isAdmin = user?.role === ROLES.ADMIN;

  const [activeTab, setActiveTab] = useState<TabType>(route?.params?.initialTab || 'prices');
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('30d');
  const [selectedCategory, setSelectedCategory] = useState<string>('PCB');

  // Dimension States
  const [pricesData, setPricesData] = useState<any | null>(null);
  const [materialsData, setMaterialsData] = useState<any | null>(null);
  const [transactionsData, setTransactionsData] = useState<any | null>(null);
  const [recyclersData, setRecyclersData] = useState<any | null>(null);
  const [traceabilityData, setTraceabilityData] = useState<any | null>(null);
  const [qualityData, setQualityData] = useState<any | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isCached, setIsCached] = useState<boolean>(false);
  const [isStale, setIsStale] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadTabData = useCallback(
    async (tab: TabType, period: PeriodType, category: string, silent = false) => {
      if (!silent) setIsLoading(true);
      setError(null);

      try {
        if (tab === 'prices') {
          const res = await analyticsService.getHistoricalPrices({
            category,
            period: 'MONTHLY',
          });
          setPricesData(res.data);
          setIsCached(Boolean(res.isCached));
          setIsStale(Boolean(res.isStale));
        } else if (tab === 'materials') {
          const res = await analyticsService.getMaterialActivity({ period });
          setMaterialsData(res.data);
          setIsCached(Boolean(res.isCached));
          setIsStale(Boolean(res.isStale));
        } else if (tab === 'transactions') {
          const res = await analyticsService.getTransactionActivity({ period });
          setTransactionsData(res.data);
          setIsCached(Boolean(res.isCached));
          setIsStale(Boolean(res.isStale));
        } else if (tab === 'recyclers') {
          const res = await analyticsService.getRecyclerActivity({ period });
          setRecyclersData(res.data);
          setIsCached(Boolean(res.isCached));
          setIsStale(Boolean(res.isStale));
        } else if (tab === 'traceability') {
          const res = await analyticsService.getTraceabilityLifecycle({ period });
          setTraceabilityData(res.data);
          setIsCached(Boolean(res.isCached));
          setIsStale(Boolean(res.isStale));
        } else if (tab === 'quality') {
          const res = await analyticsService.getDatasetQuality({ period });
          setQualityData(res.data);
          setIsCached(Boolean(res.isCached));
          setIsStale(Boolean(res.isStale));
        }
      } catch (err: any) {
        console.warn(`[AdminAnalytics] Error loading tab ${tab}:`, err);
        setError(err?.message || 'Unable to load analytical telemetry.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    if (isAdmin) {
      loadTabData(activeTab, selectedPeriod, selectedCategory, false);
    } else {
      setIsLoading(false);
    }
  }, [isAdmin, activeTab, selectedPeriod, selectedCategory, loadTabData]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadTabData(activeTab, selectedPeriod, selectedCategory, true);
  }, [activeTab, selectedPeriod, selectedCategory, loadTabData]);

  // Voice narration text
  const speechText = useMemo(() => {
    if (activeTab === 'prices' && pricesData) {
      if (!pricesData.hasSufficientData) {
        return `Historical price analysis for ${selectedCategory}. Not enough historical observations available.`;
      }
      return `Historical price analysis for ${selectedCategory}. Average price: ₹${pricesData.averagePrice} per kilogram. Lowest price: ₹${pricesData.minPrice}. Highest price: ₹${pricesData.maxPrice}. Total observations: ${pricesData.totalObservations}. Trend is ${pricesData.trendDirection}.`;
    }
    if (activeTab === 'materials' && materialsData) {
      return `Material activity summary. Total material lots: ${materialsData.totalMaterialLots}. Total approximate weight: ${materialsData.totalApproximateWeightKg} kilograms.`;
    }
    if (activeTab === 'transactions' && transactionsData) {
      return `Transaction activity summary. Total transactions: ${transactionsData.totalTransactions}. Final sale value: ₹${transactionsData.financialSummary?.totalFinalSaleValue}. Amount paid: ₹${transactionsData.financialSummary?.totalAmountPaid}. Amount due: ₹${transactionsData.financialSummary?.totalAmountDue}.`;
    }
    if (activeTab === 'recyclers' && recyclersData) {
      return `Recycler activity summary. Total facilities: ${recyclersData.totalFacilities}. Active facilities: ${recyclersData.activeFacilities}. Factual operational counts without rankings.`;
    }
    if (activeTab === 'traceability' && traceabilityData) {
      return `Traceability lifecycle summary. Lots submitted: ${traceabilityData.collectorPipeline?.lotsSubmitted}. Handovers confirmed: ${traceabilityData.handoverStage?.handoversConfirmed}. Transactions recorded: ${traceabilityData.transactionStage?.transactionsRecorded}.`;
    }
    if (activeTab === 'quality' && qualityData) {
      return `Dataset quality indicators. Material coordinates completeness: ${qualityData.materialLotDataset?.withGpsCoordinatesPct} percent. Photo evidence completeness: ${qualityData.materialLotDataset?.withPhotoEvidencePct} percent.`;
    }
    return 'EcoSetu Historical Analytics and Dataset Insights.';
  }, [activeTab, pricesData, materialsData, transactionsData, recyclersData, traceabilityData, qualityData, selectedCategory]);

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.container}>
        <TopAppBar title={t('admin.analytics.title') || 'Historical Analytics'} showBack onBack={() => navigation.goBack()} />
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>Access Restricted: Administrator privileges required.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <AdminShell
      title={t('admin.analytics.title') || 'Historical Analytics'}
      subtitle={t('admin.analytics.subtitle') || 'Factual System Telemetry'}
      activeScreen="AdminHistoricalAnalytics"
      navigation={navigation}
    >

      <View style={styles.subHeaderBar}>
        <View style={styles.subHeaderLeft}>
          <Text style={styles.subHeaderTitle}>
            {t('admin.analytics.subtitle') || 'Factual System Telemetry'}
          </Text>
          <Text style={styles.subHeaderSubtitle}>
            Authoritative Records Only • Zero Predictions
          </Text>
        </View>
        <ReadAloudButton
          variant="compact"
          text={speechText}
          accessibilityLabel={t('voice.readAloud') || 'Read Aloud'}
        />
      </View>

      <OfflineBanner />

      {isCached && (
        <View style={styles.cachedBadge}>
          <Text style={styles.cachedText}>
            {isStale ? '⚠️ Viewing cached analytics (>24h old)' : '⚡ Viewing cached offline telemetry'}
          </Text>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'prices' && styles.tabButtonActive]}
            onPress={() => setActiveTab('prices')}
          >
            <Text style={[styles.tabText, activeTab === 'prices' && styles.tabTextActive]}>
              📈 {t('admin.analytics.tabPrices') || 'Prices'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'materials' && styles.tabButtonActive]}
            onPress={() => setActiveTab('materials')}
          >
            <Text style={[styles.tabText, activeTab === 'materials' && styles.tabTextActive]}>
              📦 {t('admin.analytics.tabMaterials') || 'Materials'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'transactions' && styles.tabButtonActive]}
            onPress={() => setActiveTab('transactions')}
          >
            <Text style={[styles.tabText, activeTab === 'transactions' && styles.tabTextActive]}>
              💰 {t('admin.analytics.tabTransactions') || 'Transactions'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'recyclers' && styles.tabButtonActive]}
            onPress={() => setActiveTab('recyclers')}
          >
            <Text style={[styles.tabText, activeTab === 'recyclers' && styles.tabTextActive]}>
              🏭 {t('admin.analytics.tabRecyclers') || 'Recyclers'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'traceability' && styles.tabButtonActive]}
            onPress={() => setActiveTab('traceability')}
          >
            <Text style={[styles.tabText, activeTab === 'traceability' && styles.tabTextActive]}>
              🔄 {t('admin.analytics.tabLifecycle') || 'Lifecycle'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'quality' && styles.tabButtonActive]}
            onPress={() => setActiveTab('quality')}
          >
            <Text style={[styles.tabText, activeTab === 'quality' && styles.tabTextActive]}>
              🎯 {t('admin.analytics.tabQuality') || 'Quality'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Period Filter (for tabs that use period) */}
      {activeTab !== 'prices' && (
        <View style={styles.periodBar}>
          {(['7d', '30d', '90d', '1y', 'all'] as PeriodType[]).map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.periodChip, selectedPeriod === p && styles.periodChipActive]}
              onPress={() => setSelectedPeriod(p)}
            >
              <Text style={[styles.periodChipText, selectedPeriod === p && styles.periodChipTextActive]}>
                {p.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Category Filter (for prices tab) */}
      {activeTab === 'prices' && (
        <View style={styles.categoryBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
            {Object.values(MATERIAL_CATEGORIES).map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryChip, selectedCategory === cat && styles.categoryChipActive]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text style={[styles.categoryChipText, selectedCategory === cat && styles.categoryChipTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Main Scroll Content */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
      >
        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading analytical telemetry...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        ) : (
          <>
            {/* 1. HISTORICAL PRICES */}
            {activeTab === 'prices' && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Factual Historical Price Analysis</Text>
                  <View style={styles.badgeUnit}>
                    <Text style={styles.badgeUnitText}>Unit: PER_KG</Text>
                  </View>
                </View>

                {!pricesData || !pricesData.hasSufficientData ? (
                  <View style={styles.insufficientCard}>
                    <Text style={styles.insufficientIcon}>ℹ️</Text>
                    <Text style={styles.insufficientTitle}>Insufficient Historical Data</Text>
                    <Text style={styles.insufficientText}>
                      Not enough historical observations recorded for {selectedCategory} in the database. Historical trends
                      require at least 2 distinct observation periods.
                    </Text>
                    <Text style={styles.subtleAntiFabrication}>
                      EcoSetu Anti-Fabrication Rule: Missing price data is reported honestly and never synthesized or forecasted.
                    </Text>
                  </View>
                ) : (
                  <>
                    <View style={styles.metricRow}>
                      <View style={styles.metricCol}>
                        <MetricCard
                          label="Average Price"
                          value={`₹${pricesData.averagePrice} / kg`}
                          icon="📊"
                          accentColor={colors.primary}
                        />
                      </View>
                      <View style={styles.metricCol}>
                        <MetricCard
                          label="Observed Range"
                          value={`₹${pricesData.minPrice} – ₹${pricesData.maxPrice}`}
                          icon="📏"
                          accentColor={colors.textSecondary}
                        />
                      </View>
                    </View>

                    <View style={styles.metricRow}>
                      <View style={styles.metricCol}>
                        <MetricCard
                          label="Total Observations"
                          value={`${pricesData.totalObservations} records`}
                          icon="📝"
                          accentColor={colors.textSecondary}
                        />
                      </View>
                      <View style={styles.metricCol}>
                        <MetricCard
                          label="Period Change"
                          value={
                            pricesData.percentageChange !== null
                              ? `${pricesData.percentageChange > 0 ? '+' : ''}${pricesData.percentageChange}%`
                              : 'N/A'
                          }
                          icon={pricesData.trendDirection === 'UP' ? '📈' : pricesData.trendDirection === 'DOWN' ? '📉' : '➡️'}
                          accentColor={pricesData.trendDirection === 'UP' ? '#10B981' : pricesData.trendDirection === 'DOWN' ? '#F59E0B' : colors.textSecondary}
                        />
                      </View>
                    </View>

                    {/* Historical Periods Breakdown */}
                    <Text style={styles.subHeader}>Monthly Historical Observations</Text>
                    {pricesData.periods?.map((p: any) => (
                      <View key={p.periodKey} style={styles.periodRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.periodLabelText}>{p.label}</Text>
                          <Text style={styles.periodObsText}>{p.observationCount} observations</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={styles.periodPriceText}>₹{p.averagePrice} / kg</Text>
                          <Text style={styles.periodRangeText}>Range: ₹{p.minPrice} – ₹{p.maxPrice}</Text>
                        </View>
                      </View>
                    ))}

                    <View style={styles.disclaimerBox}>
                      <Text style={styles.disclaimerTitle}>Methodology & Provenance</Text>
                      <Text style={styles.disclaimerText}>{pricesData.methodology}</Text>
                      <Text style={styles.disclaimerNote}>⚠️ {pricesData.disclaimer}</Text>
                    </View>
                  </>
                )}
              </View>
            )}

            {/* 2. MATERIAL ACTIVITY */}
            {activeTab === 'materials' && materialsData && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Material Lot Activity</Text>
                <View style={styles.metricRow}>
                  <View style={styles.metricCol}>
                    <MetricCard
                      label="Total Material Lots"
                      value={`${materialsData.totalMaterialLots} lots`}
                      icon="📦"
                      accentColor={colors.primary}
                    />
                  </View>
                  <View style={styles.metricCol}>
                    <MetricCard
                      label="Approximate Weight"
                      value={`${materialsData.totalApproximateWeightKg} kg`}
                      icon="⚖️"
                      accentColor="#10B981"
                    />
                  </View>
                </View>

                {/* Category distribution */}
                <Text style={styles.subHeader}>Lots by Material Category</Text>
                {Object.keys(materialsData.categoryCounts || {}).length === 0 ? (
                  <Text style={styles.emptyNote}>No material lots recorded in this period.</Text>
                ) : (
                  Object.entries(materialsData.categoryCounts || {}).map(([cat, count]: any) => (
                    <View key={cat} style={styles.distributionRow}>
                      <Text style={styles.distLabel}>{cat}</Text>
                      <Text style={styles.distValue}>{count} lots</Text>
                    </View>
                  ))
                )}

                {/* Status distribution */}
                <Text style={styles.subHeader}>Lots by Lifecycle Status</Text>
                {Object.entries(materialsData.statusCounts || {}).map(([st, count]: any) => (
                  <View key={st} style={styles.distributionRow}>
                    <Text style={styles.distLabel}>{st}</Text>
                    <Text style={styles.distValue}>{count} lots</Text>
                  </View>
                ))}
              </View>
            )}

            {/* 3. TRANSACTION ACTIVITY */}
            {activeTab === 'transactions' && transactionsData && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Transaction & Commercial Activity</Text>
                <View style={styles.metricRow}>
                  <View style={styles.metricCol}>
                    <MetricCard
                      label="Recorded Transactions"
                      value={`${transactionsData.completedTransactions} settled`}
                      icon="🧾"
                      accentColor={colors.primary}
                    />
                  </View>
                  <View style={styles.metricCol}>
                    <MetricCard
                      label="Cancelled Records"
                      value={`${transactionsData.cancelledTransactions} cancelled`}
                      icon="❌"
                      accentColor="#F59E0B"
                    />
                  </View>
                </View>

                <View style={styles.metricRow}>
                  <View style={styles.metricCol}>
                    <MetricCard
                      label="Final Sale Value"
                      value={`₹${transactionsData.financialSummary?.totalFinalSaleValue}`}
                      icon="💵"
                      accentColor="#10B981"
                    />
                  </View>
                  <View style={styles.metricCol}>
                    <MetricCard
                      label="Amount Paid"
                      value={`₹${transactionsData.financialSummary?.totalAmountPaid}`}
                      icon="✅"
                      accentColor={colors.primary}
                    />
                  </View>
                </View>

                <View style={styles.metricRow}>
                  <View style={styles.metricCol}>
                    <MetricCard
                      label="Pending Dues"
                      value={`₹${transactionsData.financialSummary?.totalAmountDue}`}
                      icon="⏳"
                      accentColor="#F59E0B"
                    />
                  </View>
                  <View style={styles.metricCol}>
                    <MetricCard
                      label="Volume Procured"
                      value={`${transactionsData.quantityByUnit?.totalKg} kg / ${transactionsData.quantityByUnit?.totalUnits} units`}
                      icon="⚖️"
                      accentColor={colors.textSecondary}
                    />
                  </View>
                </View>

                <View style={styles.disclaimerBox}>
                  <Text style={styles.disclaimerTitle}>Accounting Segregation Rule</Text>
                  <Text style={styles.disclaimerText}>
                    {transactionsData.financialSummary?.note} {transactionsData.quantityByUnit?.note}
                  </Text>
                </View>
              </View>
            )}

            {/* 4. RECYCLER ACTIVITY */}
            {activeTab === 'recyclers' && recyclersData && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recycler Facilities Aggregate Activity</Text>
                <View style={styles.metricRow}>
                  <View style={styles.metricCol}>
                    <MetricCard
                      label="Total Facilities"
                      value={`${recyclersData.totalFacilities} registered`}
                      icon="🏭"
                      accentColor={colors.primary}
                    />
                  </View>
                  <View style={styles.metricCol}>
                    <MetricCard
                      label="Active Facilities"
                      value={`${recyclersData.activeFacilities} operational`}
                      icon="🟢"
                      accentColor="#10B981"
                    />
                  </View>
                </View>

                <Text style={styles.subHeader}>Authorization Status Distribution</Text>
                {Object.entries(recyclersData.authorizationStatusDistribution || {}).map(([st, count]: any) => (
                  <View key={st} style={styles.distributionRow}>
                    <Text style={styles.distLabel}>{st}</Text>
                    <Text style={styles.distValue}>{count} facilities</Text>
                  </View>
                ))}

                <Text style={styles.subHeader}>Commercial Workflow Aggregates</Text>
                <View style={styles.distributionRow}>
                  <Text style={styles.distLabel}>Quotes Issued</Text>
                  <Text style={styles.distValue}>{recyclersData.commercialActivityTotals?.totalQuotesIssued}</Text>
                </View>
                <View style={styles.distributionRow}>
                  <Text style={styles.distLabel}>Quotes Accepted</Text>
                  <Text style={styles.distValue}>{recyclersData.commercialActivityTotals?.totalQuotesAccepted}</Text>
                </View>
                <View style={styles.distributionRow}>
                  <Text style={styles.distLabel}>Handovers Confirmed</Text>
                  <Text style={styles.distValue}>{recyclersData.commercialActivityTotals?.totalHandoversConfirmed}</Text>
                </View>
                <View style={styles.distributionRow}>
                  <Text style={styles.distLabel}>Transactions Recorded</Text>
                  <Text style={styles.distValue}>{recyclersData.commercialActivityTotals?.totalTransactionsRecorded}</Text>
                </View>

                <View style={styles.disclaimerBox}>
                  <Text style={styles.disclaimerTitle}>Non-Evaluative Governance</Text>
                  <Text style={styles.disclaimerText}>{recyclersData.evaluationPolicy}</Text>
                </View>
              </View>
            )}

            {/* 5. TRACEABILITY & LIFECYCLE */}
            {activeTab === 'traceability' && traceabilityData && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Full Lifecycle Progression</Text>
                <View style={styles.stepCard}>
                  <Text style={styles.stepTitle}>1. Collector Lots Submitted</Text>
                  <Text style={styles.stepValue}>{traceabilityData.collectorPipeline?.lotsSubmitted} lots</Text>
                </View>
                <View style={styles.stepCard}>
                  <Text style={styles.stepTitle}>2. Formal Quotes Accepted</Text>
                  <Text style={styles.stepValue}>{traceabilityData.quotationStage?.quotesAccepted} quotes</Text>
                </View>
                <View style={styles.stepCard}>
                  <Text style={styles.stepTitle}>3. Digital Handovers Confirmed</Text>
                  <Text style={styles.stepValue}>{traceabilityData.handoverStage?.handoversConfirmed} handovers</Text>
                </View>
                <View style={styles.stepCard}>
                  <Text style={styles.stepTitle}>4. Transactions Recorded</Text>
                  <Text style={styles.stepValue}>{traceabilityData.transactionStage?.transactionsRecorded} receipts</Text>
                </View>
                <View style={styles.stepCard}>
                  <Text style={styles.stepTitle}>5. Citizen Consignments Delivered</Text>
                  <Text style={styles.stepValue}>{traceabilityData.citizenEwastePipeline?.consignmentsDelivered} consignments</Text>
                </View>
                <View style={styles.stepCard}>
                  <Text style={styles.stepTitle}>6. Recycling Certificates Completed</Text>
                  <Text style={styles.stepValue}>{traceabilityData.citizenEwastePipeline?.recyclingCompleted} records</Text>
                </View>

                <View style={styles.disclaimerBox}>
                  <Text style={styles.disclaimerTitle}>Lifecycle Provenance</Text>
                  <Text style={styles.disclaimerText}>{traceabilityData.antiFabricationNote}</Text>
                </View>
              </View>
            )}

            {/* 6. DATASET QUALITY */}
            {activeTab === 'quality' && qualityData && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Dataset Completeness & Quality</Text>

                <Text style={styles.subHeader}>Material Lots Dataset ({qualityData.materialLotDataset?.totalRecords} lots)</Text>
                <View style={styles.distributionRow}>
                  <Text style={styles.distLabel}>GPS Coordinates</Text>
                  <Text style={styles.distValue}>{qualityData.materialLotDataset?.withGpsCoordinatesPct}%</Text>
                </View>
                <View style={styles.distributionRow}>
                  <Text style={styles.distLabel}>Photo Evidence Attached</Text>
                  <Text style={styles.distValue}>{qualityData.materialLotDataset?.withPhotoEvidencePct}%</Text>
                </View>
                <View style={styles.distributionRow}>
                  <Text style={styles.distLabel}>Measured Weight Recorded</Text>
                  <Text style={styles.distValue}>{qualityData.materialLotDataset?.withWeightMeasurementPct}%</Text>
                </View>

                <Text style={styles.subHeader}>Transactions Dataset ({qualityData.transactionDataset?.totalRecords} receipts)</Text>
                <View style={styles.distributionRow}>
                  <Text style={styles.distLabel}>GPS Location Recorded</Text>
                  <Text style={styles.distValue}>{qualityData.transactionDataset?.withCoordinatesPct}%</Text>
                </View>
                <View style={styles.distributionRow}>
                  <Text style={styles.distLabel}>Location Name Available</Text>
                  <Text style={styles.distValue}>{qualityData.transactionDataset?.withLocationNamePct}%</Text>
                </View>
                <View style={styles.distributionRow}>
                  <Text style={styles.distLabel}>Quoted Unit Price Evidence</Text>
                  <Text style={styles.distValue}>{qualityData.transactionDataset?.withQuotedPriceEvidencePct}%</Text>
                </View>

                <Text style={styles.subHeader}>Recyclers Dataset ({qualityData.recyclerDataset?.totalRecords} facilities)</Text>
                <View style={styles.distributionRow}>
                  <Text style={styles.distLabel}>Facility Coordinates</Text>
                  <Text style={styles.distValue}>{qualityData.recyclerDataset?.withCoordinatesPct}%</Text>
                </View>
                <View style={styles.distributionRow}>
                  <Text style={styles.distLabel}>Authorization License Number</Text>
                  <Text style={styles.distValue}>{qualityData.recyclerDataset?.withAuthorizationNumberPct}%</Text>
                </View>
                <View style={styles.distributionRow}>
                  <Text style={styles.distLabel}>Validity Dates Recorded</Text>
                  <Text style={styles.distValue}>{qualityData.recyclerDataset?.withValidityDatesPct}%</Text>
                </View>

                <View style={styles.disclaimerBox}>
                  <Text style={styles.disclaimerTitle}>Quality Guarantee</Text>
                  <Text style={styles.disclaimerText}>{qualityData.dataQualityPolicy}</Text>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </AdminShell>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#071e22',
  },
  tabBar: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  tabScroll: {
    paddingHorizontal: spacing.spaceMd,
    paddingVertical: spacing.spaceSm,
    flexDirection: 'row',
  },
  tabButton: {
    paddingHorizontal: spacing.spaceMd,
    paddingVertical: spacing.spaceXs + 2,
    borderRadius: 20,
    marginRight: spacing.spaceSm,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  tabButtonActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#071e22',
    fontWeight: '700',
  },
  periodBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.spaceMd,
    paddingVertical: spacing.spaceXs,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    justifyContent: 'space-around',
  },
  periodChip: {
    paddingHorizontal: spacing.spaceSm + 4,
    paddingVertical: 4,
    borderRadius: 12,
  },
  periodChipActive: {
    backgroundColor: 'rgba(29, 209, 161, 0.2)',
  },
  periodChipText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  periodChipTextActive: {
    color: colors.primary,
  },
  categoryBar: {
    paddingVertical: spacing.spaceXs,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  categoryScroll: {
    paddingHorizontal: spacing.spaceMd,
  },
  categoryChip: {
    paddingHorizontal: spacing.spaceMd,
    paddingVertical: 4,
    borderRadius: 14,
    marginRight: spacing.spaceXs,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  categoryChipActive: {
    backgroundColor: 'rgba(29, 209, 161, 0.25)',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  categoryChipText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  categoryChipTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.spaceMd,
    paddingBottom: spacing.spaceXl * 2,
  },
  loadingBox: {
    paddingVertical: spacing.spaceXl * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: spacing.spaceMd,
    color: colors.textSecondary,
    fontSize: 14,
  },
  errorBox: {
    padding: spacing.spaceXl,
    alignItems: 'center',
  },
  errorCard: {
    padding: spacing.spaceMd,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
  },
  section: {
    marginBottom: spacing.spaceLg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.spaceMd,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  badgeUnit: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: spacing.spaceSm,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeUnitText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  subHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    marginTop: spacing.spaceMd,
    marginBottom: spacing.spaceSm,
  },
  metricRow: {
    flexDirection: 'row',
    marginHorizontal: -spacing.spaceXs,
    marginBottom: spacing.spaceSm,
  },
  metricCol: {
    flex: 1,
    paddingHorizontal: spacing.spaceXs,
  },
  periodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.spaceSm,
    paddingHorizontal: spacing.spaceMd,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 8,
    marginBottom: spacing.spaceXs,
  },
  periodLabelText: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  periodObsText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  periodPriceText: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: '700',
  },
  periodRangeText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  distributionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.spaceSm - 2,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  distLabel: {
    fontSize: 13,
    color: colors.textPrimary,
  },
  distValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  stepCard: {
    padding: spacing.spaceMd,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    marginBottom: spacing.spaceSm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepTitle: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  stepValue: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '700',
  },
  insufficientCard: {
    padding: spacing.spaceLg,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  insufficientIcon: {
    fontSize: 28,
    marginBottom: spacing.spaceSm,
  },
  insufficientTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.spaceXs,
  },
  insufficientText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.spaceSm,
  },
  subtleAntiFabrication: {
    fontSize: 11,
    color: '#1dd1a1',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  disclaimerBox: {
    marginTop: spacing.spaceMd,
    padding: spacing.spaceMd,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  disclaimerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 2,
  },
  disclaimerText: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  disclaimerNote: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: spacing.spaceXs,
    fontStyle: 'italic',
  },
  subHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.spaceMd,
    paddingVertical: spacing.spaceSm,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  subHeaderLeft: {
    flex: 1,
    marginRight: spacing.spaceSm,
  },
  subHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subHeaderSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  cachedBadge: {
    marginHorizontal: spacing.spaceMd,
    marginTop: spacing.spaceXs,
    paddingHorizontal: spacing.spaceSm,
    paddingVertical: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  cachedText: {
    fontSize: 11,
    color: '#F59E0B',
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyNote: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    paddingVertical: spacing.spaceSm,
  },
});

export default AdminHistoricalAnalyticsScreen;
