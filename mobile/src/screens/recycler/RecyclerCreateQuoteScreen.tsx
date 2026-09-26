/**
 * EcoSetu Recycler Create Quote Screen
 * Canonical Reference: docs/25_SIH_26229_REQUIREMENTS.md Section 10 (SIH-QUOTE-001..002)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useI18n } from '../../i18n';
import { EcoSetuBackground } from '../../components/eco';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { quoteService } from '../../services/quoteService';
import networkService from '../../services/networkService';
import { AppIcon } from '../../components/ui/AppIcon';

const space = {
  xs: spacing.spaceXs,
  sm: spacing.spaceSm,
  md: spacing.spaceMd,
  lg: spacing.spaceLg,
  xl: spacing.spaceXl,
};

export const RecyclerCreateQuoteScreen: React.FC = () => {
  const { t } = useI18n();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();


  const lot = route.params?.lot;
  const matchData = route.params?.matchData;

  const initialWeight = lot?.approximateTotalWeightKg ? Number(lot.approximateTotalWeightKg) : (lot?.weightKg ? Number(lot.weightKg) : 1);
  const initialRate = matchData?.offeredRate?.amount ? String(matchData.offeredRate.amount) : '';

  const [unitPrice, setUnitPrice] = useState<string>(initialRate);
  const [quantity, setQuantity] = useState<string>(String(initialWeight));
  const [unit, setUnit] = useState<string>(matchData?.offeredRate?.unit || 'PER_KG');
  const [validityDays, setValidityDays] = useState<number>(7);
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const numericPrice = parseFloat(unitPrice) || 0;
  const numericQty = parseFloat(quantity) || 0;
  const estimatedTotal = Math.round(numericPrice * numericQty * 100) / 100;

  const handleSubmit = async () => {
    if (!lot?.id) {
      Alert.alert(t('common.error') || 'Error', 'Lot information missing');
      return;
    }

    if (numericPrice <= 0) {
      Alert.alert(t('common.error') || 'Error', 'Please enter a valid positive unit price');
      return;
    }

    if (numericQty <= 0) {
      Alert.alert(t('common.error') || 'Error', 'Please enter a valid positive quantity');
      return;
    }

    if (!networkService.isOnline()) {
      Alert.alert(
        t('common.offline') || 'Offline',
        'Internet connection required to submit formal quote.'
      );
      return;
    }

    const validUntilDate = new Date();
    validUntilDate.setDate(validUntilDate.getDate() + validityDays);

    setSubmitting(true);
    try {
      const created = await quoteService.createQuote({
        materialLotId: lot.id,
        quotedUnitPrice: numericPrice,
        unit,
        quotedQuantity: numericQty,
        validUntil: validUntilDate.toISOString(),
        notes: notes.trim() || undefined,
      });

      Alert.alert(
        t('common.success') || 'Success',
        `Quote ${created.referenceNumber} submitted successfully!`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert(t('common.error') || 'Error', err.message || 'Failed to submit quote');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <EcoSetuBackground>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
          >
            <Text style={styles.backButtonText}>← {t('common.back')}</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('quotation.sendQuoteTitle')}</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Material Lot Summary */}
          <View style={styles.lotCard}>
            <Text style={styles.lotReference}>{lot?.referenceNumber || 'LOT'}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <AppIcon name="package" size={14} color="#94A3B8" />
              <Text style={styles.lotCategory}>
                {lot?.category} {lot?.subcategory ? `• ${lot.subcategory}` : ''}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <AppIcon name="scale" size={14} color="#94A3B8" />
              <Text style={styles.lotWeight}>
                Lot Weight: {initialWeight} kg
              </Text>
            </View>
          </View>

          {/* Rate Input Section */}
          <View style={styles.formSection}>
            <Text style={styles.label}>{t('quotation.unitPrice')} (₹) *</Text>
            <TextInput
              style={styles.input}
              value={unitPrice}
              onChangeText={setUnitPrice}
              placeholder="e.g. 175.00"
              placeholderTextColor="#64748B"
              keyboardType="decimal-pad"
            />

            {/* Unit Selector */}
            <Text style={styles.label}>{t('quotation.quotedRate')} Unit</Text>
            <View style={styles.unitSelector}>
              {[
                { key: 'PER_KG', label: 'Per kg' },
                { key: 'PER_UNIT', label: 'Per Unit' },
                { key: 'PER_LOT', label: 'Per Lot' },
              ].map((u) => (
                <TouchableOpacity
                  key={u.key}
                  style={[styles.unitButton, unit === u.key && styles.unitButtonSelected]}
                  onPress={() => setUnit(u.key)}
                >
                  <Text style={[styles.unitButtonText, unit === u.key && styles.unitButtonTextSelected]}>
                    {u.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Quantity */}
            <Text style={styles.label}>{t('quotation.quantity')} *</Text>
            <TextInput
              style={styles.input}
              value={quantity}
              onChangeText={setQuantity}
              placeholder="Quantity / Weight"
              placeholderTextColor="#64748B"
              keyboardType="decimal-pad"
            />

            {/* Estimated Total Calculation */}
            <View style={styles.totalPreviewBox}>
              <Text style={styles.totalPreviewLabel}>{t('quotation.quotedTotal')}:</Text>
              <Text style={styles.totalPreviewAmount}>₹{estimatedTotal.toLocaleString()}</Text>
            </View>

            {/* Validity Duration */}
            <Text style={styles.label}>{t('quotation.validUntil')}</Text>
            <View style={styles.unitSelector}>
              {[
                { days: 3, label: '3 Days' },
                { days: 7, label: '7 Days' },
                { days: 14, label: '14 Days' },
                { days: 30, label: '30 Days' },
              ].map((v) => (
                <TouchableOpacity
                  key={v.days}
                  style={[styles.unitButton, validityDays === v.days && styles.unitButtonSelected]}
                  onPress={() => setValidityDays(v.days)}
                >
                  <Text style={[styles.unitButtonText, validityDays === v.days && styles.unitButtonTextSelected]}>
                    {v.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Special Notes */}
            <Text style={styles.label}>{t('quotation.notes')}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder={t('quotation.termsNotes')}
              placeholderTextColor="#64748B"
              multiline
              numberOfLines={3}
            />

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator color="#071E22" />
              ) : (
                <View style={styles.btnRow}>
                  <AppIcon name="send" size={18} color="#071E22" />
                  <Text style={styles.submitButtonText}>{t('quotation.sendQuote')}</Text>
                </View>
              )}
            </TouchableOpacity>
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
  lotCard: {
    backgroundColor: 'rgba(15, 35, 40, 0.85)',
    borderRadius: 16,
    padding: space.md,
    marginBottom: space.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  lotReference: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  lotCategory: {
    fontSize: 14,
    color: colors.textSecondary || '#94A3B8',
    marginBottom: 2,
  },
  lotWeight: {
    fontSize: 14,
    color: '#34D399',
    fontWeight: '600',
  },
  formSection: {
    backgroundColor: 'rgba(15, 35, 40, 0.85)',
    borderRadius: 16,
    padding: space.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E2E8F0',
    marginBottom: 6,
    marginTop: space.sm,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 15,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  unitSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  unitButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  unitButtonSelected: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: '#10B981',
  },
  unitButtonText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  unitButtonTextSelected: {
    color: '#34D399',
    fontWeight: '700',
  },
  totalPreviewBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: '#10B981',
    borderWidth: 1,
    borderRadius: 12,
    padding: space.md,
    marginTop: space.md,
    marginBottom: space.sm,
  },
  totalPreviewLabel: {
    fontSize: 14,
    color: '#E2E8F0',
    fontWeight: '600',
  },
  totalPreviewAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: '#10B981',
  },
  submitButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: space.lg,
  },
  submitButtonText: {
    color: '#071E22',
    fontSize: 16,
    fontWeight: '800',
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  rowCentered: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});

export default RecyclerCreateQuoteScreen;
