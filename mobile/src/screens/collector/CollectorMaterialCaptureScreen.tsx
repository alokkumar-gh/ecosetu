/**
 * CollectorMaterialCaptureScreen.tsx
 * Authenticated INFORMAL_COLLECTOR — Step 1: Capture Material & Category Selection
 *
 * Requirements:
 * SIH-MAT-001: Device camera photo capture
 * SIH-MAT-002: Offline photo capture support
 * SIH-MAT-003: Pictorial category picker (15 SIH categories)
 * SIH-MAT-004: Subcategory selection
 * SIH-MAT-006: Condition selection (WORKING, NOT_WORKING, DAMAGED, UNKNOWN)
 * SIH-MAT-007: Source type selection (HOUSEHOLD, COMMERCIAL, INDUSTRIAL, STREET, OTHER)
 * SIH-MAT-010: Low-literacy UI with large icons (>=48dp touch targets, pictorial cards)
 *
 * Canonical Reference: docs/25_SIH_26229_REQUIREMENTS.md Section 4 Module 1
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useI18n } from '../../i18n';
import { TopAppBar } from '../../components/layout/TopAppBar';
import { EcoSetuBackground } from '../../components/eco';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

const space = {
  xs: spacing.spaceXs,
  sm: spacing.spaceSm,
  md: spacing.spaceMd,
  lg: spacing.spaceLg,
  xl: spacing.spaceXl,
};
import {
  MATERIAL_TAXONOMY,
  MATERIAL_TAXONOMY_LIST,
  MaterialCategoryDef,
  MaterialSubcategory,
} from '../../config/materialTaxonomy';
import { capturePhoto } from '../../services/cameraService';

interface CollectorMaterialCaptureScreenProps {
  navigation: any;
  route?: any;
}

export const CollectorMaterialCaptureScreen: React.FC<CollectorMaterialCaptureScreenProps> = ({
  navigation,
  route,
}) => {
  const { t } = useI18n();

  const [selectedCategory, setSelectedCategory] = useState<string>('PCB');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
  const [condition, setCondition] = useState<string>('DAMAGED');
  const [sourceType, setSourceType] = useState<string>('HOUSEHOLD');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);

  const activeCategoryDef: MaterialCategoryDef =
    MATERIAL_TAXONOMY[selectedCategory] || MATERIAL_TAXONOMY_LIST[0];

  const handleSelectCategory = (catId: string) => {
    setSelectedCategory(catId);
    const def = MATERIAL_TAXONOMY[catId];
    if (def && def.subcategories.length > 0) {
      setSelectedSubcategory(def.subcategories[0].id);
    } else {
      setSelectedSubcategory('');
    }
  };

  const handleTakePhoto = async () => {
    try {
      setIsCapturing(true);
      const result = await capturePhoto();
      if (result.success && result.uri) {
        setPhotos((prev) => [...prev, result.uri!]);
      } else if (result.error && result.error !== 'USER_CANCELLED') {
        Alert.alert(t('common.error'), result.error);
      }
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message || 'Camera capture failed');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProceed = () => {
    navigation.navigate('CollectorCreateLot', {
      category: selectedCategory,
      subcategory: selectedSubcategory,
      condition,
      sourceType,
      photos,
    });
  };

  const conditions = [
    { id: 'WORKING', icon: '⚡', label: t('materialLots.conditions.WORKING') },
    { id: 'NOT_WORKING', icon: '🔌', label: t('materialLots.conditions.NOT_WORKING') },
    { id: 'DAMAGED', icon: '🔨', label: t('materialLots.conditions.DAMAGED') },
    { id: 'UNKNOWN', icon: '❓', label: t('materialLots.conditions.UNKNOWN') },
  ];

  const sourceTypes = [
    { id: 'HOUSEHOLD', icon: '🏠', label: t('materialLots.sourceTypes.HOUSEHOLD') },
    { id: 'COMMERCIAL', icon: '🏢', label: t('materialLots.sourceTypes.COMMERCIAL') },
    { id: 'INDUSTRIAL', icon: '🏭', label: t('materialLots.sourceTypes.INDUSTRIAL') },
    { id: 'STREET', icon: '🚚', label: t('materialLots.sourceTypes.STREET') },
    { id: 'OTHER', icon: '📦', label: t('materialLots.sourceTypes.OTHER') },
  ];

  return (
    <EcoSetuBackground>
      <SafeAreaView style={styles.safeArea}>
        <TopAppBar
          title={t('materialLots.captureTitle')}
          subtitle={t('materialLots.captureSubtitle')}
          showBack
          onBack={() => navigation.goBack()}
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Section 1: Photos Capture Strip */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>📸 {t('materialLots.takePhoto')}</Text>
              <Text style={styles.sectionBadge}>
                {photos.length} {t('materialLots.photosCount')}
              </Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoStrip}>
              <TouchableOpacity
                style={styles.cameraButton}
                onPress={handleTakePhoto}
                disabled={isCapturing}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={t('materialLots.takePhoto')}
              >
                <Text style={styles.cameraIcon}>📷</Text>
                <Text style={styles.cameraText}>
                  {photos.length === 0 ? t('materialLots.takePhoto') : t('materialLots.addMorePhotos')}
                </Text>
              </TouchableOpacity>

              {photos.map((uri, idx) => (
                <View key={idx} style={styles.photoThumbnailWrapper}>
                  <Image source={{ uri }} style={styles.photoThumbnail} />
                  <TouchableOpacity
                    style={styles.removePhotoButton}
                    onPress={() => handleRemovePhoto(idx)}
                    accessibilityRole="button"
                    accessibilityLabel="Remove photo"
                    hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                  >
                    <Text style={styles.removePhotoText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>

          {/* Section 2: Pictorial Category Picker (15 SIH Types, >=64dp cards, >=48dp touch) */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>📦 {t('materialLots.selectCategory')}</Text>
            <Text style={styles.sectionSubtitle}>
              {t('lowLiteracy.tapMatchingScrap') || 'Tap the picture that matches your collected scrap'}
            </Text>

            <View style={styles.categoryGrid}>
              {MATERIAL_TAXONOMY_LIST.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryCard,
                      isSelected && styles.categoryCardSelected,
                      isSelected && { borderColor: cat.color },
                    ]}
                    onPress={() => handleSelectCategory(cat.id)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={t(cat.i18nKey) || cat.defaultName}
                  >
                    <View
                      style={[
                        styles.symbolContainer,
                        { backgroundColor: isSelected ? cat.color + '33' : 'rgba(255,255,255,0.06)' },
                      ]}
                    >
                      <Text style={styles.categorySymbol}>{cat.symbol}</Text>
                    </View>
                    <Text
                      style={[
                        styles.categoryName,
                        isSelected && { color: cat.accentColor, fontWeight: '700' },
                      ]}
                      numberOfLines={2}
                    >
                      {t(cat.i18nKey) || cat.defaultName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Section 3: Subcategory Selector */}
          {activeCategoryDef.subcategories.length > 0 && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>🔍 {t('materialLots.selectSubcategory')}</Text>
              <View style={styles.pillRow}>
                {activeCategoryDef.subcategories.map((sub: MaterialSubcategory) => {
                  const isSelected = selectedSubcategory === sub.id;
                  return (
                    <TouchableOpacity
                      key={sub.id}
                      style={[styles.pillButton, isSelected && styles.pillButtonSelected]}
                      onPress={() => setSelectedSubcategory(sub.id)}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                    >
                      <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
                        {t(sub.i18nKey) || sub.defaultName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Section 4: Condition Picker */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>⚙️ {t('materialLots.selectCondition')}</Text>
            <View style={styles.pillRow}>
              {conditions.map((item) => {
                const isSelected = condition === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.chipButton, isSelected && styles.chipButtonSelected]}
                    onPress={() => setCondition(item.id)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text style={styles.chipIcon}>{item.icon}</Text>
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Section 5: Source Type Picker */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>📍 {t('materialLots.selectSource')}</Text>
            <View style={styles.pillRow}>
              {sourceTypes.map((item) => {
                const isSelected = sourceType === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.chipButton, isSelected && styles.chipButtonSelected]}
                    onPress={() => setSourceType(item.id)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text style={styles.chipIcon}>{item.icon}</Text>
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Next Button */}
          <TouchableOpacity
            style={styles.proceedButton}
            onPress={handleProceed}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t('common.next')}
          >
            <Text style={styles.proceedButtonText}>{t('common.next')} ➔</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </EcoSetuBackground>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: space.md,
    paddingBottom: space.xl * 2,
  },
  sectionCard: {
    backgroundColor: 'rgba(15, 35, 40, 0.75)',
    borderRadius: 16,
    padding: space.md,
    marginBottom: space.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: space.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary || '#FFFFFF',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textSecondary || '#94A3B8',
    marginBottom: space.sm,
  },
  sectionBadge: {
    fontSize: 11,
    color: colors.primary || '#14B8A6',
    backgroundColor: 'rgba(20, 184, 166, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    fontWeight: '600',
  },
  photoStrip: {
    flexDirection: 'row',
    marginTop: space.xs,
  },
  cameraButton: {
    width: 90,
    height: 90,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(20, 184, 166, 0.5)',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(20, 184, 166, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: space.sm,
    padding: 4,
  },
  cameraIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  cameraText: {
    fontSize: 10,
    color: colors.primary || '#14B8A6',
    textAlign: 'center',
    fontWeight: '600',
  },
  photoThumbnailWrapper: {
    position: 'relative',
    marginRight: space.sm,
  },
  photoThumbnail: {
    width: 90,
    height: 90,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  removePhotoButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#EF4444',
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removePhotoText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: space.xs,
  },
  categoryCard: {
    width: '31%',
    minHeight: 116,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: space.xs,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.sm,
  },
  categoryCardSelected: {
    backgroundColor: 'rgba(20, 184, 166, 0.18)',
    borderColor: colors.primary || '#14B8A6',
  },
  symbolContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  categorySymbol: {
    fontSize: 32,
  },
  categoryName: {
    fontSize: 11,
    color: colors.textSecondary || '#CBD5E1',
    textAlign: 'center',
    fontWeight: '500',
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.xs,
    marginTop: space.xs,
  },
  pillButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    minHeight: 48,
    justifyContent: 'center',
  },
  pillButtonSelected: {
    backgroundColor: 'rgba(20, 184, 166, 0.25)',
    borderColor: colors.primary || '#14B8A6',
  },
  pillText: {
    fontSize: 12,
    color: colors.textSecondary || '#CBD5E1',
    fontWeight: '500',
  },
  pillTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  chipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    minHeight: 48,
  },
  chipButtonSelected: {
    backgroundColor: 'rgba(20, 184, 166, 0.2)',
    borderColor: colors.primary || '#14B8A6',
  },
  chipIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  chipText: {
    fontSize: 12,
    color: colors.textSecondary || '#CBD5E1',
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  proceedButton: {
    backgroundColor: colors.primary || '#14B8A6',
    borderRadius: 14,
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: space.sm,
    shadowColor: '#14B8A6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  proceedButtonText: {
    color: '#071E22',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

