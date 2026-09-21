/**
 * CollectorLotTraceScreen.tsx
 * Authenticated Collector & Recycler — Journey B End-to-End Traceability Screen
 *
 * Displays the complete lifecycle of a collector-sourced Material Lot:
 * MATERIAL LOT → MATERIALS → PHOTOS → LOCATION → PRICE → QUOTE → RECYCLER
 * → HANDOVER → TRANSACTION → PAYMENT → RECYCLING → AUDIT
 *
 * Canonical Reference: SIH 26229 Prompt 11, docs/25_SIH_26229_REQUIREMENTS.md Section 15
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { TopAppBar } from '../../components/layout/TopAppBar';
import { EcoSetuBackground } from '../../components/eco';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { lotTraceService, LotTraceData } from '../../services/lotTraceService';
import { voiceService } from '../../services/voiceService';
import { useI18n } from '../../i18n';

export const CollectorLotTraceScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { t, language } = useI18n();

  const lotId = route.params?.lotId || route.params?.id;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [trace, setTrace] = useState<LotTraceData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const loadTrace = useCallback(async () => {
    if (!lotId) {
      setError('Lot ID is missing');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const data = await lotTraceService.fetchLotTrace(lotId);
      setTrace(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load lot trace');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [lotId]);

  useEffect(() => {
    loadTrace();
  }, [loadTrace]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadTrace();
  };

  const handleSpeak = async () => {
    if (!trace) return;

    if (isSpeaking) {
      await voiceService.stop();
      setIsSpeaking(false);
      return;
    }

    const speechText = lotTraceService.generateLotTraceSpeechText(trace, language);
    setIsSpeaking(true);
    try {
      await voiceService.speak(speechText, { language, force: true });
    } catch (err) {
      console.warn('TTS error:', err);
    } finally {
      setIsSpeaking(false);
    }
  };

  if (loading && !refreshing) {
    return (
      <EcoSetuBackground>
        <SafeAreaView style={styles.safeArea}>
          <TopAppBar title={t('lotTrace.title')} showBack onBack={() => navigation.goBack()} />
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary || '#14B8A6'} />
            <Text style={styles.loadingText}>{t('lotTrace.loading')}</Text>
          </View>
        </SafeAreaView>
      </EcoSetuBackground>
    );
  }

  if (error || !trace) {
    return (
      <EcoSetuBackground>
        <SafeAreaView style={styles.safeArea}>
          <TopAppBar title={t('lotTrace.title')} showBack onBack={() => navigation.goBack()} />
          <View style={styles.centerContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorText}>{error || 'Trace information unavailable'}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadTrace}>
              <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </EcoSetuBackground>
    );
  }

  return (
    <EcoSetuBackground>
      <SafeAreaView style={styles.safeArea}>
        <TopAppBar
          title={t('lotTrace.title')}
          showBack
          onBack={() => navigation.goBack()}
        />

        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary || '#14B8A6'}
            />
          }
        >
          {/* Offline Banner */}
          {trace.isOfflineCached && (
            <View style={styles.offlineBanner}>
              <Text style={styles.offlineBannerText}>
                📶 {t('lotTrace.offlineCached')}
                {trace.cachedAt ? ` (${new Date(trace.cachedAt).toLocaleTimeString()})` : ''}
              </Text>
              {trace.isStale && (
                <Text style={styles.staleBannerText}>
                  ⚠️ {t('lotTrace.staleWarning')}
                </Text>
              )}
            </View>
          )}

          {/* Hero Summary Card */}
          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <View style={styles.refBadge}>
                <Text style={styles.refText}>{trace.lot.referenceNumber}</Text>
              </View>
              <View style={[styles.statusBadge, trace.finalStatus.isComplete ? styles.statusComplete : styles.statusProgress]}>
                <Text style={styles.statusText}>{trace.finalStatus.statusLabel}</Text>
              </View>
            </View>

            <Text style={styles.heroCategory}>{trace.lot.category}</Text>
            {trace.lot.subcategory && (
              <Text style={styles.heroSubcategory}>{trace.lot.subcategory}</Text>
            )}

            <View style={styles.heroMetrics}>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>{t('lotTrace.weight')}</Text>
                <Text style={styles.metricValue}>
                  {trace.lot.approximateTotalWeightKg ? `${trace.lot.approximateTotalWeightKg} kg` : '—'}
                </Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>{t('lotTrace.created')}</Text>
                <Text style={styles.metricValue}>
                  {new Date(trace.lot.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>{t('lotTrace.items')}</Text>
                <Text style={styles.metricValue}>{trace.materials.length}</Text>
              </View>
            </View>

            {/* TTS Action Button */}
            <TouchableOpacity
              style={[styles.ttsButton, isSpeaking && styles.ttsButtonSpeaking]}
              onPress={handleSpeak}
              accessibilityRole="button"
              accessibilityLabel={t('lotTrace.listenJourney') || 'Listen to lot journey'}
            >
              <Text style={styles.ttsButtonText}>
                {isSpeaking ? '🔊 ' + t('lotTrace.stopAudio') : '🔊 ' + t('lotTrace.readJourney')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* 1. Material & Photos Section */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>📦</Text>
              <Text style={styles.sectionTitle}>{t('lotTrace.materialsTitle')}</Text>
            </View>

            {trace.lot.description ? (
              <Text style={styles.sectionDescription}>{trace.lot.description}</Text>
            ) : null}

            {trace.materials.length > 0 ? (
              <View style={styles.materialsList}>
                {trace.materials.map((mat, idx) => (
                  <View key={mat.id || idx} style={styles.materialRow}>
                    <Text style={styles.materialBullet}>•</Text>
                    <Text style={styles.materialText}>
                      {mat.category} {mat.subcategory ? `(${mat.subcategory})` : ''} — {mat.approximateWeightKg ? `${mat.approximateWeightKg} kg` : 'Weight unrecorded'}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyNote}>{t('lotTrace.noItems')}</Text>
            )}

            {/* Photos Grid */}
            {trace.photos.length > 0 ? (
              <View style={styles.photoGrid}>
                {trace.photos.map((p, idx) => (
                  <Image key={p.id || idx} source={{ uri: p.photoUrl }} style={styles.thumbnail} />
                ))}
              </View>
            ) : (
              <Text style={styles.emptyNote}>{t('lotTrace.noPhotos')}</Text>
            )}
          </View>

          {/* 2. Collection Location */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>📍</Text>
              <Text style={styles.sectionTitle}>{t('lotTrace.locationTitle')}</Text>
            </View>
            <Text style={styles.locationText}>
              {trace.collection.locationRecorded
                ? `GPS: ${trace.collection.displayText} (±${trace.collection.accuracy || '—'}m)`
                : t('lotTrace.locationNotRecorded')}
            </Text>
            <Text style={styles.subtext}>
              {t('lotTrace.collectionTime')}: {new Date(trace.collection.collectedAt).toLocaleString()}
            </Text>
          </View>

          {/* 3. Market Price Benchmark */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>💰</Text>
              <Text style={styles.sectionTitle}>{t('lotTrace.priceTitle')}</Text>
            </View>
            {trace.price.status === 'AVAILABLE' ? (
              <View>
                <Text style={styles.priceHighlight}>{trace.price.displayText}</Text>
                <Text style={styles.subtext}>
                  {t('lotTrace.priceSource')}: {trace.price.source || 'Admin Verified Rate'}
                </Text>
              </View>
            ) : (
              <Text style={styles.emptyNote}>{t('lotTrace.priceUnavailable')}</Text>
            )}
          </View>

          {/* 4. Quotations Section */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>💬</Text>
              <Text style={styles.sectionTitle}>{t('lotTrace.quotesTitle')}</Text>
            </View>

            {trace.quotes.length > 0 ? (
              trace.quotes.map((q) => (
                <View key={q.id} style={[styles.quoteCard, q.isAccepted && styles.acceptedQuoteCard]}>
                  <View style={styles.quoteTopRow}>
                    <Text style={styles.quoteRecycler}>{q.recyclerName}</Text>
                    {q.isAccepted && (
                      <View style={styles.acceptedBadge}>
                        <Text style={styles.acceptedBadgeText}>✓ {t('lotTrace.accepted')}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.quoteTotal}>₹{q.quotedTotal} ({q.quotedQuantity} kg @ ₹{q.quotedUnitPrice}/kg)</Text>
                  <Text style={styles.subtext}>Ref: {q.referenceNumber} • Status: {q.status}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyNote}>{t('lotTrace.noQuotes')}</Text>
            )}
          </View>

          {/* 5. Recycler Information */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>♻️</Text>
              <Text style={styles.sectionTitle}>{t('lotTrace.recyclerTitle')}</Text>
            </View>

            {trace.recycler.status === 'SELECTED' ? (
              <View>
                <Text style={styles.recyclerFacility}>{trace.recycler.facilityName}</Text>
                <Text style={styles.subtext}>
                  {t('lotTrace.authStatus')}: {trace.recycler.authorizationStatus}
                </Text>
                {trace.recycler.serviceArea && (
                  <Text style={styles.subtext}>
                    {t('lotTrace.serviceArea')}: {trace.recycler.serviceArea}
                  </Text>
                )}
                {trace.recycler.contact?.phone && (
                  <Text style={styles.subtext}>
                    {t('lotTrace.contact')}: {trace.recycler.contact.phone}
                  </Text>
                )}
              </View>
            ) : (
              <Text style={styles.emptyNote}>{trace.recycler.message || t('lotTrace.recyclerNotSelected')}</Text>
            )}
          </View>

          {/* 6. Handover Section */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>🤝</Text>
              <Text style={styles.sectionTitle}>{t('lotTrace.handoverTitle')}</Text>
            </View>

            {trace.handover.status !== 'NOT_INITIATED' ? (
              <View>
                <View style={styles.rowBetween}>
                  <Text style={styles.handoverRef}>{trace.handover.referenceNumber}</Text>
                  <View style={[styles.statusBadge, trace.handover.status === 'CONFIRMED' ? styles.statusComplete : styles.statusProgress]}>
                    <Text style={styles.statusText}>{trace.handover.status}</Text>
                  </View>
                </View>
                <Text style={styles.subtext}>
                  {t('lotTrace.declaredWeight')}: {trace.handover.declaredWeightKg || '—'} kg • {t('lotTrace.actualWeight')}: {trace.handover.handoverWeightKg || '—'} kg
                </Text>
                {trace.handover.receiptAvailable && (
                  <TouchableOpacity
                    style={styles.receiptButton}
                    onPress={() => navigation.navigate('CollectorHandoverReceipt', { handoverId: trace.handover.id })}
                  >
                    <Text style={styles.receiptButtonText}>📄 {t('lotTrace.viewReceipt')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <Text style={styles.emptyNote}>{trace.handover.message || t('lotTrace.handoverNotInitiated')}</Text>
            )}
          </View>

          {/* 7. Sale & Payment Section */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>💵</Text>
              <Text style={styles.sectionTitle}>{t('lotTrace.paymentTitle')}</Text>
            </View>

            {trace.transaction.status !== 'NOT_RECORDED' ? (
              <View>
                <View style={styles.rowBetween}>
                  <Text style={styles.txnRef}>{trace.transaction.referenceNumber}</Text>
                  <View style={[styles.statusBadge, trace.payment.status === 'PAID' ? styles.statusComplete : styles.statusProgress]}>
                    <Text style={styles.statusText}>{trace.payment.status}</Text>
                  </View>
                </View>
                <Text style={styles.paymentSummary}>{trace.payment.displayText}</Text>
                <Text style={styles.subtext}>
                  {t('lotTrace.method')}: {trace.transaction.paymentMethod} • {t('lotTrace.date')}: {new Date(trace.transaction.transactionDate || '').toLocaleDateString()}
                </Text>
              </View>
            ) : (
              <Text style={styles.emptyNote}>{trace.transaction.message || t('lotTrace.paymentNotRecorded')}</Text>
            )}
          </View>

          {/* 8. Recycling Processing Section */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>♻️</Text>
              <Text style={styles.sectionTitle}>{t('lotTrace.recyclingTitle')}</Text>
            </View>

            {trace.recycling.status !== 'NOT_RECORDED' ? (
              <View>
                <Text style={styles.recyclingStatus}>{trace.recycling.status}</Text>
                {trace.recycling.outputDescription && (
                  <Text style={styles.subtext}>{trace.recycling.outputDescription}</Text>
                )}
              </View>
            ) : (
              <Text style={styles.emptyNote}>{trace.recycling.message || t('lotTrace.recyclingNotRecorded')}</Text>
            )}
          </View>

          {/* 9. Chronological Timeline */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>🕒</Text>
              <Text style={styles.sectionTitle}>{t('lotTrace.timelineTitle')}</Text>
            </View>

            <View style={styles.timelineList}>
              {trace.timeline.map((event, idx) => {
                const isDone = event.status === 'COMPLETED';
                const isAction = event.status === 'ACTION_REQUIRED';

                return (
                  <View key={event.id || idx} style={styles.timelineItem}>
                    <View style={styles.timelineIndicatorCol}>
                      <View style={[styles.timelineNode, isDone && styles.timelineNodeDone, isAction && styles.timelineNodeAction]}>
                        <Text style={[styles.timelineNodeText, isDone && styles.timelineNodeTextDone]}>{event.icon}</Text>
                      </View>
                      {idx < trace.timeline.length - 1 && <View style={[styles.timelineLine, isDone && styles.timelineLineDone]} />}
                    </View>
                    <View style={styles.timelineContent}>
                      <Text style={[styles.timelineTitle, isDone && styles.timelineTitleDone]}>{event.title}</Text>
                      <Text style={styles.timelineDesc}>{event.description}</Text>
                      {event.timestamp && (
                        <Text style={styles.timelineTime}>{new Date(event.timestamp).toLocaleString()}</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* 10. Append-Only Audit Trail */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>📋</Text>
              <Text style={styles.sectionTitle}>{t('lotTrace.auditTitle')}</Text>
            </View>

            {trace.audit.length > 0 ? (
              <View style={styles.auditList}>
                {trace.audit.map((entry) => (
                  <View key={entry.id} style={styles.auditRow}>
                    <Text style={styles.auditBullet}>•</Text>
                    <View style={styles.auditContent}>
                      <Text style={styles.auditAction}>{entry.action}</Text>
                      <Text style={styles.auditTime}>
                        {new Date(entry.timestamp).toLocaleString()} • {entry.actorRole}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyNote}>{t('lotTrace.noAudit')}</Text>
            )}
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
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.spaceMd || 16,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#94A3B8',
    marginTop: 12,
    fontSize: 15,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: colors.primary || '#14B8A6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#071E22',
    fontWeight: '700',
    fontSize: 15,
  },
  offlineBanner: {
    backgroundColor: '#3E2723',
    borderColor: '#F59E0B',
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
  },
  offlineBannerText: {
    color: '#FDE68A',
    fontSize: 13,
    fontWeight: '600',
  },
  staleBannerText: {
    color: '#F87171',
    fontSize: 12,
    marginTop: 4,
  },
  heroCard: {
    backgroundColor: '#0F2328',
    borderColor: '#1E3A3A',
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  refBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  refText: {
    color: '#38BDF8',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusComplete: {
    backgroundColor: '#064E3B',
  },
  statusProgress: {
    backgroundColor: '#1E293B',
  },
  statusText: {
    color: '#34D399',
    fontSize: 12,
    fontWeight: '700',
  },
  heroCategory: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 2,
  },
  heroSubcategory: {
    color: '#94A3B8',
    fontSize: 14,
    marginBottom: 14,
  },
  heroMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#071A1E',
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricLabel: {
    color: '#64748B',
    fontSize: 11,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  metricValue: {
    color: '#E2E8F0',
    fontSize: 15,
    fontWeight: '700',
  },
  ttsButton: {
    backgroundColor: '#0c4a6e',
    borderColor: '#38BDF8',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ttsButtonSpeaking: {
    backgroundColor: '#0369a1',
  },
  ttsButtonText: {
    color: '#E0F2FE',
    fontSize: 14,
    fontWeight: '700',
  },
  sectionCard: {
    backgroundColor: '#0B1D22',
    borderColor: '#1E3A3A',
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  sectionTitle: {
    color: '#F1F5F9',
    fontSize: 16,
    fontWeight: '700',
  },
  sectionDescription: {
    color: '#CBD5E1',
    fontSize: 13,
    marginBottom: 10,
    lineHeight: 18,
  },
  materialsList: {
    marginBottom: 10,
  },
  materialRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  materialBullet: {
    color: '#14B8A6',
    marginRight: 8,
    fontSize: 14,
  },
  materialText: {
    color: '#E2E8F0',
    fontSize: 13,
    flex: 1,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#1E293B',
  },
  emptyNote: {
    color: '#64748B',
    fontSize: 13,
    fontStyle: 'italic',
  },
  locationText: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  subtext: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  priceHighlight: {
    color: '#34D399',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  quoteCard: {
    backgroundColor: '#071E22',
    borderColor: '#1E293B',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  acceptedQuoteCard: {
    borderColor: '#10B981',
    backgroundColor: '#063B2B',
  },
  quoteTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  quoteRecycler: {
    color: '#F8FAFC',
    fontWeight: '700',
    fontSize: 14,
  },
  acceptedBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  acceptedBadgeText: {
    color: '#071E22',
    fontWeight: '800',
    fontSize: 10,
  },
  quoteTotal: {
    color: '#38BDF8',
    fontSize: 14,
    fontWeight: '700',
    marginVertical: 2,
  },
  recyclerFacility: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  handoverRef: {
    color: '#38BDF8',
    fontSize: 15,
    fontWeight: '700',
  },
  receiptButton: {
    backgroundColor: '#0F2D2E',
    borderColor: '#14B8A6',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  receiptButtonText: {
    color: '#34D399',
    fontWeight: '700',
    fontSize: 13,
  },
  txnRef: {
    color: '#F59E0B',
    fontSize: 15,
    fontWeight: '700',
  },
  paymentSummary: {
    color: '#F1F5F9',
    fontSize: 14,
    fontWeight: '700',
    marginVertical: 4,
  },
  recyclingStatus: {
    color: '#A7F3D0',
    fontSize: 15,
    fontWeight: '700',
  },
  timelineList: {
    marginTop: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    minHeight: 56,
  },
  timelineIndicatorCol: {
    width: 28,
    alignItems: 'center',
    marginRight: 10,
  },
  timelineNode: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    borderColor: '#475569',
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  timelineNodeDone: {
    backgroundColor: '#065F46',
    borderColor: '#34D399',
  },
  timelineNodeAction: {
    backgroundColor: '#78350F',
    borderColor: '#F59E0B',
  },
  timelineNodeText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '800',
  },
  timelineNodeTextDone: {
    color: '#A7F3D0',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#334155',
    marginVertical: 2,
  },
  timelineLineDone: {
    backgroundColor: '#059669',
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 14,
  },
  timelineTitle: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  timelineTitleDone: {
    color: '#F1F5F9',
    fontWeight: '700',
  },
  timelineDesc: {
    color: '#CBD5E1',
    fontSize: 12,
  },
  timelineTime: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  auditList: {
    marginTop: 6,
  },
  auditRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  auditBullet: {
    color: '#64748B',
    marginRight: 8,
    fontSize: 12,
  },
  auditContent: {
    flex: 1,
  },
  auditAction: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
  },
  auditTime: {
    color: '#64748B',
    fontSize: 11,
  },
});

export default CollectorLotTraceScreen;
