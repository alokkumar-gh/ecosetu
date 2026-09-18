import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CitizenTabParamList } from '../../navigation/types';
import { useNetwork } from '../../hooks/useNetwork';
import { TopAppBar } from '../../components/layout/TopAppBar';
import { ewasteService } from '../../services/ewasteService';
import { EWASTE_CATEGORIES, ITEM_CONDITIONS } from '../../utils/constants';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface Props {
  navigation: BottomTabNavigationProp<CitizenTabParamList, 'CitizenSubmit'>;
}

interface CategoryOption {
  key: string;
  label: string;
  icon: string;
}

const CATEGORY_OPTIONS: CategoryOption[] = [
  { key: EWASTE_CATEGORIES.MOBILE_PHONE, label: 'Mobile Phone', icon: '📱' },
  { key: EWASTE_CATEGORIES.LAPTOP, label: 'Laptop', icon: '💻' },
  { key: EWASTE_CATEGORIES.DESKTOP, label: 'Desktop', icon: '🖥️' },
  { key: EWASTE_CATEGORIES.TABLET, label: 'Tablet', icon: '📟' },
  { key: EWASTE_CATEGORIES.MONITOR, label: 'Monitor', icon: '🖥️' },
  { key: EWASTE_CATEGORIES.PRINTER, label: 'Printer / Scanner', icon: '🖨️' },
  { key: EWASTE_CATEGORIES.KEYBOARD_MOUSE, label: 'Keyboard / Mouse', icon: '⌨️' },
  { key: EWASTE_CATEGORIES.CABLE_CHARGER, label: 'Cable / Charger', icon: '🔌' },
  { key: EWASTE_CATEGORIES.BATTERY, label: 'Battery', icon: '🔋' },
  { key: EWASTE_CATEGORIES.CIRCUIT_BOARD, label: 'Circuit Board', icon: '🧩' },
  { key: EWASTE_CATEGORIES.OTHER, label: 'Other E-Waste', icon: '📦' },
];

const CONDITION_OPTIONS = [
  { key: ITEM_CONDITIONS.WORKING, label: 'Working' },
  { key: ITEM_CONDITIONS.NOT_WORKING, label: 'Not Working' },
  { key: ITEM_CONDITIONS.DAMAGED, label: 'Damaged' },
  { key: ITEM_CONDITIONS.UNKNOWN, label: 'Unknown' },
];

export const SubmitItemScreen: React.FC<Props> = ({ navigation }) => {
  const { isConnected } = useNetwork();

  // Form states
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedCondition, setSelectedCondition] = useState<string>(ITEM_CONDITIONS.UNKNOWN);
  const [quantity, setQuantity] = useState<number>(1);
  const [estimatedWeightKg, setEstimatedWeightKg] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');

  // UI flow states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ message: string; isOffline: boolean } | null>(null);

  const resetForm = () => {
    setSelectedCategory(null);
    setSelectedCondition(ITEM_CONDITIONS.UNKNOWN);
    setQuantity(1);
    setEstimatedWeightKg('');
    setDescription('');
    setImageUrl('');
    setErrorMessage(null);
  };

  const handleQuantityDecrement = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const handleQuantityIncrement = () => {
    if (quantity < 100) {
      setQuantity(quantity + 1);
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting) return; // Prevent duplicate taps

    setErrorMessage(null);
    setSuccessInfo(null);

    // 1. Validate Category (Required)
    if (!selectedCategory) {
      setErrorMessage('Please select an e-waste category.');
      return;
    }

    // 2. Validate Quantity
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
      setErrorMessage('Quantity must be an integer between 1 and 100.');
      return;
    }

    // 3. Validate Estimated Weight (Optional)
    let parsedWeight: number | undefined;
    if (estimatedWeightKg.trim()) {
      parsedWeight = parseFloat(estimatedWeightKg.trim());
      if (isNaN(parsedWeight) || parsedWeight < 0.01 || parsedWeight > 500) {
        setErrorMessage('Estimated weight must be a positive number between 0.01 and 500 kg.');
        return;
      }
    }

    // 4. Validate Description length (Optional, max 500)
    if (description.trim().length > 500) {
      setErrorMessage('Description must not exceed 500 characters.');
      return;
    }

    // 5. Validate Image URL length (Optional, max 500)
    if (imageUrl.trim().length > 500) {
      setErrorMessage('Image URL must not exceed 500 characters.');
      return;
    }

    // Construct request payload matching docs/05 Section 6
    const payload: any = {
      category: selectedCategory,
      condition: selectedCondition,
      quantity,
    };

    if (description.trim()) {
      payload.description = description.trim();
    }
    if (parsedWeight !== undefined) {
      payload.estimatedWeightKg = parsedWeight;
    }
    if (imageUrl.trim()) {
      payload.imageUrl = imageUrl.trim();
    }

    setIsSubmitting(true);

    try {
      const createdItem = await ewasteService.createItem(payload);
      const isDraft = Boolean((createdItem as any)?.isOfflineDraft || !isConnected);

      resetForm();

      if (isDraft) {
        setSuccessInfo({
          message:
            'E-Waste item saved as an offline draft. It will automatically synchronize with the server when connectivity returns.',
          isOffline: true,
        });
      } else {
        setSuccessInfo({
          message: 'E-Waste item submitted successfully! It is now ready for pickup collection.',
          isOffline: false,
        });
      }
    } catch (err: any) {
      console.warn('[SubmitItemScreen] Submission failed:', err?.message || err);
      const msg = err?.message || 'Unable to submit e-waste item. Please check your connection and retry.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <TopAppBar
        title="Submit E-Waste"
        roleBadge="CITIZEN"
        showBack
        onBack={() => navigation.navigate('CitizenHome')}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.container}>
          {/* Header Description */}
          <View style={styles.introBox}>
            <Text style={styles.introTitle} accessibilityRole="header">
              Register E-Waste Item
            </Text>
            <Text style={styles.introSubtitle}>
              Submit items for formal recycling, authorized consignment, and verified doorstep collection.
            </Text>
          </View>

          {/* Error Alert Box */}
          {Boolean(errorMessage) && (
            <View style={styles.errorBox} accessibilityRole="alert">
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Success Banner */}
          {Boolean(successInfo) && (
            <View
              style={[styles.successBox, successInfo?.isOffline && styles.offlineSuccessBox]}
              accessibilityRole="alert"
            >
              <Text style={styles.successIcon}>{successInfo?.isOffline ? '💾' : '✅'}</Text>
              <Text style={styles.successText}>{successInfo?.message}</Text>
              <TouchableOpacity
                style={styles.viewDashboardButton}
                onPress={() => navigation.navigate('CitizenHome')}
                accessibilityRole="button"
                accessibilityLabel="Go to Citizen Dashboard"
              >
                <Text style={styles.viewDashboardText}>Go to Dashboard</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Form Card */}
          <View style={styles.card}>
            {/* 1. Category Selection */}
            <Text style={styles.fieldLabel} accessibilityRole="header">
              Select Category <Text style={styles.requiredAsterisk}>*</Text>
            </Text>
            <Text style={styles.fieldHelpText}>Choose the primary device type</Text>

            <View style={styles.categoryGrid}>
              {CATEGORY_OPTIONS.map((cat) => {
                const isSelected = selectedCategory === cat.key;
                return (
                  <TouchableOpacity
                    key={cat.key}
                    style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
                    onPress={() => setSelectedCategory(cat.key)}
                    accessibilityRole="button"
                    accessibilityLabel={`${cat.label} category${isSelected ? ', selected' : ''}`}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.categoryChipIcon}>{cat.icon}</Text>
                    <Text
                      style={[
                        styles.categoryChipText,
                        isSelected && styles.categoryChipTextSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 2. Condition Selector */}
            <Text style={[styles.fieldLabel, styles.sectionSpacing]} accessibilityRole="header">
              Device Condition <Text style={styles.optionalTag}>(Optional)</Text>
            </Text>
            <View style={styles.conditionRow}>
              {CONDITION_OPTIONS.map((cond) => {
                const isSelected = selectedCondition === cond.key;
                return (
                  <TouchableOpacity
                    key={cond.key}
                    style={[styles.conditionButton, isSelected && styles.conditionButtonSelected]}
                    onPress={() => setSelectedCondition(cond.key)}
                    accessibilityRole="button"
                    accessibilityLabel={`${cond.label} condition${isSelected ? ', selected' : ''}`}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.conditionButtonText,
                        isSelected && styles.conditionButtonTextSelected,
                      ]}
                    >
                      {cond.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 3. Quantity Stepper */}
            <Text style={[styles.fieldLabel, styles.sectionSpacing]} accessibilityRole="header">
              Quantity <Text style={styles.optionalTag}>(1 to 100)</Text>
            </Text>
            <View style={styles.stepperContainer}>
              <TouchableOpacity
                style={[styles.stepperButton, quantity <= 1 && styles.stepperButtonDisabled]}
                onPress={handleQuantityDecrement}
                disabled={quantity <= 1}
                accessibilityRole="button"
                accessibilityLabel="Decrease quantity"
              >
                <Text style={styles.stepperButtonText}>−</Text>
              </TouchableOpacity>

              <View style={styles.stepperValueBox}>
                <Text style={styles.stepperValueText}>{quantity}</Text>
              </View>

              <TouchableOpacity
                style={[styles.stepperButton, quantity >= 100 && styles.stepperButtonDisabled]}
                onPress={handleQuantityIncrement}
                disabled={quantity >= 100}
                accessibilityRole="button"
                accessibilityLabel="Increase quantity"
              >
                <Text style={styles.stepperButtonText}>+</Text>
              </TouchableOpacity>
            </View>

            {/* 4. Estimated Weight (Kg) */}
            <Text style={[styles.fieldLabel, styles.sectionSpacing]} accessibilityRole="header">
              Estimated Total Weight <Text style={styles.optionalTag}>(Optional, kg)</Text>
            </Text>
            <View style={styles.inputWithSuffixContainer}>
              <TextInput
                style={styles.inputWithSuffix}
                placeholder="e.g. 2.5"
                placeholderTextColor={colors.textSecondary}
                value={estimatedWeightKg}
                onChangeText={setEstimatedWeightKg}
                keyboardType="decimal-pad"
                accessibilityLabel="Estimated total weight in kilograms"
              />
              <View style={styles.suffixBox}>
                <Text style={styles.suffixText}>kg</Text>
              </View>
            </View>

            {/* 5. Description */}
            <View style={[styles.labelRow, styles.sectionSpacing]}>
              <Text style={styles.fieldLabel} accessibilityRole="header">
                Description / Model Notes <Text style={styles.optionalTag}>(Optional)</Text>
              </Text>
              <Text style={styles.charCount}>{description.length} / 500</Text>
            </View>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Enter brand, model, visible damage, or specific notes..."
              placeholderTextColor={colors.textSecondary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              maxLength={500}
              textAlignVertical="top"
              accessibilityLabel="Item description and model notes"
            />

            {/* 6. Optional Image URL */}
            <Text style={[styles.fieldLabel, styles.sectionSpacing]} accessibilityRole="header">
              Photo URL <Text style={styles.optionalTag}>(Optional)</Text>
            </Text>
            <TextInput
              style={styles.textInput}
              placeholder="https://example.com/device.jpg"
              placeholderTextColor={colors.textSecondary}
              value={imageUrl}
              onChangeText={setImageUrl}
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Optional photo web URL"
            />

            {/* Primary Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityLabel="Submit e-waste item"
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <View style={styles.submittingContainer}>
                  <ActivityIndicator size="small" color={colors.surface} style={styles.spinner} />
                  <Text style={styles.submitButtonText}>Submitting Item...</Text>
                </View>
              ) : (
                <Text style={styles.submitButtonText}>Submit E-Waste Item</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  container: {
    padding: spacing.spaceMd,
    paddingBottom: spacing.spaceXl,
  },
  introBox: {
    marginBottom: spacing.spaceMd,
  },
  introTitle: {
    fontSize: typography.Headline.fontSize,
    fontWeight: '700',
    color: colors.primaryDark,
    marginBottom: 4,
  },
  introSubtitle: {
    fontSize: typography.Body.fontSize,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  errorBox: {
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: spacing.spaceMd,
    borderWidth: 1,
    borderColor: colors.error,
    marginBottom: spacing.spaceMd,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.Body.fontSize,
  },
  successBox: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    padding: spacing.spaceMd,
    borderWidth: 1,
    borderColor: colors.success,
    marginBottom: spacing.spaceMd,
    alignItems: 'center',
  },
  offlineSuccessBox: {
    backgroundColor: '#FFF8E1',
    borderColor: colors.warning,
  },
  successIcon: {
    fontSize: 28,
    marginBottom: spacing.spaceXs,
  },
  successText: {
    color: colors.textPrimary,
    fontSize: typography.Body.fontSize,
    textAlign: 'center',
    marginBottom: spacing.spaceSm,
    lineHeight: 20,
  },
  viewDashboardButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.spaceMd,
    paddingVertical: 8,
    borderRadius: 6,
    minHeight: 40,
    justifyContent: 'center',
  },
  viewDashboardText: {
    color: colors.surface,
    fontWeight: '700',
    fontSize: typography.Caption.fontSize,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.spaceMd,
    elevation: spacing.cardElevation,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  fieldLabel: {
    fontSize: typography.Subheading.fontSize,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  requiredAsterisk: {
    color: colors.error,
    fontWeight: '700',
  },
  optionalTag: {
    fontSize: typography.Caption.fontSize,
    fontWeight: '400',
    color: colors.textSecondary,
  },
  fieldHelpText: {
    fontSize: typography.Caption.fontSize,
    color: colors.textSecondary,
    marginBottom: spacing.spaceSm,
  },
  sectionSpacing: {
    marginTop: spacing.spaceLg,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    margin: 4,
    minHeight: 48, // 48dp Android touch target
  },
  categoryChipSelected: {
    backgroundColor: `${colors.primary}18`,
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  categoryChipIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  categoryChipText: {
    fontSize: typography.Caption.fontSize,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  categoryChipTextSelected: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  conditionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.spaceXs,
  },
  conditionButton: {
    flex: 1,
    minWidth: 70,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    marginBottom: 6,
    backgroundColor: colors.background,
    minHeight: 48,
  },
  conditionButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  conditionButtonText: {
    fontSize: typography.Caption.fontSize,
    color: colors.textPrimary,
    fontWeight: '600',
    textAlign: 'center',
  },
  conditionButtonTextSelected: {
    color: colors.surface,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.spaceXs,
  },
  stepperButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
  },
  stepperButtonDisabled: {
    backgroundColor: colors.divider,
  },
  stepperButtonText: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.surface,
    lineHeight: 24,
  },
  stepperValueBox: {
    width: 64,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.spaceSm,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  stepperValueText: {
    fontSize: typography.Subheading.fontSize,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  inputWithSuffixContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: 8,
    backgroundColor: colors.background,
    marginTop: spacing.spaceXs,
    height: 48,
  },
  inputWithSuffix: {
    flex: 1,
    paddingHorizontal: spacing.spaceMd,
    fontSize: typography.Body.fontSize,
    color: colors.textPrimary,
    height: '100%',
  },
  suffixBox: {
    paddingHorizontal: spacing.spaceMd,
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: colors.divider,
  },
  suffixText: {
    fontSize: typography.Body.fontSize,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  charCount: {
    fontSize: typography.Caption.fontSize,
    color: colors.textSecondary,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: 8,
    paddingHorizontal: spacing.spaceMd,
    paddingVertical: 12,
    fontSize: typography.Body.fontSize,
    color: colors.textPrimary,
    backgroundColor: colors.background,
    marginTop: spacing.spaceXs,
    minHeight: 48,
  },
  textArea: {
    minHeight: 90,
    paddingTop: 12,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: spacing.spaceMd - 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.spaceXl,
    elevation: spacing.cardElevation,
    minHeight: 48,
  },
  submitButtonDisabled: {
    backgroundColor: colors.divider,
    elevation: 0,
  },
  submitButtonText: {
    color: colors.surface,
    fontSize: typography.Button.fontSize,
    fontWeight: '700',
  },
  submittingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    marginRight: spacing.spaceSm,
  },
});

export default SubmitItemScreen;
