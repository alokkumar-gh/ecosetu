/**
 * RecyclerSourcingDetailScreen.tsx
 * Marketplace Phase 6: Recycler Sourcing Request Detail & Response Review
 *
 * Exposes full request parameters, lifecycle status toggles (Pause/Resume/Fulfill),
 * response review, quote transition, and "Source Again" generator.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import { TopAppBar } from '../../components/layout/TopAppBar';
import { GlassCard } from '../../components/glass/GlassCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EcoSetuBackground } from '../../components/glass/EcoSetuBackground';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { useI18n } from '../../i18n';
import sourcingService, {
  SourcingRequest,
  SourcingResponse,
  SourcingRequestStatus,
} from '../../services/sourcingService';

interface Props {
  navigation?: any;
  route?: {
    params?: {
      requestId: string;
      request?: SourcingRequest;
    };
  };
}

export const RecyclerSourcingDetailScreen: React.FC<Props> = ({
  navigation,
  route,
}) => {
  const { t } = useI18n();
  const requestId = route?.params?.requestId || '';

  const [request, setRequest] = useState<SourcingRequest | null>(
    route?.params?.request || null
  );
  const [responses, setResponses] = useState<SourcingResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(!route?.params?.request);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const req = await sourcingService.getRequestById(requestId);
      setRequest(req);
      const resList = await sourcingService.getResponsesForRequest(requestId);
      setResponses(resList);
    } catch (err: any) {
      setError(err.message || 'Failed to load sourcing details');
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStatusChange = async (newStatus: SourcingRequestStatus) => {
    try {
      setActionLoading(true);
      const updated = await sourcingService.updateRequestStatus(requestId, newStatus);
      setRequest(updated);
      Alert.alert(t('common.success', 'Success'), `Request status updated to ${newStatus}`);
    } catch (err: any) {
      Alert.alert(t('common.error', 'Error'), err.message || 'Status update failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSourceAgain = async () => {
    try {
      setActionLoading(true);
      const template = await sourcingService.getSourceAgainTemplate(requestId);
      navigation.navigate('RecyclerCreateSourcingRequest', { template });
    } catch (err: any) {
      Alert.alert(t('common.error', 'Error'), err.message || 'Failed to generate template');
    } finally {
      setActionLoading(false);
    }
  };

  const handleInitiateQuote = (res: SourcingResponse) => {
    // Navigate to create quote / continue deal
    Alert.alert(
      t('sourcing.initiateQuoteTitle', 'Request Formal Quote'),
      t(
        'sourcing.initiateQuoteDesc',
        `Initiate commercial negotiation for ${res.availableWeightKg} kg of ${request?.materialCategory}? This transitions into the canonical Quote workflow.`
      ),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('sourcing.proceedToQuote', 'Proceed to Quote'),
          onPress: () => {
            navigation.navigate('RecyclerCreateQuote', {
              sourcingResponseId: res.id,
              materialCategory: request?.materialCategory,
              quantity: res.availableWeightKg,
              collectorId: res.collectorId,
            });
          },
        },
      ]
    );
  };

  if (loading || !request) {
    return (
      <EcoSetuBackground>
        <SafeAreaView style={styles.safeArea}>
          <TopAppBar title={t('sourcing.requestDetails', 'Request Details')} onBack={() => navigation.goBack()} />
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </SafeAreaView>
      </EcoSetuBackground>
    );
  }

  const isUnpriced = !request.hasOfferedPrice || !request.offeredRatePerKg;
  const isOwnerOpen = request.status === 'OPEN';
  const isOwnerPaused = request.status === 'PAUSED';

  return (
    <EcoSetuBackground>
      <SafeAreaView style={styles.safeArea}>
        <TopAppBar
          title={request.materialCategory}
          subtitle={request.referenceNumber}
          onBack={() => navigation.goBack()}
        />

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Main Sourcing Request Details */}
          <GlassCard style={styles.card}>
            <View style={styles.headerRow}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{request.materialCategory}</Text>
              </View>
              <StatusBadge status={request.status} />
            </View>

            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>{t('sourcing.minQuantity', 'Min Quantity')}</Text>
                <Text style={styles.detailValue}>{request.minimumWeightKg} kg</Text>
              </View>

              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>{t('sourcing.targetWeight', 'Target')}</Text>
                <Text style={styles.detailValue}>
                  {request.targetWeightKg ? `${request.targetWeightKg} kg` : '—'}
                </Text>
              </View>

              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>{t('sourcing.offeredRate', 'Offered Rate')}</Text>
                <Text style={[styles.detailValue, isUnpriced && styles.unpricedText]}>
                  {isUnpriced
                    ? t('sourcing.priceDiscussed', 'Discussed after response')
                    : `₹${Number(request.offeredRatePerKg).toFixed(2)}/kg`}
                </Text>
              </View>
            </View>

            {request.conditionTemplate && (
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>{t('sourcing.condition', 'Condition:')} </Text>
                <Text style={styles.specValue}>{request.conditionTemplate.replace('_', ' ')}</Text>
              </View>
            )}

            {request.serviceArea && (
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>{t('sourcing.serviceArea', 'Service Area:')} </Text>
                <Text style={styles.specValue}>{request.serviceArea}</Text>
              </View>
            )}

            {request.notes && (
              <View style={styles.notesBox}>
                <Text style={styles.notesLabel}>{t('sourcing.instructions', 'Instructions:')}</Text>
                <Text style={styles.notesText}>{request.notes}</Text>
              </View>
            )}

            {/* Lifecycle Controls */}
            <View style={styles.controlsRow}>
              {isOwnerOpen && (
                <TouchableOpacity
                  style={[styles.controlBtn, styles.pauseBtn]}
                  onPress={() => handleStatusChange('PAUSED')}
                  disabled={actionLoading}
                >
                  <Text style={styles.pauseBtnText}>⏸ {t('sourcing.pause', 'Pause')}</Text>
                </TouchableOpacity>
              )}

              {isOwnerPaused && (
                <TouchableOpacity
                  style={[styles.controlBtn, styles.resumeBtn]}
                  onPress={() => handleStatusChange('OPEN')}
                  disabled={actionLoading}
                >
                  <Text style={styles.resumeBtnText}>▶️ {t('sourcing.resume', 'Resume')}</Text>
                </TouchableOpacity>
              )}

              {(isOwnerOpen || isOwnerPaused) && (
                <TouchableOpacity
                  style={[styles.controlBtn, styles.fulfillBtn]}
                  onPress={() => handleStatusChange('FULFILLED')}
                  disabled={actionLoading}
                >
                  <Text style={styles.fulfillBtnText}>✅ {t('sourcing.fulfill', 'Fulfill')}</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.controlBtn, styles.sourceAgainBtn]}
                onPress={handleSourceAgain}
                disabled={actionLoading}
              >
                <Text style={styles.sourceAgainText}>🔁 {t('sourcing.sourceAgain', 'Source Again')}</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>

          {/* Sourcing Responses Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {t('sourcing.collectorResponses', 'Collector Responses')} ({responses.length})
            </Text>
            <Text style={styles.sectionSubtitle}>
              {t('sourcing.responsesNotice', 'Review supply availability and initiate formal quotes')}
            </Text>
          </View>

          {responses.length === 0 ? (
            <GlassCard style={styles.emptyResponsesCard}>
              <Text style={styles.emptyIcon}>📬</Text>
              <Text style={styles.emptyTitle}>
                {t('sourcing.noResponsesYet', 'No Collector Responses Yet')}
              </Text>
              <Text style={styles.emptyDesc}>
                {t(
                  'sourcing.noResponsesDesc2',
                  'When eligible collectors respond with available material, they will appear here.'
                )}
              </Text>
            </GlassCard>
          ) : (
            responses.map((res) => (
              <GlassCard key={res.id} style={styles.responseCard}>
                <View style={styles.resHeader}>
                  <Text style={styles.resCollector}>
                    {res.collector?.user?.name || t('sourcing.verifiedCollector', 'Verified Collector')}
                  </Text>
                  <StatusBadge status={res.status} />
                </View>

                <Text style={styles.resRef}>{res.referenceNumber}</Text>

                <View style={styles.resGrid}>
                  <View style={styles.resGridItem}>
                    <Text style={styles.resGridLabel}>{t('sourcing.availableQuantity', 'Available')}</Text>
                    <Text style={styles.resGridValue}>{res.availableWeightKg} kg</Text>
                  </View>
                  <View style={styles.resGridItem}>
                    <Text style={styles.resGridLabel}>{t('sourcing.condition', 'Condition')}</Text>
                    <Text style={styles.resGridValue}>
                      {res.condition ? res.condition.replace('_', ' ') : 'Standard'}
                    </Text>
                  </View>
                  {res.pickupArea && (
                    <View style={styles.resGridItem}>
                      <Text style={styles.resGridLabel}>{t('sourcing.area', 'Area')}</Text>
                      <Text style={styles.resGridValue} numberOfLines={1}>
                        {res.pickupArea}
                      </Text>
                    </View>
                  )}
                </View>

                {res.notes && (
                  <Text style={styles.resNotes}>"{res.notes}"</Text>
                )}

                <View style={styles.resActions}>
                  <TouchableOpacity
                    style={styles.quoteActionBtn}
                    onPress={() => handleInitiateQuote(res)}
                  >
                    <Text style={styles.quoteActionText}>
                      💬 {t('sourcing.requestQuote', 'Request Quote / Start Deal')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </GlassCard>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </EcoSetuBackground>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.spaceMd,
    paddingBottom: spacing.spaceXl,
  },
  card: {
    padding: spacing.spaceMd,
    marginBottom: spacing.spaceLg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  detailsGrid: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 8,
    padding: spacing.spaceSm,
    marginBottom: 12,
    gap: spacing.spaceSm,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: colors.textTertiary,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  unpricedText: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  specRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  specLabel: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  specValue: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  notesBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: spacing.spaceSm,
    borderRadius: 6,
    marginTop: 8,
  },
  notesLabel: {
    fontSize: 11,
    color: colors.textTertiary,
    marginBottom: 2,
  },
  notesText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  controlsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: spacing.spaceMd,
    paddingTop: spacing.spaceSm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  controlBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  pauseBtn: {
    backgroundColor: 'rgba(234, 179, 8, 0.2)',
  },
  pauseBtnText: {
    color: '#FACC15',
    fontWeight: '600',
    fontSize: 12,
  },
  resumeBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  resumeBtnText: {
    color: colors.primaryLight,
    fontWeight: '600',
    fontSize: 12,
  },
  fulfillBtn: {
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
  },
  fulfillBtnText: {
    color: '#38BDF8',
    fontWeight: '600',
    fontSize: 12,
  },
  sourceAgainBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  sourceAgainText: {
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: 12,
  },
  sectionHeader: {
    marginBottom: spacing.spaceSm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  emptyResponsesCard: {
    padding: spacing.spaceLg,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  emptyDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  responseCard: {
    padding: spacing.spaceMd,
    marginBottom: spacing.spaceMd,
  },
  resHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resCollector: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  resRef: {
    fontSize: 11,
    color: colors.textTertiary,
    marginBottom: 8,
  },
  resGrid: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 8,
    padding: spacing.spaceSm,
    marginBottom: 8,
    gap: spacing.spaceSm,
  },
  resGridItem: {
    flex: 1,
  },
  resGridLabel: {
    fontSize: 10,
    color: colors.textTertiary,
  },
  resGridValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  resNotes: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: 10,
  },
  resActions: {
    marginTop: 4,
  },
  quoteActionBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  quoteActionText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
