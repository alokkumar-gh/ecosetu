/**
 * SubmitItemScreen — COMPLETE REBUILD as Guided 6-Step Wizard
 *
 * STEP 1: What do you have? (Category)
 * STEP 2: Take a photo
 * STEP 3: What condition is it in?
 * STEP 4: How many / how much?
 * STEP 5: Where should we collect it?
 * STEP 6: Review & Submit
 *
 * Preserves all backend service calls: ewasteService.createItem, requestService.createRequest
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Image,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CitizenTabParamList } from '../../navigation/types';
import { useNetwork } from '../../hooks/useNetwork';
import { useI18n } from '../../i18n';
import { EcoSetuBackground } from '../../components/eco';
import { ewasteService } from '../../services/ewasteService';
import { requestService } from '../../services/requestService';
import { capturePhoto } from '../../services/cameraService';
import { aiService, AIPrediction } from '../../services/aiService';
import { reverseGeocode, getCurrentLocation, ResolvedAddress } from '../../services/locationService';
import { EcoSetuMap } from '../../components/map/EcoSetuMap';
import { EWASTE_CATEGORIES, ITEM_CONDITIONS, ADDRESS_TYPES } from '../../utils/constants';
import { colors } from '../../theme/colors';

const { width: SCREEN_W } = Dimensions.get('window');

interface Props {
  navigation: BottomTabNavigationProp<CitizenTabParamList, 'CitizenSubmit'>;
}

export interface DraftItem {
  id?: string;
  category: string;
  photoUri?: string;
  condition: string;
  quantity: number;
  weight?: string;
  description?: string;
}

// ─── Step config ──────────────────────────────────────────────────────────────

const TOTAL_STEPS = 6;

const CATEGORY_MAP: Record<string, { i18nKey: string; defaultLabel: string; icon: string }> = {
  [EWASTE_CATEGORIES.MOBILE_PHONE]:   { i18nKey: 'ewaste.mobilePhone',   defaultLabel: 'Mobile Phone',     icon: '📱' },
  [EWASTE_CATEGORIES.LAPTOP]:         { i18nKey: 'ewaste.laptop',        defaultLabel: 'Laptop',           icon: '💻' },
  [EWASTE_CATEGORIES.DESKTOP]:        { i18nKey: 'ewaste.desktop',       defaultLabel: 'Desktop / Tower',  icon: '🖥️' },
  [EWASTE_CATEGORIES.TABLET]:         { i18nKey: 'ewaste.tablet',        defaultLabel: 'Tablet',           icon: '📟' },
  [EWASTE_CATEGORIES.MONITOR]:        { i18nKey: 'ewaste.monitor',       defaultLabel: 'Monitor / Screen', icon: '🖥️' },
  [EWASTE_CATEGORIES.PRINTER]:        { i18nKey: 'ewaste.printer',       defaultLabel: 'Printer / Scanner',icon: '🖨️' },
  [EWASTE_CATEGORIES.KEYBOARD_MOUSE]: { i18nKey: 'ewaste.keyboardMouse', defaultLabel: 'Keyboard / Mouse', icon: '⌨️' },
  [EWASTE_CATEGORIES.CABLE_CHARGER]:  { i18nKey: 'ewaste.cableCharger',  defaultLabel: 'Cable / Charger',  icon: '🔌' },
  [EWASTE_CATEGORIES.BATTERY]:        { i18nKey: 'ewaste.battery',       defaultLabel: 'Battery',          icon: '🔋' },
  [EWASTE_CATEGORIES.CIRCUIT_BOARD]:  { i18nKey: 'ewaste.circuitBoard',  defaultLabel: 'Circuit Board',    icon: '🧩' },
  [EWASTE_CATEGORIES.OTHER]:          { i18nKey: 'ewaste.other',         defaultLabel: 'Other E-Waste',    icon: '📦' },
};

const CONDITION_MAP: Record<string, { labelKey: string; defaultLabel: string; subKey: string; defaultSub: string; color: string }> = {
  [ITEM_CONDITIONS.WORKING]:     { labelKey: 'status.working',    defaultLabel: 'Working',      subKey: 'common.workingSub',    defaultSub: 'Powers on, functions normally',  color: '#10B981' },
  [ITEM_CONDITIONS.NOT_WORKING]: { labelKey: 'status.notWorking', defaultLabel: 'Not Working',  subKey: 'common.notWorkingSub', defaultSub: "Doesn't turn on",               color: '#F59E0B' },
  [ITEM_CONDITIONS.DAMAGED]:     { labelKey: 'status.damaged',    defaultLabel: 'Damaged',      subKey: 'common.damagedSub',    defaultSub: 'Broken screen, missing parts',   color: '#EF4444' },
  [ITEM_CONDITIONS.UNKNOWN]:     { labelKey: 'status.unknown',    defaultLabel: 'Not Sure',     subKey: 'common.unknownSub',    defaultSub: "I don't know the condition",    color: '#A78BFA' },
};

// ─── Progress Bar ─────────────────────────────────────────────────────────────

const StepBar: React.FC<{ step: number }> = ({ step }) => (
  <View style={sb.container}>
    {[1, 2, 3, 4, 5, 6].map((n) => {
      const done    = step > n;
      const current = step === n;
      return (
        <React.Fragment key={n}>
          <View style={[sb.circle, done && sb.circleDone, current && sb.circleCurrent]}>
            {done
              ? <Text style={sb.checkmark}>✓</Text>
              : <Text style={[sb.stepNum, current && sb.stepNumActive]}>{n}</Text>}
          </View>
          {n < TOTAL_STEPS && (
            <View style={[sb.line, done && sb.lineDone]} />
          )}
        </React.Fragment>
      );
    })}
  </View>
);

const sb = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleDone: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  circleCurrent: {
    backgroundColor: 'rgba(16,185,129,0.20)',
    borderColor: '#10B981',
  },
  checkmark: { fontSize: 13, color: '#FFFFFF', fontWeight: '800' },
  stepNum: { fontSize: 11, color: 'rgba(255,255,255,0.40)', fontWeight: '700' },
  stepNumActive: { color: '#34D399' },
  line: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.10)',
    marginHorizontal: 3,
  },
  lineDone: { backgroundColor: '#10B981' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export const SubmitItemScreen: React.FC<Props> = ({ navigation }) => {
  const { isConnected } = useNetwork();
  const { t } = useI18n();

  // Multi-item list
  const [items, setItems] = useState<DraftItem[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Step tracking
  const [step, setStep] = useState(1);

  // Current Item Draft Fields
  // Step 1 — Category
  const [category, setCategory] = useState<string | null>(null);

  // Step 2 — Photo
  const [photoUri, setPhotoUri] = useState<string | undefined>(undefined);
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);

  // AI Assistive state (Step 2 non-blocking material suggestion)
  const [aiPrediction, setAiPrediction] = useState<AIPrediction | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState<boolean>(false);
  const [aiDismissed, setAiDismissed] = useState<boolean>(false);
  const activeAiPhotoUri = useRef<string | null>(null);

  // Step 3 — Condition
  const [condition, setCondition] = useState<string>(ITEM_CONDITIONS.UNKNOWN);

  // Step 4 — Details
  const [quantity, setQuantity] = useState(1);
  const [weight, setWeight] = useState('');
  const [description, setDescription] = useState('');

  // Step 5 — Location
  const [pickupLat, setPickupLat] = useState(19.0760);
  const [pickupLng, setPickupLng] = useState(72.8777);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [addressType, setAddressType] = useState<string>(ADDRESS_TYPES.HOME);
  const [houseNumber, setHouseNumber] = useState('');
  const [street, setStreet] = useState('');
  const [landmark, setLandmark] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [stateName, setStateName] = useState('');
  const [pincode, setPincode] = useState('');

  // Step 6 — Submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);

  // Auto-locate on location step if default coords
  useEffect(() => {
    if (step === 5) {
      handleUseCurrentLocation();
    }
  }, [step]);

  // ── Location helpers ───────────────────────────────────────────────────────

  const triggerReverseGeocoding = async (lat: number, lng: number) => {
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) return;
    setIsResolvingAddress(true);
    try {
      const resolved: ResolvedAddress | null = await reverseGeocode(lat, lng);
      if (resolved) {
        if (resolved.houseNumber) setHouseNumber(resolved.houseNumber);
        if (resolved.street) setStreet(resolved.street);
        if (resolved.landmark) setLandmark(resolved.landmark);
        if (resolved.city) setCity(resolved.city);
        if (resolved.district) setDistrict(resolved.district);
        if (resolved.state) setStateName(resolved.state);
        if (resolved.pincode) setPincode(resolved.pincode);
      }
    } catch {
      // silent
    } finally {
      setIsResolvingAddress(false);
    }
  };

  const handleUseCurrentLocation = async () => {
    setIsLocating(true);
    setLocationError(null);
    try {
      const result = await getCurrentLocation();
      if (result.success && result.coords) {
        const { latitude, longitude, accuracy } = result.coords;
        setPickupLat(latitude);
        setPickupLng(longitude);
        if (accuracy !== null) setLocationAccuracy(accuracy);
        triggerReverseGeocoding(latitude, longitude);
      } else if (result.error === 'PERMISSION_DENIED') {
        setLocationError('Location permission denied. Enter your address manually below or drag the map pin.');
      } else {
        setLocationError(result.message || 'Could not get GPS location. Drag the map pin or enter address.');
      }
    } catch {
      setLocationError('Location unavailable. Drag the map pin or enter address.');
    } finally {
      setIsLocating(false);
    }
  };

  // ── Multi-item helpers ──────────────────────────────────────────────────────

  const resetCurrentDraft = () => {
    setCategory(null);
    setPhotoUri(undefined);
    setAiPrediction(null);
    setIsAiAnalyzing(false);
    setAiDismissed(false);
    activeAiPhotoUri.current = null;
    setCondition(ITEM_CONDITIONS.UNKNOWN);
    setQuantity(1);
    setWeight('');
    setDescription('');
    setEditingIndex(null);
  };

  const commitCurrentItemToState = (): boolean => {
    if (!category) {
      setStepError('Please select what you want to give.');
      return false;
    }
    if (weight.trim()) {
      const w = parseFloat(weight);
      if (isNaN(w) || w <= 0 || w > 500) {
        setStepError('Enter a valid weight between 0.1 and 500 kg.');
        return false;
      }
    }

    const currentItem: DraftItem = {
      category,
      photoUri,
      condition,
      quantity,
      weight: weight.trim() ? weight.trim() : undefined,
      description: description.trim() ? description.trim() : undefined,
    };

    if (editingIndex !== null && editingIndex >= 0 && editingIndex < items.length) {
      const updated = [...items];
      updated[editingIndex] = currentItem;
      setItems(updated);
    } else {
      setItems((prev) => [...prev, currentItem]);
    }
    return true;
  };

  const handleAddAnotherItem = () => {
    if (!commitCurrentItemToState()) return;
    resetCurrentDraft();
    setStepError(null);
    setSuccessInfo('Item added to request! Select category for next item.');
    setTimeout(() => setSuccessInfo(null), 3000);
    setStep(1);
  };

  const handleEditItem = (index: number) => {
    const itemToEdit = items[index];
    if (!itemToEdit) return;
    setCategory(itemToEdit.category);
    setPhotoUri(itemToEdit.photoUri);
    setCondition(itemToEdit.condition);
    setQuantity(itemToEdit.quantity);
    setWeight(itemToEdit.weight || '');
    setDescription(itemToEdit.description || '');
    setEditingIndex(index);
    setStep(1);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Navigation ─────────────────────────────────────────────────────────────

  const validateStep = (): boolean => {
    setStepError(null);
    if (step === 1 && !category) {
      if (items.length > 0) {
        // If there are already items in the list and user pressed continue without picking a new category
        return true;
      }
      setStepError('Please select what you want to give.');
      return false;
    }
    if (step === 4) {
      if (weight.trim()) {
        const w = parseFloat(weight);
        if (isNaN(w) || w <= 0 || w > 500) {
          setStepError('Enter a valid weight between 0.1 and 500 kg.');
          return false;
        }
      }
    }
    return true;
  };

  const goNext = () => {
    if (!validateStep()) return;

    if (step === 1 && !category && items.length > 0) {
      // Direct jump to location if items already exist
      setStep(5);
      return;
    }

    if (step === 4) {
      // Commit draft item and advance to Location
      if (category) {
        commitCurrentItemToState();
        resetCurrentDraft();
      }
      setStep(5);
      return;
    }

    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
    }
  };

  const goBack = () => {
    setStepError(null);
    if (step > 1) {
      if (step === 5 && !category && items.length > 0) {
        setStep(4);
      } else {
        setStep((s) => s - 1);
      }
    }
  };

  // ── Photo ──────────────────────────────────────────────────────────────────

  const runAiAnalysis = (imageUri: string, filename?: string, mimeType?: string) => {
    activeAiPhotoUri.current = imageUri;
    setIsAiAnalyzing(true);
    setAiError(null);
    setAiPrediction(null);
    setAiDismissed(false);
    console.log(`[EcoSetu AI MOBILE DEBUG] Citizen runAiAnalysis called with URI: ${imageUri}`);

    aiService
      .predictMaterial(imageUri, filename, mimeType)
      .then((aiRes) => {
        if (activeAiPhotoUri.current === imageUri) {
          setIsAiAnalyzing(false);
          if (aiRes.success && aiRes.prediction) {
            console.log(
              `[EcoSetu AI MOBILE DEBUG] Citizen received valid AI prediction: has_detection=${aiRes.prediction.has_detection}, category=${aiRes.prediction.category}`
            );
            setAiPrediction(aiRes.prediction);
            setAiError(null);
          } else {
            console.log(`[EcoSetu AI MOBILE DEBUG] Citizen AI request failed: ${aiRes.error}`);
            setAiPrediction(null);
            setAiError(aiRes.error || 'AI_SERVICE_UNAVAILABLE');
          }
        } else {
          console.log('[EcoSetu AI MOBILE DEBUG] Stale image URI match ignored in Citizen screen');
        }
      })
      .catch((err) => {
        console.warn('[EcoSetu AI MOBILE DEBUG] Citizen AI request rejected:', err?.message || err);
        if (activeAiPhotoUri.current === imageUri) {
          setIsAiAnalyzing(false);
          setAiPrediction(null);
          setAiError(err?.message || 'AI_SERVICE_UNAVAILABLE');
        }
      });
  };

  const handleRetryAi = () => {
    if (photoUri) {
      runAiAnalysis(photoUri);
    }
  };

  const handleTakePhoto = async () => {
    setIsTakingPhoto(true);
    try {
      console.log('[EcoSetu AI MOBILE DEBUG] Citizen photo capture initiated');
      const result = await capturePhoto();
      if (result.success && result.uri) {
        const newUri = result.uri;
        console.log(`[EcoSetu AI MOBILE DEBUG] Citizen photo captured: ${newUri}`);
        setPhotoUri(newUri);
        runAiAnalysis(newUri, result.fileName, result.type);
      } else if (result.error === 'CAMERA_PERMISSION_DENIED') {
        console.warn('[EcoSetu AI MOBILE DEBUG] Citizen camera permission denied');
        Alert.alert('Permission Required', 'Camera permission is needed to take a photo.');
      }
    } catch (err: any) {
      console.error('[EcoSetu AI DEBUG] Citizen handleTakePhoto uncaught exception:', err);
    } finally {
      setIsTakingPhoto(false);
    }
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setSubmitError(null);

    // Make sure we have at least one item
    let finalItems = [...items];
    if (category) {
      finalItems.push({
        category,
        photoUri,
        condition,
        quantity,
        weight: weight.trim() ? weight.trim() : undefined,
        description: description.trim() ? description.trim() : undefined,
      });
    }

    if (finalItems.length === 0) {
      setSubmitError('Please add at least one e-waste item to your request.');
      return;
    }

    if (pincode.trim() && !/^[1-9][0-9]{5}$/.test(pincode.trim())) {
      setSubmitError('PIN Code must be a valid 6-digit postal code.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Create all e-waste items sequentially/concurrently
      const createdItemIds: string[] = [];
      for (const item of finalItems) {
        const itemPayload: any = {
          category: item.category,
          condition: item.condition,
          quantity: item.quantity,
        };
        if (item.description?.trim()) itemPayload.description = item.description.trim();
        if (item.weight && !isNaN(parseFloat(item.weight))) {
          itemPayload.estimatedWeightKg = parseFloat(item.weight);
        }
        if (item.photoUri) itemPayload.imageUrl = item.photoUri;

        const createdItem: any = await ewasteService.createItem(itemPayload);
        if (createdItem?.id) {
          createdItemIds.push(createdItem.id);
        }
      }

      // 2. Build formatted address
      const formattedAddress = [
        houseNumber.trim(),
        street.trim(),
        landmark.trim(),
        city.trim(),
        district.trim(),
        stateName.trim(),
        pincode.trim(),
      ].filter(Boolean).join(', ') || 'Doorstep Pickup Location';

      // 3. Create collection request with all itemIds
      const requestPayload: any = {
        itemIds: createdItemIds,
        pickupAddress: formattedAddress,
        pickupLat: pickupLat || 0,
        pickupLng: pickupLng || 0,
        addressType,
      };
      if (houseNumber.trim()) requestPayload.houseNumber = houseNumber.trim();
      if (street.trim()) requestPayload.street = street.trim();
      if (landmark.trim()) requestPayload.landmark = landmark.trim();
      if (city.trim()) requestPayload.city = city.trim();
      if (district.trim()) requestPayload.district = district.trim();
      if (stateName.trim()) requestPayload.state = stateName.trim();
      if (pincode.trim()) requestPayload.pincode = pincode.trim();
      if (locationAccuracy !== null) requestPayload.locationAccuracy = locationAccuracy;

      await requestService.createRequest(requestPayload);

      // Navigate to Requests/Orders
      const totalCount = finalItems.reduce((acc, curr) => acc + (curr.quantity || 1), 0);
      Alert.alert(
        'Request Submitted ✓',
        isConnected
          ? `Your collection request for ${totalCount} item(s) has been submitted. A local collector will reach out soon.`
          : 'Saved offline. Will be submitted once you reconnect.',
        [{
          text: 'View My Requests',
          onPress: () => navigation.navigate('CitizenRequests'),
        }],
      );

      // Reset wizard and items list
      setItems([]);
      resetCurrentDraft();
      setStep(1);
    } catch (err: any) {
      const msg = err?.isOfflineError
        ? 'Saved offline. Will sync when you reconnect.'
        : err?.response?.data?.message || err?.message || 'Failed to submit. Please try again.';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Helper to resolve category & condition labels ─────────────────────────

  const getCategoryDetails = (catKey: string) => {
    const item = CATEGORY_MAP[catKey];
    if (item) {
      return { label: t(item.i18nKey, item.defaultLabel), icon: item.icon, key: catKey };
    }
    return { label: catKey, icon: '📦', key: catKey };
  };

  const getConditionDetails = (condKey: string) => {
    const item = CONDITION_MAP[condKey];
    if (item) {
      return {
        label: t(item.labelKey, item.defaultLabel),
        sub: t(item.subKey, item.defaultSub),
        color: item.color,
        key: condKey,
      };
    }
    return { label: condKey, sub: '', color: '#A78BFA', key: condKey };
  };

  const categoriesList = Object.keys(CATEGORY_MAP).map((k) => getCategoryDetails(k));
  const conditionsList = Object.keys(CONDITION_MAP).map((k) => getConditionDetails(k));

  const stepLabels: Record<number, { label: string; icon: string }> = {
    1: { label: t('navigation.submit', 'Category'), icon: '📦' },
    2: { label: t('common.photo', 'Photo'), icon: '📷' },
    3: { label: t('common.condition', 'Condition'), icon: '🔍' },
    4: { label: t('common.details', 'Details'), icon: '⚖️' },
    5: { label: t('location.location', 'Location'), icon: '📍' },
    6: { label: t('common.review', 'Review'), icon: '✅' },
  };

  // ─── Render Step Content ───────────────────────────────────────────────────

  const renderStep = () => {
    switch (step) {
      // ── STEP 1: Category ──────────────────────────────────────────────────
      case 1:
        return (
          <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
            {successInfo && (
              <View style={styles.successBanner}>
                <Text style={styles.successBannerText}>✓ {successInfo}</Text>
              </View>
            )}

            {items.length > 0 && (
              <View style={styles.itemsSummaryBadge}>
                <View style={styles.itemsSummaryLeft}>
                  <Text style={styles.itemsSummaryTitle}>
                    📦 {items.length} {t('common.itemsAdded', 'item type(s) added')}
                  </Text>
                  <Text style={styles.itemsSummarySub}>
                    {items.map((it) => `${getCategoryDetails(it.category).label} (x${it.quantity})`).join(', ')}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.itemsSummaryDoneBtn}
                  onPress={() => setStep(5)}
                >
                  <Text style={styles.itemsSummaryDoneBtnText}>{t('common.proceedToAddress', 'Proceed to Address →')}</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={styles.stepQuestion}>
              {editingIndex !== null
                ? t('common.editCategory', 'Edit Item Category')
                : items.length > 0
                ? t('common.addAnotherItem', 'Add another item')
                : t('common.whatToGive', 'What do you want to give?')}
            </Text>
            <Text style={styles.stepHint}>{t('common.selectTypeEwaste', 'Select the type of electronic you want to recycle.')}</Text>

            <View style={styles.categoryGrid}>
              {categoriesList.map((cat) => {
                const active = category === cat.key;
                return (
                  <TouchableOpacity
                    key={cat.key}
                    style={[styles.catTile, active && styles.catTileActive]}
                    onPress={() => { setCategory(cat.key); setStepError(null); }}
                    accessibilityRole="button"
                    accessibilityLabel={cat.label}
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={styles.catTileIcon}>{cat.icon}</Text>
                    <Text style={[styles.catTileLabel, active && styles.catTileLabelActive]}>
                      {cat.label}
                    </Text>
                    {active && <View style={styles.catSelectedDot} />}
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={{ height: 40 }} />
          </ScrollView>
        );

      // ── STEP 2: Photo ─────────────────────────────────────────────────────
      case 2:
        return (
          <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.stepQuestion}>{t('common.takePhoto', 'Take a photo')}</Text>
            <Text style={styles.stepHint}>
              {t('common.photoHint', 'A photo helps collectors identify your item accurately. You can skip this step.')}
            </Text>

            <TouchableOpacity
              style={styles.photoBox}
              onPress={handleTakePhoto}
              disabled={isTakingPhoto}
              accessibilityRole="button"
              accessibilityLabel={t('common.takePhoto', 'Take photo')}
            >
              {photoUri ? (
                <>
                  <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />
                  <View style={styles.photoChangeOverlay}>
                    <Text style={styles.photoChangeText}>{t('common.tapToRetake', 'Tap to retake')}</Text>
                  </View>
                </>
              ) : (
                <View style={styles.photoPlaceholder}>
                  {isTakingPhoto ? (
                    <ActivityIndicator size="large" color="#10B981" />
                  ) : (
                    <>
                      <Text style={styles.photoPlaceholderIcon}>📷</Text>
                      <Text style={styles.photoPlaceholderLabel}>{t('common.tapToTakePhoto', 'Tap to take photo')}</Text>
                      <Text style={styles.photoPlaceholderSub}>{t('common.photoHelpCollector', 'Shows collector what you have')}</Text>
                    </>
                  )}
                </View>
              )}
            </TouchableOpacity>

            {/* AI Checking State */}
            {isAiAnalyzing && (
              <View style={styles.aiAnalyzingCard}>
                <ActivityIndicator size="small" color="#10B981" style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.aiAnalyzingText}>{t('ai.checkingPhoto') || 'Analyzing photo with AI model...'}</Text>
                  <Text style={styles.aiAnalyzingSubText}>
                    {t('ai.aiProcessingTimeNotice') || 'AI analysis on Render cloud may take up to a minute...'}
                  </Text>
                </View>
              </View>
            )}

            {/* AI Assistive Suggestion */}
            {!isAiAnalyzing && !aiDismissed && (aiPrediction || aiError) && photoUri && (
              <View style={[styles.aiSuggestionCard, Boolean(aiError) && styles.aiErrorCard]}>
                {aiPrediction && aiPrediction.has_detection && aiPrediction.category && CATEGORY_MAP[aiPrediction.category] ? (
                  (() => {
                    console.log('[EcoSetu AI MOBILE DEBUG] final UI branch selected: SUCCESS_WITH_DETECTION');
                    const catInfo = CATEGORY_MAP[aiPrediction.category];
                    const percent = Math.round(aiPrediction.confidence * 100);
                    const isLowConf = aiPrediction.confidence_level === 'LOW' || aiPrediction.review_required;
                    const isDifferent = category !== aiPrediction.category;
                    return (
                      <View>
                        <View style={styles.aiCardHeaderRow}>
                          <View style={styles.aiTitleRow}>
                            <Text style={styles.aiSparkleIcon}>✨</Text>
                            <Text style={styles.aiCardTitle}>
                              {isLowConf ? t('ai.possibleMatch') : t('ai.suggestion')}
                            </Text>
                          </View>
                          <Text style={styles.aiPercentBadge}>
                            {t('ai.matchConfidence', { percent }) || `${percent}% match`}
                          </Text>
                        </View>

                        <View style={styles.aiSuggestionBody}>
                          <Text style={styles.aiSymbolText}>{catInfo.icon}</Text>
                          <View style={styles.aiInfoCol}>
                            <Text style={styles.aiCategoryName}>
                              {t(catInfo.i18nKey, catInfo.defaultLabel)}
                            </Text>
                            <Text style={styles.aiCategorySubtitle}>
                              {isLowConf ? t('ai.manualVerificationNeeded') : t('common.tapToSelect')}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.aiActionRow}>
                          {isDifferent && (
                            <TouchableOpacity
                              style={styles.aiUseButton}
                              onPress={() => {
                                setCategory(aiPrediction.category!);
                                setAiDismissed(true);
                              }}
                              activeOpacity={0.7}
                              accessibilityRole="button"
                              accessibilityLabel={t('ai.useSuggestion')}
                            >
                              <Text style={styles.aiUseButtonText}>✓ {t('ai.useSuggestion')}</Text>
                            </TouchableOpacity>
                          )}

                          <TouchableOpacity
                            style={styles.aiDismissButton}
                            onPress={() => setAiDismissed(true)}
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
                          <Text style={styles.aiNoDetTitle}>🔍 {t('ai.couldNotConfidentlyIdentify', "Couldn't confidently identify this item")}</Text>
                        </View>
                        <Text style={styles.aiNoDetSubtitle}>{t('ai.noMatchingEwaste', 'No supported e-waste detected. Please select category manually.')}</Text>
                        <TouchableOpacity
                          style={styles.aiDismissButtonSingle}
                          onPress={() => setAiDismissed(true)}
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
                          <Text style={styles.aiErrorTitle}>⚠️ {t('ai.serviceUnavailableTitle', 'AI Service Unavailable')}</Text>
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
                            <Text style={styles.aiRetryButtonText}>🔄 {t('ai.retryAnalysis', 'Retry AI')}</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.aiDismissButton}
                            onPress={() => setAiDismissed(true)}
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

            <TouchableOpacity
              style={styles.skipPhotoBtn}
              onPress={goNext}
              accessibilityRole="button"
            >
              <Text style={styles.skipPhotoText}>{t('common.skipPhoto', 'Skip — I don\'t want to add a photo')}</Text>
            </TouchableOpacity>
            <View style={{ height: 30 }} />
          </ScrollView>
        );

      // ── STEP 3: Condition ─────────────────────────────────────────────────
      case 3:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepQuestion}>{t('common.whatCondition', 'What condition is it in?')}</Text>
            <Text style={styles.stepHint}>{t('common.conditionHint', 'Be honest — this helps collectors make the right offer.')}</Text>
            <View style={styles.conditionList}>
              {conditionsList.map((cond) => {
                const active = condition === cond.key;
                return (
                  <TouchableOpacity
                    key={cond.key}
                    style={[styles.condRow, active && { borderColor: cond.color, backgroundColor: cond.color + '15' }]}
                    onPress={() => setCondition(cond.key)}
                    accessibilityRole="button"
                    accessibilityLabel={cond.label}
                    accessibilityState={{ selected: active }}
                  >
                    <View style={styles.condRowLeft}>
                      <Text style={[styles.condRowTitle, active && { color: cond.color }]}>{cond.label}</Text>
                      <Text style={styles.condRowSub}>{cond.sub}</Text>
                    </View>
                    <View style={[styles.condRadio, active && { borderColor: cond.color, backgroundColor: cond.color }]}>
                      {active && <View style={styles.condRadioInner} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );

      // ── STEP 4: Details ───────────────────────────────────────────────────
      case 4:
        return (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.stepQuestion}>{t('common.quantityAndDetails', 'Quantity & details')}</Text>
              <Text style={styles.stepHint}>{t('common.detailsHint', 'Tell us how many and any additional details for this item.')}</Text>

              {/* Quantity */}
              <Text style={styles.fieldLabel}>{t('common.howManyItems', 'How many items?')}</Text>
              <View style={styles.quantityRow}>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                  accessibilityLabel="Decrease quantity"
                >
                  <Text style={styles.qtyBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.qtyValue}>{quantity}</Text>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => setQuantity((q) => Math.min(100, q + 1))}
                  accessibilityLabel="Increase quantity"
                >
                  <Text style={styles.qtyBtnText}>+</Text>
                </TouchableOpacity>
              </View>

              {/* Weight (optional) */}
              <Text style={styles.fieldLabel}>{t('common.estWeightOptional', 'Estimated weight (kg) — optional')}</Text>
              <TextInput
                style={styles.inputField}
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
                placeholder={t('common.weightPlaceholder', 'e.g. 0.5')}
                placeholderTextColor="rgba(255,255,255,0.30)"
                returnKeyType="next"
                accessibilityLabel="Estimated weight in kilograms"
              />

              {/* Description (optional) */}
              <Text style={styles.fieldLabel}>{t('common.descriptionOptional', 'Description — optional')}</Text>
              <TextInput
                style={[styles.inputField, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                placeholder={t('common.descPlaceholder', 'Brand, model, any extra info…')}
                placeholderTextColor="rgba(255,255,255,0.30)"
                textAlignVertical="top"
                accessibilityLabel="Item description"
              />

              {/* Add another item CTA button */}
              <TouchableOpacity
                style={styles.addMoreItemsBtn}
                onPress={handleAddAnotherItem}
                accessibilityRole="button"
                accessibilityLabel="Add another item to this request"
              >
                <Text style={styles.addMoreItemsBtnText}>{t('common.addAnotherItemBtn', '+ Add Another Item to Request')}</Text>
              </TouchableOpacity>

              <View style={{ height: 100 }} />
            </ScrollView>
          </KeyboardAvoidingView>
        );

      // ── STEP 5: Location (With EcoSetuMap embedded) ────────────────────────
      case 5:
        return (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.stepQuestion}>{t('common.whereCollect', 'Where should we collect it?')}</Text>
              <Text style={styles.stepHint}>{t('common.selectPickupMap', 'Select pickup point on map and confirm address details.')}</Text>

              {/* Interactive Map */}
              <View style={styles.mapCard}>
                <EcoSetuMap
                  latitude={pickupLat || 19.0760}
                  longitude={pickupLng || 72.8777}
                  draggable={true}
                  allowLocationSelection={true}
                  allowTapSelection={true}
                  showMyLocationButton={true}
                  showZoomControls={true}
                  accuracy={locationAccuracy}
                  showAccuracyCircle={true}
                  onLocationChange={(lat, lng) => {
                    setPickupLat(lat);
                    setPickupLng(lng);
                    triggerReverseGeocoding(lat, lng);
                  }}
                  style={styles.mapEmbed}
                />
                <View style={styles.mapHelpBar}>
                  <Text style={styles.mapHelpText}>{t('common.dragPinHelp', '📍 Drag pin or tap map to adjust pickup location')}</Text>
                </View>
              </View>

              {/* Auto-locate button */}
              <TouchableOpacity
                style={[styles.locateBtn, isLocating && styles.locateBtnDisabled]}
                onPress={handleUseCurrentLocation}
                disabled={isLocating || isResolvingAddress}
                accessibilityRole="button"
                accessibilityLabel={t('location.useCurrentLocation', 'Use GPS / Current Location')}
              >
                {isLocating ? (
                  <ActivityIndicator size="small" color="#10B981" />
                ) : (
                  <Text style={styles.locateBtnText}>🎯 {t('location.useCurrentLocation', 'Use GPS / Current Location')}</Text>
                )}
              </TouchableOpacity>

              {isResolvingAddress && (
                <View style={styles.resolvingRow}>
                  <ActivityIndicator size="small" color="#34D399" />
                  <Text style={styles.resolvingText}>{t('location.updatingAddress', 'Auto-filling address from pin…')}</Text>
                </View>
              )}

              {locationError && (
                <Text style={styles.locationErrorText}>{locationError}</Text>
              )}

              {/* Address type */}
              <Text style={styles.fieldLabel}>{t('common.addressType', 'Address type')}</Text>
              <View style={styles.addrTypeRow}>
                {[ADDRESS_TYPES.HOME, ADDRESS_TYPES.OFFICE, ADDRESS_TYPES.OTHER].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.addrTypePill, addressType === type && styles.addrTypePillActive]}
                    onPress={() => setAddressType(type)}
                    accessibilityRole="button"
                    accessibilityLabel={type}
                  >
                    <Text style={[styles.addrTypePillText, addressType === type && styles.addrTypePillTextActive]}>
                      {type === ADDRESS_TYPES.HOME ? `🏠 ${t('common.home', 'Home')}` : type === ADDRESS_TYPES.OFFICE ? `🏢 ${t('common.work', 'Work')}` : `📌 ${t('ewaste.other', 'Other')}`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Address fields */}
              <AddressInput label={t('location.houseNo', 'House / Flat No.')} value={houseNumber} onChange={setHouseNumber} placeholder={t('location.housePlaceholder', 'e.g. 12B, Block 3')} />
              <AddressInput label={t('location.street', 'Street')} value={street} onChange={setStreet} placeholder={t('location.streetPlaceholder', 'Street / Colony name')} />
              <AddressInput label={t('location.landmark', 'Landmark')} value={landmark} onChange={setLandmark} placeholder={t('location.landmarkPlaceholder', 'Near park, temple…')} />
              <AddressInput label={t('location.city', 'City / Town')} value={city} onChange={setCity} placeholder={t('location.city', 'City')} />
              <AddressInput label={t('location.district', 'District')} value={district} onChange={setDistrict} placeholder={t('location.district', 'District')} />
              <AddressInput label={t('location.state', 'State')} value={stateName} onChange={setStateName} placeholder={t('location.state', 'State')} />
              <AddressInput label={t('location.pincode', 'PIN Code')} value={pincode} onChange={setPincode} placeholder={t('location.pincodePlaceholder', '6-digit PIN Code')} keyboard="number-pad" />

              <View style={{ height: 100 }} />
            </ScrollView>
          </KeyboardAvoidingView>
        );

      // ── STEP 6: Review ────────────────────────────────────────────────────
      case 6: {
        const allReviewItems = [...items];
        if (category) {
          allReviewItems.push({
            category,
            photoUri,
            condition,
            quantity,
            weight,
            description,
          });
        }
        const totalItemsCount = allReviewItems.reduce((acc, curr) => acc + (curr.quantity || 1), 0);

        return (
          <ScrollView style={styles.stepContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.stepQuestion}>{t('common.reviewRequest', 'Review your request')}</Text>
            <Text style={styles.stepHint}>
              {t('common.confirmItemsAndAddress', `Confirm the ${totalItemsCount} item(s) in your request and pickup address.`)}
            </Text>

            {/* Items Card List */}
            <View style={styles.reviewHeaderRow}>
              <Text style={styles.reviewSectionTitle}>📦 {t('common.itemsToRecycle', 'Items to Recycle')} ({allReviewItems.length})</Text>
              <TouchableOpacity
                style={styles.reviewAddMoreLink}
                onPress={() => {
                  resetCurrentDraft();
                  setStep(1);
                }}
              >
                <Text style={styles.reviewAddMoreLinkText}>{t('common.addMore', '+ Add More')}</Text>
              </TouchableOpacity>
            </View>

            {allReviewItems.map((item, idx) => {
              const catInfo = getCategoryDetails(item.category);
              const condInfo = getConditionDetails(item.condition);

              return (
                <View key={idx} style={styles.itemReviewCard}>
                  <View style={styles.itemReviewTopRow}>
                    <Text style={styles.itemReviewCatIcon}>{catInfo.icon}</Text>
                    <View style={styles.itemReviewHeaderTexts}>
                      <Text style={styles.itemReviewCatTitle}>{catInfo.label}</Text>
                      <Text style={styles.itemReviewSub}>
                        {t('common.qty', 'Qty')}: <Text style={styles.itemReviewHighlight}>{item.quantity}</Text> • {t('common.condition', 'Condition')}:{' '}
                        <Text style={[styles.itemReviewHighlight, { color: condInfo.color }]}>
                          {condInfo.label}
                        </Text>
                      </Text>
                    </View>
                    {allReviewItems.length > 1 && (
                      <TouchableOpacity
                        style={styles.itemDeleteBtn}
                        onPress={() => handleRemoveItem(idx)}
                        accessibilityLabel="Remove item"
                      >
                        <Text style={styles.itemDeleteBtnText}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {item.photoUri && (
                    <Image source={{ uri: item.photoUri }} style={styles.itemReviewThumb} resizeMode="cover" />
                  )}

                  {item.weight ? (
                    <ReviewRow icon="⚖️" label={t('common.weight', 'Weight')} value={`${item.weight} kg`} />
                  ) : null}
                  {item.description ? (
                    <ReviewRow icon="📝" label={t('common.note', 'Note')} value={item.description} />
                  ) : null}
                </View>
              );
            })}

            {/* Location summary */}
            <View style={styles.reviewCard}>
              <Text style={styles.reviewSectionTitle}>📍 {t('location.pickupLocation', 'Collection Address')}</Text>
              <Text style={styles.reviewLocationText}>
                {[houseNumber, street, landmark, city, district, stateName, pincode]
                  .filter(Boolean)
                  .join(', ') || t('location.addressNotFound', 'Location not provided')}
              </Text>
              <Text style={styles.reviewLocationCoords}>
                {t('location.latitude', 'Coordinates')}: {pickupLat.toFixed(5)}, {pickupLng.toFixed(5)}
              </Text>
            </View>

            {/* Submit error */}
            {submitError && (
              <View style={styles.submitErrorBox}>
                <Text style={styles.submitErrorText}>{submitError}</Text>
              </View>
            )}

            {!isConnected && (
              <View style={styles.offlineBox}>
                <Text style={styles.offlineText}>
                  ⚡ {t('offline.offlineBanner', "You're offline. Your request will be saved and submitted when you reconnect.")}
                </Text>
              </View>
            )}

            <View style={{ height: 100 }} />
          </ScrollView>
        );
      }

      default:
        return null;
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <EcoSetuBackground>
      <SafeAreaView style={styles.safe}>

        {/* Header */}
        <View style={styles.header}>
          {step > 1 ? (
            <TouchableOpacity style={styles.headerBack} onPress={goBack} accessibilityRole="button" accessibilityLabel={t('common.back', 'Go back')}>
              <Text style={styles.headerBackText}>←</Text>
            </TouchableOpacity>
          ) : <View style={styles.headerBack} />}
          <Text style={styles.headerTitle}>{t('collection.submitRequest', 'Give E-Waste')}</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Step indicator */}
        <StepBar step={step} />

        {/* Step title */}
        <View style={styles.stepLabelRow}>
          <Text style={styles.stepLabelText}>
            {t('common.stepOf', { current: step, total: TOTAL_STEPS }, `Step ${step} of ${TOTAL_STEPS}`)} · {stepLabels[step]?.icon} {stepLabels[step]?.label}
          </Text>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {renderStep()}
        </View>

        {/* Step error */}
        {stepError && (
          <View style={styles.stepErrorBox}>
            <Text style={styles.stepErrorText}>{stepError}</Text>
          </View>
        )}

        {/* Bottom nav */}
        <View style={styles.bottomNav}>
          {step < TOTAL_STEPS ? (
            <TouchableOpacity
              style={[styles.nextBtn, step === 1 && !category && items.length === 0 && styles.nextBtnDisabled]}
              onPress={goNext}
              accessibilityRole="button"
              accessibilityLabel={t('common.next', 'Continue')}
            >
              <Text style={styles.nextBtnText}>
                {step === 4 ? `${t('common.proceedToAddress', 'Proceed to Address')} (${items.length + (category ? 1 : 0)} ${t('common.items', 'items')}) →` : `${t('common.next', 'Continue')} →`}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityLabel={t('common.submit', 'Submit')}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>{t('collection.submitRequest', 'Submit Request')} ✓</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

      </SafeAreaView>
    </EcoSetuBackground>
  );
};

// ─── Address Input helper ─────────────────────────────────────────────────────

// ─── Address Input helper ─────────────────────────────────────────────────────

const AddressInput: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboard?: any;
}> = ({ label, value, onChange, placeholder, keyboard }) => (
  <View style={{ marginBottom: 10 }}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput
      style={styles.inputField}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor="rgba(255,255,255,0.30)"
      keyboardType={keyboard || 'default'}
      returnKeyType="next"
      autoCapitalize="words"
    />
  </View>
);

// ─── Review Row helper ────────────────────────────────────────────────────────

const ReviewRow: React.FC<{ icon: string; label: string; value: string }> = ({ icon, label, value }) => (
  <View style={styles.reviewRow}>
    <Text style={styles.reviewRowIcon}>{icon}</Text>
    <Text style={styles.reviewRowLabel}>{label}</Text>
    <Text style={styles.reviewRowValue} numberOfLines={2}>{value}</Text>
  </View>
);

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  headerBack: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBackText: {
    fontSize: 22,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  headerSpacer: { width: 40 },

  // ── Step label ──
  stepLabelRow: {
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  stepLabelText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 0.3,
  },

  // ── Content ──
  content: { flex: 1 },
  stepContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  stepQuestion: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
    letterSpacing: -0.3,
    lineHeight: 30,
  },
  stepHint: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    marginBottom: 20,
    lineHeight: 20,
  },

  // ── Category grid ──
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  catTile: {
    width: (SCREEN_W - 60) / 3,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.10)',
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    position: 'relative',
  },
  catTileActive: {
    backgroundColor: 'rgba(16,185,129,0.18)',
    borderColor: '#10B981',
  },
  catTileIcon: { fontSize: 28 },
  catTileLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.60)',
    textAlign: 'center',
  },
  catTileLabelActive: { color: '#34D399' },
  catSelectedDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },

  // ── Photo ──
  photoBox: {
    width: '100%',
    height: SCREEN_W * 0.65,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.12)',
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  photoPreview: { width: '100%', height: '100%' },
  photoChangeOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingVertical: 10,
    alignItems: 'center',
  },
  photoChangeText: { fontSize: 13, color: '#FFFFFF', fontWeight: '600' },
  photoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  photoPlaceholderIcon: { fontSize: 52 },
  photoPlaceholderLabel: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  photoPlaceholderSub: { fontSize: 12, color: 'rgba(255,255,255,0.45)' },
  skipPhotoBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipPhotoText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
    textDecorationLine: 'underline',
  },

  // ── Condition ──
  conditionList: { gap: 10 },
  condRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    gap: 12,
  },
  condRowLeft: { flex: 1 },
  condRowTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  condRowSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.50)',
    lineHeight: 17,
  },
  condRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.30)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  condRadioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },

  // ── Quantity ──
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginBottom: 20,
    marginTop: 8,
  },
  qtyBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(16,185,129,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: { fontSize: 24, color: '#34D399', fontWeight: '700' },
  qtyValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    minWidth: 48,
    textAlign: 'center',
  },

  // ── Fields ──
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.50)',
    letterSpacing: 0.3,
    marginBottom: 6,
    marginTop: 12,
    textTransform: 'uppercase',
  },
  inputField: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  textArea: {
    height: 90,
    paddingTop: 12,
    textAlignVertical: 'top',
  },

  // ── Location ──
  locateBtn: {
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.35)',
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  locateBtnDisabled: { opacity: 0.5 },
  locateBtnText: { fontSize: 15, fontWeight: '700', color: '#34D399' },
  resolvingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  resolvingText: { fontSize: 12, color: '#34D399', fontWeight: '500' },
  locationErrorText: {
    fontSize: 12,
    color: '#FBBF24',
    marginBottom: 10,
    lineHeight: 18,
  },
  addrTypeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
    marginTop: 8,
  },
  addrTypePill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  addrTypePillActive: {
    backgroundColor: 'rgba(16,185,129,0.18)',
    borderColor: '#10B981',
  },
  addrTypePillText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '600',
  },
  addrTypePillTextActive: { color: '#34D399' },

  // ── Review ──
  reviewPhoto: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    marginBottom: 14,
  },
  reviewCard: {
    backgroundColor: 'rgba(16,44,48,0.80)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    padding: 16,
    marginBottom: 12,
    gap: 2,
  },
  reviewSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.50)',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    gap: 10,
  },
  reviewRowIcon: { fontSize: 16, width: 24 },
  reviewRowLabel: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '500',
  },
  reviewRowValue: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'right',
    maxWidth: '55%',
  },
  reviewLocationText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.80)',
    lineHeight: 22,
  },
  submitErrorBox: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.40)',
    padding: 12,
    marginTop: 8,
  },
  submitErrorText: { fontSize: 13, color: '#FCA5A5', lineHeight: 19 },
  offlineBox: {
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.35)',
    padding: 12,
    marginTop: 8,
  },
  offlineText: { fontSize: 12, color: '#FBBF24', lineHeight: 18 },

  // ── Step error ──
  stepErrorBox: {
    marginHorizontal: 20,
    marginBottom: 8,
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderRadius: 10,
    padding: 10,
  },
  stepErrorText: {
    fontSize: 13,
    color: '#FCA5A5',
    fontWeight: '500',
  },

  // ── Success & Summary Banner ──
  successBanner: {
    backgroundColor: 'rgba(16,185,129,0.18)',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  successBannerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#34D399',
  },
  itemsSummaryBadge: {
    backgroundColor: 'rgba(16,44,48,0.90)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.30)',
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  itemsSummaryLeft: { flex: 1 },
  itemsSummaryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#34D399',
    marginBottom: 2,
  },
  itemsSummarySub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.60)',
    lineHeight: 16,
  },
  itemsSummaryDoneBtn: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(16,185,129,0.25)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10B981',
    marginTop: 4,
  },
  itemsSummaryDoneBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ── Add More Items Button (Step 4) ──
  addMoreItemsBtn: {
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderWidth: 1.5,
    borderColor: '#10B981',
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  addMoreItemsBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#34D399',
  },

  // ── Map Container (Step 5) ──
  mapCard: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(52,211,153,0.35)',
    marginBottom: 12,
    backgroundColor: 'rgba(10,25,30,0.85)',
  },
  mapEmbed: {
    width: '100%',
    height: '100%',
  },
  mapHelpBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(5,20,24,0.85)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  mapHelpText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
  },

  // ── Review Header & Item Cards (Step 6) ──
  reviewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    marginTop: 4,
  },
  reviewAddMoreLink: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  reviewAddMoreLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#34D399',
  },
  itemReviewCard: {
    backgroundColor: 'rgba(16,44,48,0.80)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    padding: 14,
    marginBottom: 10,
  },
  itemReviewTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  itemReviewCatIcon: { fontSize: 24 },
  itemReviewHeaderTexts: { flex: 1 },
  itemReviewCatTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  itemReviewSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
  },
  itemReviewHighlight: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
  itemDeleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(239,68,68,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemDeleteBtnText: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '700',
  },
  itemReviewThumb: {
    width: '100%',
    height: 120,
    borderRadius: 10,
    marginVertical: 8,
  },
  reviewLocationCoords: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.40)',
    marginTop: 6,
  },

  // ── Bottom Nav ──
  bottomNav: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(7,30,34,0.96)',
  },
  nextBtn: {
    height: 54,
    borderRadius: 16,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBtnDisabled: {
    backgroundColor: 'rgba(16,185,129,0.30)',
  },
  nextBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  submitBtn: {
    height: 54,
    borderRadius: 16,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // ── AI Suggestion Styles ──
  aiAnalyzingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 184, 166, 0.12)',
    borderColor: 'rgba(20, 184, 166, 0.3)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    marginBottom: 4,
  },
  aiAnalyzingText: {
    fontSize: 13,
    color: '#14B8A6',
    fontWeight: '600',
  },
  aiAnalyzingSubText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  aiSuggestionCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
    marginBottom: 4,
  },
  aiCardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
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
    color: '#10B981',
  },
  aiPercentBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#071E22',
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  aiSuggestionBody: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  aiSymbolText: {
    fontSize: 28,
    marginRight: 10,
  },
  aiInfoCol: {
    flex: 1,
  },
  aiCategoryName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  aiCategorySubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  aiActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  aiUseButton: {
    flex: 1.2,
    backgroundColor: '#10B981',
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
    marginTop: 8,
  },
  aiDismissButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
  },
  aiNoDetTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  aiNoDetSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
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
});

export default SubmitItemScreen;
