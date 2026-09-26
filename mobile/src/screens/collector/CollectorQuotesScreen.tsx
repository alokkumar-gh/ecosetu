/**
 * EcoSetu Collector Quotes Screen
 * Canonical Reference: docs/25_SIH_26229_REQUIREMENTS.md Section 10 (SIH-QUOTE-001..006)
 *
 * Real two-sided offer competition & transparent negotiation:
 * - Factual sorting: Highest Rate, Pickup Available, Nearest, Newest (no subjective "Best" labels)
 * - Transparent quote card: Buyer, Facility, Authorization, Rate, Unit, Quantity, Total, Pickup, Distance, Validity, Created, Status
 * - Dedicated read-only Negotiation Timeline embedded for each quote
 * - Mathematical precision: Total = Rate × Quantity
 * - Honest empty states: "No offers received yet."
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useI18n } from '../../i18n';
import { EcoSetuBackground } from '../../components/eco';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { quoteService, RecyclerQuote, LotQuotesResponse } from '../../services/quoteService';
import { NegotiationTimeline } from '../../components/marketplace/NegotiationTimeline';
import { AppIcon, AppIconName } from '../../components/ui';
import voiceService from '../../services/voiceService';
import networkService from '../../services/networkService';

const space = {
  xs: spacing.spaceXs,
  sm: spacing.spaceSm,
  md: spacing.spaceMd,
  lg: spacing.spaceLg,
  xl: spacing.spaceXl,
};

type SortOption = 'HIGHEST_RATE' | 'PICKUP' | 'NEWEST' | 'NEAREST';

export const CollectorQuotesScreen: React.FC = () => {
  const { t, language } = useI18n();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();

  const lotId = route.params?.lotId;
  const initialLot = route.params?.lot;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lotData, setLotData] = useState<LotQuotesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('HIGHEST_RATE');

  // Decision Modals
  const [selectedQuote, setSelectedQuote] = useState<RecyclerQuote | null>(null);
  const [acceptModalVisible, setAcceptModalVisible] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState<string>('PRICE_TOO_LOW');
  const [counterModalVisible, setCounterModalVisible] = useState(false);
  const [counterPriceInput, setCounterPriceInput] = useState<string>('');
  const [counterNotesInput, setCounterNotesInput] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchQuotes = useCallback(async () => {
    if (!lotId) return;
    setError(null);
    try {
      const data = await quoteService.getQuotesForLot(lotId);
      setLotData(data);
    } catch (err: any) {
      setError(err.message || t('common.error'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [lotId, t]);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchQuotes();
  };

  const handleSpeakQuote = (quote: RecyclerQuote) => {
    const text = quoteService.generateQuoteSpeechText(quote, language);
    voiceService.speak(text, { language });
  };

  const handleAcceptConfirm = async () => {
    if (!selectedQuote) return;

    if (!networkService.isOnline()) {
      Alert.alert(
        t('common.offline') || 'Offline',
        t('quotation.connectToAccept') || 'Internet connection required to accept quote.'
      );
      return;
    }

    setActionLoading(true);
    try {
      await quoteService.acceptQuote(selectedQuote.id);
      setAcceptModalVisible(false);
      setSelectedQuote(null);
      Alert.alert(
        t('quotation.quoteAccepted') || 'Quote Accepted',
        t('quotation.acceptanceNotice') || 'You have accepted this quotation. Competing quotes have been cancelled.'
      );
      fetchQuotes();
    } catch (err: any) {
      Alert.alert(t('common.error') || 'Error', err.message || 'Failed to accept quote');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectConfirm = async () => {
    if (!selectedQuote) return;

    if (!networkService.isOnline()) {
      Alert.alert(
        t('common.offline') || 'Offline',
        t('quotation.connectToReject') || 'Internet connection required to reject quote.'
      );
      return;
    }

    setActionLoading(true);
    try {
      await quoteService.rejectQuote(selectedQuote.id, rejectReason);
      setRejectModalVisible(false);
      setSelectedQuote(null);
      Alert.alert(
        t('quotation.quoteRejected') || 'Quote Rejected',
        t('quotation.quoteRejected') || 'The quotation has been marked as rejected.'
      );
      fetchQuotes();
    } catch (err: any) {
      Alert.alert(t('common.error') || 'Error', err.message || 'Failed to reject quote');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCounterConfirm = async () => {
    if (!selectedQuote) return;

    const parsedPrice = parseFloat(counterPriceInput);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      Alert.alert(t('common.error') || 'Error', t('quotation.validRateRequired') || 'Please enter a valid positive rate');
      return;
    }

    if (!networkService.isOnline()) {
      Alert.alert(
        t('common.offline') || 'Offline',
        t('quotation.connectToCounter') || 'Connect to internet to propose counter-offer'
      );
      return;
    }

    setActionLoading(true);
    try {
      await quoteService.counterQuote(selectedQuote.id, parsedPrice, counterNotesInput.trim() || undefined);
      setCounterModalVisible(false);
      setSelectedQuote(null);
      setCounterPriceInput('');
      setCounterNotesInput('');
      Alert.alert(
        t('quotation.counterSubmitted') || 'Counter-Offer Submitted',
        t('quotation.counterSubmittedDesc') || 'Your counter-offer has been sent to the recycler.'
      );
      fetchQuotes();
    } catch (err: any) {
      Alert.alert(t('common.error') || 'Error', err.message || 'Failed to submit counter-offer');
    } finally {
      setActionLoading(false);
    }
  };

  const sortedQuotes = useMemo(() => {
    if (!lotData?.quotes) return [];
    const list = [...lotData.quotes];
    if (sortBy === 'HIGHEST_RATE') {
      list.sort((a, b) => (b.quotedUnitPrice || 0) - (a.quotedUnitPrice || 0));
    } else if (sortBy === 'PICKUP') {
      list.sort((a, b) => {
        const aPickup = a.recycler?.pickupAvailable ? 1 : 0;
        const bPickup = b.recycler?.pickupAvailable ? 1 : 0;
        return bPickup - aPickup;
      });
    } else if (sortBy === 'NEWEST') {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortBy === 'NEAREST') {
      list.sort((a: any, b: any) => (a.distanceKm || 9999) - (b.distanceKm || 9999));
    }
    return list;
  }, [lotData?.quotes, sortBy]);

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return styles.statusAccepted;
      case 'REJECTED':
        return styles.statusRejected;
      case 'EXPIRED':
        return styles.statusExpired;
      case 'CANCELLED':
        return styles.statusCancelled;
      case 'SENT':
      case 'VIEWED':
      default:
        return styles.statusActive;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return t('quotation.accepted') || 'Accepted';
      case 'REJECTED':
        return t('quotation.rejected') || 'Rejected';
      case 'EXPIRED':
        return t('quotation.expired') || 'Expired';
      case 'CANCELLED':
        return t('quotation.cancelled') || 'Cancelled';
      case 'VIEWED':
        return t('quotation.viewed') || 'Viewed';
      case 'SENT':
      default:
        return t('quotation.active') || 'Active';
    }
  };

  const getStatusIcon = (status: string): AppIconName => {
    switch (status) {
      case 'ACCEPTED':
        return 'check-circle';
      case 'REJECTED':
        return 'x-circle';
      case 'EXPIRED':
        return 'clock';
      case 'CANCELLED':
        return 'slash';
      case 'VIEWED':
        return 'eye';
      case 'SENT':
      default:
        return 'clock';
    }
  };

  const isLotAccepted = lotData?.lotStatus === 'ACCEPTED' || lotData?.quotes?.some(q => q.status === 'ACCEPTED');

  return (
    <EcoSetuBackground>
      <SafeAreaView style={styles.safeArea}>
        {/* Navigation Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
          >
            <Text style={styles.backButtonText}>← {t('common.back')}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('quotation.title') || 'Competitive Offers'}</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />}
        >
          {/* Offline / Cached Notice */}
          {lotData?.isFromCache ? (
            <View style={[styles.cacheNoticeBanner, lotData.isStale && styles.staleBanner]}>
              <View style={styles.bannerRow}>
                <AppIcon
                  name={lotData.isStale ? 'alert-triangle' : 'wifi-off'}
                  size={14}
                  color={lotData.isStale ? '#EF4444' : '#F59E0B'}
                />
                <Text style={styles.cacheNoticeText}>
                  {lotData.isStale ? t('recyclerMatching.staleCacheWarning') : t('quotation.offlineNotice')}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Lot Context Header Card */}
          <View style={styles.lotSummaryCard}>
            <View style={styles.lotSummaryRow}>
              <Text style={styles.lotRefText}>{lotData?.lotReference || initialLot?.referenceNumber || 'LOT'}</Text>
              <View style={[styles.lotStatusBadge, isLotAccepted ? styles.statusAccepted : styles.statusActive]}>
                <Text style={styles.lotStatusText}>
                  {isLotAccepted ? (t('quotation.accepted') || 'ACCEPTED') : (lotData?.lotStatus || initialLot?.status || 'QUOTED')}
                </Text>
              </View>
            </View>
            <View style={styles.lotMetaRow}>
              <AppIcon name="package" size={14} color="#94A3B8" />
              <Text style={styles.lotMetaText}>
                {lotData?.category || initialLot?.category}
                {lotData?.subcategory ? ` • ${lotData.subcategory}` : ''}
                {lotData?.weightKg ? ` • ${lotData.weightKg} kg` : ''}
              </Text>
            </View>
          </View>

          {/* Benchmark Market Valuation Context */}
          {lotData?.benchmarkEstimate && lotData.benchmarkEstimate.status === 'AVAILABLE' ? (
            <View style={styles.benchmarkCard}>
              <View style={styles.benchmarkHeaderRow}>
                <AppIcon name="bar-chart-2" size={16} color="#10B981" />
                <Text style={styles.benchmarkHeader}>{t('recyclerMatching.marketEstimateTitle') || 'Verified Market Price Reference'}</Text>
              </View>
              <Text style={styles.benchmarkValue}>
                ₹{lotData.benchmarkEstimate.marketRangeLow} – ₹{lotData.benchmarkEstimate.marketRangeHigh} / kg
              </Text>
              {lotData.benchmarkEstimate.estimatedLow ? (
                <Text style={styles.benchmarkTotal}>
                  Est. Lot Value: ₹{Math.round(lotData.benchmarkEstimate.estimatedLow)} – ₹{Math.round(lotData.benchmarkEstimate.estimatedHigh)}
                </Text>
              ) : null}
              <Text style={styles.benchmarkNote}>
                {t('recyclerMatching.marketEstimateNote') || 'Reference only based on recent verified transactions. You make the final commercial decision.'}
              </Text>
            </View>
          ) : null}

          {/* Loading Indicator */}
          {loading && !refreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#10B981" />
              <Text style={styles.loadingText}>{t('common.loading') || 'Loading...'}</Text>
            </View>
          ) : null}

          {/* Error Message */}
          {error ? (
            <View style={styles.errorContainer}>
              <AppIcon name="alert-circle" size={24} color="#EF4444" style={{ marginBottom: 6 }} />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={fetchQuotes}>
                <Text style={styles.retryButtonText}>{t('common.retry') || 'Retry'}</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Empty State */}
          {!loading && !error && (!lotData?.quotes || lotData.quotes.length === 0) ? (
            <View style={styles.emptyContainer}>
              <AppIcon name="mail" size={40} color="#64748B" style={{ marginBottom: 12 }} />
              <Text style={styles.emptyTitle}>No offers received yet.</Text>
              <Text style={styles.emptyDescription}>
                {t('quotation.noQuotesDescription') || 'No verified recyclers have submitted bids for this material lot yet. Tap below to notify matched recyclers.'}
              </Text>
              <TouchableOpacity
                style={styles.findRecyclerCta}
                onPress={() => navigation.navigate('CollectorRecyclerMatches', { lotId })}
              >
                <AppIcon name="search" size={16} color="#061A21" />
                <Text style={styles.findRecyclerCtaText}>{t('recyclerMatching.findRecycler') || 'Match Recyclers'}</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Factual Sort Controls */}
          {sortedQuotes.length > 1 ? (
            <View style={styles.sortBar}>
              <Text style={styles.sortLabel}>Sort By:</Text>
              <TouchableOpacity
                style={[styles.sortChip, sortBy === 'HIGHEST_RATE' && styles.sortChipActive]}
                onPress={() => setSortBy('HIGHEST_RATE')}
              >
                <AppIcon
                  name="dollar-sign"
                  size={12}
                  color={sortBy === 'HIGHEST_RATE' ? '#10B981' : '#94A3B8'}
                />
                <Text style={[styles.sortChipText, sortBy === 'HIGHEST_RATE' && styles.sortChipTextActive]}>
                  Highest Rate
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sortChip, sortBy === 'PICKUP' && styles.sortChipActive]}
                onPress={() => setSortBy('PICKUP')}
              >
                <AppIcon
                  name="truck"
                  size={12}
                  color={sortBy === 'PICKUP' ? '#10B981' : '#94A3B8'}
                />
                <Text style={[styles.sortChipText, sortBy === 'PICKUP' && styles.sortChipTextActive]}>
                  Pickup
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sortChip, sortBy === 'NEWEST' && styles.sortChipActive]}
                onPress={() => setSortBy('NEWEST')}
              >
                <AppIcon
                  name="clock"
                  size={12}
                  color={sortBy === 'NEWEST' ? '#10B981' : '#94A3B8'}
                />
                <Text style={[styles.sortChipText, sortBy === 'NEWEST' && styles.sortChipTextActive]}>
                  Newest
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sortChip, sortBy === 'NEAREST' && styles.sortChipActive]}
                onPress={() => setSortBy('NEAREST')}
              >
                <AppIcon
                  name="map-pin"
                  size={12}
                  color={sortBy === 'NEAREST' ? '#10B981' : '#94A3B8'}
                />
                <Text style={[styles.sortChipText, sortBy === 'NEAREST' && styles.sortChipTextActive]}>
                  Nearest
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Quotes List */}
          {sortedQuotes.map((quote) => {
            const canDecide = !isLotAccepted && ['SENT', 'VIEWED'].includes(quote.status) && !quote.isExpired;
            const unitLabel = quote.unit === 'PER_KG' ? 'kg' : quote.unit === 'PER_UNIT' ? 'unit' : 'lot';
            const weightVal = lotData?.weightKg || initialLot?.approximateTotalWeightKg || 0;
            const calculatedTotal = quote.quotedTotal || (Number(quote.quotedUnitPrice) * (weightVal || 1));

            return (
              <View key={quote.id} style={styles.quoteCard}>
                {/* Quote Card Header: Buyer Facility & Status */}
                <View style={styles.cardHeader}>
                  <View style={styles.recyclerInfo}>
                    <Text style={styles.recyclerName}>{quote.recycler?.facilityName || 'Authorized Recycler'}</Text>
                    <View style={styles.badgeRow}>
                      <View style={[styles.statusBadge, getStatusBadgeStyle(quote.status)]}>
                        <AppIcon name={getStatusIcon(quote.status)} size={11} color="#CBD5E1" />
                        <Text style={styles.statusBadgeText}>{getStatusText(quote.status)}</Text>
                      </View>
                      {quote.recycler?.user?.isVerified ? (
                        <View style={styles.verifiedBadge}>
                          <AppIcon name="check-circle" size={11} color="#10B981" />
                          <Text style={styles.verifiedBadgeText}>{t('recyclerMatching.authorized') || 'Authorized'}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                  <Text style={styles.quoteRefText}>{quote.referenceNumber}</Text>
                </View>

                {/* Quoted Price Banner: Rate, Unit, Quantity, Total */}
                <View style={styles.priceContainer}>
                  <View>
                    <Text style={styles.priceLabel}>Offer Rate</Text>
                    <Text style={styles.priceValue}>
                      ₹{quote.quotedUnitPrice} <Text style={styles.priceUnit}>/ {unitLabel}</Text>
                    </Text>
                    {weightVal > 0 ? (
                      <Text style={styles.quantityLabel}>Lot Quantity: {weightVal} kg</Text>
                    ) : null}
                  </View>
                  <View style={styles.totalContainer}>
                    <Text style={styles.totalLabel}>Total Offer Value</Text>
                    <Text style={styles.totalValue}>₹{calculatedTotal.toLocaleString()}</Text>
                  </View>
                </View>

                {/* Location & Logistics Specs */}
                <View style={styles.specRow}>
                  <View style={styles.specItem}>
                    <AppIcon
                      name={quote.recycler?.pickupAvailable ? 'truck' : 'factory'}
                      size={12}
                      color="#94A3B8"
                    />
                    <Text style={styles.specText}>
                      {quote.recycler?.pickupAvailable ? 'Pickup Available' : 'Self Drop / Handover'}
                    </Text>
                  </View>
                  {quote.recycler?.city ? (
                    <View style={styles.specItem}>
                      <AppIcon name="map-pin" size={12} color="#94A3B8" />
                      <Text style={styles.specText}>
                        {quote.recycler.city}{quote.recycler.state ? `, ${quote.recycler.state}` : ''}
                      </Text>
                    </View>
                  ) : null}
                  {(quote as any).distanceKm ? (
                    <View style={styles.specItem}>
                      <AppIcon name="navigation" size={12} color="#94A3B8" />
                      <Text style={styles.specText}>
                        {(quote as any).distanceKm} km away
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Timestamp & Validity */}
                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <AppIcon name="clock" size={11} color="#64748B" />
                    <Text style={styles.metaText}>
                      Offered: {new Date(quote.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({new Date(quote.createdAt).toLocaleDateString()})
                    </Text>
                  </View>
                  <View style={styles.metaItem}>
                    <AppIcon name="calendar" size={11} color="#64748B" />
                    <Text style={styles.metaText}>
                      Valid Until: {new Date(quote.validUntil).toLocaleDateString()}
                    </Text>
                  </View>
                </View>

                {/* Dedicated Negotiation Timeline Component */}
                <NegotiationTimeline quote={quote} />

                {/* Rejection / Cancellation Reason if present */}
                {quote.rejectionReason ? (
                  <View style={styles.reasonContainer}>
                    <AppIcon name="x-circle" size={13} color="#EF4444" style={{ marginRight: 6 }} />
                    <Text style={styles.reasonText}>
                      Rejection Reason: {quote.rejectionReason}
                    </Text>
                  </View>
                ) : null}
                {quote.cancellationReason ? (
                  <View style={styles.reasonContainer}>
                    <AppIcon name="slash" size={13} color="#94A3B8" style={{ marginRight: 6 }} />
                    <Text style={styles.cancellationText}>
                      {quote.cancellationReason === 'COMPETING_QUOTE_ACCEPTED' ? 'Another competing quote was accepted.' : quote.cancellationReason}
                    </Text>
                  </View>
                ) : null}

                {/* Card Actions */}
                <View style={styles.cardActions}>
                  {/* TTS Button */}
                  <TouchableOpacity
                    style={styles.speakButton}
                    onPress={() => handleSpeakQuote(quote)}
                    accessibilityRole="button"
                    accessibilityLabel="Speak Offer Summary"
                  >
                    <AppIcon name="volume-2" size={15} color="#38BDF8" />
                    <Text style={styles.speakButtonText}>Speak Summary</Text>
                  </TouchableOpacity>

                  {/* Decision CTAs */}
                  {canDecide ? (
                    <View style={styles.decisionRow}>
                      <TouchableOpacity
                        style={styles.rejectButton}
                        onPress={() => {
                          setSelectedQuote(quote);
                          setRejectModalVisible(true);
                        }}
                      >
                        <AppIcon name="x" size={14} color="#EF4444" />
                        <Text style={styles.rejectButtonText}>Reject</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.counterButton}
                        onPress={() => {
                          setSelectedQuote(quote);
                          setCounterPriceInput(quote.quotedUnitPrice ? String(quote.quotedUnitPrice) : '');
                          setCounterNotesInput('');
                          setCounterModalVisible(true);
                        }}
                      >
                        <AppIcon name="message-square" size={14} color="#38BDF8" />
                        <Text style={styles.counterButtonText}>Counter</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.acceptButton}
                        onPress={() => {
                          setSelectedQuote(quote);
                          setAcceptModalVisible(true);
                        }}
                      >
                        <AppIcon name="check" size={14} color="#061A21" />
                        <Text style={styles.acceptButtonText}>Accept</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}

                  {/* Handover CTA for Accepted Quotes */}
                  {quote.status === 'ACCEPTED' ? (
                    <View style={styles.decisionRow}>
                      <TouchableOpacity
                        style={styles.handoverButton}
                        onPress={() => (navigation as any).navigate('CollectorHandover', { lot: lotData || initialLot, quote })}
                        accessibilityRole="button"
                        accessibilityLabel="Start Handover"
                      >
                        <AppIcon name="truck" size={15} color="#061A21" />
                        <Text style={styles.handoverButtonText}>Start Handover</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* Accept Confirmation Modal */}
        <Modal
          visible={acceptModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setAcceptModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalTitleRow}>
                <AppIcon name="handshake" size={22} color="#10B981" />
                <Text style={styles.modalTitle}>Confirm Quote Acceptance</Text>
              </View>
              <Text style={styles.modalMessage}>
                Accepting this quotation establishes an official commercial deal. All other competing bids for this material lot will be automatically cancelled.
              </Text>

              {selectedQuote ? (
                <View style={styles.modalQuoteSummary}>
                  <View style={styles.confirmRow}>
                    <Text style={styles.confirmLabel}>Buyer:</Text>
                    <Text style={styles.confirmValue}>{selectedQuote.recycler?.facilityName || 'Authorized Recycler'}</Text>
                  </View>
                  <View style={styles.confirmRow}>
                    <Text style={styles.confirmLabel}>Material:</Text>
                    <Text style={styles.confirmValue}>{lotData?.category || initialLot?.category || 'E-Waste'}</Text>
                  </View>
                  <View style={styles.confirmRow}>
                    <Text style={styles.confirmLabel}>Weight:</Text>
                    <Text style={styles.confirmValue}>{lotData?.weightKg || initialLot?.approximateTotalWeightKg || '—'} kg</Text>
                  </View>
                  <View style={styles.confirmRow}>
                    <Text style={styles.confirmLabel}>Agreed Rate:</Text>
                    <Text style={[styles.confirmValue, { color: '#10B981', fontWeight: '700' }]}>
                      ₹{selectedQuote.quotedUnitPrice} / {selectedQuote.unit === 'PER_KG' ? 'kg' : selectedQuote.unit}
                    </Text>
                  </View>
                  <View style={styles.confirmRow}>
                    <Text style={styles.confirmLabel}>Total Deal Value:</Text>
                    <Text style={[styles.confirmValue, { color: '#34D399', fontWeight: '800', fontSize: 16 }]}>
                      ₹{(selectedQuote.quotedTotal || (Number(selectedQuote.quotedUnitPrice) * Number(lotData?.weightKg || 1))).toLocaleString()}
                    </Text>
                  </View>
                  {selectedQuote.validUntil ? (
                    <View style={styles.confirmRow}>
                      <Text style={styles.confirmLabel}>Offer Validity:</Text>
                      <Text style={styles.confirmValue}>{new Date(selectedQuote.validUntil).toLocaleDateString()}</Text>
                    </View>
                  ) : null}
                </View>
              ) : null}

              <View style={styles.modalWarningBox}>
                <AppIcon name="alert-triangle" size={16} color="#F59E0B" />
                <Text style={styles.modalWarningText}>
                  Server-authoritative acceptance: Competing quotes will be marked CANCELLED.
                </Text>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setAcceptModalVisible(false)}
                  disabled={actionLoading}
                  accessibilityRole="button"
                >
                  <Text style={styles.modalCancelButtonText}>{t('common.cancel') || 'Cancel'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalConfirmAcceptButton}
                  onPress={handleAcceptConfirm}
                  disabled={actionLoading}
                  accessibilityRole="button"
                >
                  {actionLoading ? (
                    <ActivityIndicator color="#071E22" />
                  ) : (
                    <View style={styles.btnContentRow}>
                      <AppIcon name="check" size={18} color="#071E22" />
                      <Text style={styles.modalConfirmAcceptButtonText}>Accept Deal</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Counter Offer Modal */}
        <Modal
          visible={counterModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setCounterModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalTitleRow}>
                <AppIcon name="message-square" size={22} color="#38BDF8" />
                <Text style={styles.modalTitle}>Propose Counter-Offer</Text>
              </View>
              <Text style={styles.modalMessage}>
                Submit a revised rate to the buyer. This will update the negotiation round while keeping the audit trail transparent.
              </Text>

              {selectedQuote ? (
                <View style={styles.modalQuoteSummary}>
                  <View style={styles.confirmRow}>
                    <Text style={styles.confirmLabel}>Buyer:</Text>
                    <Text style={styles.confirmValue}>{selectedQuote.recycler?.facilityName || 'Recycler'}</Text>
                  </View>
                  <View style={styles.confirmRow}>
                    <Text style={styles.confirmLabel}>Current Offer Rate:</Text>
                    <Text style={styles.confirmValue}>₹{selectedQuote.quotedUnitPrice} / {selectedQuote.unit === 'PER_KG' ? 'kg' : selectedQuote.unit}</Text>
                  </View>
                </View>
              ) : null}

              <Text style={styles.inputLabel}>Your Desired Unit Rate (₹/kg):</Text>
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                placeholder="e.g. 250"
                placeholderTextColor="#64748B"
                value={counterPriceInput}
                onChangeText={setCounterPriceInput}
              />

              {lotData?.weightKg && !isNaN(parseFloat(counterPriceInput)) && parseFloat(counterPriceInput) > 0 ? (
                <Text style={styles.calcPreview}>
                  Mathematical Total: {lotData.weightKg} kg × ₹{parseFloat(counterPriceInput)} = ₹{(lotData.weightKg * parseFloat(counterPriceInput)).toLocaleString()}
                </Text>
              ) : null}

              <Text style={styles.inputLabel}>Negotiation Notes (Optional):</Text>
              <TextInput
                style={[styles.textInput, styles.textAreaInput]}
                placeholder="e.g. Material is sorted and packaged for immediate pickup"
                placeholderTextColor="#64748B"
                multiline
                numberOfLines={3}
                value={counterNotesInput}
                onChangeText={setCounterNotesInput}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setCounterModalVisible(false)}
                  disabled={actionLoading}
                >
                  <Text style={styles.modalCancelButtonText}>{t('common.cancel') || 'Cancel'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalConfirmCounterButton}
                  onPress={handleCounterConfirm}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <View style={styles.btnContentRow}>
                      <AppIcon name="send" size={16} color="#FFFFFF" />
                      <Text style={styles.modalConfirmCounterButtonText}>Send Counter</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Reject Reason Modal */}
        <Modal
          visible={rejectModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setRejectModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalTitleRow}>
                <AppIcon name="x-circle" size={22} color="#EF4444" />
                <Text style={styles.modalTitle}>Reject Quotation</Text>
              </View>
              <Text style={styles.modalMessage}>Select a reason for declining this buyer's offer:</Text>

              {/* Reasons options */}
              {[
                { key: 'PRICE_TOO_LOW', label: 'Rate is too low' },
                { key: 'PICKUP_ISSUE', label: 'Logistics / Pickup terms unsuitable' },
                { key: 'TIMING_ISSUE', label: 'Timeline or validity issue' },
                { key: 'OTHER', label: 'Other commercial reason' },
              ].map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.reasonOption, rejectReason === item.key && styles.reasonOptionSelected]}
                  onPress={() => setRejectReason(item.key)}
                >
                  <View style={styles.reasonOptionInner}>
                    <AppIcon
                      name={rejectReason === item.key ? 'radio-checked' : 'radio-unchecked'}
                      size={16}
                      color={rejectReason === item.key ? '#EF4444' : '#64748B'}
                    />
                    <Text style={[styles.reasonOptionText, rejectReason === item.key && styles.reasonOptionTextSelected]}>
                      {item.label}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setRejectModalVisible(false)}
                  disabled={actionLoading}
                >
                  <Text style={styles.modalCancelButtonText}>{t('common.cancel') || 'Cancel'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalConfirmRejectButton}
                  onPress={handleRejectConfirm}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <View style={styles.btnContentRow}>
                      <AppIcon name="x" size={16} color="#FFFFFF" />
                      <Text style={styles.modalConfirmRejectButtonText}>Confirm Rejection</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </EcoSetuBackground>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginRight: space.sm,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scrollContent: {
    padding: space.md,
    paddingBottom: 40,
  },
  cacheNoticeBanner: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: '#F59E0B',
    borderWidth: 1,
    borderRadius: 12,
    padding: space.sm,
    marginBottom: space.sm,
  },
  staleBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#EF4444',
  },
  cacheNoticeText: {
    fontSize: 12,
    color: '#FDE68A',
    fontWeight: '600',
    textAlign: 'center',
  },
  lotSummaryCard: {
    backgroundColor: 'rgba(15, 35, 40, 0.85)',
    borderRadius: 16,
    padding: space.md,
    marginBottom: space.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  lotSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  lotRefText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  lotStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  lotStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  lotMetaText: {
    fontSize: 13,
    color: colors.textSecondary || '#94A3B8',
  },
  benchmarkCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderRadius: 16,
    padding: space.md,
    marginBottom: space.md,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  benchmarkHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#34D399',
    marginBottom: 4,
  },
  benchmarkValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  benchmarkTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6EE7B7',
    marginTop: 2,
  },
  benchmarkNote: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 6,
    fontStyle: 'italic',
  },
  loadingContainer: {
    padding: space.xl,
    alignItems: 'center',
  },
  loadingText: {
    color: colors.textSecondary || '#94A3B8',
    marginTop: space.sm,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#EF4444',
    borderWidth: 1,
    borderRadius: 12,
    padding: space.md,
    alignItems: 'center',
    marginBottom: space.md,
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: space.sm,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#EF4444',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: space.xl,
    backgroundColor: 'rgba(15, 35, 40, 0.6)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: space.sm,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  emptyDescription: {
    fontSize: 13,
    color: colors.textSecondary || '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: space.md,
  },
  findRecyclerCta: {
    backgroundColor: '#10B981',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  findRecyclerCtaText: {
    color: '#071E22',
    fontWeight: '700',
    fontSize: 15,
  },
  sortBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 6,
  },
  sortLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
    marginRight: 4,
  },
  sortChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sortChipActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    borderColor: '#10B981',
  },
  sortChipText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  sortChipTextActive: {
    color: '#34D399',
    fontWeight: '700',
  },
  quoteCard: {
    backgroundColor: 'rgba(15, 35, 40, 0.85)',
    borderRadius: 18,
    padding: space.md,
    marginBottom: space.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: space.sm,
  },
  recyclerInfo: {
    flex: 1,
    marginRight: space.sm,
  },
  recyclerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: '#10B981',
    borderWidth: 1,
  },
  statusAccepted: {
    backgroundColor: 'rgba(34, 197, 94, 0.3)',
    borderColor: '#22C55E',
    borderWidth: 1,
  },
  statusRejected: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: '#EF4444',
    borderWidth: 1,
  },
  statusExpired: {
    backgroundColor: 'rgba(156, 163, 175, 0.2)',
    borderColor: '#9CA3AF',
    borderWidth: 1,
  },
  statusCancelled: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderColor: '#F59E0B',
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  verifiedBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderColor: '#3B82F6',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#93C5FD',
  },
  quoteRefText: {
    fontSize: 11,
    color: colors.textSecondary || '#94A3B8',
    fontFamily: 'monospace',
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: space.sm,
    marginBottom: space.sm,
  },
  priceLabel: {
    fontSize: 11,
    color: colors.textSecondary || '#94A3B8',
    marginBottom: 2,
  },
  priceValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#10B981',
  },
  priceUnit: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94A3B8',
  },
  quantityLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  totalContainer: {
    alignItems: 'flex-end',
  },
  totalLabel: {
    fontSize: 11,
    color: colors.textSecondary || '#94A3B8',
    marginBottom: 2,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  specRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
    paddingVertical: 4,
  },
  specText: {
    fontSize: 12,
    color: '#CBD5E1',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  metaText: {
    fontSize: 11,
    color: colors.textSecondary || '#94A3B8',
  },
  reasonContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    padding: 6,
    marginVertical: 4,
  },
  reasonText: {
    fontSize: 11,
    color: '#FCA5A5',
  },
  cancellationText: {
    fontSize: 11,
    color: '#FCD34D',
  },
  cardActions: {
    marginTop: space.sm,
    paddingTop: space.xs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  speakButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 8,
    minHeight: 48,
    minWidth: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  speakButtonText: {
    fontSize: 12,
    color: '#CBD5E1',
    fontWeight: '600',
  },
  decisionRow: {
    flexDirection: 'row',
    gap: space.sm,
  },
  rejectButton: {
    flex: 1,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#EF4444',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectButtonText: {
    color: '#EF4444',
    fontWeight: '700',
    fontSize: 13,
  },
  counterButton: {
    flex: 1,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: '#3B82F6',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterButtonText: {
    color: '#60A5FA',
    fontWeight: '700',
    fontSize: 13,
  },
  acceptButton: {
    flex: 2,
    backgroundColor: '#10B981',
    borderRadius: 10,
    paddingVertical: 12,
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptButtonText: {
    color: '#071E22',
    fontWeight: '800',
    fontSize: 14,
  },
  handoverButton: {
    flex: 1,
    backgroundColor: '#8B5CF6',
    borderRadius: 10,
    paddingVertical: 12,
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  handoverButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: space.md,
  },
  modalCard: {
    backgroundColor: '#0F2328',
    borderRadius: 20,
    padding: space.lg,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
    marginBottom: space.md,
  },
  modalQuoteSummary: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: space.sm,
    marginBottom: space.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  confirmLabel: {
    fontSize: 13,
    color: '#94A3B8',
  },
  confirmValue: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  modalWarningText: {
    fontSize: 11,
    color: '#FCD34D',
    lineHeight: 16,
    marginBottom: space.md,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: 8,
    borderRadius: 8,
  },
  modalActions: {
    flexDirection: 'row',
    gap: space.sm,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  modalCancelButtonText: {
    color: '#CBD5E1',
    fontWeight: '600',
    fontSize: 13,
  },
  modalConfirmAcceptButton: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  modalConfirmAcceptButtonText: {
    color: '#071E22',
    fontWeight: '800',
    fontSize: 14,
  },
  modalConfirmCounterButton: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  modalConfirmCounterButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  modalConfirmRejectButton: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  modalConfirmRejectButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  inputLabel: {
    fontSize: 12,
    color: '#CBD5E1',
    marginBottom: 4,
    fontWeight: '600',
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    marginBottom: space.sm,
  },
  textAreaInput: {
    height: 70,
    textAlignVertical: 'top',
  },
  calcPreview: {
    fontSize: 11,
    color: '#34D399',
    marginBottom: space.sm,
    fontWeight: '600',
  },
  reasonOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  reasonOptionSelected: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#EF4444',
  },
  reasonOptionText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  reasonOptionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    marginBottom: 8,
  },
  modalWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: 8,
    borderRadius: 8,
    marginBottom: space.md,
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  reasonOptionInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lotMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  benchmarkHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
});

export default CollectorQuotesScreen;
