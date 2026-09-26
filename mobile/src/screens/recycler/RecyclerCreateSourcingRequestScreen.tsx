/**
 * RecyclerCreateSourcingRequestScreen.tsx
 * Marketplace Phase 6: Recycler Sourcing Request Creation
 *
 * Allows verified recyclers to post real commercial sourcing requirements
 * with explicit preview before publishing (or saving as draft).
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Modal,
  Switch,
} from 'react-native';
import { TopAppBar } from '../../components/layout/TopAppBar';
import { GlassCard } from '../../components/glass/GlassCard';
import { EcoSetuBackground } from '../../components/glass/EcoSetuBackground';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { useI18n } from '../../i18n';
import sourcingService, { SourcingRequest, SourceAgainTemplate } from '../../services/sourcingService';
import { AppIcon } from '../../components/ui/AppIcon';

interface Props {
  navigation?: any;
  route?: {
    params?: {
      template?: SourceAgainTemplate;
    };
  };
}

const CATEGORIES = [
  'BATTERY',
  'PCB',
  'DISPLAY',
  'CABLE',
  'METAL',
  'PLASTIC',
  'MIXED_ELECTRONICS',
];

const CONDITIONS = [
  'NEW_UNOPENED',
  'LIKE_NEW',
  'GOOD',
  'FAIR',
  'DAMAGED',
  'SCRAP',
];

export const RecyclerCreateSourcingRequestScreen: React.FC<Props> = ({
  navigation,
  route,
}) => {
  const { t } = useI18n();
  const template = route?.params?.template;

  const [materialCategory, setMaterialCategory] = useState<string>(
    template?.materialCategory || 'PCB'
  );
  const [materialSubcategory, setMaterialSubcategory] = useState<string>(
    template?.materialSubcategory || ''
  );
  const [conditionTemplate, setConditionTemplate] = useState<string>(
    template?.conditionTemplate || 'GOOD'
  );
  const [minimumWeightKg, setMinimumWeightKg] = useState<string>(
    template?.minimumWeightKg ? String(template.minimumWeightKg) : ''
  );
  const [targetWeightKg, setTargetWeightKg] = useState<string>(
    template?.targetWeightKg ? String(template.targetWeightKg) : ''
  );
  const [offeredRatePerKg, setOfferedRatePerKg] = useState<string>(
    template?.offeredRatePerKg ? String(template.offeredRatePerKg) : ''
  );
  const [pickupRequired, setPickupRequired] = useState<boolean>(
    template?.pickupRequired ?? true
  );
  const [serviceArea, setServiceArea] = useState<string>(
    template?.serviceArea || ''
  );
  const [requestedDays, setRequestedDays] = useState<string>('14');
  const [notes, setNotes] = useState<string>('');

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [previewVisible, setPreviewVisible] = useState<boolean>(false);

  const validateInputs = () => {
    const minW = parseFloat(minimumWeightKg);
    if (isNaN(minW) || minW <= 0) {
      Alert.alert(
        t('common.error', 'Error'),
        t('sourcing.enterValidMinWeight', 'Please enter a valid minimum weight in kg')
      );
      return false;
    }
    return true;
  };

  const handleOpenPreview = () => {
    if (!validateInputs()) return;
    setPreviewVisible(true);
  };

  const handleExecuteSave = async (status: 'OPEN' | 'DRAFT') => {
    try {
      setSubmitting(true);
      const minW = parseFloat(minimumWeightKg);
      const targetW = targetWeightKg ? parseFloat(targetWeightKg) : undefined;
      const rate = offeredRatePerKg ? parseFloat(offeredRatePerKg) : undefined;

      const days = parseInt(requestedDays, 10) || 14;
      const requestedByDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

      await sourcingService.createRequest({
        materialCategory,
        materialSubcategory: materialSubcategory.trim() || undefined,
        conditionTemplate,
        minimumWeightKg: minW,
        targetWeightKg: targetW,
        offeredRatePerKg: rate,
        pickupRequired,
        serviceArea: serviceArea.trim() || undefined,
        requestedByDate,
        notes: notes.trim() || undefined,
        status,
      });

      setPreviewVisible(false);
      Alert.alert(
        t('common.success', 'Success'),
        status === 'OPEN'
          ? t('sourcing.requestPublished', 'Sourcing request published to demand feed')
          : t('sourcing.draftSaved', 'Sourcing request saved as draft'),
        [{ text: t('common.ok', 'OK'), onPress: () => navigation.goBack() }]
      );
    } catch (err: any) {
      Alert.alert(t('common.error', 'Error'), err.message || 'Failed to create request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <EcoSetuBackground>
      <SafeAreaView style={styles.safeArea}>
        <TopAppBar
          title={
            template
              ? t('sourcing.sourceAgain', 'Source Again')
              : t('sourcing.createRequest', 'Create Sourcing Request')
          }
          subtitle={t('sourcing.postDemandSubtitle', 'Specify your material requirements')}
          onBack={() => navigation.goBack()}
        />

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {template?.sourceRequestReference && (
            <View style={styles.templateNotice}>
              <View style={styles.rowCentered}>
                <AppIcon name="refresh" size={14} color="#34D399" />
                <Text style={styles.templateNoticeText}>
                  {t('sourcing.prefilledFrom', 'Prefilled from')} {template.sourceRequestReference}. {t('sourcing.newRequestNotice', 'Creates an independent new request.')}
                </Text>
              </View>
            </View>
          )}

          <GlassCard style={styles.card}>
            {/* Material Category */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                {t('sourcing.materialCategory', 'Material Category')} *
              </Text>
              <View style={styles.chipGrid}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.chip,
                      materialCategory === cat && styles.chipActive,
                    ]}
                    onPress={() => setMaterialCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        materialCategory === cat && styles.chipTextActive,
                      ]}
                    >
                      {cat.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Subcategory */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                {t('sourcing.subcategory', 'Subcategory / Grade (Optional)')}
              </Text>
              <TextInput
                style={styles.input}
                placeholder={t('sourcing.subcategoryPlaceholder', 'e.g. Server PCBs, Li-ion pouch')}
                placeholderTextColor={colors.textTertiary}
                value={materialSubcategory}
                onChangeText={setMaterialSubcategory}
              />
            </View>

            {/* Condition */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                {t('sourcing.acceptableCondition', 'Acceptable Condition')}
              </Text>
              <View style={styles.chipGrid}>
                {CONDITIONS.map((cond) => (
                  <TouchableOpacity
                    key={cond}
                    style={[
                      styles.chip,
                      conditionTemplate === cond && styles.chipActive,
                    ]}
                    onPress={() => setConditionTemplate(cond)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        conditionTemplate === cond && styles.chipTextActive,
                      ]}
                    >
                      {cond.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Quantities */}
            <View style={styles.row}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.label}>
                  {t('sourcing.minimumWeight', 'Min Weight (kg)')} *
                </Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="e.g. 50"
                  placeholderTextColor={colors.textTertiary}
                  value={minimumWeightKg}
                  onChangeText={setMinimumWeightKg}
                />
              </View>

              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.label}>
                  {t('sourcing.targetWeight', 'Target Weight (kg)')}
                </Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="e.g. 200"
                  placeholderTextColor={colors.textTertiary}
                  value={targetWeightKg}
                  onChangeText={setTargetWeightKg}
                />
              </View>
            </View>

            {/* Commercial Rate (Optional) */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                {t('sourcing.offeredRateLabel', 'Offered Rate (₹/kg) - Optional')}
              </Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                placeholder={t('sourcing.unpricedPrompt', 'Leave blank to discuss price after response')}
                placeholderTextColor={colors.textTertiary}
                value={offeredRatePerKg}
                onChangeText={setOfferedRatePerKg}
              />
              <Text style={styles.helperText}>
                {offeredRatePerKg
                  ? `₹${offeredRatePerKg}/kg will be published as indicative rate.`
                  : 'If left blank, collectors will see "Price discussed after response".'}
              </Text>
            </View>

            {/* Pickup & Service Area */}
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>
                {t('sourcing.requirePickup', 'Pickup Logistics Required')}
              </Text>
              <Switch
                value={pickupRequired}
                onValueChange={setPickupRequired}
                trackColor={{ false: '#334155', true: colors.primary }}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>
                {t('sourcing.serviceArea', 'Service Area / City')}
              </Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Mumbai Metropolitan Region"
                placeholderTextColor={colors.textTertiary}
                value={serviceArea}
                onChangeText={setServiceArea}
              />
            </View>

            {/* Validity Days */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                {t('sourcing.validityDays', 'Request Validity (Days)')}
              </Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                placeholder="14"
                placeholderTextColor={colors.textTertiary}
                value={requestedDays}
                onChangeText={setRequestedDays}
              />
            </View>

            {/* Notes */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>{t('sourcing.notes', 'Specific Instructions')}</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                multiline
                numberOfLines={3}
                placeholder="e.g. Clean boards preferred, sorted by grade..."
                placeholderTextColor={colors.textTertiary}
                value={notes}
                onChangeText={setNotes}
              />
            </View>

            {/* Submit / Preview Button */}
            <TouchableOpacity
              style={styles.previewButton}
              onPress={handleOpenPreview}
            >
              <Text style={styles.previewButtonText}>
                {t('sourcing.previewRequest', 'Preview Request')}
              </Text>
            </TouchableOpacity>
          </GlassCard>
        </ScrollView>

        {/* Preview & Confirmation Modal */}
        <Modal visible={previewVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <GlassCard style={styles.modalCard}>
                <Text style={styles.modalTitle}>
                  {t('sourcing.previewTitle', 'Preview Sourcing Request')}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {t('sourcing.verifyDetailsNotice', 'Verify details before publishing to collector demand feed')}
                </Text>

                <View style={styles.previewBox}>
                  <Text style={styles.previewLine}>
                    <Text style={styles.previewBold}>Category: </Text>
                    {materialCategory} {materialSubcategory ? `(${materialSubcategory})` : ''}
                  </Text>
                  <Text style={styles.previewLine}>
                    <Text style={styles.previewBold}>Condition: </Text>
                    {conditionTemplate.replace('_', ' ')}
                  </Text>
                  <Text style={styles.previewLine}>
                    <Text style={styles.previewBold}>Min Quantity: </Text>
                    {minimumWeightKg} kg {targetWeightKg ? `(Target: ${targetWeightKg} kg)` : ''}
                  </Text>
                  <Text style={styles.previewLine}>
                    <Text style={styles.previewBold}>Rate: </Text>
                    {offeredRatePerKg
                      ? `₹${offeredRatePerKg}/kg`
                      : 'Price discussed after response'}
                  </Text>
                  <Text style={styles.previewLine}>
                    <Text style={styles.previewBold}>Pickup: </Text>
                    {pickupRequired ? 'Required' : 'Collector drops off'}
                  </Text>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.draftButton}
                    onPress={() => handleExecuteSave('DRAFT')}
                    disabled={submitting}
                  >
                    <Text style={styles.draftButtonText}>
                      {t('sourcing.saveDraft', 'Save Draft')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.publishButton}
                    onPress={() => handleExecuteSave('OPEN')}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.publishButtonText}>
                        {t('sourcing.publishRequest', 'Publish Request')}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.backEditButton}
                  onPress={() => setPreviewVisible(false)}
                  disabled={submitting}
                >
                  <Text style={styles.backEditText}>
                    ← {t('sourcing.backToEdit', 'Back to Edit')}
                  </Text>
                </TouchableOpacity>
              </GlassCard>
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
  scrollContent: {
    padding: spacing.spaceMd,
    paddingBottom: spacing.spaceXl,
  },
  templateNotice: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    padding: spacing.spaceSm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    marginBottom: spacing.spaceMd,
  },
  templateNoticeText: {
    fontSize: 12,
    color: colors.primaryLight,
    lineHeight: 16,
  },
  card: {
    padding: spacing.spaceMd,
  },
  formGroup: {
    marginBottom: spacing.spaceMd,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.spaceMd,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  helperText: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 4,
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
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  chipActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  chipTextActive: {
    color: colors.primaryLight,
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.spaceMd,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    padding: spacing.spaceSm,
    borderRadius: 8,
  },
  switchLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  previewButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.spaceSm,
  },
  previewButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    padding: spacing.spaceMd,
  },
  modalContent: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalCard: {
    padding: spacing.spaceLg,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 2,
    marginBottom: spacing.spaceMd,
  },
  previewBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: spacing.spaceMd,
    gap: 8,
    marginBottom: spacing.spaceLg,
  },
  previewLine: {
    fontSize: 13,
    color: colors.textPrimary,
  },
  previewBold: {
    fontWeight: '700',
    color: colors.textSecondary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.spaceMd,
    marginBottom: spacing.spaceMd,
  },
  draftButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  draftButtonText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 13,
  },
  publishButton: {
    flex: 1.5,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  publishButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  backEditButton: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  backEditText: {
    color: colors.textTertiary,
    fontSize: 12,
  },
  rowCentered: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
