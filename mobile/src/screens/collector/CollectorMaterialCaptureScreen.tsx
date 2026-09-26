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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useI18n } from '../../i18n';
import { TopAppBar } from '../../components/layout/TopAppBar';
import { EcoSetuBackground } from '../../components/eco';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { AppIcon } from '../../components/ui/AppIcon';

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
import { aiService, AIPrediction } from '../../services/aiService';

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

  // AI Assistive state
  const [aiPrediction, setAiPrediction] = useState<AIPrediction | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState<boolean>(false);
  const [aiSuggestionDismissed, setAiSuggestionDismissed] = useState<boolean>(false);
  const activeAiImageUri = React.useRef<string | null>(null);

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

  const handleAcceptAiSuggestion = (catId: string) => {
    handleSelectCategory(catId);
    setAiSuggestionDismissed(true);
  };

  const handleDismissAiSuggestion = () => {
    setAiSuggestionDismissed(true);
  };

  const runAiAnalysis = (imageUri: string, filename?: string, mimeType?: string) => {
    activeAiImageUri.current = imageUri;
    setIsAiAnalyzing(true);
    setAiError(null);
    setAiPrediction(null);
    setAiSuggestionDismissed(false);
    console.log(`[EcoSetu AI MOBILE DEBUG] Collector runAiAnalysis called with URI: ${imageUri}`);

    aiService
      .predictMaterial(imageUri, filename, mimeType)
      .then((aiRes) => {
        if (activeAiImageUri.current === imageUri) {
          setIsAiAnalyzing(false);
          if (aiRes.success && aiRes.prediction) {
            console.log(
              `[EcoSetu AI MOBILE DEBUG] Collector received valid AI prediction: has_detection=${aiRes.prediction.has_detection}, category=${aiRes.prediction.category}`
            );
            setAiPrediction(aiRes.prediction);
            setAiError(null);
          } else {
            console.log(`[EcoSetu AI MOBILE DEBUG] Collector AI request failed: ${aiRes.error}`);
            setAiPrediction(null);
            setAiError(aiRes.error || 'AI_SERVICE_UNAVAILABLE');
          }
        } else {
          console.log('[EcoSetu AI MOBILE DEBUG] Stale image URI match ignored in Collector screen');
        }
      })
      .catch((err) => {
        console.warn('[EcoSetu AI MOBILE DEBUG] Collector AI request rejected:', err?.message || err);
        if (activeAiImageUri.current === imageUri) {
          setIsAiAnalyzing(false);
          setAiPrediction(null);
          setAiError(err?.message || 'AI_SERVICE_UNAVAILABLE');
        }
      });
  };

  const handleRetryAi = () => {
    if (photos.length > 0) {
      runAiAnalysis(photos[photos.length - 1]);
    }
  };

  const handleTakePhoto = async () => {
    try {
      setIsCapturing(true);
      console.log('[EcoSetu AI MOBILE DEBUG] Collector photo capture initiated');
      const result = await capturePhoto();
      if (result.success && result.uri) {
        const newUri = result.uri;
        console.log(`[EcoSetu AI MOBILE DEBUG] Collector photo captured successfully: ${newUri}`);
        setPhotos((prev) => [...prev, newUri]);
        runAiAnalysis(newUri, result.fileName, result.type);
      } else if (result.error && result.error !== 'USER_CANCELLED') {
        console.warn(`[EcoSetu AI MOBILE DEBUG] Camera capture error: ${result.error}`);
        Alert.alert(t('common.error'), result.error);
      }
    } catch (err: any) {
      console.error('[EcoSetu AI DEBUG] handleTakePhoto uncaught exception:', err);
      Alert.alert(t('common.error'), err.message || 'Camera capture failed');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      if (updated.length === 0) {
        activeAiImageUri.current = null;
        setAiPrediction(null);
        setIsAiAnalyzing(false);
      }
      return updated;
    });
  };

  const handleProceed = () => {
    navigation.navigate('CollectorCreateLot', {
      category: selectedCategory,
      subcategory: selectedSubcategory,
      condition,
      sourceType,
      photos,
      aiPrediction: aiPrediction || undefined,
    });
  };

  const getCategoryIcon = (id: string): any => {
    switch (id) {
      case 'CRT': return 'tv';
      case 'LCD_PANEL': return 'computer';
      case 'PCB': return 'grid';
      case 'CABLE': return 'link';
      case 'BATTERY': return 'battery';
      case 'MOTOR': return 'settings';
      case 'MAGNET_ASSEMBLY': return 'refresh';
      case 'MIXED_PLASTIC': return 'recycle';
      case 'MOBILE_PHONE': return 'mobile';
      case 'LAPTOP': return 'laptop';
      case 'MONITOR': return 'computer';
      case 'PRINTER': return 'file';
      case 'KEYBOARD_MOUSE': return 'grid';
      case 'DESKTOP_COMPUTER': return 'computer';
      case 'TABLET': return 'mobile';
      default: return 'package';
    }
  };

  const conditions = [
    { id: 'WORKING', icon: 'check', label: t('materialLots.conditions.WORKING') },
    { id: 'NOT_WORKING', icon: 'clock', label: t('materialLots.conditions.NOT_WORKING') },
    { id: 'DAMAGED', icon: 'close', label: t('materialLots.conditions.DAMAGED') },
    { id: 'UNKNOWN', icon: 'help', label: t('materialLots.conditions.UNKNOWN') },
  ];

  const sourceTypes = [
    { id: 'HOUSEHOLD', icon: 'home', label: t('materialLots.sourceTypes.HOUSEHOLD') },
    { id: 'COMMERCIAL', icon: 'store', label: t('materialLots.sourceTypes.COMMERCIAL') },
    { id: 'INDUSTRIAL', icon: 'factory', label: t('materialLots.sourceTypes.INDUSTRIAL') },
    { id: 'STREET', icon: 'truck', label: t('materialLots.sourceTypes.STREET') },
    { id: 'OTHER', icon: 'package', label: t('materialLots.sourceTypes.OTHER') },
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
          {/* AI Vision Assist Banner */}
          <View style={styles.aiHelperBanner}>
            <View style={styles.aiBannerBadgeRow}>
              <View style={styles.aiBannerBadge}>
                <AppIcon name="sparkles" size={13} color="#34D399" />
                <Text style={styles.aiBannerBadgeText}>{t('admin.systemHealth.aiServiceTitle') || 'AI Vision Assist'}</Text>
              </View>
              <Text style={styles.aiBannerLiveStatus}>● YOLOv8 Active</Text>
            </View>
            <Text style={styles.aiBannerDesc}>
              {t('admin.systemHealth.aiServiceDesc') || 'Take a photo of collected scrap to automatically detect category (Smartphones, PCBs, Tablets, Keyboards & more).'}
            </Text>
          </View>

          {/* Section 1: Photos Capture Strip */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleRow}>
                <AppIcon name="camera" size={18} color="#10B981" />
                <Text style={styles.sectionTitle}>{t('materialLots.takePhoto')}</Text>
              </View>
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
                <AppIcon name="camera" size={24} color="#10B981" />
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
                    <AppIcon name="x" size={12} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>

          {/* AI Assistive Suggestion Box (Non-blocking, assistive only) */}
          {isAiAnalyzing && (
            <View style={styles.aiAnalyzingCard}>
              <ActivityIndicator size="small" color="#10B981" style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.aiAnalyzingText}>{t('ai.checkingPhoto') || 'Analyzing photo with AI model...'}</Text>
                <Text style={styles.aiAnalyzingSubText}>
                  {t('ai.aiProcessingTimeNotice') || 'Checking your photo with AI...'}
                </Text>
              </View>
            </View>
          )}

          {!isAiAnalyzing && !aiSuggestionDismissed && (aiPrediction || aiError) && photos.length > 0 && (
            <View style={[styles.aiSuggestionCard, Boolean(aiError) && styles.aiErrorCard]}>
              {aiPrediction && aiPrediction.has_detection && aiPrediction.category && MATERIAL_TAXONOMY[aiPrediction.category] ? (
                (() => {
                  console.log('[EcoSetu AI MOBILE DEBUG] final UI branch selected: SUCCESS_WITH_DETECTION');
                  const catDef = MATERIAL_TAXONOMY[aiPrediction.category];
                  const percent = Math.round(aiPrediction.confidence * 100);
                  const isLowConf = aiPrediction.confidence_level === 'LOW' || aiPrediction.review_required;
                  return (
                    <View>
                      <View style={styles.aiCardHeaderRow}>
                        <View style={styles.aiTitleRow}>
                          <AppIcon name="sparkles" size={16} color="#34D399" style={{ marginRight: 6 }} />
                          <Text style={styles.aiCardTitle}>
                            {isLowConf ? t('ai.possibleMatch') : t('ai.suggestion')}
                          </Text>
                        </View>
                        <Text style={styles.aiPercentBadge}>
                          {t('ai.matchConfidence', { percent }) || `${percent}% match`}
                        </Text>
                      </View>

                      <View style={styles.aiSuggestionBody}>
                        <View
                          style={[
                            styles.aiSymbolContainer,
                            { backgroundColor: catDef.color + '25', borderColor: catDef.color },
                          ]}
                        >
                          <AppIcon name={getCategoryIcon(catDef.id)} size={22} color={catDef.accentColor || '#10B981'} />
                        </View>
                        <View style={styles.aiInfoCol}>
                          <Text style={styles.aiCategoryName}>
                            {t(catDef.i18nKey) || catDef.defaultName}
                          </Text>
                          <Text style={styles.aiCategorySubtitle}>
                            {isLowConf ? t('ai.manualVerificationNeeded') : t('materialLots.tapToSelect')}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.aiActionRow}>
                        <TouchableOpacity
                          style={styles.aiUseButton}
                          onPress={() => handleAcceptAiSuggestion(aiPrediction.category!)}
                          activeOpacity={0.7}
                          accessibilityRole="button"
                          accessibilityLabel={t('ai.useSuggestion')}
                        >
                          <View style={styles.btnRow}>
                            <AppIcon name="check" size={15} color="#071E22" />
                            <Text style={styles.aiUseButtonText}>{t('ai.useSuggestion')}</Text>
                          </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.aiDismissButton}
                          onPress={handleDismissAiSuggestion}
                          activeOpacity={0.7}
                          accessibilityRole="button"
                          accessibilityLabel={t('ai.chooseManually')}
                        >
                          <Text style={styles.aiDismissButtonText}>{t('ai.chooseManually')}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })()
              ) : aiPrediction ? (
                // CASE A: VALID AI NO DETECTION (AI responded successfully, no supported e-waste found)
                (() => {
                  console.log('[EcoSetu AI MOBILE DEBUG] final UI branch selected: SUCCESS_NO_DETECTION');
                  return (
                    <View>
                      <View style={styles.aiCardHeaderRow}>
                        <View style={styles.sectionTitleRow}>
                          <AppIcon name="search" size={16} color="#38BDF8" />
                          <Text style={styles.aiNoDetTitle}>{t('ai.couldNotConfidentlyIdentify', "Couldn't confidently identify this item")}</Text>
                        </View>
                      </View>
                      <Text style={styles.aiNoDetSubtitle}>{t('ai.noMatchingEwaste', 'No supported e-waste detected. Please select category manually.')}</Text>
                      <TouchableOpacity
                        style={styles.aiDismissButtonSingle}
                        onPress={handleDismissAiSuggestion}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={t('ai.chooseManually')}
                      >
                        <Text style={styles.aiDismissButtonText}>{t('ai.chooseManually')}</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })()
              ) : (
                // CASE B: AI SERVICE UNAVAILABLE / TIMEOUT / NETWORK ERROR
                (() => {
                  console.log('[EcoSetu AI MOBILE DEBUG] final UI branch selected: AI_SERVICE_ERROR');
                  return (
                    <View>
                      <View style={styles.aiCardHeaderRow}>
                        <View style={styles.sectionTitleRow}>
                          <AppIcon name="warning" size={16} color="#EF4444" />
                          <Text style={styles.aiErrorTitle}>{t('ai.serviceUnavailableTitle', 'AI Service Unavailable')}</Text>
                        </View>
                      </View>
                      <Text style={styles.aiNoDetSubtitle}>{t('ai.suggestionUnavailable', 'AI service is temporarily unavailable. Select material manually.')}</Text>
                      <View style={styles.aiActionRow}>
                        <TouchableOpacity
                          style={styles.aiRetryButton}
                          onPress={handleRetryAi}
                          activeOpacity={0.7}
                          accessibilityRole="button"
                          accessibilityLabel={t('ai.retryAnalysis', 'Retry AI')}
                        >
                          <View style={styles.btnRow}>
                            <AppIcon name="refresh" size={14} color="#071E22" />
                            <Text style={styles.aiRetryButtonText}>{t('ai.retryAnalysis', 'Retry AI')}</Text>
                          </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.aiDismissButton}
                          onPress={handleDismissAiSuggestion}
                          activeOpacity={0.7}
                          accessibilityRole="button"
                          accessibilityLabel={t('ai.chooseManually')}
                        >
                          <Text style={styles.aiDismissButtonText}>{t('ai.chooseManually')}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })()
              )}
            </View>
          )}

          {/* Section 2: Pictorial Category Picker (15 SIH Types, >=64dp cards, >=48dp touch) */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionTitleRow}>
              <AppIcon name="package" size={18} color="#10B981" />
              <Text style={styles.sectionTitle}>{t('materialLots.selectCategory')}</Text>
            </View>
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
                      <AppIcon name={getCategoryIcon(cat.id)} size={24} color={isSelected ? cat.accentColor : '#94A3B8'} />
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
              <View style={styles.sectionTitleRow}>
                <AppIcon name="search" size={18} color="#10B981" />
                <Text style={styles.sectionTitle}>{t('materialLots.selectSubcategory')}</Text>
              </View>
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
            <View style={styles.sectionTitleRow}>
              <AppIcon name="settings" size={18} color="#10B981" />
              <Text style={styles.sectionTitle}>{t('materialLots.selectCondition')}</Text>
            </View>
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
                    <AppIcon
                      name={item.icon as any}
                      size={14}
                      color={isSelected ? '#14B8A6' : '#94A3B8'}
                      style={{ marginRight: 6 }}
                    />
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
            <View style={styles.sectionTitleRow}>
              <AppIcon name="location" size={18} color="#10B981" />
              <Text style={styles.sectionTitle}>{t('materialLots.selectSource')}</Text>
            </View>
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
                    <AppIcon
                      name={item.icon as any}
                      size={14}
                      color={isSelected ? '#14B8A6' : '#94A3B8'}
                      style={{ marginRight: 6 }}
                    />
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
            <View style={styles.btnRow}>
              <Text style={styles.proceedButtonText}>{t('common.next')}</Text>
              <AppIcon name="arrowRight" size={18} color="#071E22" />
            </View>
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
  aiHelperBanner: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.25)',
    borderWidth: 1,
    borderRadius: 14,
    padding: space.sm,
    marginBottom: space.sm,
  },
  aiBannerBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  aiBannerBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  aiBannerBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#10B981',
  },
  aiBannerLiveStatus: {
    fontSize: 11,
    fontWeight: '600',
    color: '#34D399',
  },
  aiBannerDesc: {
    fontSize: 12,
    color: colors.textSecondary || '#94A3B8',
    lineHeight: 17,
  },
  aiAnalyzingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 184, 166, 0.12)',
    borderColor: 'rgba(20, 184, 166, 0.3)',
    borderWidth: 1,
    borderRadius: 12,
    padding: space.sm,
    marginBottom: space.md,
  },
  aiAnalyzingIcon: {
    fontSize: 18,
    marginRight: space.xs,
  },
  aiAnalyzingText: {
    fontSize: 13,
    color: colors.primary || '#14B8A6',
    fontWeight: '600',
  },
  aiAnalyzingSubText: {
    fontSize: 11,
    color: colors.textSecondary || '#94A3B8',
    marginTop: 2,
  },
  aiSuggestionCard: {
    backgroundColor: 'rgba(20, 184, 166, 0.15)',
    borderColor: 'rgba(20, 184, 166, 0.4)',
    borderWidth: 1.5,
    borderRadius: 16,
    padding: space.md,
    marginBottom: space.md,
  },
  aiCardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: space.xs,
  },
  aiTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiSparkleIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  aiCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary || '#14B8A6',
  },
  aiPercentBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#071E22',
    backgroundColor: colors.primary || '#14B8A6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  aiSuggestionBody: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: space.xs,
  },
  aiSymbolContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    marginRight: space.sm,
  },
  aiSymbolText: {
    fontSize: 24,
  },
  aiInfoCol: {
    flex: 1,
  },
  aiCategoryName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary || '#FFFFFF',
  },
  aiCategorySubtitle: {
    fontSize: 11,
    color: colors.textSecondary || '#94A3B8',
    marginTop: 2,
  },
  aiActionRow: {
    flexDirection: 'row',
    gap: space.xs,
    marginTop: space.sm,
  },
  aiUseButton: {
    flex: 1.2,
    backgroundColor: colors.primary || '#14B8A6',
    minHeight: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiUseButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#071E22',
  },
  aiDismissButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    minHeight: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiDismissButtonSingle: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    minHeight: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: space.xs,
  },
  aiDismissButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary || '#CBD5E1',
  },
  aiNoDetTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary || '#FFFFFF',
  },
  aiNoDetSubtitle: {
    fontSize: 12,
    color: colors.textSecondary || '#94A3B8',
    marginVertical: 4,
  },
  aiErrorCard: {
    borderColor: 'rgba(245, 158, 11, 0.4)',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  aiErrorTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F59E0B',
  },
  aiRetryButton: {
    flex: 1.2,
    backgroundColor: '#F59E0B',
    minHeight: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiRetryButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#071E22',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
});

export default CollectorMaterialCaptureScreen;


