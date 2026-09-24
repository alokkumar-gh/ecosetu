/**
 * CollectorCreateLotScreen.tsx
 * Authenticated INFORMAL_COLLECTOR — Step 2: Weight, Description, GPS & Lot Finalization
 *
 * Requirements:
 * SIH-LOT-001: Create digital Material Lot
 * SIH-LOT-002: Lot contents definition
 * SIH-LOT-003: Offline lot draft creation
 * SIH-LOT-004: Lot editing before submission
 * SIH-LOT-007: Multiple photos support
 * SIH-LOT-008: Automatic GPS capture with graceful fallback
 *
 * Canonical Reference: docs/25_SIH_26229_REQUIREMENTS.md Section 4 Module 2
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useI18n } from '../../i18n';
import { useNetwork } from '../../hooks/useNetwork';
import { TopAppBar } from '../../components/layout/TopAppBar';
import { OfflineBanner } from '../../components/common/OfflineBanner';
import { QuickNumberStepper } from '../../components/common/QuickNumberStepper';
import { EcoSetuBackground, EcoGlassTextArea } from '../../components/eco';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

const space = {
  xs: spacing.spaceXs,
  sm: spacing.spaceSm,
  md: spacing.spaceMd,
  lg: spacing.spaceLg,
  xl: spacing.spaceXl,
};
import { getCurrentLocation, LocationCoordinates } from '../../services/locationService';
import { materialLotService } from '../../services/materialLotService';
import { priceService, ValuationResult } from '../../services/priceService';
import { MATERIAL_TAXONOMY } from '../../config/materialTaxonomy';

interface CollectorCreateLotScreenProps {
  navigation?: any;
  route?: {
    params?: {
      category?: string;
      subcategory?: string;
      condition?: string;
      sourceType?: string;
      photos?: string[];
      lotId?: string;
      existingLot?: any;
    };
  };
}

export const CollectorCreateLotScreen: React.FC<CollectorCreateLotScreenProps> = ({
  navigation,
  route,
}) => {
  const { t } = useI18n();
  const { isConnected } = useNetwork();

  const params = route?.params || {};
  const isEditing = Boolean(params.lotId);

  const [category] = useState<string>(params.category || params.existingLot?.category || 'PCB');
  const [subcategory] = useState<string>(params.subcategory || params.existingLot?.subcategory || '');
  const [condition] = useState<string>(params.condition || params.existingLot?.condition || 'DAMAGED');
  const [sourceType] = useState<string>(params.sourceType || params.existingLot?.sourceType || 'HOUSEHOLD');
  const [photos] = useState<string[]>(params.photos || params.existingLot?.photos?.map((p: any) => p.photoUrl) || []);

  const [weightKg, setWeightKg] = useState<string>(
    params.existingLot?.approximateTotalWeightKg ? String(params.existingLot.approximateTotalWeightKg) : ''
  );
  const [description, setDescription] = useState<string>(params.existingLot?.description || '');
  const [listingPurpose, setListingPurpose] = useState<'RECYCLING' | 'REUSE' | 'REPAIR_REUSE'>(
    params.existingLot?.listingPurpose || (condition === 'WORKING' || condition === 'TESTED_WORKING' ? 'REUSE' : 'RECYCLING')
  );
  const [askingPrice, setAskingPrice] = useState<string>(
    params.existingLot?.askingPrice ? String(params.existingLot.askingPrice) : ''
  );

  // Live Rule-based Valuation state (SIH-PRICE-003, SIH-VAL-001)
  const [valuation, setValuation] = useState<ValuationResult | null>(null);
  const [isValuating, setIsValuating] = useState<boolean>(false);

  // GPS state
  const [gpsLocation, setGpsLocation] = useState<LocationCoordinates | null>(
    params.existingLot?.collectionLat
      ? {
          latitude: Number(params.existingLot.collectionLat),
          longitude: Number(params.existingLot.collectionLng),
          accuracy: Number(params.existingLot.collectionAccuracy) || null,
        }
      : null
  );
  const [gpsStatus, setGpsStatus] = useState<'IDLE' | 'ACQUIRING' | 'ACQUIRED' | 'UNAVAILABLE'>('IDLE');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Attempt automatic GPS capture on load
  useEffect(() => {
    let isMounted = true;
    async function acquireGps() {
      if (gpsLocation) {
        setGpsStatus('ACQUIRED');
        return;
      }
      setGpsStatus('ACQUIRING');
      try {
        const result = await getCurrentLocation();
        if (isMounted) {
          if (result.success && result.coords) {
            setGpsLocation(result.coords);
            setGpsStatus('ACQUIRED');
          } else {
            setGpsStatus('UNAVAILABLE');
          }
        }
      } catch (err) {
        if (isMounted) setGpsStatus('UNAVAILABLE');
      }
    }

    acquireGps();
    return () => {
      isMounted = false;
    };
  }, []);

  // Recalculate deterministic valuation on weight change (SIH-VAL-001, SIH-VAL-003)
  useEffect(() => {
    const numWeight = parseFloat(weightKg);
    if (isNaN(numWeight) || numWeight <= 0) {
      setValuation(null);
      return;
    }

    let isCurrent = true;
    setIsValuating(true);
    const timer = setTimeout(async () => {
      try {
        const est = await priceService.getValuationEstimate({
          category,
          subcategory: subcategory || undefined,
          weightKg: numWeight,
        });
        if (isCurrent) {
          setValuation(est);
        }
      } catch (err) {
        console.warn('[CollectorCreateLot] Valuation estimation failed:', err);
      } finally {
        if (isCurrent) setIsValuating(false);
      }
    }, 350);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [category, subcategory, weightKg]);

  const categoryDef = MATERIAL_TAXONOMY[category] || {
    symbol: '📦',
    defaultName: category,
    i18nKey: 'materialLots.categories.OTHER',
  };
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);

  const handleSave = async (targetStatus: 'DRAFT' | 'OPEN') => {
    const parsedWeight = parseFloat(weightKg);
    if (isNaN(parsedWeight) || parsedWeight <= 0) {
      Alert.alert(t('common.error'), 'Please enter a valid weight in kg greater than 0');
      return;
    }

    if (targetStatus === 'OPEN') {
      setShowPreviewModal(true);
      return;
    }

    await executeSave('DRAFT');
  };

  const executeSave = async (targetStatus: 'DRAFT' | 'OPEN') => {
    const parsedWeight = parseFloat(weightKg);
    try {
      setIsSubmitting(true);
      setShowPreviewModal(false);

      const parsedAsking = parseFloat(askingPrice);
      const payload = {
        category,
        subcategory: subcategory || undefined,
        condition,
        sourceType,
        listingPurpose,
        askingPrice: !isNaN(parsedAsking) && parsedAsking > 0 ? parsedAsking : null,
        priceUnit: 'TOTAL',
        description: description.trim() || undefined,
        approximateTotalWeightKg: parsedWeight,
        status: targetStatus,
        collectionLat: gpsLocation?.latitude || null,
        collectionLng: gpsLocation?.longitude || null,
        collectionAccuracy: gpsLocation?.accuracy || null,
        collectionTimestamp: new Date().toISOString(),
        photos: photos.map((uri) => ({ photoUrl: uri })),
      };

      if (isEditing && params.lotId) {
        await materialLotService.updateLot(params.lotId, payload);
      } else {
        await materialLotService.createLot(payload);
      }

      const msg = targetStatus === 'DRAFT'
        ? t('materialLots.draftSavedSuccess') || 'Lot draft saved locally'
        : listingPurpose === 'RECYCLING'
        ? 'Material listed for recycling! Authorized recyclers can now discover your lot.'
        : 'Item listed on Circular Citizen Marketplace! Local citizens can discover and make purchase offers.';

      Alert.alert(t('common.success'), msg, [
        {
          text: t('common.done'),
          onPress: () => {
            navigation.navigate('CollectorLots');
          },
        },
      ]);
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message || 'Failed to save material lot');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <EcoSetuBackground>
      <SafeAreaView style={styles.safeArea}>
        <TopAppBar
          title={isEditing ? 'Edit Material Lot' : 'List Material for Sale'}
          subtitle="Supply Creation"
          showBack={true}
          onBack={() => navigation.goBack()}
        />

        <OfflineBanner />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Material Summary Header Card */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryIconBadge}>
              <Text style={styles.summaryIcon}>{categoryDef.symbol}</Text>
            </View>
            <View style={styles.summaryDetails}>
              <Text style={styles.summaryCategoryName}>
                {t(categoryDef.i18nKey) || categoryDef.defaultName}
              </Text>
              {subcategory ? (
                <Text style={styles.summarySubcategory}>Subcategory: {subcategory}</Text>
              ) : null}
              <View style={styles.summaryTagRow}>
                <Text style={styles.summaryTag}>Condition: {condition}</Text>
                <Text style={styles.summaryTag}>Source: {sourceType}</Text>
              </View>
            </View>
          </View>

          {/* Photos Preview */}
          {photos.length > 0 && (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>📸 Photos ({photos.length})</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoStrip}>
                {photos.map((uri, idx) => (
                  <Image key={idx} source={{ uri }} style={styles.photoThumb} />
                ))}
              </ScrollView>
            </View>
          )}

          {/* Section: Weight Entry (Large Touch & Numpad - SIH-LIT-008, SIH-LIT-009) */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>⚖️ {t('materialLots.enterWeight')}</Text>
            <Text style={styles.sectionSubtitle}>
              {t('lowLiteracy.weightHelper') || 'Estimate total weight in kilograms'}
            </Text>

            <QuickNumberStepper
              value={parseFloat(weightKg) || 0}
              onChange={(val) => setWeightKg(val > 0 ? String(val) : '')}
              unit="kg"
              presets={[5, 10, 25, 50]}
              min={0}
              max={10000}
              step={1}
              accessibilityLabel={t('materialLots.weightKg')}
            />
          </View>

          {/* Section: Live Valuation Estimate (SIH-PRICE-003, SIH-VAL-001..005) */}
          {parseFloat(weightKg) > 0 && (
            <View style={styles.valuationCard}>
              <View style={styles.valuationHeader}>
                <Text style={styles.valuationTitle}>
                  💰 {t('valuation.estimatedValue') || 'Estimated Value'}
                </Text>
                {isValuating ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={styles.valuationBadge}>
                    {valuation?.status === 'AVAILABLE'
                      ? '📊 ' + (t('valuation.estimateAvailable') || 'Estimated')
                      : 'ℹ️ ' + (t('valuation.estimateUnavailable') || 'Unavailable')}
                  </Text>
                )}
              </View>

              {valuation?.status === 'AVAILABLE' ? (
                <View>
                  <Text style={styles.valuationAmount}>
                    {valuation.formattedEstimate}
                  </Text>
                  <Text style={styles.valuationConfidence}>
                    {valuation.confidence === 'VERIFIED_MARKET_DATA'
                      ? '✅ ' + (t('valuation.confidenceVerified') || 'Based on verified market data')
                      : '📱 ' + (t('valuation.confidenceLimited') || 'Based on cached data')}
                  </Text>
                  {/* Mandatory Non-Guarantee Disclaimer (SIH-VAL-004) */}
                  <View style={styles.disclaimerBox}>
                    <Text style={styles.disclaimerText}>
                      ⚠️ {t('valuation.disclaimer') || 'This is an estimate, not a guaranteed sale price.'}{' '}
                      {t('valuation.estimateNote') || 'Actual sale price may vary depending on quality and negotiation.'}
                    </Text>
                  </View>
                </View>
              ) : !isValuating ? (
                /* No-Data state without fabricating prices (SIH-PRICE-009, SIH-VAL-003) */
                <View style={styles.unavailableBox}>
                  <Text style={styles.unavailableText}>
                    {t('valuation.unavailableReason') ||
                      'No verified price data is available for this material and location.'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => navigation?.navigate('CollectorPriceBoard')}
                    style={styles.checkPriceLink}
                  >
                    <Text style={styles.checkPriceLinkText}>
                      🔍 {t('valuation.checkPriceBoard') || 'Check Price Board for latest rates'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          )}

          {/* Section: Listing Purpose (Recycling vs Circular Reuse) */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>🎯 Listing Purpose & Target Buyer</Text>
            <Text style={styles.sectionSubtitle}>
              Select where this lot should be listed:
            </Text>

            <View style={styles.purposeOptionsCol}>
              <TouchableOpacity
                style={[
                  styles.purposeOptionCard,
                  listingPurpose === 'RECYCLING' && styles.purposeOptionCardActive,
                ]}
                onPress={() => setListingPurpose('RECYCLING')}
                activeOpacity={0.8}
              >
                <Text style={styles.purposeOptionIcon}>🏭</Text>
                <View style={styles.purposeOptionInfo}>
                  <Text style={[styles.purposeOptionTitle, listingPurpose === 'RECYCLING' && styles.purposeOptionTitleActive]}>
                    Recycling Supply (Authorized Recyclers)
                  </Text>
                  <Text style={styles.purposeOptionDesc}>
                    Best for raw materials, PCBs, damaged components, and industrial processing.
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.purposeOptionCard,
                  listingPurpose === 'REUSE' && styles.purposeOptionCardActive,
                ]}
                onPress={() => setListingPurpose('REUSE')}
                activeOpacity={0.8}
              >
                <Text style={styles.purposeOptionIcon}>🛍️</Text>
                <View style={styles.purposeOptionInfo}>
                  <Text style={[styles.purposeOptionTitle, listingPurpose === 'REUSE' && styles.purposeOptionTitleActive]}>
                    Circular Reuse (Direct to Citizens)
                  </Text>
                  <Text style={styles.purposeOptionDesc}>
                    Lists on Citizen Marketplace for working smartphones, laptops, appliances, etc.
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.purposeOptionCard,
                  listingPurpose === 'REPAIR_REUSE' && styles.purposeOptionCardActive,
                ]}
                onPress={() => setListingPurpose('REPAIR_REUSE')}
                activeOpacity={0.8}
              >
                <Text style={styles.purposeOptionIcon}>🔧</Text>
                <View style={styles.purposeOptionInfo}>
                  <Text style={[styles.purposeOptionTitle, listingPurpose === 'REPAIR_REUSE' && styles.purposeOptionTitleActive]}>
                    Repair / Refurbish (Hobbyists & Technicians)
                  </Text>
                  <Text style={styles.purposeOptionDesc}>
                    Partially working or repairable items sold for spare parts or fixing.
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Asking Price Input (Mandatory/Encouraged for Reuse) */}
            {(listingPurpose === 'REUSE' || listingPurpose === 'REPAIR_REUSE') && (
              <View style={styles.askingPriceContainer}>
                <Text style={styles.askingPriceLabel}>💰 Asking Price (₹ Total - Optional)</Text>
                <TextInput
                  style={styles.askingPriceInput}
                  keyboardType="numeric"
                  value={askingPrice}
                  onChangeText={setAskingPrice}
                  placeholder="e.g. 1200 (Leave blank if open for offers)"
                  placeholderTextColor="rgba(255, 255, 255, 0.35)"
                />
                <Text style={styles.askingPriceHelper}>
                  Citizens can buy at this price or submit counter-offers for negotiation.
                </Text>
              </View>
            )}
          </View>

          {/* Section: Description & Notes */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>📝 {t('materialLots.description')}</Text>
            <TextInput
              style={styles.textArea}
              value={description}
              onChangeText={setDescription}
              placeholder={t('materialLots.descriptionPlaceholder')}
              placeholderTextColor="rgba(255,255,255,0.3)"
              multiline
              numberOfLines={3}
              accessibilityLabel={t('materialLots.description')}
            />
          </View>

          {/* Section: GPS Status Indicator */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>📍 {t('materialLots.gpsStatus')}</Text>
            <View style={styles.gpsRow}>
              <View
                style={[
                  styles.gpsDot,
                  gpsStatus === 'ACQUIRED' && styles.gpsDotGreen,
                  gpsStatus === 'ACQUIRING' && styles.gpsDotYellow,
                  gpsStatus === 'UNAVAILABLE' && styles.gpsDotGray,
                ]}
              />
              <Text style={styles.gpsText}>
                {gpsStatus === 'ACQUIRED' && gpsLocation
                  ? `${t('materialLots.gpsAcquired')} (${gpsLocation.latitude.toFixed(4)}, ${gpsLocation.longitude.toFixed(4)})`
                  : gpsStatus === 'ACQUIRING'
                  ? t('materialLots.gpsSearching')
                  : t('materialLots.gpsUnavailable')}
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            {/* Save Draft */}
            <TouchableOpacity
              style={styles.draftButton}
              onPress={() => handleSave('DRAFT')}
              disabled={isSubmitting}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t('materialLots.saveDraft')}
            >
              <Text style={styles.draftButtonText}>💾 {t('materialLots.saveDraft')}</Text>
            </TouchableOpacity>

            {/* List For Sale (Open for Bids) */}
            <TouchableOpacity
              style={styles.submitButton}
              onPress={() => handleSave('OPEN')}
              disabled={isSubmitting}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="List For Sale"
            >
              {isSubmitting ? (
                <ActivityIndicator color="#071E22" />
              ) : (
                <Text style={styles.submitButtonText}>🏷️ List For Sale</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Phase 3: Marketplace Listing Preview Modal */}
        {showPreviewModal && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>🏷️ PREVIEW MARKETPLACE LISTING</Text>
              <Text style={styles.modalSubtitle}>
                Publishing makes this lot discoverable to verified authorized recyclers for competitive bidding.
              </Text>

              <View style={styles.previewMatrix}>
                <View style={styles.matrixRow}>
                  <Text style={styles.matrixLabel}>Material Category:</Text>
                  <Text style={styles.matrixValue}>{categoryDef.defaultName}</Text>
                </View>
                {subcategory ? (
                  <View style={styles.matrixRow}>
                    <Text style={styles.matrixLabel}>Subcategory:</Text>
                    <Text style={styles.matrixValue}>{subcategory}</Text>
                  </View>
                ) : null}
                <View style={styles.matrixRow}>
                  <Text style={styles.matrixLabel}>Weight:</Text>
                  <Text style={styles.matrixValue}>{weightKg} kg</Text>
                </View>
                <View style={styles.matrixRow}>
                  <Text style={styles.matrixLabel}>Condition:</Text>
                  <Text style={styles.matrixValue}>{condition}</Text>
                </View>
                <View style={styles.matrixRow}>
                  <Text style={styles.matrixLabel}>Location:</Text>
                  <Text style={styles.matrixValue}>
                    {gpsLocation ? '📍 GPS Tagged' : '📍 Service Area'}
                  </Text>
                </View>
                <View style={styles.matrixRow}>
                  <Text style={styles.matrixLabel}>Photos:</Text>
                  <Text style={styles.matrixValue}>{photos.length} attached</Text>
                </View>
              </View>

              <View style={styles.modalActionsRow}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setShowPreviewModal(false)}
                >
                  <Text style={styles.modalCancelText}>Edit Details</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalConfirmButton}
                  onPress={() => executeSave('OPEN')}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#071E22" />
                  ) : (
                    <Text style={styles.modalConfirmText}>[ LIST FOR SALE ]</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
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
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 184, 166, 0.12)',
    borderRadius: 16,
    padding: space.md,
    marginBottom: space.md,
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.3)',
  },
  summaryIconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(20, 184, 166, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: space.md,
  },
  summaryIcon: {
    fontSize: 32,
  },
  summaryDetails: {
    flex: 1,
  },
  summaryCategoryName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  summarySubcategory: {
    fontSize: 12,
    color: '#14B8A6',
    marginBottom: 4,
    fontWeight: '600',
  },
  summaryTagRow: {
    flexDirection: 'row',
    gap: 8,
  },
  summaryTag: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  sectionCard: {
    backgroundColor: 'rgba(15, 35, 40, 0.75)',
    borderRadius: 16,
    padding: space.md,
    marginBottom: space.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary || '#FFFFFF',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textSecondary || '#94A3B8',
    marginBottom: space.sm,
  },
  photoStrip: {
    flexDirection: 'row',
    marginTop: space.xs,
  },
  photoThumb: {
    width: 80,
    height: 80,
    borderRadius: 10,
    marginRight: space.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  weightInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(20, 184, 166, 0.4)',
    paddingHorizontal: space.md,
    minHeight: 56,
  },
  weightInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    paddingVertical: 10,
  },
  weightUnit: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary || '#14B8A6',
    marginLeft: space.sm,
  },
  textArea: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    padding: space.sm,
    color: '#FFFFFF',
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  gpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: space.xs,
  },
  gpsDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  gpsDotGreen: {
    backgroundColor: '#10B981',
  },
  gpsDotYellow: {
    backgroundColor: '#F59E0B',
  },
  gpsDotGray: {
    backgroundColor: '#6B7280',
  },
  gpsText: {
    fontSize: 12,
    color: colors.textSecondary || '#CBD5E1',
    flex: 1,
  },
  actionsContainer: {
    marginTop: space.sm,
    gap: space.sm,
  },
  draftButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 14,
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  draftButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: colors.primary || '#14B8A6',
    borderRadius: 14,
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#14B8A6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    color: '#071E22',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  valuationCard: {
    backgroundColor: 'rgba(16, 42, 46, 0.85)',
    borderRadius: 14,
    padding: space.md,
    marginBottom: space.md,
    borderWidth: 1,
    borderColor: 'rgba(0, 201, 167, 0.3)',
  },
  valuationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: space.xs,
  },
  valuationTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  valuationBadge: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  valuationAmount: {
    fontSize: 24,
    fontWeight: '800',
    color: '#34d399',
    marginVertical: space.xs,
  },
  valuationConfidence: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: space.xs,
  },
  disclaimerBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    padding: space.sm,
    borderRadius: 8,
    marginTop: space.xs,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  disclaimerText: {
    fontSize: 11,
    color: '#FDE68A',
    lineHeight: 16,
  },
  unavailableBox: {
    paddingVertical: space.xs,
  },
  unavailableText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 18,
  },
  checkPriceLink: {
    marginTop: space.xs,
  },
  checkPriceLinkText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: space.md,
    zIndex: 999,
  },
  modalCard: {
    backgroundColor: '#0F2A2E',
    borderRadius: 20,
    padding: space.lg,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1.5,
    borderColor: colors.primary || '#14B8A6',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary || '#14B8A6',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  modalSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.75)',
    lineHeight: 18,
    marginBottom: space.md,
  },
  previewMatrix: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: space.md,
    marginBottom: space.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: space.xs,
  },
  matrixRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  matrixLabel: {
    fontSize: 13,
    color: colors.textSecondary || '#94A3B8',
  },
  matrixValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: space.sm,
  },
  modalCancelButton: {
    flex: 1,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  modalCancelText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  modalConfirmButton: {
    flex: 1.5,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: colors.primary || '#14B8A6',
  },
  modalConfirmText: {
    color: '#071E22',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  purposeOptionsCol: {
    gap: space.sm,
    marginTop: space.sm,
  },
  purposeOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: space.md,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
  },
  purposeOptionCardActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10B981',
  },
  purposeOptionIcon: {
    fontSize: 24,
    marginRight: space.sm,
  },
  purposeOptionInfo: {
    flex: 1,
  },
  purposeOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  purposeOptionTitleActive: {
    color: '#10B981',
  },
  purposeOptionDesc: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.65)',
    marginTop: 2,
    lineHeight: 15,
  },
  askingPriceContainer: {
    marginTop: space.md,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  askingPriceLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10B981',
    marginBottom: space.xs,
  },
  askingPriceInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderRadius: 12,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: space.md,
    height: 48,
  },
  askingPriceHelper: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 4,
  },
});
