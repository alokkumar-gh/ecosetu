/**
 * SubmitItemScreen — Rebuilt Citizen E-Waste Submission Flow
 *
 * WORKFLOW:
 * STEP 1: Capture Image & AI Recognition
 *   - First action: Capture e-waste (Camera / Gallery / Retake)
 *   - AI detects material & confidence (e.g., PCB 87%)
 *   - Citizen reviews AI result:
 *       [ Confirm Category ] -> Proceed with AI suggestion
 *       [ Choose another category ] -> Manual pictorial taxonomy picker
 *       [ Retake photo ] -> Return to camera without losing draft
 *   - Low confidence explicitly prompts for confirmation
 *   - Persists BOTH aiDetectedCategory / aiConfidence AND confirmedCategory
 *
 * STEP 2: Material Details & Condition
 *   - Condition: Working / Not Working / Damaged / Unknown
 *   - Approximate Weight (kg) + Quantity (1-100)
 *   - Optional description / notes
 *
 * STEP 3: Pickup Location
 *   - Embedded EcoSetuMap with draggable pin
 *   - GPS Location auto-fill + reverse geocoding
 *   - Structured address & PIN code validation
 *
 * STEP 4: Review & Submit Pickup Request
 *   - Item photo, AI vs Confirmed category, weight, condition, location
 *   - Moves request directly to SUBMITTED (Offers Open for collectors)
 *   - Offline-first queuing with transparent status messaging
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
import { reverseGeocode, getCurrentLocation } from '../../services/locationService';
import { EcoSetuMap } from '../../components/map/EcoSetuMap';
import { EWASTE_CATEGORIES, ITEM_CONDITIONS, ADDRESS_TYPES } from '../../utils/constants';
import { colors } from '../../theme/colors';
import { AppIcon, IconName } from '../../components/ui/AppIcon';

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
  aiDetectedCategory?: string;
  aiConfidence?: number;
}

// ─── Taxonomy Configuration ──────────────────────────────────────────────────

interface TaxonomyItem {
  key: string;
  i18nKey: string;
  defaultLabel: string;
  iconName: IconName;
  badgeEmoji: string;
  description: string;
}

const TAXONOMY_LIST: TaxonomyItem[] = [
  {
    key: EWASTE_CATEGORIES.CIRCUIT_BOARD,
    i18nKey: 'ewaste.circuitBoard',
    defaultLabel: 'PCB / Circuit Board',
    iconName: 'cpu',
    badgeEmoji: '🧩',
    description: 'Motherboards, green/blue PCBs, logic boards',
  },
  {
    key: EWASTE_CATEGORIES.MOBILE_PHONE,
    i18nKey: 'ewaste.mobilePhone',
    defaultLabel: 'Mobile Phone / Smartphone',
    iconName: 'smartphone',
    badgeEmoji: '📱',
    description: 'Smartphones, feature phones, handsets',
  },
  {
    key: EWASTE_CATEGORIES.LAPTOP,
    i18nKey: 'ewaste.laptop',
    defaultLabel: 'Laptop / Notebook',
    iconName: 'laptop',
    badgeEmoji: '💻',
    description: 'Laptops, MacBooks, notebooks, netbooks',
  },
  {
    key: EWASTE_CATEGORIES.DESKTOP,
    i18nKey: 'ewaste.desktop',
    defaultLabel: 'Desktop / CPU Tower',
    iconName: 'monitor',
    badgeEmoji: '🖥️',
    description: 'Desktop towers, servers, CPUs',
  },
  {
    key: EWASTE_CATEGORIES.MONITOR,
    i18nKey: 'ewaste.monitor',
    defaultLabel: 'CRT / LCD / Monitor',
    iconName: 'tv',
    badgeEmoji: '📺',
    description: 'CRT monitors, LCD/LED screens, TVs',
  },
  {
    key: EWASTE_CATEGORIES.TABLET,
    i18nKey: 'ewaste.tablet',
    defaultLabel: 'Tablet / iPad / Display',
    iconName: 'tablet',
    badgeEmoji: '📟',
    description: 'iPads, Android tablets, touch displays',
  },
  {
    key: EWASTE_CATEGORIES.CABLE_CHARGER,
    i18nKey: 'ewaste.cableCharger',
    defaultLabel: 'Cables & Chargers',
    iconName: 'zap',
    badgeEmoji: '🔌',
    description: 'Power cables, USB chargers, copper wiring',
  },
  {
    key: EWASTE_CATEGORIES.BATTERY,
    i18nKey: 'ewaste.battery',
    defaultLabel: 'Batteries & Power Cells',
    iconName: 'battery',
    badgeEmoji: '🔋',
    description: 'Li-ion, lead-acid, UPS batteries',
  },
  {
    key: EWASTE_CATEGORIES.PRINTER,
    i18nKey: 'ewaste.printer',
    defaultLabel: 'Printers & Motors',
    iconName: 'printer',
    badgeEmoji: '🖨️',
    description: 'Printers, scanners, stepper motors',
  },
  {
    key: EWASTE_CATEGORIES.KEYBOARD_MOUSE,
    i18nKey: 'ewaste.keyboardMouse',
    defaultLabel: 'Keyboards & Peripherals',
    iconName: 'package',
    badgeEmoji: '⌨️',
    description: 'Keyboards, mice, webcams, magnets',
  },
  {
    key: EWASTE_CATEGORIES.OTHER,
    i18nKey: 'ewaste.other',
    defaultLabel: 'Mixed Plastics & Other',
    iconName: 'box',
    badgeEmoji: '📦',
    description: 'Mixed plastics, small appliances, other e-waste',
  },
];

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
  [ITEM_CONDITIONS.WORKING]:     { labelKey: 'status.working',    defaultLabel: 'Working',      subKey: 'common.workingSub',    defaultSub: 'Powers on, functional',          color: '#10B981' },
  [ITEM_CONDITIONS.NOT_WORKING]: { labelKey: 'status.notWorking', defaultLabel: 'Not Working',  subKey: 'common.notWorkingSub', defaultSub: "Doesn't turn on / scrap",       color: '#F59E0B' },
  [ITEM_CONDITIONS.DAMAGED]:     { labelKey: 'status.damaged',    defaultLabel: 'Damaged',      subKey: 'common.damagedSub',    defaultSub: 'Broken screen / parts',          color: '#EF4444' },
  [ITEM_CONDITIONS.UNKNOWN]:     { labelKey: 'status.unknown',    defaultLabel: 'Unknown',      subKey: 'common.unknownSub',    defaultSub: 'Not sure of condition',          color: '#A78BFA' },
};

// ─── Step Indicator ──────────────────────────────────────────────────────────

const TOTAL_STEPS = 4;

const StepBar: React.FC<{ step: number }> = ({ step }) => (
  <View style={sb.container}>
    {[1, 2, 3, 4].map((n) => {
      const done = step > n;
      const current = step === n;
      return (
        <React.Fragment key={n}>
          <View style={[sb.circle, done && sb.circleDone, current && sb.circleCurrent]}>
            {done ? (
              <Text style={sb.checkmark}>✓</Text>
            ) : (
              <Text style={[sb.stepNum, current && sb.stepNumActive]}>{n}</Text>
            )}
          </View>
          {n < TOTAL_STEPS && <View style={[sb.line, done && sb.lineDone]} />}
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
    paddingVertical: 10,
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
  circleDone: { backgroundColor: '#10B981', borderColor: '#10B981' },
  circleCurrent: { backgroundColor: 'rgba(16,185,129,0.20)', borderColor: '#10B981' },
  checkmark: { fontSize: 13, color: '#FFFFFF', fontWeight: '800' },
  stepNum: { fontSize: 11, color: 'rgba(255,255,255,0.40)', fontWeight: '700' },
  stepNumActive: { color: '#34D399' },
  line: { flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.10)', marginHorizontal: 4 },
  lineDone: { backgroundColor: '#10B981' },
});

// ─── Main Component ──────────────────────────────────────────────────────────

export const SubmitItemScreen: React.FC<Props> = ({ navigation }) => {
  const { isConnected } = useNetwork();
  const { t } = useI18n();

  // Step state (1: Photo & AI, 2: Details & Condition, 3: Pickup Location, 4: Review & Submit)
  const [step, setStep] = useState<number>(1);

  // Draft Data State
  const [photoUri, setPhotoUri] = useState<string | undefined>(undefined);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [aiPrediction, setAiPrediction] = useState<AIPrediction | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isAnalyzingAi, setIsAnalyzingAi] = useState<boolean>(false);
  const activeAiRequestUriRef = useRef<string | null>(null);

  // Category State (Persist both AI suggestion & Confirmed category)
  const [aiDetectedCategory, setAiDetectedCategory] = useState<string | null>(null);
  const [aiConfidence, setAiConfidence] = useState<number | null>(null);
  const [confirmedCategory, setConfirmedCategory] = useState<string | null>(null);
  const [showManualTaxonomy, setShowManualTaxonomy] = useState<boolean>(false);

  // Material Details State
  const [condition, setCondition] = useState<string>(ITEM_CONDITIONS.UNKNOWN);
  const [quantity, setQuantity] = useState<number>(1);
  const [weight, setWeight] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  // Location State
  const [pickupLat, setPickupLat] = useState<number>(19.076);
  const [pickupLng, setPickupLng] = useState<number>(72.8777);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isResolvingAddress, setIsResolvingAddress] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [addressType, setAddressType] = useState<string>(ADDRESS_TYPES.HOME);

  // Structured Address Fields
  const [houseNumber, setHouseNumber] = useState<string>('');
  const [street, setStreet] = useState<string>('');
  const [landmark, setLandmark] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [district, setDistrict] = useState<string>('');
  const [stateName, setStateName] = useState<string>('');
  const [pincode, setPincode] = useState<string>('');

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);

  // Initial Location Fetch on step 3
  useEffect(() => {
    if (step === 3) {
      handleGetLocation();
    }
  }, [step]);

  // ── Address Resolving ───────────────────────────────────────────────────────

  const handleResolveAddress = useCallback(async (lat: number, lng: number) => {
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) return;
    setIsResolvingAddress(true);
    try {
      const resolved = await reverseGeocode(lat, lng);
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
      // Non-fatal geocoding error
    } finally {
      setIsResolvingAddress(false);
    }
  }, []);

  const handleGetLocation = useCallback(async () => {
    setIsLocating(true);
    setLocationError(null);
    try {
      const result = await getCurrentLocation();
      if (result.success && result.coords) {
        const { latitude, longitude, accuracy } = result.coords;
        setPickupLat(latitude);
        setPickupLng(longitude);
        if (accuracy !== null) setLocationAccuracy(accuracy);
        handleResolveAddress(latitude, longitude);
      } else if (result.error === 'PERMISSION_DENIED') {
        setLocationError('Location permission denied. Enter address manually below or drag the map pin.');
      } else {
        setLocationError(result.message || 'Could not get GPS location. Drag the map pin or enter address.');
      }
    } catch {
      setLocationError('Location unavailable. Drag the map pin or enter address.');
    } finally {
      setIsLocating(false);
    }
  }, [handleResolveAddress]);

  // ── AI Material Analysis ───────────────────────────────────────────────────

  const runAiAnalysis = useCallback((uri: string, fileName?: string, mimeType?: string) => {
    activeAiRequestUriRef.current = uri;
    setIsAnalyzingAi(true);
    setAiError(null);
    setAiPrediction(null);

    aiService
      .predictMaterial(uri, fileName, mimeType)
      .then((res) => {
        if (activeAiRequestUriRef.current !== uri) return;
        setIsAnalyzingAi(false);

        if (res.success && res.prediction) {
          setAiPrediction(res.prediction);
          setAiError(null);
          if (res.prediction.has_detection && res.prediction.category) {
            setAiDetectedCategory(res.prediction.category);
            setAiConfidence(res.prediction.confidence || 0.87);
          }
        } else {
          setAiPrediction(null);
          setAiError(res.error || 'AI_SERVICE_UNAVAILABLE');
        }
      })
      .catch((err) => {
        if (activeAiRequestUriRef.current !== uri) return;
        setIsAnalyzingAi(false);
        setAiPrediction(null);
        setAiError(err?.message || 'AI_SERVICE_UNAVAILABLE');
      });
  }, []);

  // ── Photo Capture ──────────────────────────────────────────────────────────

  const handleTakePhoto = useCallback(async () => {
    setIsCapturing(true);
    setStepError(null);
    try {
      const res = await capturePhoto();
      if (res.success && res.uri) {
        setPhotoUri(res.uri);
        setShowManualTaxonomy(false);
        runAiAnalysis(res.uri, res.fileName, res.type);
      } else if (res.error === 'CAMERA_PERMISSION_DENIED') {
        Alert.alert('Permission Required', 'Camera permission is required to capture e-waste photos.');
      }
    } catch (err) {
      console.error('[SubmitItemScreen] Error in photo capture:', err);
    } finally {
      setIsCapturing(false);
    }
  }, [runAiAnalysis]);

  // ── Actions for Step 1 ─────────────────────────────────────────────────────

  const handleConfirmAiCategory = () => {
    if (aiPrediction?.category) {
      setConfirmedCategory(aiPrediction.category);
      setStep(2);
    } else if (aiDetectedCategory) {
      setConfirmedCategory(aiDetectedCategory);
      setStep(2);
    }
  };

  const handleSelectManualCategory = (catKey: string) => {
    setConfirmedCategory(catKey);
    setShowManualTaxonomy(false);
    setStep(2);
  };

  const handleRetakePhoto = () => {
    handleTakePhoto();
  };

  // ── Step Navigation & Validation ───────────────────────────────────────────

  const validateStep = (): boolean => {
    setStepError(null);

    if (step === 1) {
      if (!photoUri) {
        setStepError('Please capture or select an e-waste photo first.');
        return false;
      }
      if (!confirmedCategory) {
        setStepError('Please select an e-waste category.');
        return false;
      }
    }

    if (step === 2) {
      if (!confirmedCategory) {
        setStepError('Please select an e-waste category.');
        return false;
      }
      if (quantity < 1 || quantity > 100) {
        setStepError('Quantity must be between 1 and 100.');
        return false;
      }
      if (weight.trim()) {
        const parsedWeight = parseFloat(weight);
        if (isNaN(parsedWeight) || parsedWeight < 0.01 || parsedWeight > 500) {
          setStepError('Please enter a valid weight between 0.01 and 500 kg.');
          return false;
        }
      }
      if (description.trim().length > 500) {
        setStepError('Description must not exceed 500 characters.');
        return false;
      }
    }

    if (step === 3) {
      if (pincode.trim() && !/^[1-9][0-9]{5}$/.test(pincode.trim())) {
        setStepError('PIN Code must be a valid 6-digit postal code.');
        return false;
      }
    }

    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    setStepError(null);
    if (step > 1) {
      setStep((s) => s - 1);
    } else {
      navigation.navigate('CitizenHome');
    }
  };

  // ── Final Submission ───────────────────────────────────────────────────────

  const handleSubmitRequest = async () => {
    if (isSubmitting) return;
    setSubmitError(null);

    if (!confirmedCategory) {
      setSubmitError('Please select an e-waste category.');
      return;
    }

    if (quantity < 1 || quantity > 100) {
      setSubmitError('Quantity must be between 1 and 100.');
      return;
    }

    if (weight.trim()) {
      const parsedWeight = parseFloat(weight);
      if (isNaN(parsedWeight) || parsedWeight < 0.01 || parsedWeight > 500) {
        setSubmitError('Please enter a valid weight between 0.01 and 500 kg.');
        return;
      }
    }

    if (description.trim().length > 500) {
      setSubmitError('Description must not exceed 500 characters.');
      return;
    }

    if (pincode.trim() && !/^[1-9][0-9]{5}$/.test(pincode.trim())) {
      setSubmitError('PIN Code must be a valid 6-digit postal code.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Create E-Waste Item with AI & Confirmation details
      const itemPayload: any = {
        category: confirmedCategory,
        condition,
        quantity,
      };

      if (description.trim()) itemPayload.description = description.trim();
      if (weight && !isNaN(parseFloat(weight))) itemPayload.estimatedWeightKg = parseFloat(weight);
      if (photoUri) itemPayload.imageUri = photoUri;
      if (aiDetectedCategory) itemPayload.aiDetectedCategory = aiDetectedCategory;
      if (aiConfidence) itemPayload.aiConfidence = aiConfidence;
      itemPayload.wasAccepted = confirmedCategory === aiDetectedCategory;

      const createdItem: any = await ewasteService.createItem(itemPayload);
      const itemId = createdItem?.id;

      // 2. Create Collection Request
      const formattedAddr = [
        houseNumber.trim(),
        street.trim(),
        landmark.trim(),
        city.trim(),
        district.trim(),
        stateName.trim(),
        pincode.trim(),
      ]
        .filter(Boolean)
        .join(', ');

      const requestPayload: any = {
        itemIds: [itemId],
        pickupAddress: formattedAddr || 'Doorstep Pickup Location',
        pickupLat: pickupLat || 0,
        pickupLng: pickupLng || 0,
        addressType,
        autoSubmit: true, // Moves directly to OFFERS_OPEN / SUBMITTED
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

      if (isConnected) {
        Alert.alert(
          'Pickup Request Created',
          'Your e-waste collection request has been broadcast to local collectors. You will receive price offers shortly.',
          [
            {
              text: 'View Requests',
              onPress: () => navigation.navigate('CitizenRequests'),
            },
          ]
        );
      } else {
        Alert.alert(
          'Saved Offline',
          'E-Waste item saved as an offline draft. It will automatically synchronize with the server when connectivity returns.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('CitizenHome'),
            },
          ]
        );
      }
    } catch (err: any) {
      const msg =
        err?.isOfflineError
          ? 'E-Waste item saved as an offline draft. It will automatically synchronize with the server when connectivity returns.'
          : err?.response?.data?.message || err?.message || 'Failed to submit pickup request. Please try again.';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render Helpers ─────────────────────────────────────────────────────────

  const getCategoryLabel = (key?: string | null) => {
    if (!key) return '—';
    const found = TAXONOMY_LIST.find((t) => t.key === key);
    return found ? found.defaultLabel : key;
  };

  const getCategoryEmoji = (key?: string | null) => {
    if (!key) return '📦';
    const found = TAXONOMY_LIST.find((t) => t.key === key);
    return found ? found.badgeEmoji : '📦';
  };

  return (
    <EcoSetuBackground>
      <SafeAreaView style={styles.safe}>
        {/* ── Top Header ── */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerBack}
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel={t('common.back', 'Go back')}
          >
            <Text style={styles.headerBackText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} accessibilityRole="header">
            {t('collection.submitRequest', 'Give E-Waste')}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* ── Progress Step Bar ── */}
        <StepBar step={step} />

        <View style={styles.stepLabelRow}>
          <Text style={styles.stepLabelText}>
            Step {step} of 4 ·{' '}
            {step === 1 && 'Capture & AI Detection'}
            {step === 2 && 'Material Details & Condition'}
            {step === 3 && 'Pickup Location'}
            {step === 4 && 'Review & Submit'}
          </Text>
        </View>

        {/* ── Step Content ── */}
        <View style={styles.content}>
          {/* STEP 1: CAPTURE PHOTO & AI DETECTION */}
          {step === 1 && (
            <ScrollView style={styles.stepScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.stepQuestion} accessibilityRole="header">
                Capture e-waste
              </Text>
              <Text style={styles.stepHint}>
                Take a clear photo of your electronic item. Our AI will identify the material and category.
              </Text>

              {/* Photo Box */}
              <TouchableOpacity
                style={styles.photoBox}
                onPress={handleTakePhoto}
                disabled={isCapturing}
                accessibilityRole="button"
                accessibilityLabel="Capture e-waste photo"
                activeOpacity={0.8}
              >
                {photoUri ? (
                  <>
                    <Image source={{ uri: photoUri }} style={styles.photoPreview} resizeMode="cover" />
                    <View style={styles.photoChangeOverlay}>
                      <Text style={styles.photoChangeText}>Tap to retake photo</Text>
                    </View>
                  </>
                ) : (
                  <View style={styles.photoPlaceholder}>
                    {isCapturing ? (
                      <ActivityIndicator size="large" color="#10B981" />
                    ) : (
                      <>
                        <View style={styles.camIconCircle}>
                          <AppIcon name="camera" size={36} color="#10B981" />
                        </View>
                        <Text style={styles.photoPlaceholderLabel}>Tap to capture e-waste</Text>
                        <Text style={styles.photoPlaceholderSub}>
                          Camera will analyze material & category automatically
                        </Text>
                      </>
                    )}
                  </View>
                )}
              </TouchableOpacity>

              {/* AI Processing Status Card */}
              {isAnalyzingAi && (
                <View style={styles.aiAnalyzingCard} accessibilityRole="alert">
                  <ActivityIndicator size="small" color="#10B981" style={{ marginRight: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.aiAnalyzingText}>Analyzing material with AI...</Text>
                    <Text style={styles.aiAnalyzingSubText}>Detecting electronic components & recyclable grade</Text>
                  </View>
                </View>
              )}

              {/* AI Classification Result & Confirmation Banner */}
              {!isAnalyzingAi && photoUri && (
                <View style={styles.aiResultCard}>
                  {aiPrediction?.has_detection && aiPrediction?.category ? (
                    <View>
                      <View style={styles.aiCardHeaderRow}>
                        <View style={styles.aiTitleRow}>
                          <Text style={{ fontSize: 18, marginRight: 6 }}>✨</Text>
                          <Text style={styles.aiCardTitle}>Detected Material</Text>
                        </View>
                        <View style={styles.confidenceBadge}>
                          <Text style={styles.confidenceText}>
                            {Math.round((aiPrediction.confidence || 0.87) * 100)}% Match
                          </Text>
                        </View>
                      </View>

                      <View style={styles.detectedMaterialRow}>
                        <Text style={styles.detectedEmoji}>
                          {getCategoryEmoji(aiPrediction.category)}
                        </Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.detectedName}>
                            {getCategoryLabel(aiPrediction.category)}
                          </Text>
                          <Text style={styles.detectedPrompt}>Is this correct?</Text>
                        </View>
                      </View>

                      {/* Confirmation & Action Buttons */}
                      <View style={styles.aiActionRow}>
                        <TouchableOpacity
                          style={styles.confirmAiBtn}
                          onPress={handleConfirmAiCategory}
                          accessibilityRole="button"
                          accessibilityLabel={`Confirm ${getCategoryLabel(aiPrediction.category)}`}
                        >
                          <AppIcon name="check" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                          <Text style={styles.confirmAiBtnText}>
                            Confirm {getCategoryLabel(aiPrediction.category)}
                          </Text>
                        </TouchableOpacity>

                        <View style={styles.aiSecondaryActions}>
                          <TouchableOpacity
                            style={styles.chooseManualBtn}
                            onPress={() => setShowManualTaxonomy(true)}
                            accessibilityRole="button"
                            accessibilityLabel="Choose another category manually"
                          >
                            <Text style={styles.chooseManualText}>Choose another category</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.retakeBtn}
                            onPress={handleRetakePhoto}
                            accessibilityRole="button"
                            accessibilityLabel="Retake photo"
                          >
                            <Text style={styles.retakeText}>Retake photo</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ) : (
                    <View>
                      <View style={styles.aiCardHeaderRow}>
                        <View style={styles.aiTitleRow}>
                          <AppIcon name="search" size={18} color="#F59E0B" style={{ marginRight: 6 }} />
                          <Text style={styles.aiCardTitle}>Material Verification</Text>
                        </View>
                      </View>
                      <Text style={styles.aiNoDetText}>
                        {aiError
                          ? 'AI analysis unavailable. Please select your material category manually.'
                          : "Couldn't confidently identify this item. Please select your material category manually."}
                      </Text>

                      <View style={styles.aiSecondaryActions}>
                        <TouchableOpacity
                          style={styles.chooseManualBtnPrimary}
                          onPress={() => setShowManualTaxonomy(true)}
                          accessibilityRole="button"
                          accessibilityLabel="Select category manually"
                        >
                          <Text style={styles.chooseManualBtnPrimaryText}>Choose category manually</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.retakeBtn}
                          onPress={handleRetakePhoto}
                          accessibilityRole="button"
                          accessibilityLabel="Retake photo"
                        >
                          <Text style={styles.retakeText}>Retake photo</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              )}

              {/* Manual Category Selection Section */}
              {(showManualTaxonomy || (!photoUri && !isCapturing)) && (
                <View style={styles.manualTaxonomySection}>
                  <Text style={styles.manualTaxonomyTitle} accessibilityRole="header">
                    Select Material Category
                  </Text>
                  <Text style={styles.manualTaxonomySub}>
                    Choose the closest category matching your e-waste item.
                  </Text>

                  <View style={styles.taxonomyGrid}>
                    {TAXONOMY_LIST.map((tax) => {
                      const isSelected = confirmedCategory === tax.key;
                      return (
                        <TouchableOpacity
                          key={tax.key}
                          style={[styles.taxCard, isSelected && styles.taxCardActive]}
                          onPress={() => handleSelectManualCategory(tax.key)}
                          accessibilityRole="button"
                          accessibilityLabel={tax.defaultLabel}
                          accessibilityState={{ selected: isSelected }}
                        >
                          <View style={styles.taxIconBox}>
                            <AppIcon
                              name={tax.iconName}
                              size={22}
                              color={isSelected ? '#10B981' : '#CBD5E1'}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.taxLabel, isSelected && styles.taxLabelActive]}>
                              {tax.defaultLabel}
                            </Text>
                            <Text style={styles.taxDesc} numberOfLines={1}>
                              {tax.description}
                            </Text>
                          </View>
                          {isSelected && <View style={styles.taxSelectedDot} />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              <View style={{ height: 40 }} />
            </ScrollView>
          )}

          {/* STEP 2: MATERIAL DETAILS & CONDITION */}
          {step === 2 && (
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={{ flex: 1 }}
            >
              <ScrollView style={styles.stepScroll} showsVerticalScrollIndicator={false}>
                <Text style={styles.stepQuestion} accessibilityRole="header">
                  Material Details & Condition
                </Text>
                <Text style={styles.stepHint}>
                  Accurate details help local collectors offer the best price for your e-waste.
                </Text>

                {/* Confirmed Material Category Pill */}
                <View style={styles.confirmedCatBadge}>
                  <View style={styles.confirmedCatLeft}>
                    <Text style={styles.confirmedCatEmoji}>{getCategoryEmoji(confirmedCategory)}</Text>
                    <View>
                      <Text style={styles.confirmedCatLabel}>Confirmed Material</Text>
                      <Text style={styles.confirmedCatValue}>{getCategoryLabel(confirmedCategory)}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.confirmedCatChangeBtn}
                    onPress={() => {
                      setShowManualTaxonomy(true);
                      setStep(1);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Change category"
                  >
                    <Text style={styles.confirmedCatChangeText}>Change</Text>
                  </TouchableOpacity>
                </View>

                {/* Condition Selector */}
                <Text style={styles.fieldLabel} accessibilityRole="header">
                  What condition is it in? *
                </Text>
                <View style={styles.conditionList}>
                  {Object.keys(CONDITION_MAP).map((condKey) => {
                    const cond = CONDITION_MAP[condKey];
                    const isSelected = condition === condKey;
                    return (
                      <TouchableOpacity
                        key={condKey}
                        style={[
                          styles.condRow,
                          isSelected && { borderColor: cond.color, backgroundColor: cond.color + '15' },
                        ]}
                        onPress={() => setCondition(condKey)}
                        accessibilityRole="button"
                        accessibilityLabel={cond.defaultLabel}
                        accessibilityState={{ selected: isSelected }}
                      >
                        <View style={styles.condRowLeft}>
                          <Text style={[styles.condRowTitle, isSelected && { color: cond.color }]}>
                            {cond.defaultLabel}
                          </Text>
                          <Text style={styles.condRowSub}>{cond.defaultSub}</Text>
                        </View>
                        <View
                          style={[
                            styles.condRadio,
                            isSelected && { borderColor: cond.color, backgroundColor: cond.color },
                          ]}
                        >
                          {isSelected && <View style={styles.condRadioInner} />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Approximate Weight Input */}
                <Text style={styles.fieldLabel} accessibilityRole="header">
                  Approximate weight (kg)
                </Text>
                <TextInput
                  style={styles.inputField}
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="decimal-pad"
                  placeholder="e.g. 2.5"
                  placeholderTextColor="rgba(255,255,255,0.30)"
                  accessibilityLabel="Estimated weight in kilograms"
                />

                {/* Quick Weight Chips */}
                <View style={styles.weightChipsRow}>
                  {['0.5', '1.0', '2.5', '5.0', '10.0'].map((w) => (
                    <TouchableOpacity
                      key={w}
                      style={[styles.weightChip, weight === w && styles.weightChipActive]}
                      onPress={() => setWeight(w)}
                      accessibilityRole="button"
                      accessibilityLabel={`${w} kilograms`}
                    >
                      <Text
                        style={[
                          styles.weightChipText,
                          weight === w && styles.weightChipTextActive,
                        ]}
                      >
                        {w} kg
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Quantity Stepper */}
                <Text style={styles.fieldLabel} accessibilityRole="header">
                  Quantity
                </Text>
                <View style={styles.quantityRow}>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                    accessibilityRole="button"
                    accessibilityLabel="Decrease quantity"
                  >
                    <Text style={styles.qtyBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.qtyValue}>{quantity}</Text>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => setQuantity((q) => Math.min(100, q + 1))}
                    accessibilityRole="button"
                    accessibilityLabel="Increase quantity"
                  >
                    <Text style={styles.qtyBtnText}>+</Text>
                  </TouchableOpacity>
                </View>

                {/* Description Input */}
                <Text style={styles.fieldLabel} accessibilityRole="header">
                  Additional details / Notes (optional)
                </Text>
                <TextInput
                  style={[styles.inputField, styles.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={3}
                  maxLength={500}
                  placeholder="Brand, model number, screen working, battery present…"
                  placeholderTextColor="rgba(255,255,255,0.30)"
                  textAlignVertical="top"
                  accessibilityLabel="Item description"
                />

                <View style={{ height: 40 }} />
              </ScrollView>
            </KeyboardAvoidingView>
          )}

          {/* STEP 3: PICKUP LOCATION */}
          {step === 3 && (
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={{ flex: 1 }}
            >
              <ScrollView style={styles.stepScroll} showsVerticalScrollIndicator={false}>
                <Text style={styles.stepQuestion} accessibilityRole="header">
                  Pickup Location
                </Text>
                <Text style={styles.stepHint}>
                  Select your doorstep pickup point on the map and confirm address details.
                </Text>

                {/* Map Embed */}
                <View style={styles.mapCard}>
                  <EcoSetuMap
                    latitude={pickupLat || 19.076}
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
                      handleResolveAddress(lat, lng);
                    }}
                    style={styles.mapEmbed}
                  />
                  <View style={styles.mapHelpBar}>
                    <AppIcon name="location" size={13} color="#94A3B8" style={{ marginRight: 6 }} />
                    <Text style={styles.mapHelpText}>
                      Drag pin or tap map to adjust doorstep pickup location
                    </Text>
                  </View>
                </View>

                {/* GPS Location Button */}
                <TouchableOpacity
                  style={[styles.locateBtn, isLocating && styles.locateBtnDisabled]}
                  onPress={handleGetLocation}
                  disabled={isLocating || isResolvingAddress}
                  accessibilityRole="button"
                  accessibilityLabel="Use GPS current location"
                >
                  {isLocating ? (
                    <ActivityIndicator size="small" color="#10B981" />
                  ) : (
                    <View style={styles.btnRow}>
                      <AppIcon name="location" size={16} color="#10B981" style={{ marginRight: 6 }} />
                      <Text style={styles.locateBtnText}>Use GPS / Current Location</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {isResolvingAddress && (
                  <View style={styles.resolvingRow}>
                    <ActivityIndicator size="small" color="#34D399" />
                    <Text style={styles.resolvingText}>Auto-filling address from GPS pin…</Text>
                  </View>
                )}

                {Boolean(locationError) && (
                  <Text style={styles.locationErrorText} accessibilityRole="alert">
                    {locationError}
                  </Text>
                )}

                {/* Address Type Pills */}
                <Text style={styles.fieldLabel} accessibilityRole="header">
                  Address Type
                </Text>
                <View style={styles.addrTypeRow}>
                  {[ADDRESS_TYPES.HOME, ADDRESS_TYPES.OFFICE, ADDRESS_TYPES.OTHER].map((type) => {
                    const label =
                      type === ADDRESS_TYPES.HOME
                        ? '🏠 Home'
                        : type === ADDRESS_TYPES.OFFICE
                        ? '🏢 Work'
                        : '📍 Other';
                    const isSelected = addressType === type;
                    return (
                      <TouchableOpacity
                        key={type}
                        style={[styles.addrTypePill, isSelected && styles.addrTypePillActive]}
                        onPress={() => setAddressType(type)}
                        accessibilityRole="button"
                        accessibilityLabel={type}
                      >
                        <Text
                          style={[
                            styles.addrTypePillText,
                            isSelected && styles.addrTypePillTextActive,
                          ]}
                        >
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Structured Address Fields */}
                <FormField
                  label="House / Flat / Building No."
                  value={houseNumber}
                  onChange={setHouseNumber}
                  placeholder="e.g. 12B, Green Woods"
                />
                <FormField
                  label="Street / Colony"
                  value={street}
                  onChange={setStreet}
                  placeholder="e.g. Station Road"
                />
                <FormField
                  label="Landmark"
                  value={landmark}
                  onChange={setLandmark}
                  placeholder="e.g. Near City Bank"
                />
                <FormField
                  label="City / Town"
                  value={city}
                  onChange={setCity}
                  placeholder="City"
                />
                <FormField
                  label="District"
                  value={district}
                  onChange={setDistrict}
                  placeholder="District"
                />
                <FormField
                  label="State"
                  value={stateName}
                  onChange={setStateName}
                  placeholder="State"
                />
                <FormField
                  label="PIN Code"
                  value={pincode}
                  onChange={setPincode}
                  placeholder="6-digit PIN Code"
                  keyboard="number-pad"
                />

                <View style={{ height: 40 }} />
              </ScrollView>
            </KeyboardAvoidingView>
          )}

          {/* STEP 4: REVIEW & SUBMIT */}
          {step === 4 && (
            <ScrollView style={styles.stepScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.stepQuestion} accessibilityRole="header">
                Review Pickup Request
              </Text>
              <Text style={styles.stepHint}>
                Please confirm the lot details below. Local collectors will see your image and place price offers.
              </Text>

              {/* Review Card */}
              <View style={styles.reviewCard}>
                {/* Photo Preview */}
                {Boolean(photoUri) && (
                  <Image source={{ uri: photoUri }} style={styles.reviewPhoto} resizeMode="cover" />
                )}

                <View style={styles.reviewDetailsBlock}>
                  <View style={styles.reviewHeaderRow}>
                    <Text style={styles.reviewCatEmoji}>{getCategoryEmoji(confirmedCategory)}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.reviewCategoryTitle}>
                        {getCategoryLabel(confirmedCategory)}
                      </Text>
                      <Text style={styles.reviewQtyCond}>
                        Qty: {quantity} · Condition: {condition}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.reviewDivider} />

                  {/* AI Prediction vs Citizen Confirmed */}
                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewRowLabel}>AI Suggestion:</Text>
                    <Text style={styles.reviewRowVal}>
                      {aiDetectedCategory ? getCategoryLabel(aiDetectedCategory) : '—'}{' '}
                      {aiConfidence ? `(${Math.round(aiConfidence * 100)}%)` : ''}
                    </Text>
                  </View>

                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewRowLabel}>Confirmed Category:</Text>
                    <Text style={[styles.reviewRowVal, { color: '#34D399', fontWeight: '700' }]}>
                      {getCategoryLabel(confirmedCategory)}
                    </Text>
                  </View>

                  {Boolean(weight) && (
                    <View style={styles.reviewRow}>
                      <Text style={styles.reviewRowLabel}>Approx. Weight:</Text>
                      <Text style={styles.reviewRowVal}>~{weight} kg</Text>
                    </View>
                  )}

                  {Boolean(description) && (
                    <View style={styles.reviewRow}>
                      <Text style={styles.reviewRowLabel}>Notes:</Text>
                      <Text style={styles.reviewRowVal} numberOfLines={2}>
                        "{description}"
                      </Text>
                    </View>
                  )}

                  <View style={styles.reviewDivider} />

                  {/* Pickup Address */}
                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewRowLabel}>Pickup Location:</Text>
                    <Text style={styles.reviewRowVal} numberOfLines={2}>
                      {[houseNumber, street, landmark, city, pincode].filter(Boolean).join(', ') ||
                        'Current GPS Location'}
                    </Text>
                  </View>
                </View>
              </View>

              {Boolean(submitError) && (
                <View style={styles.submitErrorBox} accessibilityRole="alert">
                  <AppIcon name="alert" size={16} color="#EF4444" style={{ marginRight: 8 }} />
                  <Text style={styles.submitErrorText}>{submitError}</Text>
                </View>
              )}

              <View style={{ height: 40 }} />
            </ScrollView>
          )}
        </View>

        {/* ── Error Box ── */}
        {Boolean(stepError) && (
          <View style={styles.stepErrorBox} accessibilityRole="alert">
            <AppIcon name="alert" size={14} color="#EF4444" style={{ marginRight: 6 }} />
            <Text style={styles.stepErrorText}>{stepError}</Text>
          </View>
        )}

        {/* ── Bottom Navigation Bar ── */}
        <View style={styles.bottomNav}>
          {step < TOTAL_STEPS ? (
            <TouchableOpacity
              style={styles.nextBtn}
              onPress={handleNext}
              accessibilityRole="button"
              accessibilityLabel={t('common.next', 'Continue')}
            >
              <Text style={styles.nextBtnText}>{t('common.next', 'Continue')} →</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
              onPress={handleSubmitRequest}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityLabel="Submit pickup request"
            >
              {isSubmitting ? (
                <View style={styles.btnRow}>
                  <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.submitBtnText}>Submitting Item...</Text>
                </View>
              ) : (
                <Text style={styles.submitBtnText}>Submit Pickup Request ✓</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </EcoSetuBackground>
  );
};

// ─── Reusable Form Field ──────────────────────────────────────────────────────

const FormField: React.FC<{
  label: string;
  value: string;
  onChange: (t: string) => void;
  placeholder: string;
  keyboard?: any;
}> = ({ label, value, onChange, placeholder, keyboard }) => (
  <View style={{ marginBottom: 12 }}>
    <Text style={styles.fieldLabel} accessibilityRole="header">
      {label}
    </Text>
    <TextInput
      style={styles.inputField}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor="rgba(255,255,255,0.30)"
      keyboardType={keyboard || 'default'}
      autoCapitalize="words"
      accessibilityLabel={label}
    />
  </View>
);

// ─── Stylesheet ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerBack: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  headerBackText: { fontSize: 22, color: '#FFFFFF', fontWeight: '700' },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  headerSpacer: { width: 48 },
  stepLabelRow: { paddingHorizontal: 20, marginBottom: 8 },
  stepLabelText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.50)',
    letterSpacing: 0.3,
  },
  content: { flex: 1 },
  stepScroll: { flex: 1, paddingHorizontal: 20, paddingTop: 10 },
  stepQuestion: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  stepHint: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.60)',
    marginBottom: 16,
    lineHeight: 19,
  },

  // ── Photo Box ──
  photoBox: {
    width: '100%',
    height: SCREEN_W * 0.6,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.15)',
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  photoPreview: { width: '100%', height: '100%' },
  photoChangeOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingVertical: 10,
    alignItems: 'center',
  },
  photoChangeText: { fontSize: 13, color: '#FFFFFF', fontWeight: '700' },
  photoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  camIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(16,185,129,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  photoPlaceholderLabel: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  photoPlaceholderSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.50)',
    textAlign: 'center',
    maxWidth: 240,
  },

  // ── AI Cards ──
  aiAnalyzingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.30)',
    padding: 14,
    marginBottom: 16,
  },
  aiAnalyzingText: { fontSize: 13.5, fontWeight: '700', color: '#34D399', marginBottom: 2 },
  aiAnalyzingSubText: { fontSize: 11.5, color: 'rgba(255,255,255,0.60)' },

  aiResultCard: {
    backgroundColor: 'rgba(15,23,42,0.85)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(52,211,153,0.35)',
    padding: 16,
    marginBottom: 16,
  },
  aiCardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  aiTitleRow: { flexDirection: 'row', alignItems: 'center' },
  aiCardTitle: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  confidenceBadge: {
    backgroundColor: 'rgba(16,185,129,0.20)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  confidenceText: { fontSize: 11, fontWeight: '800', color: '#34D399' },
  detectedMaterialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
  },
  detectedEmoji: { fontSize: 32, marginRight: 12 },
  detectedName: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', marginBottom: 2 },
  detectedPrompt: { fontSize: 12, color: 'rgba(255,255,255,0.50)' },
  aiNoDetText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.70)',
    lineHeight: 18,
    marginBottom: 14,
  },

  // ── AI Actions ──
  aiActionRow: { gap: 10 },
  confirmAiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 12,
    minHeight: 48,
  },
  confirmAiBtnText: { fontSize: 13.5, fontWeight: '800', color: '#02080D' },
  aiSecondaryActions: { flexDirection: 'row', gap: 8 },
  chooseManualBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  chooseManualText: { fontSize: 12, fontWeight: '700', color: '#CBD5E1' },
  chooseManualBtnPrimary: {
    flex: 1,
    backgroundColor: '#10B981',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  chooseManualBtnPrimaryText: { fontSize: 12, fontWeight: '800', color: '#02080D' },
  retakeBtn: {
    paddingHorizontal: 14,
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.30)',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  retakeText: { fontSize: 12, fontWeight: '700', color: '#F87171' },

  // ── Manual Taxonomy ──
  manualTaxonomySection: { marginTop: 16 },
  manualTaxonomyTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
  manualTaxonomySub: { fontSize: 12, color: 'rgba(255,255,255,0.50)', marginBottom: 12 },
  taxonomyGrid: { gap: 8 },
  taxCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: 12,
    minHeight: 48,
  },
  taxCardActive: {
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderColor: '#10B981',
  },
  taxIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  taxLabel: { fontSize: 13.5, fontWeight: '700', color: '#FFFFFF', marginBottom: 2 },
  taxLabelActive: { color: '#34D399' },
  taxDesc: { fontSize: 11, color: 'rgba(255,255,255,0.45)' },
  taxSelectedDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    marginLeft: 8,
  },

  // ── Confirmed Category Badge (Step 2) ──
  confirmedCatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.35)',
    padding: 12,
    marginBottom: 16,
  },
  confirmedCatLeft: { flexDirection: 'row', alignItems: 'center' },
  confirmedCatEmoji: { fontSize: 26, marginRight: 10 },
  confirmedCatLabel: { fontSize: 10, fontWeight: '700', color: '#34D399', textTransform: 'uppercase' },
  confirmedCatValue: { fontSize: 14, fontWeight: '800', color: '#FFFFFF' },
  confirmedCatChangeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  confirmedCatChangeText: { fontSize: 11, fontWeight: '700', color: '#CBD5E1' },

  // ── Condition List ──
  conditionList: { gap: 8, marginBottom: 16 },
  condRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    minHeight: 48,
  },
  condRowLeft: { flex: 1 },
  condRowTitle: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', marginBottom: 2 },
  condRowSub: { fontSize: 11, color: 'rgba(255,255,255,0.50)' },
  condRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.30)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  condRadioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' },

  // ── Inputs ──
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 6,
  },
  inputField: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 14,
    minHeight: 48,
  },
  textArea: { minHeight: 80, paddingTop: 10 },

  // ── Weight Chips ──
  weightChipsRow: { flexDirection: 'row', gap: 8, marginTop: 8, marginBottom: 16 },
  weightChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weightChipActive: {
    backgroundColor: 'rgba(16,185,129,0.20)',
    borderColor: '#10B981',
  },
  weightChipText: { fontSize: 12, fontWeight: '600', color: '#CBD5E1' },
  weightChipTextActive: { color: '#34D399', fontWeight: '800' },

  // ── Quantity Stepper ──
  quantityRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  qtyBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(16,185,129,0.20)',
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: { fontSize: 20, color: '#34D399', fontWeight: '800' },
  qtyValue: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', minWidth: 32, textAlign: 'center' },

  // ── Location Map ──
  mapCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    marginBottom: 12,
  },
  mapEmbed: { height: 180 },
  mapHelpBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,0.90)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  mapHelpText: { fontSize: 11, color: '#94A3B8' },
  locateBtn: {
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.30)',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    minHeight: 48,
  },
  locateBtnDisabled: { opacity: 0.6 },
  locateBtnText: { fontSize: 13, fontWeight: '700', color: '#34D399' },
  resolvingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  resolvingText: { fontSize: 11.5, color: '#34D399' },
  locationErrorText: { fontSize: 12, color: '#F87171', marginBottom: 10 },
  addrTypeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  addrTypePill: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  addrTypePillActive: {
    backgroundColor: 'rgba(16,185,129,0.18)',
    borderColor: '#10B981',
  },
  addrTypePillText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.60)' },
  addrTypePillTextActive: { color: '#34D399', fontWeight: '800' },

  // ── Review Card ──
  reviewCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
    marginBottom: 16,
  },
  reviewPhoto: { width: '100%', height: 180 },
  reviewDetailsBlock: { padding: 16 },
  reviewHeaderRow: { flexDirection: 'row', alignItems: 'center' },
  reviewCatEmoji: { fontSize: 32, marginRight: 12 },
  reviewCategoryTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', marginBottom: 2 },
  reviewQtyCond: { fontSize: 12, color: 'rgba(255,255,255,0.60)' },
  reviewDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 12,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginVertical: 4,
  },
  reviewRowLabel: { fontSize: 12, color: 'rgba(255,255,255,0.50)', width: 130 },
  reviewRowVal: { flex: 1, fontSize: 12.5, color: '#E2E8F0', textAlign: 'right' },
  submitErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.30)',
    marginBottom: 16,
  },
  submitErrorText: { flex: 1, fontSize: 12, color: '#F87171' },

  // ── Bottom Nav ──
  stepErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: 'rgba(239,68,68,0.12)',
  },
  stepErrorText: { flex: 1, fontSize: 12, color: '#F87171', fontWeight: '600' },
  bottomNav: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 14,
    backgroundColor: 'rgba(7,30,34,0.98)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.10)',
  },
  nextBtn: {
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  nextBtnText: { fontSize: 15, fontWeight: '800', color: '#02080D' },
  submitBtn: {
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 15, fontWeight: '800', color: '#02080D' },
  btnRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
});

export default SubmitItemScreen;
