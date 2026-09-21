/**
 * CollectorPickupDetailScreen.tsx
 * Authenticated INFORMAL_COLLECTOR — State-Driven Doorstep Pickup Management.
 *
 * Server State Machine:
 *   REQUEST -> ACCEPTED -> PICKUP SCHEDULED -> START PICKUP -> COMPLETE PICKUP
 *
 * Operational UX Invariant:
 * - SCHEDULED: ONE primary action -> "Start Pickup"
 * - IN_PROGRESS: ONE primary action -> "Complete Pickup"
 * - COMPLETED: No action CTA -> Clean completion receipt
 * - CANCELLED / FAILED: Terminal information state
 * - Navigation intent is secondary and strictly authorized
 * - E-Waste items render authentic authorized citizen photo previews
 * - Fully accessible with on-device Read Aloud voice assistance
 *
 * Source of Truth: docs/05_API_SPECIFICATION.md, docs/08_UI_UX_SPECIFICATION.md
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { useNetwork } from '../../hooks/useNetwork';
import { TopAppBar } from '../../components/layout/TopAppBar';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Skeleton } from '../../components/common/Skeleton';
import { OfflineBanner } from '../../components/common/OfflineBanner';
import { EcoSetuMap } from '../../components/map/EcoSetuMap';
import { AuthorizedImage } from '../../components/common/AuthorizedImage';
import { ReadAloudButton } from '../../components/voice/ReadAloudButton';
import { EcoSetuBackground } from '../../components/eco';
import { GlassCard } from '../../components/glass/GlassCard';
import { GlassButton } from '../../components/glass/GlassButton';
import { collectorService } from '../../services/collectorService';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { PICKUP_STATUS, REQUEST_STATUS } from '../../utils/constants';
import { useI18n } from '../../i18n';
import { voiceService, AnnouncementPriority } from '../../services/voiceService';
import { useCollectorVoice } from '../../context/CollectorVoiceContext';

interface Props {
  navigation?: any;
  route?: {
    params?: {
      pickupId?: string;
      requestId?: string;
      pickup?: any;
      request?: any;
    };
  };
}

const fmtDate = (iso?: string | null): string => {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
};

const fmtTime = (iso?: string | null): string => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  } catch {
    return '';
  }
};

export const CollectorPickupDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { user } = useAuth();
  const { isConnected } = useNetwork();
  const { t, language } = useI18n();
  const { setSelectedEntity, registerActions } = useCollectorVoice();

  const pickupId = route?.params?.pickupId;
  const initialPickup = route?.params?.pickup;

  const [pickup, setPickup] = useState<any | null>(initialPickup || null);
  const [isLoading, setIsLoading] = useState<boolean>(!initialPickup);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Per-action loading state
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);

  // Completion modal state
  const [isCompleteModalVisible, setIsCompleteModalVisible] = useState<boolean>(false);
  const [itemWeights, setItemWeights] = useState<{ [itemId: string]: string }>({});
  const [collectorNotes, setCollectorNotes] = useState<string>('');
  const [isSubmittingCompletion, setIsSubmittingCompletion] = useState<boolean>(false);
  const [completionError, setCompletionError] = useState<string | null>(null);

  // Load pickup details
  const loadPickupDetails = useCallback(async (silent = false) => {
    if (!silent) setError(null);
    try {
      if (pickupId) {
        try {
          const direct = await collectorService.getPickupById(pickupId);
          if (direct) {
            setPickup(direct);
            return;
          }
        } catch (directErr) {
          console.warn('[CollectorPickupDetail] direct getPickupById warning:', directErr);
        }
      }
      const result = await collectorService.getMyPickups({ limit: 50 });
      const found = (result.pickups || []).find((p: any) => p.id === pickupId);
      if (found) {
        setPickup(found);
      } else if (!pickup) {
        setError(t('collector.pickups.notFoundMessage') || 'Pickup details could not be found.');
      }
    } catch (err: any) {
      if (!silent) {
        setError(err?.response?.data?.message || err?.message || 'Could not load pickup details.');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [pickupId, pickup, t]);

  useEffect(() => {
    loadPickupDetails(false);
  }, [loadPickupDetails]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadPickupDetails(true);
  }, [loadPickupDetails]);

  // Derived state
  const status: string = pickup?.status || PICKUP_STATUS.SCHEDULED;
  const req = pickup?.collectionRequest || {};
  const items: any[] = req.ewasteItems || [];

  const isScheduled = status === PICKUP_STATUS.SCHEDULED;
  const isInProgress = status === PICKUP_STATUS.IN_PROGRESS;
  const isCompleted = status === PICKUP_STATUS.COMPLETED;
  const isCancelled = status === PICKUP_STATUS.CANCELLED;
  const isFailed = status === PICKUP_STATUS.FAILED;

  // Authorization check: collector can view exact coordinates once assigned
  const isAuthorized = Boolean(
    pickup?.collectorId ||
    req.status === REQUEST_STATUS.ACCEPTED ||
    req.status === REQUEST_STATUS.PICKUP_SCHEDULED ||
    req.status === REQUEST_STATUS.PICKED_UP ||
    isScheduled ||
    isInProgress ||
    isCompleted
  );

  const exactLat = typeof req.pickupLat === 'number'
    ? req.pickupLat
    : parseFloat(req.pickupLat || '0');
  const exactLng = typeof req.pickupLng === 'number'
    ? req.pickupLng
    : parseFloat(req.pickupLng || '0');
  const hasValidCoordinates = !isNaN(exactLat) && !isNaN(exactLng) && (exactLat !== 0 || exactLng !== 0);

  // Total estimated weight
  const totalEstWeight = useMemo(() => {
    return items.reduce((sum: number, it: any) => sum + (Number(it.estimatedWeightKg) || 0), 0);
  }, [items]);

  // Total verified weight in modal
  const calculatedTotalWeight = useMemo(() => {
    return Object.values(itemWeights).reduce((sum, w) => {
      const parsed = parseFloat(w);
      return sum + (isNaN(parsed) ? 0 : parsed);
    }, 0);
  }, [itemWeights]);

  // Doorstep address string
  const doorstepAddress = req.pickupAddress || [req.houseNumber, req.street, req.landmark, req.city, req.pincode].filter(Boolean).join(', ') || '';

  const handleReadAloudAuthorizedPickup = useCallback(async () => {
    if (!isAuthorized) return;
    const parts = [
      `Pickup for ${items.length} e-waste items.`,
      `Status is ${status.replace('_', ' ').toLowerCase()}.`,
      doorstepAddress ? `Doorstep address: ${doorstepAddress}.` : '',
    ];
    await voiceService.speak(parts.filter(Boolean).join(' '), {
      priority: AnnouncementPriority.NORMAL,
      force: true,
    });
  }, [isAuthorized, items.length, status, doorstepAddress]);

  // Voice announcement content
  const screenSummaryText = useMemo(() => {
    const parts = [
      `Pickup for ${items.length} e-waste items.`,
      `Status is ${status.replace('_', ' ').toLowerCase()}.`,
      req.city ? `Located in ${req.city}.` : '',
      isScheduled ? 'Next step: Start pickup when heading to doorstep.' : '',
      isInProgress ? 'Next step: Complete pickup and record collected weights.' : '',
      isCompleted ? 'Pickup completed and verified.' : '',
    ];
    return parts.filter(Boolean).join(' ');
  }, [items.length, status, req.city, isScheduled, isInProgress, isCompleted]);

  // Register current pickup as active Voice context entity
  useEffect(() => {
    const activeId = pickup?.id || pickupId;
    if (activeId) {
      const refCode = String(activeId).slice(-8).toUpperCase();
      setSelectedEntity({
        type: 'PICKUP',
        id: activeId,
        label: `Pickup #${refCode}`,
        data: pickup,
      });
      return () => {
        setSelectedEntity(null);
      };
    }
  }, [pickupId, pickup, setSelectedEntity]);

  // ── Primary Action Handlers ────────────────────────────────────────────────

  // 1. Start Scheduled Pickup
  const handleStartPickup = useCallback(async () => {
    if (!pickup?.id || isActionLoading) return;
    if (!isConnected) {
      Alert.alert(
        t('collector.browse.offlineAlert') || 'Offline',
        t('collector.pickups.offlineWarning') || 'Cannot start pickup while offline. Please connect to the internet.'
      );
      return;
    }

    setIsActionLoading(true);
    try {
      const updated = await collectorService.startPickup(pickup.id);
      setPickup((prev: any) => ({ ...prev, ...updated, status: PICKUP_STATUS.IN_PROGRESS }));
      voiceService.speak(
        t('voice.pickupStarted') || 'Pickup started. Heading to citizen location.',
        { priority: AnnouncementPriority.HIGH, language }
      );
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Could not start pickup.';
      if (err?.response?.status === 409) {
        Alert.alert(
          t('collector.dashboard.conflictTitle') || 'Status Conflict',
          'This pickup has already changed status. Refreshing latest details.'
        );
        loadPickupDetails(true);
      } else {
        Alert.alert(t('common.error') || 'Error', msg);
      }
    } finally {
      setIsActionLoading(false);
    }
  }, [pickup?.id, isActionLoading, isConnected, language, t, loadPickupDetails]);

  // 2. Open Complete Modal
  const handleOpenCompleteModal = useCallback(() => {
    setCompletionError(null);
    // Pre-populate estimated weights
    const initialWeights: { [itemId: string]: string } = {};
    items.forEach((it: any) => {
      initialWeights[it.id] = String(it.estimatedWeightKg || it.actualWeightKg || 1.0);
    });
    setItemWeights(initialWeights);
    setCollectorNotes(pickup?.collectorNotes || '');
    setIsCompleteModalVisible(true);
  }, [items, pickup?.collectorNotes]);

  // 3. Confirm and Finalize Completion
  const handleConfirmCompletion = useCallback(async () => {
    if (!pickup?.id || isSubmittingCompletion) return;
    if (!isConnected) {
      setCompletionError(t('collector.pickups.offlineWarning') || 'Cannot complete pickup while offline.');
      return;
    }

    if (calculatedTotalWeight < 0.01) {
      setCompletionError(t('collector.pickups.valWeight') || 'Total collected weight must be greater than 0 kg.');
      return;
    }

    setIsSubmittingCompletion(true);
    setCompletionError(null);

    try {
      const actualItems = items.map((it: any) => ({
        itemId: it.id,
        actualWeightKg: parseFloat(itemWeights[it.id] || '0') || Number(it.estimatedWeightKg) || 1.0,
      }));

      const payload = {
        totalWeightKg: calculatedTotalWeight,
        items: actualItems,
        collectorNotes: collectorNotes.trim() || undefined,
      };

      const updated = await collectorService.completePickup(pickup.id, payload);
      setPickup((prev: any) => ({
        ...prev,
        ...updated,
        status: PICKUP_STATUS.COMPLETED,
        totalWeightKg: calculatedTotalWeight,
        collectorNotes: collectorNotes.trim() || null,
        completedAt: new Date().toISOString(),
      }));

      setIsCompleteModalVisible(false);

      voiceService.speak(
        t('voice.pickupCompleted') || `Pickup completed. Total weight ${calculatedTotalWeight} kilograms recorded.`,
        { priority: AnnouncementPriority.HIGH, language }
      );
    } catch (err: any) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message || err?.message || 'Failed to complete pickup.';
      if (status === 409) {
        setCompletionError('Status conflict: Pickup state already updated.');
        loadPickupDetails(true);
      } else {
        setCompletionError(msg);
      }
    } finally {
      setIsSubmittingCompletion(false);
    }
  }, [pickup?.id, isSubmittingCompletion, isConnected, calculatedTotalWeight, items, itemWeights, collectorNotes, language, t, loadPickupDetails]);

  // 4. Secondary Navigation: Open Google Maps Intent
  const handleNavigateToPickup = useCallback(() => {
    if (!hasValidCoordinates) {
      Alert.alert(
        t('collector.pickups.navigationUnavailable') || 'Location Unavailable',
        t('collector.pickups.locationUnavailable') || 'Exact coordinates are not yet available for navigation.'
      );
      return;
    }

    const scheme = Platform.select({
      ios: `maps:0,0?q=${exactLat},${exactLng}`,
      android: `google.navigation:q=${exactLat},${exactLng}`,
    });

    const fallbackUrl = `https://www.google.com/maps/dir/?api=1&destination=${exactLat},${exactLng}`;

    Linking.canOpenURL(scheme || fallbackUrl)
      .then((supported) => {
        if (supported) {
          Linking.openURL(scheme || fallbackUrl);
        } else {
          Linking.openURL(fallbackUrl);
        }
      })
      .catch(() => {
        Linking.openURL(fallbackUrl);
      });
  }, [hasValidCoordinates, exactLat, exactLng, t]);

  // Connect voice actions
  useEffect(() => {
    const unregister = registerActions({
      onStartPickup: async () => {
        if (isScheduled) handleStartPickup();
      },
      onCompletePickup: async () => {
        if (isInProgress) handleOpenCompleteModal();
      },
    });
    return () => unregister();
  }, [registerActions, isScheduled, isInProgress, handleStartPickup, handleOpenCompleteModal]);

  // Loading Skeleton
  if (isLoading && !pickup) {
    return (
      <EcoSetuBackground>
        <SafeAreaView style={styles.container}>
          <TopAppBar title={t('collector.pickups.pickupDetails') || 'Pickup Details'} onBack={() => navigation?.goBack()} />
          <View style={styles.loadingPadding}>
            <Skeleton width="100%" height={160} borderRadius={16} />
            <View style={{ height: spacing.spaceMd }} />
            <Skeleton width="100%" height={140} borderRadius={16} />
            <View style={{ height: spacing.spaceMd }} />
            <Skeleton width="100%" height={80} borderRadius={16} />
          </View>
        </SafeAreaView>
      </EcoSetuBackground>
    );
  }

  // Error State
  if (error && !pickup) {
    return (
      <EcoSetuBackground>
        <SafeAreaView style={styles.container}>
          <TopAppBar title={t('collector.pickups.pickupDetails') || 'Pickup Details'} onBack={() => navigation?.goBack()} />
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>⚠</Text>
            <Text style={styles.errorTitle}>{t('common.error') || 'Error'}</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            <GlassButton
              label={t('common.retry') || 'Retry'}
              variant="primary"
              onPress={() => loadPickupDetails(false)}
              style={styles.retryButton}
            />
          </View>
        </SafeAreaView>
      </EcoSetuBackground>
    );
  }

  const scheduledDateStr = fmtDate(pickup?.scheduledDate || req.preferredDate);
  const scheduledTimeStr = pickup?.timeSlot || req.timeSlot || fmtTime(req.preferredTimeStart);

  return (
    <EcoSetuBackground>
      <SafeAreaView style={styles.container}>
        <TopAppBar
          title={t('collector.pickups.pickupDetails') || 'Pickup Details'}
          subtitle={`#${pickup?.id ? String(pickup.id).slice(0, 8).toUpperCase() : 'ECO'}`}
          onBack={() => navigation?.goBack()}
        />

        <OfflineBanner />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          {/* 1. Header Card: Reference, Status & Voice Read Aloud */}
          <GlassCard style={styles.headerCard}>
            <View style={styles.headerTopRow}>
              <View style={styles.refColumn}>
                <Text style={styles.refText}>
                  PICKUP #{pickup?.id ? String(pickup.id).slice(0, 8).toUpperCase() : 'ECO'}
                </Text>
                <Text style={styles.dateSubText}>
                  📅 {scheduledDateStr} {scheduledTimeStr ? `• ${scheduledTimeStr}` : ''}
                </Text>
              </View>
              <StatusBadge status={status} />
            </View>

            <View style={styles.headerDivider} />

            <View style={styles.voiceRow}>
              <ReadAloudButton
                text={screenSummaryText}
                label={t('voice.readAloud') || 'Read Aloud'}
                variant="pill"
                accessibilityLabel="Read aloud pickup details and status"
              />
              <Text style={styles.itemsSummaryPill}>
                {items.length} {items.length === 1 ? 'item' : 'items'} • ~{Math.round(totalEstWeight * 10) / 10} kg
              </Text>
            </View>
          </GlassCard>

          {/* 2. Doorstep Address & Map Section */}
          <GlassCard style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>
                📍 {t('collector.pickups.doorstepAddress') || 'Doorstep Address'}
              </Text>
              {isAuthorized && hasValidCoordinates && isConnected && (
                <TouchableOpacity
                  style={styles.navSecondaryBtn}
                  onPress={handleNavigateToPickup}
                  accessibilityRole="button"
                  accessibilityLabel={t('collector.pickups.navigateToPickup') || 'Navigate to Pickup'}
                  accessibilityHint="Opens Google Maps to route to doorstep"
                  activeOpacity={0.8}
                >
                  <Text style={styles.navSecondaryIcon}>🧭</Text>
                  <Text style={styles.navSecondaryText}>
                    {t('collector.pickups.openInGoogleMaps') || 'Google Maps'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {isAuthorized ? (
              <View style={styles.addressBox}>
                <Text style={styles.fullAddressText}>
                  {req.pickupAddress || [req.houseNumber, req.street, req.landmark, req.city, req.pincode].filter(Boolean).join(', ') || 'Address verified upon acceptance'}
                </Text>
                {Boolean(req.landmark) && (
                  <Text style={styles.landmarkText}>
                    Landmark: Near {req.landmark}
                  </Text>
                )}
              </View>
            ) : (
              <View style={styles.privacyMaskBox}>
                <Text style={styles.privacyMaskText}>
                  🔒 {t('collector.browse.exactLocationAfterAcceptance') || 'Exact address revealed upon acceptance'}
                </Text>
              </View>
            )}

            {/* Map Rendering */}
            {isAuthorized && hasValidCoordinates && (
              <View style={styles.mapContainer}>
                <EcoSetuMap
                  latitude={exactLat}
                  longitude={exactLng}
                  draggable={false}
                  showApproximateCircles={false}
                  pinTitle={t('collector.pickups.exactPickupLocation') || 'Doorstep Location'}
                  isOffline={!isConnected}
                  style={styles.map}
                />
              </View>
            )}
          </GlassCard>

          {/* 3. E-Waste Items & Photos */}
          <GlassCard style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>
              📦 {t('collector.pickups.verifiedWeights') || 'E-Waste Items'} ({items.length})
            </Text>

            {items.map((it: any, idx: number) => (
              <View key={it.id || idx} style={styles.itemRow}>
                {/* Image Preview Thumbnail with Fullscreen Modal */}
                <View style={styles.imageThumbnailWrapper}>
                  <AuthorizedImage
                    uri={it.imageUrl}
                    style={styles.itemImage}
                    categoryLabel={it.category}
                    allowFullscreen={true}
                    fallbackIcon="📷"
                    fallbackText="No Photo"
                    accessibilityLabel={`Photo of ${it.category}`}
                  />
                </View>

                {/* Item Details */}
                <View style={styles.itemInfo}>
                  <Text style={styles.itemCategory}>{it.category}</Text>
                  <Text style={styles.itemSub}>
                    Qty: {it.quantity ?? 1} • Condition: {it.condition || 'Unknown'}
                  </Text>
                  <Text style={styles.itemWeightBadge}>
                    {it.actualWeightKg != null
                      ? `✓ Collected: ${it.actualWeightKg} kg`
                      : it.estimatedWeightKg != null
                      ? `Est: ~${it.estimatedWeightKg} kg`
                      : 'Weight verified at doorstep'}
                  </Text>
                </View>
              </View>
            ))}
          </GlassCard>

          {/* 4. State-Driven Receipt or Status Card */}
          {isCompleted && (
            <GlassCard style={styles.receiptCard}>
              <View style={styles.receiptHeader}>
                <Text style={styles.receiptIcon}>✓</Text>
                <View>
                  <Text style={styles.receiptTitle}>Pickup Completed</Text>
                  <Text style={styles.receiptSub}>Recorded in EcoSetu Chain of Custody</Text>
                </View>
              </View>
              <View style={styles.receiptDivider} />
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Total Collected Weight:</Text>
                <Text style={styles.receiptValue}>{pickup?.totalWeightKg || totalEstWeight} kg</Text>
              </View>
              {pickup?.completedAt && (
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Completion Time:</Text>
                  <Text style={styles.receiptValue}>{fmtDate(pickup.completedAt)} {fmtTime(pickup.completedAt)}</Text>
                </View>
              )}
              {Boolean(pickup?.collectorNotes) && (
                <View style={styles.notesBox}>
                  <Text style={styles.notesLabel}>Collector Notes:</Text>
                  <Text style={styles.notesValue}>{pickup.collectorNotes}</Text>
                </View>
              )}
            </GlassCard>
          )}

          {(isCancelled || isFailed) && (
            <GlassCard style={styles.cancelledCard}>
              <Text style={styles.cancelledIcon}>⚠</Text>
              <Text style={styles.cancelledTitle}>
                {isCancelled ? 'Pickup Cancelled' : 'Pickup Failed'}
              </Text>
              <Text style={styles.cancelledSub}>
                {req.cancellationReason || 'This collection request was terminated.'}
              </Text>
            </GlassCard>
          )}

          {/* 5. THE SINGLE PRIMARY ACTION CTA CONTAINER */}
          <View style={styles.primaryActionContainer}>
            {isScheduled && (
              <GlassButton
                label={t('collector.pickups.startPickup') || 'Start Pickup'}
                variant="primary"
                onPress={handleStartPickup}
                loading={isActionLoading}
                disabled={isActionLoading || !isConnected}
                style={styles.primaryCtaBtn}
                accessibilityLabel="Start pickup and notify citizen"
              />
            )}

            {isInProgress && (
              <GlassButton
                label={t('collector.pickups.completePickup') || 'Complete Pickup'}
                variant="primary"
                onPress={handleOpenCompleteModal}
                style={styles.primaryCtaBtn}
                accessibilityLabel="Complete pickup and verify collected weights"
              />
            )}

            {/* When completed, cancelled, or failed: ZERO primary action CTA is displayed */}
          </View>
        </ScrollView>

        {/* ── Complete Pickup Verification Modal ── */}
        <Modal
          visible={isCompleteModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => !isSubmittingCompletion && setIsCompleteModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.modalKeyboardAvoid}
            >
              <View style={styles.modalSheet}>
                {/* Modal Title */}
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitle}>
                      {t('collector.pickups.completeModalTitle') || 'Complete Pickup'}
                    </Text>
                    <Text style={styles.modalSubtitle}>
                      Record verified actual weights collected at citizen doorstep
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => !isSubmittingCompletion && setIsCompleteModalVisible(false)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text style={styles.modalCloseText}>✕</Text>
                  </TouchableOpacity>
                </View>

                {completionError && (
                  <View style={styles.modalErrorBox}>
                    <Text style={styles.modalErrorText}>{completionError}</Text>
                  </View>
                )}

                <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
                  {/* Item Weight Inputs */}
                  <Text style={styles.modalInputSectionTitle}>
                    {t('collector.pickups.verifiedWeights') || 'Verified Item Weights (kg)'}
                  </Text>

                  {items.map((it: any) => (
                    <View key={it.id} style={styles.modalItemInputRow}>
                      <View style={styles.modalItemLabelCol}>
                        <Text style={styles.modalItemCategoryText}>{it.category}</Text>
                        <Text style={styles.modalItemEstText}>
                          Est: ~{it.estimatedWeightKg ?? 1.0} kg • Qty: {it.quantity ?? 1}
                        </Text>
                      </View>
                      <View style={styles.modalWeightInputWrapper}>
                        <TextInput
                          style={styles.weightTextInput}
                          value={itemWeights[it.id] || ''}
                          onChangeText={(val) => setItemWeights((prev) => ({ ...prev, [it.id]: val }))}
                          placeholder="0.0"
                          placeholderTextColor={colors.textSecondary}
                          keyboardType="decimal-pad"
                          editable={!isSubmittingCompletion}
                        />
                        <Text style={styles.kgUnitText}>kg</Text>
                      </View>
                    </View>
                  ))}

                  {/* Calculated Total Weight Pill */}
                  <View style={styles.modalTotalWeightBox}>
                    <Text style={styles.modalTotalWeightLabel}>
                      {t('collector.delivery.totalWeight') || 'Total Weight'}:
                    </Text>
                    <Text style={styles.modalTotalWeightValue}>
                      {Math.round(calculatedTotalWeight * 100) / 100} kg
                    </Text>
                  </View>

                  {/* Collector Notes */}
                  <Text style={styles.modalInputSectionTitle}>
                    {t('collector.pickups.collectorNotes') || 'Collector Notes (Optional)'}
                  </Text>
                  <TextInput
                    style={styles.notesTextInput}
                    value={collectorNotes}
                    onChangeText={setCollectorNotes}
                    placeholder={t('collector.pickups.notesPlaceholder') || 'e.g. Collected in good condition...'}
                    placeholderTextColor={colors.textSecondary}
                    multiline
                    numberOfLines={3}
                    maxLength={500}
                    editable={!isSubmittingCompletion}
                  />

                  {/* Modal Action Buttons: Cancel and ONE Primary Confirm */}
                  <View style={styles.modalActionsRow}>
                    <GlassButton
                      label={t('collector.pickups.cancel') || 'Cancel'}
                      variant="outline"
                      onPress={() => setIsCompleteModalVisible(false)}
                      disabled={isSubmittingCompletion}
                      style={styles.modalCancelBtn}
                    />
                    <GlassButton
                      label={t('collector.pickups.confirmCompletion') || 'Confirm & Complete'}
                      variant="primary"
                      onPress={handleConfirmCompletion}
                      loading={isSubmittingCompletion}
                      disabled={isSubmittingCompletion || calculatedTotalWeight < 0.01}
                      style={styles.modalConfirmBtn}
                    />
                  </View>
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>
      </SafeAreaView>
    </EcoSetuBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    padding: spacing.spaceMd,
    paddingBottom: spacing.spaceXl + 40,
  },
  loadingPadding: {
    padding: spacing.spaceMd,
  },
  errorContainer: {
    padding: spacing.spaceLg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  errorIcon: {
    fontSize: 42,
    marginBottom: spacing.spaceSm,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.spaceXs,
  },
  errorMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.spaceMd,
  },
  retryButton: {
    minWidth: 140,
  },
  headerCard: {
    marginBottom: spacing.spaceMd,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  refColumn: {
    flex: 1,
  },
  refText: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  dateSubText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  headerDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    marginVertical: spacing.spaceSm,
  },
  voiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemsSummaryPill: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    backgroundColor: 'rgba(20, 184, 166, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sectionCard: {
    marginBottom: spacing.spaceMd,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.spaceSm,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  navSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  navSecondaryIcon: {
    fontSize: 13,
  },
  navSecondaryText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  addressBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 8,
    padding: spacing.spaceSm,
    marginBottom: spacing.spaceSm,
  },
  fullAddressText: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
    fontWeight: '500',
  },
  landmarkText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  privacyMaskBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 8,
    padding: spacing.spaceSm,
    marginBottom: spacing.spaceSm,
  },
  privacyMaskText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  mapContainer: {
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    marginTop: spacing.spaceXs,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 10,
    padding: spacing.spaceSm,
    marginTop: spacing.spaceSm,
  },
  imageThumbnailWrapper: {
    width: 64,
    height: 64,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: spacing.spaceSm,
  },
  itemImage: {
    width: 64,
    height: 64,
  },
  itemInfo: {
    flex: 1,
  },
  itemCategory: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  itemSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  itemWeightBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 4,
  },
  receiptCard: {
    marginBottom: spacing.spaceMd,
    borderColor: 'rgba(34, 197, 94, 0.35)',
  },
  receiptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  receiptIcon: {
    fontSize: 24,
    color: '#22C55E',
  },
  receiptTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  receiptSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  receiptDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    marginVertical: spacing.spaceSm,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  receiptLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  receiptValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  notesBox: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  notesLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  notesValue: {
    fontSize: 13,
    color: colors.textPrimary,
    marginTop: 2,
  },
  cancelledCard: {
    marginBottom: spacing.spaceMd,
    alignItems: 'center',
    padding: spacing.spaceMd,
  },
  cancelledIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  cancelledTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cancelledSub: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  primaryActionContainer: {
    marginTop: spacing.spaceSm,
  },
  primaryCtaBtn: {
    minHeight: 52,
    borderRadius: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(7, 24, 28, 0.85)',
    justifyContent: 'flex-end',
  },
  modalKeyboardAvoid: {
    width: '100%',
  },
  modalSheet: {
    backgroundColor: 'rgba(15, 34, 40, 0.98)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    padding: spacing.spaceLg,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.spaceMd,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modalCloseText: {
    fontSize: 18,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  modalErrorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 8,
    padding: spacing.spaceSm,
    marginBottom: spacing.spaceSm,
  },
  modalErrorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
  modalScroll: {
    marginBottom: spacing.spaceSm,
  },
  modalInputSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginVertical: spacing.spaceSm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalItemInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    padding: spacing.spaceSm,
    marginBottom: spacing.spaceXs,
  },
  modalItemLabelCol: {
    flex: 1,
  },
  modalItemCategoryText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalItemEstText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  modalWeightInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
  },
  weightTextInput: {
    width: 60,
    height: 38,
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'right',
  },
  kgUnitText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginLeft: 4,
  },
  modalTotalWeightBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(20, 184, 166, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.35)',
    borderRadius: 10,
    padding: spacing.spaceSm,
    marginVertical: spacing.spaceSm,
  },
  modalTotalWeightLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalTotalWeightValue: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.primary,
  },
  notesTextInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 10,
    color: colors.textPrimary,
    padding: spacing.spaceSm,
    minHeight: 64,
    textAlignVertical: 'top',
    fontSize: 13,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: spacing.spaceMd,
    marginTop: spacing.spaceMd,
  },
  modalCancelBtn: {
    flex: 1,
  },
  modalConfirmBtn: {
    flex: 2,
  },
});

export default CollectorPickupDetailScreen;
