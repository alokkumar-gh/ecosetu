/**
 * EcoSetu Report Problem Modal (Dispute Creation)
 * Canonical Reference: Marketplace Phase 7 - Dispute Resolution & Return Workflows (SIH 26229)
 *
 * Low-literacy accessible modal for Collectors and Recyclers to report commercial discrepancies
 * with large touch targets, simplified categories, and server-validated payload.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import disputeService, { DisputeType, MarketplaceDispute } from '../../services/disputeService';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

import { AppIcon, IconName } from '../ui/AppIcon';

interface Props {
  visible: boolean;
  onClose: () => void;
  materialLotId: string;
  quoteId?: string | null;
  handoverId?: string | null;
  transactionId?: string | null;
  pickupBatchId?: string | null;
  initialDisputeType?: DisputeType;
  estimatedWeightKg?: number | null;
  finalWeightKg?: number | null;
  amount?: number | null;
  onDisputeCreated?: (dispute: MarketplaceDispute) => void;
}

const PROBLEM_OPTIONS: { type: DisputeType; label: string; icon: IconName; desc: string }[] = [
  { type: 'WEIGHT_MISMATCH', label: 'Weight is Incorrect', icon: 'scale', desc: 'Disagreement on estimated or final verified weight' },
  { type: 'MATERIAL_MISMATCH', label: 'Material is Different', icon: 'box', desc: 'Material does not match listed category or grade' },
  { type: 'CONDITION_MISMATCH', label: 'Condition Mismatch', icon: 'search', desc: 'Contamination, damage, or wrong condition' },
  { type: 'PARTIAL_ACCEPTANCE', label: 'Only Part Accepted', icon: 'filter', desc: 'Recycler accepts portion; rest rejected' },
  { type: 'HANDOVER_REJECTION', label: 'Handover Rejected', icon: 'close', desc: 'Material rejected at physical pickup' },
  { type: 'PAYMENT_DISPUTE', label: 'Payment is Incorrect', icon: 'receipt', desc: 'Amount recorded does not match agreed terms' },
  { type: 'CANCELLATION_REQUEST', label: 'Cancel Accepted Deal', icon: 'alert', desc: 'Request deal cancellation before completion' },
  { type: 'RETURN_REQUEST', label: 'Request Return', icon: 'refresh', desc: 'Request material to be returned/released' },
  { type: 'OTHER', label: 'Other Issue', icon: 'help', desc: 'Any other commercial or operational dispute' },
];

export const ReportProblemModal: React.FC<Props> = ({
  visible,
  onClose,
  materialLotId,
  quoteId,
  handoverId,
  transactionId,
  pickupBatchId,
  initialDisputeType = 'WEIGHT_MISMATCH',
  estimatedWeightKg,
  finalWeightKg,
  amount,
  onDisputeCreated,
}) => {
  const [selectedType, setSelectedType] = useState<DisputeType>(initialDisputeType);
  const [description, setDescription] = useState('');
  const [disputedWeight, setDisputedWeight] = useState(
    finalWeightKg ? String(finalWeightKg) : estimatedWeightKg ? String(estimatedWeightKg) : ''
  );
  const [disputedAmount, setDisputedAmount] = useState(amount ? String(amount) : '');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!description.trim() || description.trim().length < 5) {
      Alert.alert('Explanation Needed', 'Please provide at least 5 characters explaining the problem.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        materialLotId,
        quoteId: quoteId || undefined,
        handoverId: handoverId || undefined,
        transactionId: transactionId || undefined,
        pickupBatchId: pickupBatchId || undefined,
        disputeType: selectedType,
        description: description.trim(),
        disputedEstimatedWeightKg: estimatedWeightKg || undefined,
        disputedFinalWeightKg: finalWeightKg || undefined,
        disputedQuantityKg: disputedWeight ? parseFloat(disputedWeight) : undefined,
        disputedAmount: disputedAmount ? parseFloat(disputedAmount) : undefined,
      };

      const result = await disputeService.openDispute(payload);
      Alert.alert(
        'Dispute Logged',
        `Reference: ${result.disputeReference}\nYour issue has been recorded. The counterparty has been notified for review.`
      );
      if (onDisputeCreated) {
        onDisputeCreated(result);
      }
      onClose();
    } catch (err: any) {
      Alert.alert('Unable to Submit', err.message || 'Could not open dispute.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.contentCard}>
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <AppIcon name="alert" size={20} color="#EF4444" />
              <Text style={styles.title}>Report a Problem</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <AppIcon name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionLabel}>Select the type of issue:</Text>

            <View style={styles.typeGrid}>
              {PROBLEM_OPTIONS.map((opt) => {
                const isSelected = selectedType === opt.type;
                return (
                  <TouchableOpacity
                    key={opt.type}
                    style={[styles.typeButton, isSelected && styles.typeButtonSelected]}
                    onPress={() => setSelectedType(opt.type)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.iconContainer}>
                      <AppIcon
                        name={opt.icon}
                        size={18}
                        color={isSelected ? colors.primary : colors.textSecondary}
                      />
                    </View>
                    <View style={styles.typeTextWrap}>
                      <Text style={[styles.typeLabel, isSelected && styles.typeLabelSelected]}>
                        {opt.label}
                      </Text>
                      <Text style={styles.typeDesc}>{opt.desc}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {(selectedType === 'WEIGHT_MISMATCH' || selectedType === 'PARTIAL_ACCEPTANCE') && (
              <View style={styles.fieldBox}>
                <Text style={styles.inputLabel}>
                  {selectedType === 'PARTIAL_ACCEPTANCE' ? 'Accepted Weight (kg)' : 'Your Claimed Weight (kg)'}
                </Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="e.g. 18.5"
                  value={disputedWeight}
                  onChangeText={setDisputedWeight}
                />
              </View>
            )}

            {selectedType === 'PAYMENT_DISPUTE' && (
              <View style={styles.fieldBox}>
                <Text style={styles.inputLabel}>Expected / Claimed Amount (₹)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="e.g. 1200"
                  value={disputedAmount}
                  onChangeText={setDisputedAmount}
                />
              </View>
            )}

            <View style={styles.fieldBox}>
              <Text style={styles.inputLabel}>Describe what happened:</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                multiline
                numberOfLines={3}
                placeholder="Explain clearly what went wrong (facts only)..."
                value={description}
                onChangeText={setDescription}
              />
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={submitting}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.submitText}>Submit Dispute</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const space = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  contentCard: {
    backgroundColor: '#0F2328',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    padding: space.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: space.sm,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  closeBtn: {
    padding: 6,
  },
  iconContainer: {
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollArea: {
    marginBottom: space.md,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: space.sm,
  },
  typeGrid: {
    gap: 8,
    marginBottom: space.md,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'rgba(15, 35, 40, 0.85)',
  },
  typeButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  typeIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  typeTextWrap: {
    flex: 1,
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  typeLabelSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  typeDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  fieldBox: {
    marginBottom: space.md,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  submitButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
});
