/**
 * RecyclerBatchDetailScreen
 * Marketplace Phase 5: Consolidated Batch Detail & Lot-by-Lot Handover Execution
 *
 * Provides the operational hub for inspecting each material lot, advancing the
 * server-authoritative pickup status, viewing verified weights, and reviewing
 * the arithmetic consolidated settlement summary.
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
  RefreshControl,
} from 'react-native';
import { TopAppBar } from '../../components/layout/TopAppBar';
import { GlassCard } from '../../components/glass/GlassCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EcoSetuBackground } from '../../components/glass/EcoSetuBackground';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { useI18n } from '../../i18n';
import { useAuth } from '../../hooks/useAuth';
import pickupBatchService, { PickupBatch, BatchStatus, PickupBatchLot } from '../../services/pickupBatchService';
import { AppIcon } from '../../components/ui/AppIcon';

interface Props {
  navigation?: any;
  route?: {
    params: {
      batchId: string;
      batch?: PickupBatch;
    };
  };
}

export const RecyclerBatchDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useI18n();
  const { user } = useAuth();
  const batchId = route?.params?.batchId || '';

  const [batch, setBatch] = useState<PickupBatch | null>(route?.params?.batch || null);
  const [loading, setLoading] = useState<boolean>(!route?.params?.batch);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBatchDetail = useCallback(async () => {
    try {
      setError(null);
      const data = await pickupBatchService.getBatchById(batchId);
      setBatch(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch batch details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [batchId]);

  useEffect(() => {
    fetchBatchDetail();
  }, [fetchBatchDetail]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBatchDetail();
  };

  const handleStatusTransition = async (nextStatus: BatchStatus) => {
    try {
      setUpdatingStatus(true);
      const updated = await pickupBatchService.updateBatchStatus(batchId, { status: nextStatus });
      setBatch(updated);
      Alert.alert(
        t('logistics.statusUpdated'),
        t('logistics.statusUpdatedDesc')
      );
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message || 'Failed to update batch status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const isRecycler = user?.role === 'RECYCLER';

  const renderActionButtons = () => {
    if (!batch) return null;

    if (batch.status === 'COMPLETED' || batch.status === 'CANCELLED') {
      return null;
    }

    if (batch.status === 'SCHEDULED' || batch.status === 'PLANNED') {
      return (
        <TouchableOpacity
          style={styles.primaryActionBtn}
          disabled={updatingStatus}
          onPress={() => handleStatusTransition('IN_PROGRESS')}
        >
          {updatingStatus ? (
            <ActivityIndicator color="#071E22" />
          ) : (
            <View style={styles.btnRow}>
              <AppIcon name="truck" size={16} color="#071E22" />
              <Text style={styles.primaryActionBtnText}>{t('logistics.startPickup')}</Text>
            </View>
          )}
        </TouchableOpacity>
      );
    }

    if (batch.status === 'IN_PROGRESS') {
      return (
        <TouchableOpacity
          style={styles.primaryActionBtn}
          disabled={updatingStatus}
          onPress={() => handleStatusTransition('ARRIVED')}
        >
          {updatingStatus ? (
            <ActivityIndicator color="#071E22" />
          ) : (
            <View style={styles.btnRow}>
              <AppIcon name="mapPin" size={16} color="#071E22" />
              <Text style={styles.primaryActionBtnText}>{t('logistics.markArrived')}</Text>
            </View>
          )}
        </TouchableOpacity>
      );
    }

    if (batch.status === 'ARRIVED') {
      return (
        <TouchableOpacity
          style={styles.primaryActionBtn}
          disabled={updatingStatus}
          onPress={() => handleStatusTransition('COLLECTING')}
        >
          {updatingStatus ? (
            <ActivityIndicator color="#071E22" />
          ) : (
            <View style={styles.btnRow}>
              <AppIcon name="scale" size={16} color="#071E22" />
              <Text style={styles.primaryActionBtnText}>{t('logistics.startCollecting')}</Text>
            </View>
          )}
        </TouchableOpacity>
      );
    }

    if (batch.status === 'COLLECTING') {
      return (
        <TouchableOpacity
          style={[styles.primaryActionBtn, { backgroundColor: '#2EC4B6' }]}
          disabled={updatingStatus}
          onPress={() => handleStatusTransition('COMPLETED')}
        >
          {updatingStatus ? (
            <ActivityIndicator color="#071E22" />
          ) : (
            <View style={styles.btnRow}>
              <AppIcon name="check" size={16} color="#071E22" strokeWidth={2.5} />
              <Text style={styles.primaryActionBtnText}>{t('logistics.completeBatch')}</Text>
            </View>
          )}
        </TouchableOpacity>
      );
    }

    return null;
  };

  const renderLotItem = (lotItem: PickupBatchLot, index: number) => {
    const lot = lotItem.materialLot;
    if (!lot) return null;

    const acceptedQuote = lot.acceptedQuote;
    const handover = lotItem.handover;
    const transaction = lotItem.transaction;

    const isHandoverComplete = handover?.status === 'CONFIRMED' || lot.status === 'COMPLETED';

    return (
      <GlassCard key={lotItem.id} style={styles.lotCard}>
        <View style={styles.lotHeader}>
          <View style={styles.lotIndexBadge}>
            <Text style={styles.lotIndexText}>#{index + 1}</Text>
          </View>
          <View style={styles.lotTitleCol}>
            <Text style={styles.lotRef}>{lot.referenceNumber}</Text>
            <Text style={styles.lotCategory}>
              {lot.category.replace('_', ' ')}
              {lot.subcategory ? ` • ${lot.subcategory}` : ''}
            </Text>
          </View>
          <StatusBadge status={lot.status} />
        </View>

        <View style={styles.lotDetailsGrid}>
          <View style={styles.lotDetailItem}>
            <Text style={styles.detailLabel}>{t('logistics.estWeight')}</Text>
            <Text style={styles.detailValue}>{lot.approximateTotalWeightKg} kg</Text>
          </View>
          <View style={styles.lotDetailItem}>
            <Text style={styles.detailLabel}>{t('logistics.agreedRate')}</Text>
            <Text style={styles.detailValue}>
              ₹{acceptedQuote?.quotedUnitPrice || '—'}/{acceptedQuote?.unit === 'PER_KG' ? 'kg' : 'unit'}
            </Text>
          </View>
          <View style={styles.lotDetailItem}>
            <Text style={styles.detailLabel}>{t('logistics.verifiedWeight')}</Text>
            <Text style={[styles.detailValue, isHandoverComplete && { color: colors.primary }]}>
              {handover?.handoverWeightKg ? `${handover.handoverWeightKg} kg` : 'Pending'}
            </Text>
          </View>
        </View>

        {/* Lot Handover & Commercial Settlement Link */}
        <View style={styles.lotActionRow}>
          {transaction ? (
            <View style={styles.settlementBadge}>
              <AppIcon name="check" size={12} color="#10B981" strokeWidth={2.5} style={{ marginRight: 4 }} />
              <Text style={styles.settlementText}>
                {t('logistics.settled')}: ₹{transaction.finalSaleValue} ({transaction.paymentMethod})
              </Text>
            </View>
          ) : handover ? (
            <TouchableOpacity
              style={styles.lotActionBtn}
              onPress={() => {
                if (isRecycler) {
                  navigation.navigate('RecyclerHandoverConfirm', { handoverId: handover.id, handover });
                } else {
                  navigation.navigate('CollectorHandover', { handoverId: handover.id, handover });
                }
              }}
            >
              <Text style={styles.lotActionBtnText}>
                {isRecycler ? t('logistics.verifyHandover') : t('logistics.viewHandover')}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.lotActionBtn}
              onPress={() => {
                navigation.navigate('CollectorHandover', {
                  lotId: lot.id,
                  quoteId: acceptedQuote?.id,
                  lot,
                  quote: acceptedQuote,
                });
              }}
            >
              <Text style={styles.lotActionBtnText}>+ {t('logistics.recordHandover')}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.traceBtn}
            onPress={() => navigation.navigate(isRecycler ? 'RecyclerLotTrace' : 'CollectorLotTrace', { lotId: lot.id, lot })}
          >
            <View style={styles.btnRow}>
              <AppIcon name="search" size={13} color={colors.primary} />
              <Text style={styles.traceBtnText}>{t('logistics.trace')}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </GlassCard>
    );
  };

  return (
    <EcoSetuBackground>
      <SafeAreaView style={styles.container}>
        <TopAppBar
          title={batch?.referenceNumber || t('logistics.batchDetail')}
          showBack
          onBack={() => navigation.goBack()}
        />

        {loading && !refreshing ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : error || !batch ? (
          <View style={styles.centerContainer}>
            <Text style={styles.errorText}>{error || 'Batch not found'}</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          >
            {/* Batch Status Header Card */}
            <GlassCard style={styles.headerCard}>
              <View style={styles.headerTop}>
                <View>
                  <Text style={styles.refTitle}>{batch.referenceNumber}</Text>
                  <Text style={styles.createdAtText}>
                    Created {new Date(batch.createdAt).toLocaleDateString('en-IN')}
                  </Text>
                </View>
                <StatusBadge status={batch.status} />
              </View>

              {/* Status Stepper / Progression */}
              <View style={styles.stepperContainer}>
                {['SCHEDULED', 'IN_PROGRESS', 'ARRIVED', 'COLLECTING', 'COMPLETED'].map((step, idx) => {
                  const stepIndex = ['PLANNED', 'SCHEDULED', 'IN_PROGRESS', 'ARRIVED', 'COLLECTING', 'COMPLETED'].indexOf(batch.status);
                  const thisStepIndex = ['PLANNED', 'SCHEDULED', 'IN_PROGRESS', 'ARRIVED', 'COLLECTING', 'COMPLETED'].indexOf(step);
                  const isPassed = stepIndex >= thisStepIndex;
                  return (
                    <View key={step} style={styles.stepItem}>
                      <View style={[styles.stepDot, isPassed && styles.stepDotActive]}>
                        <Text style={[styles.stepDotText, isPassed && styles.stepDotTextActive]}>{idx + 1}</Text>
                      </View>
                      <Text style={[styles.stepLabel, isPassed && styles.stepLabelActive]} numberOfLines={1}>
                        {step.charAt(0) + step.slice(1).toLowerCase().replace('_', ' ')}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {/* Logistics Metadata */}
              <View style={styles.metaDivider} />
              {batch.scheduledDate && (
                <View style={styles.metaRow}>
                  <AppIcon name="calendar" size={13} color={colors.textSecondary} style={styles.metaIcon} />
                  <Text style={styles.metaText}>
                    {new Date(batch.scheduledDate).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                    {batch.scheduledTimeWindow ? ` (${batch.scheduledTimeWindow})` : ''}
                  </Text>
                </View>
              )}
              {batch.pickupAddress && (
                <View style={styles.metaRow}>
                  <AppIcon name="mapPin" size={13} color={colors.textSecondary} style={styles.metaIcon} />
                  <Text style={styles.metaText}>{batch.pickupAddress}</Text>
                </View>
              )}
              {batch.notes && (
                <View style={styles.metaRow}>
                  <AppIcon name="fileText" size={13} color={colors.textSecondary} style={styles.metaIcon} />
                  <Text style={styles.metaText}>{batch.notes}</Text>
                </View>
              )}
            </GlassCard>

            {/* Operational Action Button */}
            <View style={styles.actionContainer}>{renderActionButtons()}</View>

            {/* Consolidated Summary Card */}
            {batch.consolidatedSummary && (
              <GlassCard style={styles.summaryCard}>
                <View style={styles.rowCentered}>
                  <AppIcon name="barChart" size={16} color={colors.textPrimary} />
                  <Text style={styles.summaryTitle}>{t('logistics.consolidatedSummary')}</Text>
                </View>
                <View style={styles.summaryGrid}>
                  <View style={styles.summaryCol}>
                    <Text style={styles.summaryLabel}>{t('logistics.totalLots')}</Text>
                    <Text style={styles.summaryValue}>
                      {batch.consolidatedSummary.completedLotsCount}/{batch.consolidatedSummary.totalLotsCount}
                    </Text>
                  </View>
                  <View style={styles.summaryCol}>
                    <Text style={styles.summaryLabel}>{t('logistics.estWeight')}</Text>
                    <Text style={styles.summaryValue}>{batch.consolidatedSummary.totalEstimatedWeightKg} kg</Text>
                  </View>
                  <View style={styles.summaryCol}>
                    <Text style={styles.summaryLabel}>{t('logistics.verifiedWeight')}</Text>
                    <Text style={[styles.summaryValue, { color: colors.primary }]}>
                      {batch.consolidatedSummary.totalVerifiedWeightKg} kg
                    </Text>
                  </View>
                </View>

                {batch.consolidatedSummary.totalFinalPayableAmount > 0 && (
                  <View style={styles.settlementSummaryRow}>
                    <Text style={styles.settlementSummaryLabel}>{t('logistics.totalSettlementSum')}</Text>
                    <Text style={styles.settlementSummaryAmount}>
                      ₹{batch.consolidatedSummary.totalFinalPayableAmount.toFixed(2)}
                    </Text>
                  </View>
                )}

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.spaceXs }}>
                  <AppIcon name="info" size={14} color={colors.textSecondary} />
                  <Text style={[styles.disclaimerText, { marginTop: 0, flex: 1 }]}>
                    {t('logistics.commercialRuleNote')}
                  </Text>
                </View>
              </GlassCard>
            )}

            {/* Lots List */}
            <Text style={styles.sectionHeader}>
              {t('logistics.lotsInBatch')} ({batch.lots?.length || 0})
            </Text>

            {batch.lots && batch.lots.map((lotItem, index) => renderLotItem(lotItem, index))}
          </ScrollView>
        )}
      </SafeAreaView>
    </EcoSetuBackground>
  );
};

const space = {
  xs: spacing.spaceXs,
  sm: spacing.spaceSm,
  md: spacing.spaceMd,
  lg: spacing.spaceLg,
  xl: spacing.spaceXl,
  xxl: spacing.space2Xl,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: space.md,
    paddingBottom: space.xxl,
  },
  headerCard: {
    padding: space.md,
    marginBottom: space.md,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  refTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  createdAtText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  stepperContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: space.md,
    marginBottom: space.xs,
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepDotActive: {
    backgroundColor: colors.primary,
  },
  stepDotText: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  stepDotTextActive: {
    color: '#071E22',
  },
  stepLabel: {
    fontSize: 9,
    color: colors.textSecondary,
  },
  stepLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  metaDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: space.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  metaIcon: {
    fontSize: 12,
    marginRight: 6,
  },
  metaText: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
  },
  actionContainer: {
    marginBottom: space.md,
  },
  primaryActionBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: space.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  primaryActionBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#071E22',
  },
  summaryCard: {
    padding: space.md,
    marginBottom: space.md,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: space.sm,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 8,
    padding: space.xs,
  },
  summaryCol: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 2,
  },
  settlementSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: space.sm,
    paddingTop: space.xs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  settlementSummaryLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  settlementSummaryAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  disclaimerText: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: space.xs,
    fontStyle: 'italic',
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: space.sm,
    marginBottom: space.xs,
  },
  lotCard: {
    padding: space.md,
    marginBottom: space.sm,
  },
  lotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lotIndexBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: space.xs,
  },
  lotIndexText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  lotTitleCol: {
    flex: 1,
  },
  lotRef: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  lotCategory: {
    fontSize: 12,
    color: colors.textPrimary,
  },
  lotDetailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: space.xs,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 6,
    padding: space.xs,
  },
  lotDetailItem: {
    flex: 1,
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 10,
    color: colors.textSecondary,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 2,
  },
  lotActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: space.xs,
  },
  lotActionBtn: {
    backgroundColor: 'rgba(0, 168, 150, 0.2)',
    borderColor: colors.primary,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 36,
    justifyContent: 'center',
  },
  lotActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  settlementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(46, 196, 182, 0.15)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  rowCentered: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  settlementText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2EC4B6',
  },
  traceBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  traceBtnText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: space.xl,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
  },
});
