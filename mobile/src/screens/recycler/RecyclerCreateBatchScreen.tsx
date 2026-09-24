/**
 * RecyclerCreateBatchScreen
 * Marketplace Phase 5: Multi-Lot Consolidation
 *
 * Allows a formal recycler to group multiple accepted material lots from a single collector
 * into a consolidated operational pickup batch.
 *
 * Commercial Invariant: Grouping preserves individual agreed rates and lot traceability.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { TopAppBar } from '../../components/layout/TopAppBar';
import { GlassCard } from '../../components/glass/GlassCard';
import { EcoSetuBackground } from '../../components/glass/EcoSetuBackground';
import { EmptyState } from '../../components/common/EmptyState';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { useI18n } from '../../i18n';
import pickupBatchService from '../../services/pickupBatchService';

interface Props {
  navigation: any;
  route?: any;
}

export const RecyclerCreateBatchScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useI18n();
  const [eligibleLots, setEligibleLots] = useState<any[]>([]);
  const [selectedLotIds, setSelectedLotIds] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [timeWindow, setTimeWindow] = useState<string>('Morning (09:00 - 12:00)');
  const [pickupAddress, setPickupAddress] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    const fetchEligibleLots = async () => {
      try {
        setLoading(true);
        setError(null);
        const lots = await pickupBatchService.getEligibleLots();
        setEligibleLots(lots || []);

        if (route?.params?.preselectedLotIds) {
          setSelectedLotIds(route.params.preselectedLotIds);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load eligible lots');
      } finally {
        setLoading(false);
      }
    };

    fetchEligibleLots();
  }, [route?.params?.preselectedLotIds]);

  // Selected collector constraint: All consolidated lots must belong to the same collector
  const selectedCollectorId = useMemo(() => {
    if (selectedLotIds.length === 0) return null;
    const firstSelected = eligibleLots.find((l) => l.id === selectedLotIds[0]);
    return firstSelected?.collectorId || null;
  }, [selectedLotIds, eligibleLots]);

  const toggleLotSelection = (lot: any) => {
    if (selectedLotIds.includes(lot.id)) {
      setSelectedLotIds(selectedLotIds.filter((id) => id !== lot.id));
    } else {
      if (selectedCollectorId && lot.collectorId !== selectedCollectorId) {
        Alert.alert(
          t('logistics.incompatibleCollector'),
          t('logistics.collectorMismatchMessage')
        );
        return;
      }
      setSelectedLotIds([...selectedLotIds, lot.id]);

      // Pre-fill address if not already filled
      if (!pickupAddress && (lot.collectionAddress || lot.collectionArea)) {
        setPickupAddress(lot.collectionAddress || lot.collectionArea || '');
      }
    }
  };

  const selectedLots = useMemo(() => {
    return eligibleLots.filter((l) => selectedLotIds.includes(l.id));
  }, [eligibleLots, selectedLotIds]);

  const totalConsolidatedWeightKg = useMemo(() => {
    return selectedLots.reduce((sum, l) => sum + (Number(l.approximateTotalWeightKg) || 0), 0);
  }, [selectedLots]);

  const handleCreateBatch = async () => {
    if (selectedLotIds.length === 0) {
      Alert.alert(t('common.error'), t('logistics.selectAtLeastOneLot'));
      return;
    }

    try {
      setSubmitting(true);
      const newBatch = await pickupBatchService.createBatch({
        materialLotIds: selectedLotIds,
        scheduledDate: scheduledDate ? new Date(scheduledDate).toISOString() : undefined,
        scheduledTimeWindow: timeWindow,
        pickupAddress: pickupAddress.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      Alert.alert(
        t('logistics.batchCreated'),
        `${t('logistics.batchCreatedDesc')} (${newBatch.referenceNumber})`,
        [
          {
            text: t('common.ok'),
            onPress: () => navigation.replace('RecyclerBatchDetail', { batchId: newBatch.id, batch: newBatch }),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message || 'Failed to create pickup batch');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <EcoSetuBackground>
      <SafeAreaView style={styles.container}>
        <TopAppBar
          title={t('logistics.createPickupBatch')}
          showBack
          onBack={() => navigation.goBack()}
        />

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : eligibleLots.length === 0 ? (
          <EmptyState
            icon="📋"
            title={t('logistics.noEligibleLots')}
            message={t('logistics.noEligibleLotsDesc')}
          />
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Instruction Card */}
            <GlassCard style={styles.infoCard}>
              <Text style={styles.infoTitle}>📦 {t('logistics.consolidationTitle')}</Text>
              <Text style={styles.infoDesc}>
                {t('logistics.consolidationDesc')}
              </Text>
            </GlassCard>

            {/* Eligible Lots Selection List */}
            <Text style={styles.sectionHeader}>{t('logistics.selectLots')}</Text>
            {eligibleLots.map((lot) => {
              const isSelected = selectedLotIds.includes(lot.id);
              const isBlocked = selectedCollectorId && lot.collectorId !== selectedCollectorId;

              return (
                <TouchableOpacity
                  key={lot.id}
                  activeOpacity={0.8}
                  disabled={isBlocked}
                  onPress={() => toggleLotSelection(lot)}
                  style={[styles.lotCardWrapper, isBlocked && styles.blockedCard]}
                >
                  <GlassCard style={[styles.lotCard, isSelected && styles.lotCardSelected]}>
                    <View style={styles.lotHeader}>
                      <View style={styles.checkboxWrapper}>
                        <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                          {isSelected && <Text style={styles.checkmark}>✓</Text>}
                        </View>
                        <View style={styles.lotTitleCol}>
                          <Text style={styles.lotRef}>{lot.referenceNumber}</Text>
                          <Text style={styles.lotCategory}>
                            {lot.category.replace('_', ' ')}
                            {lot.subcategory ? ` • ${lot.subcategory}` : ''}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.lotWeight}>{lot.approximateTotalWeightKg} kg</Text>
                    </View>

                    <View style={styles.lotMetaRow}>
                      <Text style={styles.lotCollector}>
                        👤 {lot.collector?.user?.name || t('logistics.collector')}
                        {lot.collector?.city ? ` (${lot.collector.city})` : ''}
                      </Text>
                      {lot.acceptedQuote ? (
                        <Text style={styles.lotRate}>
                          ₹{lot.acceptedQuote.quotedUnitPrice}/{lot.acceptedQuote.unit === 'PER_KG' ? 'kg' : 'unit'}
                        </Text>
                      ) : null}
                    </View>
                  </GlassCard>
                </TouchableOpacity>
              );
            })}

            {/* Consolidated Summary Preview */}
            {selectedLotIds.length > 0 && (
              <GlassCard style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>{t('logistics.batchSummary')}</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{t('logistics.selectedLotsCount')}</Text>
                  <Text style={styles.summaryValue}>{selectedLotIds.length}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{t('logistics.totalEstWeight')}</Text>
                  <Text style={[styles.summaryValue, { color: colors.primary }]}>{totalConsolidatedWeightKg.toFixed(2)} kg</Text>
                </View>
              </GlassCard>
            )}

            {/* Logistics Scheduling Details */}
            <Text style={styles.sectionHeader}>{t('logistics.scheduleDetails')}</Text>

            <GlassCard style={styles.formCard}>
              <Text style={styles.inputLabel}>{t('logistics.scheduledDate')}</Text>
              <TextInput
                style={styles.input}
                placeholder="2026-09-25"
                placeholderTextColor={colors.textSecondary}
                value={scheduledDate}
                onChangeText={setScheduledDate}
              />

              <Text style={styles.inputLabel}>{t('logistics.timeWindow')}</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Morning 09:00 AM - 12:00 PM"
                placeholderTextColor={colors.textSecondary}
                value={timeWindow}
                onChangeText={setTimeWindow}
              />

              <Text style={styles.inputLabel}>{t('logistics.pickupAddress')}</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Collector facility / pickup location address"
                placeholderTextColor={colors.textSecondary}
                value={pickupAddress}
                onChangeText={setPickupAddress}
                multiline
                numberOfLines={2}
              />

              <Text style={styles.inputLabel}>{t('logistics.operationalNotes')}</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Gate entry instructions, vehicle details, etc."
                placeholderTextColor={colors.textSecondary}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={2}
              />
            </GlassCard>

            {/* Confirm Submit Button */}
            <TouchableOpacity
              style={[styles.submitBtn, (selectedLotIds.length === 0 || submitting) && styles.submitBtnDisabled]}
              activeOpacity={0.8}
              disabled={selectedLotIds.length === 0 || submitting}
              onPress={handleCreateBatch}
            >
              {submitting ? (
                <ActivityIndicator color="#071E22" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {t('logistics.confirmBatchBtn')} ({selectedLotIds.length} lots)
                </Text>
              )}
            </TouchableOpacity>
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
  infoCard: {
    padding: space.md,
    marginBottom: space.md,
    backgroundColor: 'rgba(0, 168, 150, 0.1)',
    borderColor: 'rgba(0, 168, 150, 0.3)',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  infoDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: space.sm,
    marginBottom: space.xs,
  },
  lotCardWrapper: {
    marginBottom: space.sm,
  },
  blockedCard: {
    opacity: 0.4,
  },
  lotCard: {
    padding: space.md,
  },
  lotCardSelected: {
    borderColor: colors.primary,
    borderWidth: 1.5,
    backgroundColor: 'rgba(0, 168, 150, 0.15)',
  },
  lotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  checkboxWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: space.sm,
  },
  checkboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    color: '#071E22',
    fontWeight: '800',
    fontSize: 14,
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
  lotWeight: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  lotMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: space.xs,
    paddingTop: space.xs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  lotCollector: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  lotRate: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  summaryCard: {
    padding: space.md,
    marginVertical: space.md,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: space.xs,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  formCard: {
    padding: space.md,
    marginBottom: space.lg,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: space.xs,
    marginBottom: 4,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    color: colors.textPrimary,
    minHeight: 44,
    marginBottom: space.xs,
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: space.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#071E22',
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
