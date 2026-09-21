/**
 * LanguageSelector — Glassmorphism Reusable Component
 * Allows users to toggle between English, Hindi, Marathi, and Odia.
 * Fully offline, persists choice, updates UI immediately.
 */

import React, { useState, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  ViewStyle,
} from 'react-native';
import { useI18n, SupportedLanguage, LANGUAGE_OPTIONS } from '../../i18n';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';


export interface LanguageSelectorProps {
  /**
   * 'chips' — horizontal row of language pill buttons
   * 'compact' — button with globe icon that opens a modal
   * 'list' — full vertical list of language cards (ideal for settings/profile)
   */
  variant?: 'chips' | 'compact' | 'list';
  theme?: 'dark' | 'light';
  style?: ViewStyle;
  onLanguageChanged?: (lang: SupportedLanguage) => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = memo(({
  variant = 'chips',
  theme = 'light',
  style,
  onLanguageChanged,
}) => {
  const { language, setLanguage, t } = useI18n();
  const [modalVisible, setModalVisible] = useState(false);

  const handleSelect = (code: SupportedLanguage) => {
    setLanguage(code);
    if (onLanguageChanged) {
      onLanguageChanged(code);
    }
    setModalVisible(false);
  };

  const isLight = theme === 'light';

  // Compact variant: opens clean institutional modal picker
  if (variant === 'compact') {
    const activeOption = LANGUAGE_OPTIONS.find((o) => o.code === language) || LANGUAGE_OPTIONS[0];

    return (
      <>
        <TouchableOpacity
          style={[
            styles.compactButton,
            isLight && styles.compactButtonLight,
            style,
          ]}
          onPress={() => setModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel={`Language selector, current language is ${activeOption.englishName}`}
          activeOpacity={0.75}
        >
          <Text style={styles.globeIcon}>🌐</Text>
          <Text style={[styles.compactLabel, isLight && styles.compactLabelLight]}>
            {activeOption.label}
          </Text>
          <Text style={[styles.dropdownArrow, isLight && styles.dropdownArrowLight]}>▼</Text>
        </TouchableOpacity>

        <Modal
          visible={modalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          >
            <View style={styles.modalContainer}>
              <View style={[styles.modalCard, isLight && styles.modalCardLight]}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, isLight && styles.modalTitleLight]} accessibilityRole="header">
                    {t('common.selectLanguage')}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setModalVisible(false)}
                    accessibilityRole="button"
                    accessibilityLabel={t('common.close')}
                    style={styles.closeButton}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <Text style={[styles.closeButtonText, isLight && styles.closeButtonTextLight]}>✕</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.listContainer}>
                  {LANGUAGE_OPTIONS.map((opt) => {
                    const isSelected = opt.code === language;
                    return (
                      <TouchableOpacity
                        key={opt.code}
                        style={[
                          styles.listItem,
                          isLight && styles.listItemLight,
                          isSelected && (isLight ? styles.listItemSelectedLight : styles.listItemSelected),
                        ]}
                        onPress={() => handleSelect(opt.code)}
                        accessibilityRole="button"
                        accessibilityLabel={`${opt.englishName}, ${opt.label}`}
                        accessibilityState={{ selected: isSelected }}
                        activeOpacity={0.75}
                      >
                        <View style={styles.itemTextContainer}>
                          <Text style={[
                            styles.itemNative,
                            isLight && styles.itemNativeLight,
                            isSelected && (isLight ? styles.itemTextSelectedLight : styles.itemTextSelected),
                          ]}>
                            {opt.label}
                          </Text>
                          <Text style={[styles.itemEnglish, isLight && styles.itemEnglishLight]}>
                            {opt.englishName}
                          </Text>
                        </View>
                        {isSelected && (
                          <View style={[styles.selectedBadge, isLight && styles.selectedBadgeLight]}>
                            <Text style={styles.selectedCheck}>✓</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      </>
    );
  }

  // Full list variant
  if (variant === 'list') {
    return (
      <View style={[styles.fullListContainer, style]}>
        <Text style={styles.sectionLabel}>{t('common.selectLanguage')}</Text>
        <View style={styles.listContainer}>
          {LANGUAGE_OPTIONS.map((opt) => {
            const isSelected = opt.code === language;
            return (
              <TouchableOpacity
                key={opt.code}
                style={[
                  styles.listItem,
                  isSelected && styles.listItemSelected,
                ]}
                onPress={() => handleSelect(opt.code)}
                accessibilityRole="button"
                accessibilityLabel={`${opt.englishName}, ${opt.label}`}
                accessibilityState={{ selected: isSelected }}
                activeOpacity={0.75}
              >
                <View style={styles.itemTextContainer}>
                  <Text style={[styles.itemNative, isSelected && styles.itemTextSelected]}>
                    {opt.label}
                  </Text>
                  <Text style={styles.itemEnglish}>{opt.englishName}</Text>
                </View>
                {isSelected && (
                  <View style={styles.selectedBadge}>
                    <Text style={styles.selectedCheck}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  }

  // Default: Horizontal chips variant
  return (
    <View style={[styles.chipsContainer, style]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsScrollContent}
      >
        {LANGUAGE_OPTIONS.map((opt) => {
          const isSelected = opt.code === language;
          return (
            <TouchableOpacity
              key={opt.code}
              style={[
                styles.chip,
                isLight && styles.chipLight,
                isSelected && (isLight ? styles.chipSelectedLight : styles.chipSelected),
              ]}
              onPress={() => handleSelect(opt.code)}
              accessibilityRole="button"
              accessibilityLabel={`Select ${opt.englishName}`}
              accessibilityState={{ selected: isSelected }}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.chipText,
                  isLight && styles.chipTextLight,
                  isSelected && (isLight ? styles.chipTextSelectedLight : styles.chipTextSelected),
                ]}
              >
                {opt.label}
              </Text>
              {isSelected && (
                <Text style={[styles.chipCheck, isLight && styles.chipCheckLight]}> ✓</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
});

LanguageSelector.displayName = 'LanguageSelector';

const styles = StyleSheet.create({
  // Chips
  chipsContainer: {
    marginVertical: spacing.spaceXs,
  },
  chipsScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.spaceXs + 2,
    paddingVertical: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.spaceMd,
    paddingVertical: 10,
    borderRadius: spacing.radiusPill,
    backgroundColor: colors.glassFill,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    minHeight: 48,
    minWidth: 76,
  },
  chipLight: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  chipSelected: {
    backgroundColor: 'rgba(74, 222, 128, 0.2)',
    borderColor: colors.primary,
  },
  chipSelectedLight: {
    backgroundColor: '#071E22',
    borderColor: '#071E22',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chipTextLight: {
    color: '#374151',
  },
  chipTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  chipTextSelectedLight: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  chipCheck: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  chipCheckLight: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },

  // Compact button
  compactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glassFill,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: spacing.radiusSm,
    paddingHorizontal: spacing.spaceSm + 4,
    paddingVertical: 8,
    minHeight: 48,
  },
  globeIcon: {
    fontSize: 15,
    marginRight: 6,
  },
  compactLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginRight: 4,
  },
  dropdownArrow: {
    fontSize: 9,
    color: colors.textTertiary,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.spaceMd,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 360,
  },
  modalCard: {
    backgroundColor: '#0F262B',
    borderRadius: spacing.radiusLg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: spacing.spaceLg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.spaceLg,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  closeButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '700',
  },

  // List
  fullListContainer: {
    width: '100%',
    marginVertical: spacing.spaceSm,
  },
  sectionLabel: {
    fontSize: typography.Label.fontSize,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 1.2,
    marginBottom: spacing.spaceSm,
  },
  listContainer: {
    gap: spacing.spaceSm,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.spaceMd,
    paddingVertical: spacing.spaceSm + 4,
    borderRadius: spacing.radiusMd,
    backgroundColor: colors.glassSurface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    minHeight: 56,
  },
  listItemSelected: {
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    borderColor: colors.primary,
  },
  itemTextContainer: {
    flex: 1,
  },
  itemNative: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  itemTextSelected: {
    color: colors.primary,
  },
  itemEnglish: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  selectedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.spaceSm,
  },
  selectedCheck: {
    color: colors.textInverse,
    fontSize: 13,
    fontWeight: '900',
  },

  // Institutional light theme styles
  compactButtonLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: 6,
  },
  compactLabelLight: {
    color: '#0F2942',
    fontWeight: '700',
  },
  dropdownArrowLight: {
    color: '#475569',
  },
  modalCardLight: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  modalTitleLight: {
    color: '#0F2942',
    fontSize: 18,
    fontWeight: '800',
  },
  closeButtonTextLight: {
    color: '#475569',
  },
  listItemLight: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 6,
  },
  listItemSelectedLight: {
    backgroundColor: '#0F2942',
    borderColor: '#0F2942',
  },
  itemNativeLight: {
    color: '#0F2942',
    fontWeight: '700',
  },
  itemEnglishLight: {
    color: '#64748B',
  },
  itemTextSelectedLight: {
    color: '#FFFFFF',
  },
  selectedBadgeLight: {
    backgroundColor: '#15803D',
  },
});

