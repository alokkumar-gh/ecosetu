/**
 * EcoSetu Collector Quotes Screen
 * Canonical Reference: docs/25_SIH_26229_REQUIREMENTS.md Section 10 (SIH-QUOTE-001..006)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useI18n } from '../../i18n';
import { EcoSetuBackground } from '../../components/eco';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { quoteService, RecyclerQuote, LotQuotesResponse } from '../../services/quoteService';
import voiceService from '../../services/voiceService';
import networkService from '../../services/networkService';

const space = {
  xs: spacing.spaceXs,
  sm: spacing.spaceSm,
  md: spacing.spaceMd,
  lg: spacing.spaceLg,
  xl: spacing.spaceXl,
};

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

  // Decision Modals
  const [selectedQuote, setSelectedQuote] = useState<RecyclerQuote | null>(null);
  const [acceptModalVisible, setAcceptModalVisible] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState<string>('PRICE_TOO_LOW');
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
        t('quotation.connectToAccept')
      );
      return;
    }

    setActionLoading(true);
    try {
      await quoteService.acceptQuote(selectedQuote.id);
      setAcceptModalVisible(false);
      setSelectedQuote(null);
      Alert.alert(
        t('quotation.quoteAccepted'),
        t('quotation.acceptanceNotice')
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
        t('quotation.connectToReject')
      );
      return;
    }

    setActionLoading(true);
    try {
      await quoteService.rejectQuote(selectedQuote.id, rejectReason);
      setRejectModalVisible(false);
      setSelectedQuote(null);
      Alert.alert(
        t('quotation.quoteRejected'),
        t('quotation.quoteRejected')
      );
      fetchQuotes();
    } catch (err: any) {
      Alert.alert(t('common.error') || 'Error', err.message || 'Failed to reject quote');
    } finally {
      setActionLoading(false);
    }
  };

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
        return `✓ ${t('quotation.accepted')}`;
      case 'REJECTED':
        return `✗ ${t('quotation.rejected')}`;
      case 'EXPIRED':
        return `⏱ ${t('quotation.expired')}`;
      case 'CANCELLED':
        return `⊘ ${t('quotation.cancelled')}`;
      case 'VIEWED':
        return `👁 ${t('quotation.viewed')}`;
      case 'SENT':
      default:
        return `● ${t('quotation.active')}`;
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
          <Text style={styles.headerTitle}>{t('quotation.title')}</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10B981" />}
        >
          {/* Offline / Cached Notice */}
          {lotData?.isFromCache ? (
            <View style={[styles.cacheNoticeBanner, lotData.isStale && styles.staleBanner]}>
              <Text style={styles.cacheNoticeText}>
                {lotData.isStale ? `⚠️ ${t('recyclerMatching.staleCacheWarning')}` : `💾 ${t('quotation.offlineNotice')}`}
              </Text>
            </View>
          ) : null}

          {/* Lot Context Header Card */}
          <View style={styles.lotSummaryCard}>
            <View style={styles.lotSummaryRow}>
              <Text style={styles.lotRefText}>{lotData?.lotReference || initialLot?.referenceNumber || 'LOT'}</Text>
              <View style={[styles.lotStatusBadge, isLotAccepted ? styles.statusAccepted : styles.statusActive]}>
                <Text style={styles.lotStatusText}>
                  {isLotAccepted ? t('quotation.accepted') : (lotData?.lotStatus || initialLot?.status || 'QUOTED')}
                </Text>
              </View>
            </View>
            <Text style={styles.lotMetaText}>
              📦 {lotData?.category || initialLot?.category}
              {lotData?.subcategory ? ` • ${lotData.subcategory}` : ''}
              {lotData?.weightKg ? ` • ${lotData.weightKg} kg` : ''}
            </Text>
          </View>

          {/* Benchmark Market Valuation Context */}
          {lotData?.benchmarkEstimate && lotData.benchmarkEstimate.status === 'AVAILABLE' ? (
            <View style={styles.benchmarkCard}>
              <Text style={styles.benchmarkHeader}>📊 {t('recyclerMatching.marketEstimateTitle')}</Text>
              <Text style={styles.benchmarkValue}>
                ₹{lotData.benchmarkEstimate.marketRangeLow} – ₹{lotData.benchmarkEstimate.marketRangeHigh} / kg
              </Text>
              {lotData.benchmarkEstimate.estimatedLow ? (
                <Text style={styles.benchmarkTotal}>
                  Est. Lot Value: ₹{Math.round(lotData.benchmarkEstimate.estimatedLow)} – ₹{Math.round(lotData.benchmarkEstimate.estimatedHigh)}
                </Text>
              ) : null}
              <Text style={styles.benchmarkNote}>
                {t('recyclerMatching.marketEstimateNote')}
              </Text>
            </View>
          ) : null}

          {/* Loading Indicator */}
          {loading && !refreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#10B981" />
              <Text style={styles.loadingText}>{t('common.loading')}</Text>
            </View>
          ) : null}

          {/* Error Message */}
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={fetchQuotes}>
                <Text style={styles.retryButtonText}>{t('common.retry') || 'Retry'}</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Empty State */}
          {!loading && !error && (!lotData?.quotes || lotData.quotes.length === 0) ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📨</Text>
              <Text style={styles.emptyTitle}>{t('quotation.noQuotesYet')}</Text>
              <Text style={styles.emptyDescription}>{t('quotation.noQuotesDescription')}</Text>
              <TouchableOpacity
                style={styles.findRecyclerCta}
                onPress={() => navigation.navigate('CollectorRecyclerMatches', { lotId })}
              >
                <Text style={styles.findRecyclerCtaText}>🔍 {t('recyclerMatching.findRecycler')}</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Quotes List */}
          {lotData?.quotes?.map((quote) => {
            const canDecide = !isLotAccepted && ['SENT', 'VIEWED'].includes(quote.status) && !quote.isExpired;

            return (
              <View key={quote.id} style={styles.quoteCard}>
                {/* Quote Card Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.recyclerInfo}>
                    <Text style={styles.recyclerName}>{quote.recycler?.facilityName || 'Recycler'}</Text>
                    <View style={styles.badgeRow}>
                      <View style={[styles.statusBadge, getStatusBadgeStyle(quote.status)]}>
                        <Text style={styles.statusBadgeText}>{getStatusText(quote.status)}</Text>
                      </View>
                      {quote.recycler?.user?.isVerified ? (
                        <View style={styles.verifiedBadge}>
                          <Text style={styles.verifiedBadgeText}>✓ {t('recyclerMatching.authorized')}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                  <Text style={styles.quoteRefText}>{quote.referenceNumber}</Text>
                </View>

                {/* Quoted Price Banner */}
                <View style={styles.priceContainer}>
                  <View>
                    <Text style={styles.priceLabel}>{t('quotation.quotedRate')}</Text>
                    <Text style={styles.priceValue}>
                      ₹{quote.quotedUnitPrice} <Text style={styles.priceUnit}>/ {quote.unit === 'PER_KG' ? 'kg' : quote.unit}</Text>
                    </Text>
                  </View>
                  {quote.quotedTotal ? (
                    <View style={styles.totalContainer}>
                      <Text style={styles.totalLabel}>{t('quotation.quotedTotal')}</Text>
                      <Text style={styles.totalValue}>₹{quote.quotedTotal.toLocaleString()}</Text>
                    </View>
                  ) : null}
                </View>

                {/* Validity and Details */}
                <View style={styles.metaRow}>
                  <Text style={styles.metaText}>
                    📅 {t('quotation.validUntil')}: {new Date(quote.validUntil).toLocaleDateString()}
                  </Text>
                  {quote.recycler?.city ? (
                    <Text style={styles.metaText}>
                      📍 {quote.recycler.city}, {quote.recycler.state}
                    </Text>
                  ) : null}
                </View>

                {/* Notes if present */}
                {quote.notes ? (
                  <View style={styles.notesContainer}>
                    <Text style={styles.notesTitle}>📝 {t('quotation.notes')}:</Text>
                    <Text style={styles.notesText}>{quote.notes}</Text>
                  </View>
                ) : null}

                {/* Rejection / Cancellation Reason if present */}
                {quote.rejectionReason ? (
                  <View style={styles.reasonContainer}>
                    <Text style={styles.reasonText}>
                      ✗ {t('quotation.rejectionReason')}: {quote.rejectionReason}
                    </Text>
                  </View>
                ) : null}
                {quote.cancellationReason ? (
                  <View style={styles.reasonContainer}>
                    <Text style={styles.cancellationText}>
                      ⊘ {quote.cancellationReason === 'COMPETING_QUOTE_ACCEPTED' ? t('quotation.competingQuotesCancelledWarning') : quote.cancellationReason}
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
                    accessibilityLabel={t('quotation.speakQuote')}
                  >
                    <Text style={styles.speakButtonText}>🔊 {t('quotation.speakQuote')}</Text>
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
                        <Text style={styles.rejectButtonText}>✗ {t('quotation.rejectQuote')}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.acceptButton}
                        onPress={() => {
                          setSelectedQuote(quote);
                          setAcceptModalVisible(true);
                        }}
                      >
                        <Text style={styles.acceptButtonText}>✓ {t('quotation.acceptQuote')}</Text>
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
                        accessibilityLabel={t('handover.startHandover')}
                      >
                        <Text style={styles.handoverButtonText}>🤝 {t('handover.startHandover')}</Text>
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
              <Text style={styles.modalTitle}>🤝 {t('lowLiteracy.quoteConfirmTitle') || t('quotation.confirmAcceptTitle')}</Text>
              <Text style={styles.modalMessage}>{t('lowLiteracy.quoteConfirmMessage') || t('quotation.confirmAcceptMessage')}</Text>

              {selectedQuote ? (
                <View style={styles.modalQuoteSummary}>
                  <View style={styles.confirmRow}>
                    <Text style={styles.confirmLabel}>{t('lowLiteracy.buyer')}:</Text>
                    <Text style={styles.confirmValue}>{selectedQuote.recycler?.facilityName || 'Authorized Recycler'}</Text>
                  </View>
                  <View style={styles.confirmRow}>
                    <Text style={styles.confirmLabel}>{t('lowLiteracy.category')}:</Text>
                    <Text style={styles.confirmValue}>{lotData?.category || initialLot?.category || 'E-Waste'}</Text>
                  </View>
                  <View style={styles.confirmRow}>
                    <Text style={styles.confirmLabel}>{t('lowLiteracy.weight')}:</Text>
                    <Text style={styles.confirmValue}>{lotData?.weightKg || initialLot?.approximateTotalWeightKg || '—'} kg</Text>
                  </View>
                  <View style={styles.confirmRow}>
                    <Text style={styles.confirmLabel}>{t('lowLiteracy.rate')}:</Text>
                    <Text style={[styles.confirmValue, { color: '#10B981', fontWeight: '700' }]}>
                      ₹{selectedQuote.quotedUnitPrice} / {selectedQuote.unit === 'PER_KG' ? 'kg' : selectedQuote.unit}
                    </Text>
                  </View>
                  {selectedQuote.quotedTotal ? (
                    <View style={styles.confirmRow}>
                      <Text style={styles.confirmLabel}>{t('lowLiteracy.totalAmount')}:</Text>
                      <Text style={[styles.confirmValue, { color: '#34D399', fontWeight: '800', fontSize: 16 }]}>
                        ₹{selectedQuote.quotedTotal.toLocaleString()}
                      </Text>
                    </View>
                  ) : null}
                  {selectedQuote.validUntil ? (
                    <View style={styles.confirmRow}>
                      <Text style={styles.confirmLabel}>{t('lowLiteracy.validity')}:</Text>
                      <Text style={styles.confirmValue}>{new Date(selectedQuote.validUntil).toLocaleDateString()}</Text>
                    </View>
                  ) : null}
                </View>
              ) : null}

              <Text style={styles.modalWarningText}>
                ⚠️ {t('quotation.competingQuotesCancelledWarning')}
              </Text>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setAcceptModalVisible(false)}
                  disabled={actionLoading}
                  accessibilityRole="button"
                >
                  <Text style={styles.modalCancelButtonText}>{t('lowLiteracy.cancelAction') || t('common.cancel')}</Text>
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
                    <Text style={styles.modalConfirmAcceptButtonText}>✓ {t('lowLiteracy.acceptAction') || t('quotation.acceptQuote')}</Text>
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
              <Text style={styles.modalTitle}>✗ {t('quotation.confirmRejectTitle')}</Text>
              <Text style={styles.modalMessage}>{t('quotation.selectRejectReason')}</Text>

              {/* Reasons options */}
              {[
                { key: 'PRICE_TOO_LOW', label: t('quotation.priceTooLow') },
                { key: 'PICKUP_ISSUE', label: t('quotation.pickupIssue') },
                { key: 'TIMING_ISSUE', label: t('quotation.timingIssue') },
                { key: 'OTHER', label: t('quotation.otherReason') },
              ].map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={[styles.reasonOption, rejectReason === item.key && styles.reasonOptionSelected]}
                  onPress={() => setRejectReason(item.key)}
                >
                  <Text style={[styles.reasonOptionText, rejectReason === item.key && styles.reasonOptionTextSelected]}>
                    {rejectReason === item.key ? '● ' : '○ '}
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setRejectModalVisible(false)}
                  disabled={actionLoading}
                >
                  <Text style={styles.modalCancelButtonText}>{t('common.cancel')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalConfirmRejectButton}
                  onPress={handleRejectConfirm}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalConfirmRejectButtonText}>✗ {t('quotation.rejectQuote')}</Text>
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
  notesContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 8,
    padding: 8,
    marginVertical: 4,
  },
  notesTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#E2E8F0',
    marginBottom: 2,
  },
  notesText: {
    fontSize: 12,
    color: '#CBD5E1',
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
    fontSize: 15,
  },
  handoverButton: {
    flex: 1,
    backgroundColor: '#059669',
    borderColor: '#34D399',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  handoverButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.5,
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
    maxWidth: 380,
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
    color: colors.textSecondary || '#94A3B8',
    lineHeight: 18,
    marginBottom: space.md,
  },
  modalQuoteSummary: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: space.sm,
    marginBottom: space.sm,
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  confirmLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.65)',
    fontWeight: '500',
  },
  confirmValue: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'right',
    flexShrink: 1,
  },
  modalQuoteName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalQuoteAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#10B981',
    marginTop: 2,
  },
  modalWarningText: {
    fontSize: 11,
    color: '#FCD34D',
    marginBottom: space.md,
    lineHeight: 16,
  },
  reasonOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'transparent',
    minHeight: 48,
    justifyContent: 'center',
  },
  reasonOptionSelected: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  reasonOptionText: {
    color: '#CBD5E1',
    fontSize: 13,
  },
  reasonOptionTextSelected: {
    color: '#FCA5A5',
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: space.sm,
    marginTop: space.md,
  },
  modalCancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: '#CBD5E1',
    fontWeight: '600',
    fontSize: 13,
  },
  modalConfirmAcceptButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
    minHeight: 56,
  },
  modalConfirmAcceptButtonText: {
    color: '#071E22',
    fontWeight: '800',
    fontSize: 14,
  },
  modalConfirmRejectButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
    minHeight: 52,
  },
  modalConfirmRejectButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});

export default CollectorQuotesScreen;
