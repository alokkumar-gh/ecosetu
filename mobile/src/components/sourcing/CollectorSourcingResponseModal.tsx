/**
 * CollectorSourcingResponseModal.tsx
 * Marketplace Phase 6: Collector Response to Buyer Sourcing Request
 *
 * Allows collector to express factual supply interest with available quantity,
 * condition, pickup area, and availability date.
 * Note: Sourcing Response != Commercial Quote (Supply Interest only).
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { GlassCard } from '../glass/GlassCard';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { useI18n } from '../../i18n';
import sourcingService, { SourcingRequest, SourcingResponse } from '../../services/sourcingService';

interface Props {
  visible: boolean;
  request: SourcingRequest | null;
  existingResponse?: SourcingResponse | null;
  onClose: () => void;
  onSuccess: (response: SourcingResponse) => void;
}

export const CollectorSourcingResponseModal: React.FC<Props> = ({
  visible,
  request,
  existingResponse,
  onClose,
  onSuccess,
}) => {
  const { t } = useI18n();
  const [availableWeightKg, setAvailableWeightKg] = useState<string>(
    existingResponse ? String(existingResponse.availableWeightKg) : ''
  );
  const [condition, setCondition] = useState<string>(
    existingResponse?.condition || request?.conditionTemplate || 'GOOD'
  );
  const [pickupArea, setPickupArea] = useState<string>(
    existingResponse?.pickupArea || ''
  );
  const [notes, setNotes] = useState<string>(existingResponse?.notes || '');
  const [submitting, setSubmitting] = useState<boolean>(false);

  if (!request) return null;

  const handleSubmit = async () => {
    const weight = parseFloat(availableWeightKg);
    if (isNaN(weight) || weight <= 0) {
      Alert.alert(
        t('common.error', 'Error'),
        t('sourcing.enterValidWeight', 'Please enter a valid available quantity in kg')
      );
      return;
    }

    try {
      setSubmitting(true);
      let res: SourcingResponse;

      if (existingResponse) {
        res = await sourcingService.updateResponse(existingResponse.id, {
          availableWeightKg: weight,
          condition,
          pickupArea: pickupArea.trim() || undefined,
          notes: notes.trim() || undefined,
        });
        Alert.alert(
          t('common.success', 'Success'),
          t('sourcing.responseUpdated', 'Your response has been updated')
        );
      } else {
        res = await sourcingService.respondToRequest(request.id, {
          availableWeightKg: weight,
          condition,
          pickupArea: pickupArea.trim() || undefined,
          notes: notes.trim() || undefined,
        });
        Alert.alert(
          t('common.success', 'Success'),
          t('sourcing.responseSubmitted', 'Your supply interest was sent to the buyer')
        );
      }

      onSuccess(res);
      onClose();
    } catch (err: any) {
      Alert.alert(t('common.error', 'Error'), err.message || 'Failed to submit response');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          <GlassCard style={styles.card}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.header}>
                <Text style={styles.title}>
                  {existingResponse
                    ? t('sourcing.updateResponse', 'Update Supply Response')
                    : t('sourcing.respondToBuyer', 'Respond to Buyer')}
                </Text>
                <Text style={styles.subtitle}>
                  {request.materialCategory} • {request.referenceNumber}
                </Text>
              </View>

              <View style={styles.infoBanner}>
                <Text style={styles.infoText}>
                  ℹ️ {t('sourcing.supplyInterestNotice', 'This establishes supply availability. Price and terms are finalized in the formal quote process.')}
                </Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  {t('sourcing.availableWeight', 'Available Quantity (kg)')} *
                </Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="e.g. 50"
                  placeholderTextColor={colors.textTertiary}
                  value={availableWeightKg}
                  onChangeText={setAvailableWeightKg}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  {t('sourcing.materialCondition', 'Material Condition')}
                </Text>
                <View style={styles.conditionRow}>
                  {['NEW_UNOPENED', 'LIKE_NEW', 'GOOD', 'FAIR', 'DAMAGED', 'SCRAP'].map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[
                        styles.conditionChip,
                        condition === c && styles.conditionChipActive,
                      ]}
                      onPress={() => setCondition(c)}
                    >
                      <Text
                        style={[
                          styles.conditionChipText,
                          condition === c && styles.conditionChipTextActive,
                        ]}
                      >
                        {c.replace('_', ' ')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  {t('sourcing.pickupArea', 'Your Pickup / Location Area')}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder={t('sourcing.pickupAreaPlaceholder', 'e.g. Kurla West, Mumbai')}
                  placeholderTextColor={colors.textTertiary}
                  value={pickupArea}
                  onChangeText={setPickupArea}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  {t('sourcing.optionalNotes', 'Notes / Remarks (Optional)')}
                </Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  multiline
                  numberOfLines={3}
                  placeholder={t('sourcing.notesPlaceholder', 'Any additional lot specifics or availability timing...')}
                  placeholderTextColor={colors.textTertiary}
                  value={notes}
                  onChangeText={setNotes}
                />
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={onClose}
                  disabled={submitting}
                >
                  <Text style={styles.cancelButtonText}>{t('common.cancel', 'Cancel')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitButtonText}>
                      {existingResponse
                        ? t('common.save', 'Update Response')
                        : t('sourcing.sendResponse', 'Send Response')}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </GlassCard>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: '85%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  card: {
    padding: spacing.spaceLg,
  },
  header: {
    marginBottom: spacing.spaceMd,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: colors.primaryLight,
    marginTop: 2,
    fontWeight: '600',
  },
  infoBanner: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    padding: spacing.spaceSm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    marginBottom: spacing.spaceMd,
  },
  infoText: {
    fontSize: 12,
    color: '#38BDF8',
    lineHeight: 17,
  },
  formGroup: {
    marginBottom: spacing.spaceMd,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    color: colors.textPrimary,
    paddingHorizontal: spacing.spaceMd,
    paddingVertical: 10,
    fontSize: 14,
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  conditionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  conditionChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  conditionChipActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    borderColor: colors.primary,
  },
  conditionChipText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  conditionChipTextActive: {
    color: colors.primaryLight,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.spaceMd,
    marginTop: spacing.spaceMd,
    marginBottom: spacing.spaceSm,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
  submitButton: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
