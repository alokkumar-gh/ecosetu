import React, { useState, useEffect, useRef } from 'react';
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
  Image,
  Modal,
  Alert,
} from 'react-native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CitizenTabParamList } from '../../navigation/types';
import { useNetwork } from '../../hooks/useNetwork';
import { useI18n } from '../../i18n';
import { TopAppBar } from '../../components/layout/TopAppBar';
import { EcoSetuBackground, EcoGlassInput, EcoGlassTextArea } from '../../components/eco';
import { GlassCard } from '../../components/glass/GlassCard';
import { GlassButton } from '../../components/glass/GlassButton';
import { GlassBadge } from '../../components/glass/GlassBadge';
import { ReadAloudButton } from '../../components/voice/ReadAloudButton';
import { ewasteService } from '../../services/ewasteService';
import { requestService } from '../../services/requestService';
import { capturePhoto } from '../../services/cameraService';
import { reverseGeocode, getCurrentLocation, ResolvedAddress } from '../../services/locationService';
import { EWASTE_CATEGORIES, ITEM_CONDITIONS, ADDRESS_TYPES } from '../../utils/constants';
import { EcoSetuMap } from '../../components/map/EcoSetuMap';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface Props {
  navigation: BottomTabNavigationProp<CitizenTabParamList, 'CitizenSubmit'>;
}

export interface EwasteItemDraft {
  id: string;
  category: string;
  condition: string;
  quantity: number;
  estimatedWeightKg?: string;
  description?: string;
  imageUri?: string;
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
  const { t } = useI18n();

  // Multi-item state
  const [items, setItems] = useState<EwasteItemDraft[]>([]);
  const [isItemModalVisible, setIsItemModalVisible] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // Item Draft Form States
  const [modalCategory, setModalCategory] = useState<string | null>(null);
  const [modalCondition, setModalCondition] = useState<string>(ITEM_CONDITIONS.UNKNOWN);
  const selectedCategory = modalCategory;
  const selectedCondition = modalCondition;
  const [modalQuantity, setModalQuantity] = useState<number>(1);
  const [modalWeight, setModalWeight] = useState<string>('');
  const [modalDescription, setModalDescription] = useState<string>('');
  const [modalImageUri, setModalImageUri] = useState<string | undefined>(undefined);
  const [modalItemError, setModalItemError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  // Pickup Location & Map states (Zero hardcoded Delhi coordinates)
  const [pickupLat, setPickupLat] = useState<number>(0);
  const [pickupLng, setPickupLng] = useState<number>(0);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isResolvingAddress, setIsResolvingAddress] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLocationConfirmed, setIsLocationConfirmed] = useState<boolean>(false);
  const [showFullMapModal, setShowFullMapModal] = useState<boolean>(false);

  // Structured Address fields
  const [addressType, setAddressType] = useState<string>(ADDRESS_TYPES.HOME);
  const [houseNumber, setHouseNumber] = useState<string>('');
  const [street, setStreet] = useState<string>('');
  const [landmark, setLandmark] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [district, setDistrict] = useState<string>('');
  const [state, setState] = useState<string>('');
  const [pincode, setPincode] = useState<string>('');

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ message: string; isOffline: boolean } | null>(null);

  const geocodeTimerRef = useRef<NodeJS.Timeout | null>(null);

  const getCategoryLabel = (key: string): string => {
    switch (key) {
      case EWASTE_CATEGORIES.MOBILE_PHONE: return t('ewaste.mobilePhone') || 'Mobile Phone';
      case EWASTE_CATEGORIES.LAPTOP: return t('ewaste.laptop') || 'Laptop';
      case EWASTE_CATEGORIES.DESKTOP: return t('ewaste.desktop') || 'Desktop';
      case EWASTE_CATEGORIES.TABLET: return t('ewaste.tablet') || 'Tablet';
      case EWASTE_CATEGORIES.MONITOR: return t('ewaste.monitor') || 'Monitor';
      case EWASTE_CATEGORIES.PRINTER: return t('ewaste.printer') || 'Printer / Scanner';
      case EWASTE_CATEGORIES.KEYBOARD_MOUSE: return t('ewaste.keyboardMouse') || 'Keyboard / Mouse';
      case EWASTE_CATEGORIES.CABLE_CHARGER: return t('ewaste.cableCharger') || 'Cable / Charger';
      case EWASTE_CATEGORIES.BATTERY: return t('ewaste.battery') || 'Battery';
      case EWASTE_CATEGORIES.CIRCUIT_BOARD: return t('ewaste.circuitBoard') || 'Circuit Board';
      case EWASTE_CATEGORIES.OTHER: return t('ewaste.other') || 'Other E-Waste';
      default: return key;
    }
  };

  const getConditionLabel = (key: string): string => {
    switch (key) {
      case ITEM_CONDITIONS.WORKING: return t('citizen.conditions.working') || 'Working';
      case ITEM_CONDITIONS.NOT_WORKING: return t('citizen.conditions.notWorking') || 'Not Working';
      case ITEM_CONDITIONS.DAMAGED: return t('citizen.conditions.damaged') || 'Damaged';
      case ITEM_CONDITIONS.UNKNOWN: return t('citizen.conditions.unknown') || 'Unknown';
      default: return key;
    }
  };

  // Perform reverse geocoding to auto-populate address fields
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
        if (resolved.state) setState(resolved.state);
        if (resolved.pincode) setPincode(resolved.pincode);
        setIsLocationConfirmed(true);
      }
    } catch (err) {
      console.warn('[SubmitItemScreen] reverseGeocode error:', err);
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
        setLocationError(t('citizen.submit.locPermissionDenied') || 'Location permission was denied.');
      } else {
        setLocationError(result.message || (t('citizen.submit.locUnavailable') || 'Location unavailable. Please drag the pin manually.'));
      }
    } catch (err: any) {
      console.warn('[SubmitItemScreen] Location fetch error:', err);
      setLocationError(t('citizen.submit.locUnavailable') || 'Location unavailable. Please drag the pin manually.');
    } finally {
      setIsLocating(false);
    }
  };

  // Initial location fetch
  useEffect(() => {
    handleUseCurrentLocation();
  }, []);

  const handleMarkerDrag = (newLat: number, newLng: number) => {
    setPickupLat(newLat);
    setPickupLng(newLng);

    // Debounce reverse geocoding on drag
    if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);
    geocodeTimerRef.current = setTimeout(() => {
      triggerReverseGeocoding(newLat, newLng);
    }, 800);
  };

  // Item Modal Handlers
  const handleOpenAddItem = () => {
    setEditingItemId(null);
    setModalCategory(null);
    setModalCondition(ITEM_CONDITIONS.UNKNOWN);
    setModalQuantity(1);
    setModalWeight('');
    setModalDescription('');
    setModalImageUri(undefined);
    setModalItemError(null);
    setIsItemModalVisible(true);
  };

  const handleOpenEditItem = (item: EwasteItemDraft) => {
    setEditingItemId(item.id);
    setModalCategory(item.category);
    setModalCondition(item.condition);
    setModalQuantity(item.quantity);
    setModalWeight(item.estimatedWeightKg || '');
    setModalDescription(item.description || '');
    setModalImageUri(item.imageUri);
    setModalItemError(null);
    setIsItemModalVisible(true);
  };

  const handleRemoveItem = (itemId: string) => {
    setItems((prev) => prev.filter((it) => it.id !== itemId));
  };

  // Direct camera capture
  const handleCapturePhoto = async () => {
    setIsCameraActive(true);
    try {
      const captureResult = await capturePhoto();
      if (captureResult.success && captureResult.uri) {
        setModalImageUri(captureResult.uri);
      } else if (captureResult.error === 'CAMERA_PERMISSION_DENIED') {
        Alert.alert(
          t('common.error') || 'Permission Error',
          t('citizen.submit.cameraPermissionDenied') || 'Camera permission is required to capture photos.'
        );
      }
    } catch (err: any) {
      console.warn('[SubmitItemScreen] Camera error:', err);
    } finally {
      setIsCameraActive(false);
    }
  };

  const handleSaveItemModal = () => {
    if (!modalCategory) {
      setModalItemError(t('citizen.submit.valSelectCategory') || 'Please select an e-waste category.');
      return;
    }

    if (!Number.isInteger(modalQuantity) || modalQuantity < 1 || modalQuantity > 100) {
      setModalItemError(t('citizen.submit.valQuantity') || 'Quantity must be between 1 and 100.');
      return;
    }

    if (modalWeight.trim()) {
      const weightNum = parseFloat(modalWeight.trim());
      if (isNaN(weightNum) || weightNum <= 0 || weightNum > 500) {
        setModalItemError(t('citizen.submit.valWeight') || 'Estimated weight must be between 0.01 and 500 kg.');
        return;
      }
    }

    const itemDraft: EwasteItemDraft = {
      id: editingItemId || `draft_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      category: modalCategory,
      condition: modalCondition,
      quantity: modalQuantity,
      estimatedWeightKg: modalWeight.trim() || undefined,
      description: modalDescription.trim() || undefined,
      imageUri: modalImageUri,
    };

    if (editingItemId) {
      setItems((prev) => prev.map((it) => (it.id === editingItemId ? itemDraft : it)));
    } else {
      setItems((prev) => [...prev, itemDraft]);
    }

    setIsItemModalVisible(false);
  };

  // Totals
  const totalItemCount = items.reduce((sum, it) => sum + it.quantity, 0);
  const totalEstWeightKg = items.reduce((sum, it) => sum + (parseFloat(it.estimatedWeightKg || '0') || 0), 0);

  // Overall Submission Flow
  const handleSubmitRequest = async () => {
    if (isSubmitting) return;

    setErrorMessage(null);
    setSuccessInfo(null);

    // 1. Must have at least one item
    if (items.length === 0) {
      setErrorMessage(t('citizen.submit.noItemsInRequest') || 'Please add at least one e-waste item before submitting.');
      return;
    }

    // 2. Validate PIN code if provided
    if (pincode.trim() && !/^[1-9][0-9]{5}$/.test(pincode.trim())) {
      setErrorMessage(t('citizen.submit.valPincode') || 'PIN Code must be a valid 6-digit postal code.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Step A: Create each EwasteItem
      const createdItemIds: string[] = [];

      for (const it of items) {
        const itemPayload: any = {
          category: it.category,
          condition: it.condition,
          quantity: it.quantity,
        };
        if (it.description) itemPayload.description = it.description;
        if (it.estimatedWeightKg) itemPayload.estimatedWeightKg = parseFloat(it.estimatedWeightKg);
        if (it.imageUri) itemPayload.imageUrl = it.imageUri;

        const createdItem = await ewasteService.createItem(itemPayload);
        if ((createdItem as any)?.id) {
          createdItemIds.push((createdItem as any).id);
        }
      }

      // Step B: Create CollectionRequest with all itemIds and structured address
      const formattedAddress = [
        houseNumber.trim(),
        street.trim(),
        landmark.trim(),
        city.trim(),
        district.trim(),
        state.trim(),
        pincode.trim(),
      ].filter(Boolean).join(', ') || 'Doorstep Pickup Location';

      const requestPayload: any = {
        itemIds: createdItemIds,
        pickupAddress: formattedAddress,
        pickupLat: typeof pickupLat === 'number' && pickupLat !== 0 ? pickupLat : 19.3149,
        pickupLng: typeof pickupLng === 'number' && pickupLng !== 0 ? pickupLng : 84.7941,
        addressType,
      };

      if (houseNumber.trim()) requestPayload.houseNumber = houseNumber.trim();
      if (street.trim()) requestPayload.street = street.trim();
      if (landmark.trim()) requestPayload.landmark = landmark.trim();
      if (city.trim()) requestPayload.city = city.trim();
      if (district.trim()) requestPayload.district = district.trim();
      if (state.trim()) requestPayload.state = state.trim();
      if (pincode.trim()) requestPayload.pincode = pincode.trim();
      if (locationAccuracy !== null && locationAccuracy !== undefined) {
        requestPayload.locationAccuracy = locationAccuracy;
      }

      const createdRequest: any = await requestService.createRequest(requestPayload);

      // Step C: Move request from DRAFT to SUBMITTED so collectors can see it!
      if (createdRequest?.id && isConnected) {
        try {
          await requestService.submitRequest(createdRequest.id);
        } catch (submitErr) {
          console.warn('[SubmitItemScreen] submitRequest transition warning:', submitErr);
        }
      }

      // Reset form
      setItems([]);
      setHouseNumber('');
      setStreet('');
      setLandmark('');
      setCity('');
      setDistrict('');
      setState('');
      setPincode('');

      setSuccessInfo({
        message:
          t('citizen.submit.submitSuccess') ||
          'Collection request created and submitted successfully! Local collectors can now view and accept your pickup.',
        isOffline: !isConnected,
      });
    } catch (err: any) {
      console.error('[SubmitItemScreen] Request creation error:', err);
      setErrorMessage(err?.message || (t('citizen.submit.submitError') || 'Unable to submit pickup request. Please retry.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <EcoSetuBackground>
      <TopAppBar
        title={t('citizen.submit.title') || 'Submit E-Waste'}
        subtitle={t('citizen.submit.subtitle') || 'Doorstep e-waste pickup registration'}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Success Banner */}
          {successInfo && (
            <GlassCard style={styles.successCard}>
              <Text style={styles.successIcon}>✓</Text>
              <Text style={styles.successTitle}>{t('common.success') || 'Success'}</Text>
              <Text style={styles.successMessage}>{successInfo.message}</Text>
              <GlassButton
                label={t('citizen.submit.goToDashboard') || 'Go to Dashboard'}
                variant="primary"
                onPress={() => navigation.navigate('CitizenHome')}
                style={styles.actionBtn}
              />
            </GlassCard>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <GlassCard style={styles.errorCard}>
              <Text style={styles.errorIcon}>⚠</Text>
              <Text style={styles.errorTitle}>{t('common.error') || 'Error'}</Text>
              <Text style={styles.errorMessage}>{errorMessage}</Text>
            </GlassCard>
          )}

          {/* Section 1: E-Waste Item List */}
          <GlassCard style={styles.sectionCard}>
            <View style={[styles.sectionHeaderRow, { justifyContent: 'space-between', alignItems: 'center' }]}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.sectionTitle}>
                  📦 {t('citizen.submit.itemList') || 'E-Waste Items in this Request'}
                </Text>
                <Text style={styles.sectionSubtitle}>
                  {items.length > 0
                    ? `${t('citizen.submit.totalItems') || 'Total Items'}: ${totalItemCount}${
                        totalEstWeightKg > 0 ? ` • ${totalEstWeightKg.toFixed(1)} kg` : ''
                      }`
                    : t('citizen.submit.noItemsInRequest') || 'No items added yet. Please add at least one item.'}
                </Text>
              </View>
              <ReadAloudButton
                text={`${t('citizen.submit.title') || 'Register E-Waste Item'}. ${items.length > 0 ? `${items.length} items added.` : 'No items added yet.'}`}
                size="small"
              />
            </View>

            {items.map((item, index) => (
              <View key={item.id} style={styles.itemRowCard}>
                {item.imageUri ? (
                  <Image source={{ uri: item.imageUri }} style={styles.itemThumbnail} />
                ) : (
                  <View style={styles.itemThumbnailPlaceholder}>
                    <Text style={styles.itemPlaceholderIcon}>
                      {CATEGORY_OPTIONS.find((c) => c.key === item.category)?.icon || '📦'}
                    </Text>
                  </View>
                )}

                <View style={styles.itemDetailsCol}>
                  <Text style={styles.itemCategoryTitle}>
                    {getCategoryLabel(item.category)}
                  </Text>
                  <View style={styles.itemBadgeRow}>
                    <GlassBadge
                      label={`Qty: ${item.quantity}`}
                      tone="info"
                    />
                    <GlassBadge
                      label={getConditionLabel(item.condition)}
                      tone="neutral"
                    />
                    {Boolean(item.estimatedWeightKg) && (
                      <GlassBadge
                        label={`${item.estimatedWeightKg} kg`}
                        tone="neutral"
                      />
                    )}
                  </View>
                  {Boolean(item.description) && (
                    <Text style={styles.itemDescText} numberOfLines={1}>
                      {item.description}
                    </Text>
                  )}
                </View>

                <View style={styles.itemActionsCol}>
                  <TouchableOpacity
                    onPress={() => handleOpenEditItem(item)}
                    style={styles.itemEditBtn}
                  >
                    <Text style={styles.itemEditBtnText}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleRemoveItem(item.id)}
                    style={styles.itemDeleteBtn}
                  >
                    <Text style={styles.itemDeleteBtnText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <GlassButton
              label={t('citizen.submit.addItem') || '+ Add E-Waste Item'}
              variant="outline"
              onPress={handleOpenAddItem}
              style={styles.addItemBtn}
            />
          </GlassCard>

          {/* Section 2: Pickup Location & Map */}
          <GlassCard style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>
                  🗺️ {t('citizen.submit.pickupLocation') || 'Pickup Location'}
                </Text>
                <Text style={styles.sectionSubtitle}>
                  Choose exactly where your e-waste should be collected.
                </Text>
              </View>
            </View>

            {locationError && (
              <Text style={styles.locationErrorText}>{locationError}</Text>
            )}

            {/* Interactive EcoSetuMap embedded */}
            <View style={styles.mapContainer}>
              <EcoSetuMap
                latitude={pickupLat !== 0 ? pickupLat : 19.3149}
                longitude={pickupLng !== 0 ? pickupLng : 84.7941}
                draggable={true}
                allowLocationSelection={true}
                allowTapSelection={true}
                allowLongPressSelection={true}
                accuracy={locationAccuracy}
                showAccuracyCircle={true}
                showMapTypeControl={true}
                showZoomControls={true}
                showMyLocationButton={true}
                showRecenterButton={true}
                showSearch={true}
                onLocationChange={handleMarkerDrag}
                onLocationSelectWithAccuracy={(lat, lng, acc) => {
                  setPickupLat(lat);
                  setPickupLng(lng);
                  if (acc) setLocationAccuracy(acc);
                  triggerReverseGeocoding(lat, lng);
                }}
                pinTitle="Pickup Doorstep"
                pinDescription="Drag to refine doorstep location"
                style={styles.map}
              />
            </View>

            {/* Selected Location Summary Glass Card */}
            <View style={styles.selectedAddressPreviewCard}>
              <View style={styles.selectedAddressTopRow}>
                <Text style={styles.selectedAddressPinIcon}>📍</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.selectedAddressTitle}>Selected Pickup Location</Text>
                  <Text style={styles.selectedAddressFormatted}>
                    {isResolvingAddress
                      ? t('location.updatingAddress') || 'Resolving address from live location...'
                      : [houseNumber, street, landmark, city, state, pincode].filter(Boolean).join(', ') ||
                        (pickupLat !== 0 ? `Coordinates: ${pickupLat.toFixed(4)}, ${pickupLng.toFixed(4)}` : 'No location selected')}
                  </Text>
                  {locationAccuracy !== null && locationAccuracy !== undefined ? (
                    <Text style={styles.selectedAddressAccuracy}>
                      🎯 {t('location.locationAccuracy') || 'Accuracy'}: Approx. ±{Math.round(locationAccuracy)} m
                    </Text>
                  ) : null}
                </View>
              </View>

              {/* Action Buttons Row */}
              <View style={styles.mapActionRow}>
                <TouchableOpacity
                  style={styles.mapSecondaryActionBtn}
                  onPress={handleUseCurrentLocation}
                  disabled={isLocating}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={t('location.useMyLocation') || 'Use My Location'}
                >
                  {isLocating ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Text style={styles.mapSecondaryActionText}>
                      🎯 {t('location.useMyLocation') || 'Use My Location'}
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.mapSecondaryActionBtn}
                  onPress={() => setShowFullMapModal(true)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={t('location.chooseOnMap') || 'Full Screen Map'}
                >
                  <Text style={styles.mapSecondaryActionText}>
                    ⛶ {t('location.chooseOnMap') || 'Full Screen Map'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Confirm Location Button */}
              <TouchableOpacity
                style={[
                  styles.confirmLocationBtn,
                  isLocationConfirmed && styles.confirmLocationBtnActive,
                ]}
                onPress={() => {
                  setIsLocationConfirmed(true);
                  triggerReverseGeocoding(pickupLat, pickupLng);
                }}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={t('location.confirmPickupLocation') || 'Confirm Pickup Location'}
              >
                <Text style={styles.confirmLocationBtnText}>
                  {isLocationConfirmed
                    ? `✓ ${t('location.confirmPickupLocation') || 'Pickup Location Confirmed'}`
                    : `📍 ${t('location.confirmPickupLocation') || 'Confirm Pickup Location'}`}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Address Form Fields Auto-Resolved */}
            <View style={styles.addressFieldsGrid}>
              <View style={styles.fieldRow}>
                <View style={styles.fieldHalf}>
                  <EcoGlassInput
                    label={t('citizen.submit.houseNumber') || 'Building / House'}
                    value={houseNumber}
                    onChangeText={setHouseNumber}
                    placeholder="e.g. Flat 4B / Plot 12"
                  />
                </View>
                <View style={styles.fieldHalf}>
                  <EcoGlassInput
                    label={t('citizen.submit.street') || 'Street / Road'}
                    value={street}
                    onChangeText={setStreet}
                    placeholder="e.g. College Road"
                  />
                </View>
              </View>

              <View style={styles.fieldRow}>
                <View style={styles.fieldHalf}>
                  <EcoGlassInput
                    label={t('citizen.submit.landmark') || 'Landmark'}
                    value={landmark}
                    onChangeText={setLandmark}
                    placeholder="Near City Hospital"
                  />
                </View>
                <View style={styles.fieldHalf}>
                  <EcoGlassInput
                    label={t('citizen.submit.city') || 'City / Town'}
                    value={city}
                    onChangeText={setCity}
                    placeholder="e.g. Berhampur"
                  />
                </View>
              </View>

              <View style={styles.fieldRow}>
                <View style={styles.fieldHalf}>
                  <EcoGlassInput
                    label={t('citizen.submit.district') || 'District'}
                    value={district}
                    onChangeText={setDistrict}
                    placeholder="e.g. Ganjam"
                  />
                </View>
                <View style={styles.fieldHalf}>
                  <EcoGlassInput
                    label={t('citizen.submit.pincode') || 'PIN Code'}
                    value={pincode}
                    onChangeText={setPincode}
                    placeholder="760001"
                    keyboardType="numeric"
                    maxLength={6}
                  />
                </View>
              </View>

              <View style={styles.fieldFull}>
                <EcoGlassInput
                  label={t('citizen.submit.state') || 'State'}
                  value={state}
                  onChangeText={setState}
                  placeholder="e.g. Odisha"
                />
              </View>
            </View>
          </GlassCard>

          {/* Section 3: Review & Submit */}
          <GlassCard style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>
              📋 {t('citizen.submit.reviewRequest') || 'Review Pickup Request'}
            </Text>
            <View style={styles.reviewSummaryBox}>
              <Text style={styles.reviewSummaryText}>
                • Items: <Text style={styles.bold}>{items.length} categories ({totalItemCount} total items)</Text>
              </Text>
              <Text style={styles.reviewSummaryText}>
                • Address:{' '}
                <Text style={styles.bold}>
                  {[houseNumber, street, city, pincode].filter(Boolean).join(', ') || 'Doorstep Pickup Location'}
                </Text>
              </Text>
              <Text style={styles.reviewSummaryText}>
                • Privacy: Full address is hidden from collectors until accepted.
              </Text>
            </View>

            <GlassButton
              label={
                isSubmitting
                  ? t('citizen.submit.submitting') || 'Submitting...'
                  : t('citizen.submit.confirmSubmitRequest') || 'Confirm & Submit Pickup Request'
              }
              variant="primary"
              onPress={handleSubmitRequest}
              disabled={isSubmitting || items.length === 0}
              loading={isSubmitting}
              style={styles.submitBtn}
            />
          </GlassCard>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Modal: Add / Edit Item ────────────────────────────────────────── */}
      <Modal
        visible={isItemModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsItemModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingItemId
                  ? t('citizen.submit.editItem') || 'Edit E-Waste Item'
                  : t('citizen.submit.addItem') || 'Add E-Waste Item'}
              </Text>
              <TouchableOpacity
                onPress={() => setIsItemModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              {modalItemError && (
                <Text style={styles.modalErrorText}>{modalItemError}</Text>
              )}

              {/* Category Selection */}
              <Text style={styles.inputLabel}>{t('citizen.submit.selectCategory') || 'Select Category'} *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                {CATEGORY_OPTIONS.map((cat) => {
                  const isSelected = modalCategory === cat.key;
                  return (
                    <TouchableOpacity
                      key={cat.key}
                      style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
                      onPress={() => setModalCategory(cat.key)}
                    >
                      <Text style={styles.categoryChipIcon}>{cat.icon}</Text>
                      <Text style={[styles.categoryChipLabel, isSelected && styles.categoryChipLabelSelected]}>
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Condition Selection */}
              <Text style={styles.inputLabel}>{t('citizen.submit.deviceCondition') || 'Condition'} *</Text>
              <View style={styles.conditionRow}>
                {CONDITION_OPTIONS.map((cond) => {
                  const isSelected = modalCondition === cond.key;
                  return (
                    <TouchableOpacity
                      key={cond.key}
                      style={[styles.conditionChip, isSelected && styles.conditionChipSelected]}
                      onPress={() => setModalCondition(cond.key)}
                    >
                      <Text style={[styles.conditionChipLabel, isSelected && styles.conditionChipLabelSelected]}>
                        {cond.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Quantity Stepper */}
              <Text style={styles.inputLabel}>{t('citizen.submit.quantity') || 'Quantity'} *</Text>
              <View style={styles.stepperContainer}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => setModalQuantity(Math.max(1, modalQuantity - 1))}
                >
                  <Text style={styles.stepperBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.stepperValue}>{modalQuantity}</Text>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => setModalQuantity(Math.min(100, modalQuantity + 1))}
                >
                  <Text style={styles.stepperBtnText}>+</Text>
                </TouchableOpacity>
              </View>

              {/* Estimated Weight & Description */}
              <EcoGlassInput
                label={t('citizen.submit.estimatedWeight') || 'Estimated Weight (kg)'}
                value={modalWeight}
                onChangeText={setModalWeight}
                placeholder="e.g. 0.5"
                keyboardType="numeric"
              />

              <EcoGlassTextArea
                label={t('citizen.submit.description') || 'Notes / Model Description'}
                value={modalDescription}
                onChangeText={setModalDescription}
                placeholder="Brand, model, visible condition..."
                maxLength={500}
              />

              {/* Android Camera Photo Capture */}
              <Text style={styles.inputLabel}>📸 {t('citizen.submit.takePhoto') || 'Item Photo'}</Text>
              {modalImageUri ? (
                <View style={styles.photoPreviewBox}>
                  <Image source={{ uri: modalImageUri }} style={styles.photoPreviewImage} />
                  <View style={styles.photoActionsRow}>
                    <TouchableOpacity
                      style={styles.photoActionBtn}
                      onPress={handleCapturePhoto}
                      disabled={isCameraActive}
                    >
                      <Text style={styles.photoActionBtnText}>
                        📷 {t('citizen.submit.retakePhoto') || 'Retake'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.photoActionBtn, styles.photoRemoveBtn]}
                      onPress={() => setModalImageUri(undefined)}
                    >
                      <Text style={[styles.photoActionBtnText, styles.photoRemoveBtnText]}>
                        🗑️ {t('citizen.submit.removePhoto') || 'Remove'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.cameraCaptureBtn}
                  onPress={handleCapturePhoto}
                  disabled={isCameraActive}
                >
                  {isCameraActive ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <>
                      <Text style={styles.cameraCaptureIcon}>📷</Text>
                      <Text style={styles.cameraCaptureText}>
                        {t('citizen.submit.takePhoto') || 'Take Photo with Camera'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              <GlassButton
                label={editingItemId ? t('common.save') || 'Save Changes' : t('citizen.submit.addItem') || '+ Add to List'}
                variant="primary"
                onPress={handleSaveItemModal}
                style={styles.modalSaveBtn}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Full Screen Map Picker Modal ── */}
      <Modal
        visible={showFullMapModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowFullMapModal(false)}
      >
        <View style={styles.fullMapModalRoot}>
          {/* Header Bar */}
          <View style={styles.fullMapHeader}>
            <TouchableOpacity
              style={styles.fullMapBackBtn}
              onPress={() => setShowFullMapModal(false)}
              accessibilityRole="button"
              accessibilityLabel="Back to Request"
            >
              <Text style={styles.fullMapBackBtnText}>← {t('common.back') || 'Back'}</Text>
            </TouchableOpacity>
            <Text style={styles.fullMapHeaderTitle}>
              🗺️ {t('location.selectLocation') || 'Choose Pickup Location'}
            </Text>
            <View style={{ width: 60 }} />
          </View>

          {/* Full-Screen Map */}
          <EcoSetuMap
            latitude={pickupLat !== 0 ? pickupLat : 19.3149}
            longitude={pickupLng !== 0 ? pickupLng : 84.7941}
            draggable={true}
            allowLocationSelection={true}
            allowTapSelection={true}
            allowLongPressSelection={true}
            accuracy={locationAccuracy}
            showAccuracyCircle={true}
            showMapTypeControl={true}
            showZoomControls={true}
            showMyLocationButton={true}
            showRecenterButton={true}
            showSearch={true}
            onLocationChange={handleMarkerDrag}
            onLocationSelectWithAccuracy={(lat, lng, acc) => {
              setPickupLat(lat);
              setPickupLng(lng);
              if (acc) setLocationAccuracy(acc);
              triggerReverseGeocoding(lat, lng);
            }}
            pinTitle="Doorstep Pickup"
            pinDescription="Drag pin or tap map to adjust"
            style={styles.fullScreenMapElement}
          />

          {/* Bottom Confirmation Floating Glass Sheet */}
          <View style={styles.fullMapBottomFloatingCard}>
            <Text style={styles.fullMapBottomLabel}>
              📍 {t('citizen.submit.selectedLocation') || 'Selected Pickup Location'}
            </Text>
            <Text style={styles.fullMapBottomAddress} numberOfLines={2}>
              {isResolvingAddress
                ? t('location.updatingAddress') || 'Resolving address...'
                : [houseNumber, street, landmark, city, state, pincode].filter(Boolean).join(', ') ||
                  (pickupLat !== 0 ? `Coordinates: ${pickupLat.toFixed(5)}, ${pickupLng.toFixed(5)}` : 'Tap on map')}
            </Text>
            {locationAccuracy !== null && locationAccuracy !== undefined ? (
              <Text style={styles.fullMapBottomAccuracy}>
                🎯 {t('location.locationAccuracy') || 'Accuracy'}: Approx. ±{Math.round(locationAccuracy)} m
              </Text>
            ) : null}

            <View style={styles.fullMapBottomBtnRow}>
              <TouchableOpacity
                style={styles.fullMapRepositionBtn}
                onPress={handleUseCurrentLocation}
                disabled={isLocating}
              >
                <Text style={styles.fullMapRepositionText}>
                  🎯 {t('location.useMyLocation') || 'GPS'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.fullMapConfirmBtn}
                onPress={() => {
                  setIsLocationConfirmed(true);
                  triggerReverseGeocoding(pickupLat, pickupLng);
                  setShowFullMapModal(false);
                }}
              >
                <Text style={styles.fullMapConfirmText}>
                  ✓ {t('location.confirmPickupLocation') || 'Confirm Location'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </EcoSetuBackground>
  );
};

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.spaceMd,
    paddingBottom: 40,
  },
  sectionCard: {
    marginBottom: spacing.spaceMd,
    padding: spacing.spaceMd,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.spaceSm,
  },
  sectionTitle: {
    fontSize: typography.fontSizeBase,
    fontWeight: typography.fontWeightBold,
    color: colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: typography.fontSizeSm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  locateBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: spacing.radiusSm,
    backgroundColor: 'rgba(15, 41, 66, 0.08)',
  },
  locateBtnText: {
    fontSize: typography.fontSizeSm,
    fontWeight: typography.fontWeightSemiBold,
    color: colors.primary,
  },
  locationErrorText: {
    color: colors.error,
    fontSize: typography.fontSizeSm,
    marginBottom: spacing.spaceSm,
  },
  mapContainer: {
    height: 280,
    borderRadius: spacing.radiusMd,
    overflow: 'hidden',
    marginBottom: spacing.spaceSm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },

  // ── Selected Address Preview Card ──
  selectedAddressPreviewCard: {
    backgroundColor: 'rgba(6, 21, 27, 0.85)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    padding: spacing.spaceMd,
    marginBottom: spacing.spaceMd,
    gap: 10,
  },
  selectedAddressTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  selectedAddressPinIcon: {
    fontSize: 20,
    marginTop: 2,
  },
  selectedAddressTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#34D399',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  selectedAddressFormatted: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 2,
    lineHeight: 18,
  },
  selectedAddressAccuracy: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.65)',
    marginTop: 3,
  },
  mapActionRow: {
    flexDirection: 'row',
    gap: spacing.spaceSm,
  },
  mapSecondaryActionBtn: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  mapSecondaryActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  confirmLocationBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  confirmLocationBtnActive: {
    backgroundColor: '#059669',
  },
  confirmLocationBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },

  // ── Full-Screen Map Picker Modal ──
  fullMapModalRoot: {
    flex: 1,
    backgroundColor: '#051417',
    position: 'relative',
  },
  fullMapHeader: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 24 : 44,
    left: 14,
    right: 14,
    height: 50,
    backgroundColor: 'rgba(6, 21, 27, 0.90)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    zIndex: 25,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 6,
  },
  fullMapBackBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  fullMapBackBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#34D399',
  },
  fullMapHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  fullScreenMapElement: {
    ...StyleSheet.absoluteFillObject,
    height: '100%',
    width: '100%',
    marginVertical: 0,
    borderRadius: 0,
    borderWidth: 0,
  },
  fullMapBottomFloatingCard: {
    position: 'absolute',
    bottom: 24,
    left: 14,
    right: 14,
    backgroundColor: 'rgba(6, 21, 27, 0.94)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    padding: spacing.spaceMd,
    gap: 8,
    zIndex: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
  fullMapBottomLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#34D399',
    textTransform: 'uppercase',
  },
  fullMapBottomAddress: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 18,
  },
  fullMapBottomAccuracy: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.65)',
  },
  fullMapBottomBtnRow: {
    flexDirection: 'row',
    gap: spacing.spaceSm,
    marginTop: 4,
  },
  fullMapRepositionBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    minHeight: 48,
  },
  fullMapRepositionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  fullMapConfirmBtn: {
    flex: 1,
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  fullMapConfirmText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  addressFieldsGrid: {
    gap: spacing.spaceSm,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: spacing.spaceSm,
  },
  fieldHalf: {
    flex: 1,
  },
  fieldFull: {
    width: '100%',
  },
  inputLabel: {
    fontSize: typography.fontSizeSm,
    fontWeight: typography.fontWeightSemiBold,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  textInput: {
    height: 44,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: spacing.radiusSm,
    paddingHorizontal: spacing.spaceSm,
    fontSize: typography.fontSizeBase,
    color: colors.textPrimary,
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
    paddingVertical: 8,
  },
  itemRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glassFill,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: spacing.radiusMd,
    padding: spacing.spaceSm,
    marginVertical: 4,
  },
  itemThumbnail: {
    width: 48,
    height: 48,
    borderRadius: spacing.radiusSm,
  },
  itemThumbnailPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: spacing.radiusSm,
    backgroundColor: 'rgba(15, 41, 66, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemPlaceholderIcon: {
    fontSize: 24,
  },
  itemDetailsCol: {
    flex: 1,
    marginLeft: spacing.spaceSm,
  },
  itemCategoryTitle: {
    fontSize: typography.fontSizeBase,
    fontWeight: typography.fontWeightSemiBold,
    color: colors.textPrimary,
  },
  itemBadgeRow: {
    flexDirection: 'row',
    gap: 4,
    marginVertical: 2,
  },
  itemDescText: {
    fontSize: typography.fontSizeXs,
    color: colors.textSecondary,
  },
  itemActionsCol: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: spacing.spaceSm,
  },
  itemEditBtn: {
    padding: 6,
  },
  itemEditBtnText: {
    fontSize: 16,
  },
  itemDeleteBtn: {
    padding: 6,
  },
  itemDeleteBtnText: {
    fontSize: 16,
  },
  addItemBtn: {
    marginTop: spacing.spaceSm,
  },
  reviewSummaryBox: {
    backgroundColor: colors.glassFill,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: spacing.radiusMd,
    padding: spacing.spaceSm,
    marginVertical: spacing.spaceSm,
  },
  reviewSummaryText: {
    fontSize: typography.fontSizeSm,
    color: colors.textSecondary,
    marginVertical: 2,
  },
  bold: {
    fontWeight: typography.fontWeightBold,
    color: colors.textPrimary,
  },
  submitBtn: {
    marginTop: spacing.spaceSm,
  },
  successCard: {
    marginBottom: spacing.spaceMd,
    padding: spacing.spaceMd,
    backgroundColor: colors.successFill,
    borderColor: colors.success,
    alignItems: 'center',
  },
  successIcon: {
    fontSize: 32,
    color: colors.success,
    marginBottom: 4,
  },
  successTitle: {
    fontSize: typography.fontSizeLg,
    fontWeight: typography.fontWeightBold,
    color: colors.success,
  },
  successMessage: {
    fontSize: typography.fontSizeSm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginVertical: 8,
  },
  actionBtn: {
    marginTop: 8,
    width: '100%',
  },
  errorCard: {
    marginBottom: spacing.spaceMd,
    padding: spacing.spaceMd,
    backgroundColor: colors.errorFill,
    borderColor: colors.error,
  },
  errorIcon: {
    fontSize: 24,
    color: colors.error,
    marginBottom: 4,
  },
  errorTitle: {
    fontSize: typography.fontSizeBase,
    fontWeight: typography.fontWeightBold,
    color: colors.error,
  },
  errorMessage: {
    fontSize: typography.fontSizeSm,
    color: colors.error,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 8, 13, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#071A21',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.35)',
    maxHeight: '90%',
    padding: spacing.spaceLg,
    elevation: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.spaceMd,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalCloseBtn: {
    padding: 6,
    minHeight: 36,
    minWidth: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 20,
    color: '#CBD5E1',
  },
  modalScroll: {
    paddingBottom: 24,
  },
  modalErrorText: {
    color: '#FCA5A5',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.40)',
    padding: 8,
    borderRadius: 8,
    fontSize: typography.fontSizeSm,
    marginBottom: spacing.spaceSm,
  },
  categoryScroll: {
    marginVertical: 6,
    marginBottom: spacing.spaceSm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: spacing.radiusSm,
    backgroundColor: 'rgba(6, 21, 27, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    marginRight: 8,
  },
  categoryChipSelected: {
    backgroundColor: '#10B981',
    borderColor: '#34D399',
  },
  categoryChipIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  categoryChipLabel: {
    fontSize: typography.fontSizeSm,
    color: '#CBD5E1',
    fontWeight: typography.fontWeightMedium,
  },
  categoryChipLabelSelected: {
    color: '#03120E',
    fontWeight: '800',
  },
  conditionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 6,
    marginBottom: spacing.spaceSm,
  },
  conditionChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: spacing.radiusSm,
    backgroundColor: 'rgba(6, 21, 27, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  conditionChipSelected: {
    backgroundColor: '#10B981',
    borderColor: '#34D399',
  },
  conditionChipLabel: {
    fontSize: typography.fontSizeSm,
    color: '#CBD5E1',
  },
  conditionChipLabelSelected: {
    color: '#03120E',
    fontWeight: '800',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
    marginBottom: spacing.spaceSm,
  },
  stepperBtn: {
    width: 40,
    height: 40,
    borderRadius: spacing.radiusSm,
    backgroundColor: 'rgba(6, 21, 27, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: {
    fontSize: 22,
    fontWeight: typography.fontWeightBold,
    color: colors.primary,
  },
  stepperValue: {
    fontSize: typography.fontSizeLg,
    fontWeight: typography.fontWeightBold,
    color: colors.textPrimary,
    marginHorizontal: 16,
    minWidth: 24,
    textAlign: 'center',
  },
  cameraCaptureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    marginVertical: 8,
  },
  cameraCaptureIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  cameraCaptureText: {
    fontSize: typography.fontSizeBase,
    fontWeight: '700',
    color: '#34D399',
  },
  photoPreviewBox: {
    alignItems: 'center',
    marginVertical: 8,
  },
  photoPreviewImage: {
    width: 140,
    height: 140,
    borderRadius: spacing.radiusMd,
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.40)',
  },
  photoActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  photoActionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
  },
  photoActionBtnText: {
    fontSize: typography.fontSizeSm,
    fontWeight: '700',
    color: '#34D399',
  },
  photoRemoveBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  photoRemoveBtnText: {
    color: '#FCA5A5',
  },
  modalSaveBtn: {
    marginTop: spacing.spaceMd,
  },
});

export default SubmitItemScreen;
