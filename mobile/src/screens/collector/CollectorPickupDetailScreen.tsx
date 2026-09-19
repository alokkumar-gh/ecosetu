/**
 * CollectorPickupDetailScreen.tsx
 * Authenticated INFORMAL_COLLECTOR — Accepted Pickup Detail & Exact Map Navigation.
 *
 * Operational Chain:
 *   CITIZEN → COLLECTION REQUEST → INFORMAL COLLECTOR ACCEPTS
 *   → PICKUP SCHEDULED → PICKUP IN PROGRESS → PICKUP COMPLETED
 *
 * PRIVACY RULES (CRITICAL):
 * - Before authoritative acceptance:
 *     DO NOT render exact coordinates or exact address fields.
 *     DO NOT reconstruct exact coordinates on client.
 *     DO NOT call external geocoding/places/directions APIs.
 * - After authoritative acceptance:
 *     The backend authoritatively discloses exact coordinates and structured address.
 *     Render exact location on EcoSetuMap and structured address breakdown.
 *     Provide external Google Maps navigation intent via Linking.openURL.
 *
 * EXTERNAL NAVIGATION:
 * - Direct intent to device navigation application (google.navigation:q=lat,lng / geo:lat,lng).
 * - ZERO internal turn-by-turn routing or Directions API.
 *
 * Source of Truth:
 *   docs/05_API_SPECIFICATION.md Section 8
 *   docs/07_BUSINESS_WORKFLOWS.md Section 2.2
 *   docs/08_UI_UX_SPECIFICATION.md
 *   docs/13_SECURITY_PRIVACY.md
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
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { useNetwork } from '../../hooks/useNetwork';
import { TopAppBar } from '../../components/layout/TopAppBar';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Skeleton } from '../../components/common/Skeleton';
import { OfflineBanner } from '../../components/common/OfflineBanner';
import { EcoSetuMap } from '../../components/map/EcoSetuMap';
import { getCurrentLocation } from '../../services/locationService';
import { collectorService } from '../../services/collectorService';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { PICKUP_STATUS, REQUEST_STATUS } from '../../utils/constants';
import { useI18n } from '../../i18n';
import { voiceService, AnnouncementPriority } from '../../services/voiceService';

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

  const [isVoiceEnabled, setIsVoiceEnabled] = useState<boolean>(false);

  useEffect(() => {
    voiceService.isVoiceAssistanceEnabled().then(setIsVoiceEnabled);
    const unsub = voiceService.subscribe(setIsVoiceEnabled);
    return () => unsub();
  }, []);

  const pickupId = route?.params?.pickupId;
  const initialPickup = route?.params?.pickup;

  const [pickup, setPickup] = useState<any | null>(initialPickup || null);
  const [isLoading, setIsLoading] = useState<boolean>(!initialPickup);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // User location trigger state
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [collectorLoc, setCollectorLoc] = useState<{ latitude: number; longitude: number } | null>(null);

  // Per-action loading state
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);

  // Load pickup details if not provided in route params
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
        setError('Pickup details could not be found.');
      }
    } catch (err: any) {
      if (!pickup) {
        setError(err?.response?.data?.message || err?.message || 'Failed to load pickup details.');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [pickupId, pickup]);

  useEffect(() => {
    if (!pickup) {
      loadPickupDetails(false);
    }
  }, [loadPickupDetails, pickup]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadPickupDetails(true);
  }, [loadPickupDetails]);

  // Request & Status extraction
  const req = pickup?.collectionRequest || route?.params?.request || {};
  const items = req.ewasteItems || [];
  const status = pickup?.status || PICKUP_STATUS.SCHEDULED;

  const isScheduled = status === PICKUP_STATUS.SCHEDULED;
  const isInProgress = status === PICKUP_STATUS.IN_PROGRESS;
  const isCompleted = status === PICKUP_STATUS.COMPLETED;

  // ── Strict State-Gated Privacy Authorization ──────────────────────────────
  // Authorized ONLY when the request is confirmed assigned to this collector
  const isAuthorized = useMemo(() => {
    if (!pickup) return false;
    const s = String(pickup.status || '').toUpperCase();
    const reqStatus = String(req.status || '').toUpperCase();

    const isPickupActive =
      s === PICKUP_STATUS.SCHEDULED ||
      s === PICKUP_STATUS.IN_PROGRESS ||
      s === PICKUP_STATUS.COMPLETED;

    const isRequestAccepted =
      reqStatus === REQUEST_STATUS.ACCEPTED ||
      reqStatus === REQUEST_STATUS.PICKUP_SCHEDULED ||
      reqStatus === REQUEST_STATUS.PICKED_UP;

    return isPickupActive || isRequestAccepted;
  }, [pickup, req.status]);

  // Exact coordinates safely parsed
  const exactLat = typeof req.pickupLat === 'number' ? req.pickupLat : parseFloat(req.pickupLat);
  const exactLng = typeof req.pickupLng === 'number' ? req.pickupLng : parseFloat(req.pickupLng);
  const hasValidCoordinates =
    isAuthorized &&
    !isNaN(exactLat) &&
    !isNaN(exactLng) &&
    exactLat >= -90 &&
    exactLat <= 90 &&
    exactLng >= -180 &&
    exactLng <= 180;

  // ── "Use My Location" user-triggered handler (no background tracking) ─────
  const handleUseMyLocation = useCallback(async () => {
    setIsLocating(true);
    try {
      const res = await getCurrentLocation();
      if (res.success && res.coords) {
        setCollectorLoc({ latitude: res.coords.latitude, longitude: res.coords.longitude });
        Alert.alert(
          t('collector.browse.useMyLocation') || 'My Location',
          'Current position updated on map view.'
        );
      } else {
        Alert.alert(
          t('location.permissionRequiredTitle') || 'Location Permission',
          t('location.permissionRequiredMessage') || 'Permission is required to determine your current position.'
        );
      }
    } catch (err: any) {
      Alert.alert(
        t('location.permissionRequiredTitle') || 'Location Permission',
        t('location.permissionRequiredMessage') || 'Permission is required to determine your current position.'
      );
    } finally {
      setIsLocating(false);
    }
  }, [t]);

  // ── External Google Maps Navigation Launcher ──────────────────────────────
  const handleNavigateToPickup = useCallback(async () => {
    if (!isAuthorized || !hasValidCoordinates) {
      Alert.alert(
        t('collector.pickups.navigationUnavailable') || 'Navigation Unavailable',
        t('collector.pickups.navigationRequiresAcceptance') || 'Exact location and navigation are available after request acceptance.'
      );
      return;
    }

    if (!isConnected) {
      Alert.alert(
        t('collector.browse.offlineAlert') || 'Offline',
        t('collector.pickups.navigationUnavailableDesc') || 'An internet connection is required to launch navigation.'
      );
      return;
    }

    // Android Google Maps Intent URLs
    const navUrl = `google.navigation:q=${exactLat},${exactLng}`;
    const geoUrl = `geo:${exactLat},${exactLng}?q=${exactLat},${exactLng}(Pickup Location)`;
    const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${exactLat},${exactLng}`;

    try {
      const canOpenNav = await Linking.canOpenURL(navUrl);
      if (canOpenNav) {
        await Linking.openURL(navUrl);
        return;
      }
    } catch {
      // Fall through to geo intent or browser
    }

    try {
      const canOpenGeo = await Linking.canOpenURL(geoUrl);
      if (canOpenGeo) {
        await Linking.openURL(geoUrl);
        return;
      }
    } catch {
      // Fall through to web
    }

    try {
      await Linking.openURL(webUrl);
    } catch {
      Alert.alert(
        t('collector.pickups.navigationUnavailable') || 'Navigation Unavailable',
        t('collector.pickups.navigationUnavailableDesc') || 'Unable to launch maps navigation application on this device.'
      );
    }
  }, [isAuthorized, hasValidCoordinates, isConnected, exactLat, exactLng, t]);

  // ── Manual Read Aloud for Authorized Pickup Details ──────────────────────
  const handleReadAloudAuthorizedPickup = useCallback(() => {
    if (!isAuthorized) return;
    const st = String(status || '').replace(/_/g, ' ').toLowerCase();
    const parts = [
      `Pickup status: ${st}.`,
      req.houseNumber || req.street ? `Address: ${[req.houseNumber, req.street].filter(Boolean).join(', ')}.` : '',
      req.landmark ? `Landmark: near ${req.landmark}.` : '',
      req.city || req.district ? `City: ${[req.city, req.district].filter(Boolean).join(', ')}.` : '',
      isScheduled
        ? 'Next action: Start pickup when heading to doorstep.'
        : isInProgress
        ? 'Next action: Complete pickup after verifying weights.'
        : '',
    ]
      .filter(Boolean)
      .join(' ');

    voiceService.speak(parts, {
      priority: AnnouncementPriority.LOW,
      language,
      force: true, // Manual action
    });
  }, [isAuthorized, status, req, isScheduled, isInProgress, language]);

  // ── Start Pickup Lifecycle ────────────────────────────────────────────────
  const handleStartPickup = useCallback(async () => {
    if (!pickup?.id || !isConnected || isActionLoading) return;
    setIsActionLoading(true);
    try {
      const updated = await collectorService.startPickup(pickup.id);
      setPickup((prev: any) => ({ ...prev, ...updated, status: PICKUP_STATUS.IN_PROGRESS }));
      if (isVoiceEnabled) {
        voiceService.speak(
          t('voice.pickupStarted') || 'Pickup started. Heading to citizen location.',
          { priority: AnnouncementPriority.HIGH, language }
        );
      }
      Alert.alert('Pickup Started', 'You are now en route to the citizen doorstep.');
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Could not start pickup.');
    } finally {
      setIsActionLoading(false);
    }
  }, [pickup?.id, isConnected, isActionLoading, isVoiceEnabled, language, t]);

  // Total estimated weight
  const totalEstWeight = items.reduce(
    (sum: number, it: any) => sum + (Number(it.estimatedWeightKg) || 0),
    0
  );

  const scheduledDateStr = fmtDate(pickup?.scheduledDate || req.preferredDate);
  const scheduledTimeStr = pickup?.timeSlot || req.timeSlot || fmtTime(req.preferredTimeStart);

  if (isLoading && !pickup) {
    return (
      <SafeAreaView style={styles.container}>
        <TopAppBar title={t('collector.pickups.pickupDetails') || 'Pickup Details'} onBack={() => navigation?.goBack()} />
        <View style={styles.loadingContainer}>
          <Skeleton width="100%" height={220} borderRadius={12} />
          <View style={{ height: spacing.spaceMd }} />
          <Skeleton width="100%" height={120} borderRadius={12} />
          <View style={{ height: spacing.spaceMd }} />
          <Skeleton width="100%" height={100} borderRadius={12} />
        </View>
      </SafeAreaView>
    );
  }

  if (error && !pickup) {
    return (
      <SafeAreaView style={styles.container}>
        <TopAppBar title={t('collector.pickups.pickupDetails') || 'Pickup Details'} onBack={() => navigation?.goBack()} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠</Text>
          <Text style={styles.errorTitle}>Pickup Unavailable</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => loadPickupDetails(false)}
            accessibilityRole="button"
            accessibilityLabel="Retry loading pickup details"
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <TopAppBar
        title={t('collector.pickups.pickupDetails') || 'Pickup Details'}
        subtitle={`#${pickup?.id ? String(pickup.id).slice(0, 8).toUpperCase() : 'ECO'}`}
        onBack={() => navigation?.goBack()}
      />

      <OfflineBanner />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[colors.primary]} />}
      >
        {/* Status & Reference Header */}
        <View style={styles.headerCard}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.refText}>
                PICKUP #{pickup?.id ? String(pickup.id).slice(0, 8).toUpperCase() : 'ECO'}
              </Text>
              {req.requestId && (
                <Text style={styles.reqRefText}>Request: #{req.requestId}</Text>
              )}
            </View>
            <StatusBadge status={status} />
          </View>
          <Text style={styles.dateText}>
            📅 {scheduledDateStr} {scheduledTimeStr ? `• ${scheduledTimeStr}` : ''}
          </Text>
        </View>

        {/* ── Exact Map View ────────────────────────────────────────────── */}
        <View style={styles.mapSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              🗺 {t('collector.pickups.exactPickupLocation') || 'Exact Pickup Location'}
            </Text>
            {isAuthorized ? (
              <View style={styles.authorizedBadge}>
                <Text style={styles.authorizedBadgeText}>
                  🛡 {t('collector.pickups.exactLocationAuthorized') || 'Authorized Doorstep'}
                </Text>
              </View>
            ) : (
              <View style={styles.protectedBadge}>
                <Text style={styles.protectedBadgeText}>
                  🔒 {t('collector.browse.privacyProtected') || 'Privacy Protected'}
                </Text>
              </View>
            )}
          </View>

          {isAuthorized && hasValidCoordinates ? (
            <View style={styles.mapWrapper}>
              <EcoSetuMap
                latitude={exactLat}
                longitude={exactLng}
                draggable={false}
                showApproximateCircles={false}
                pinTitle={t('collector.pickups.exactPickupLocation') || 'Exact Pickup Location'}
                pinDescription={t('collector.pickups.exactLocationAuthorized') || 'Authorized Citizen Doorstep'}
                isOffline={!isConnected}
                style={styles.map}
              />

              {/* Map Floating Controls: Use My Location */}
              <TouchableOpacity
                style={styles.floatingLocateBtn}
                onPress={handleUseMyLocation}
                disabled={isLocating}
                accessibilityRole="button"
                accessibilityLabel="Use my current location to center map"
                activeOpacity={0.8}
              >
                {isLocating ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={styles.locateBtnText}>🎯 {t('collector.browse.useMyLocation') || 'My Location'}</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.privacyMaskBox}>
              <Text style={styles.privacyMaskIcon}>🛡</Text>
              <Text style={styles.privacyMaskTitle}>
                {t('collector.browse.approximateLocation') || 'Approximate Location'}
              </Text>
              <Text style={styles.privacyMaskSubtitle}>
                {t('collector.pickups.navigationRequiresAcceptance') ||
                  'Exact citizen doorstep coordinates and navigation become available once this collection request is accepted.'}
              </Text>
            </View>
          )}

          {/* ── External Navigation Button ──────────────────────────────── */}
          <TouchableOpacity
            style={[
              styles.navButton,
              (!isAuthorized || !hasValidCoordinates || !isConnected) && styles.navButtonDisabled,
            ]}
            onPress={handleNavigateToPickup}
            disabled={!isAuthorized || !hasValidCoordinates || !isConnected}
            accessibilityRole="button"
            accessibilityLabel={t('collector.pickups.navigateToPickup') || 'Navigate to Pickup'}
            accessibilityHint="Opens Google Maps or your external navigation app to route to this doorstep"
            activeOpacity={0.85}
          >
            <Text style={styles.navButtonIcon}>🧭</Text>
            <View style={styles.navButtonTextGroup}>
              <Text style={styles.navButtonTitle}>
                {t('collector.pickups.navigateToPickup') || 'Navigate to Pickup'}
              </Text>
              <Text style={styles.navButtonSub}>
                {t('collector.pickups.openInGoogleMaps') || 'Open in Google Maps'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Structured Address Breakdown (Authoritative Acceptance Only) ── */}
        <View style={styles.addressSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>
              📍 {t('collector.pickups.doorstepAddress') || 'Doorstep Address'}
            </Text>
            {isAuthorized && (
              <TouchableOpacity
                style={styles.readAloudHeaderBtn}
                onPress={handleReadAloudAuthorizedPickup}
                accessibilityRole="button"
                accessibilityLabel={t('voice.readAloud') || 'Read Aloud'}
                accessibilityHint="Reads doorstep address details aloud"
                activeOpacity={0.8}
              >
                <Text style={styles.readAloudHeaderBtnText}>🔊 {t('voice.readAloud') || 'Read Aloud'}</Text>
              </TouchableOpacity>
            )}
          </View>

          {isAuthorized ? (
            <View style={styles.addressCard}>
              {Boolean(req.houseNumber) && (
                <View style={styles.addressRow}>
                  <Text style={styles.addressLabel}>{t('collector.pickups.houseNumber') || 'Building / House'}:</Text>
                  <Text style={styles.addressValue}>{req.houseNumber}</Text>
                </View>
              )}
              {Boolean(req.street) && (
                <View style={styles.addressRow}>
                  <Text style={styles.addressLabel}>{t('collector.pickups.street') || 'Street'}:</Text>
                  <Text style={styles.addressValue}>{req.street}</Text>
                </View>
              )}
              {Boolean(req.landmark) && (
                <View style={styles.addressRow}>
                  <Text style={styles.addressLabel}>{t('collector.pickups.landmark') || 'Landmark'}:</Text>
                  <Text style={styles.addressValue}>Near {req.landmark}</Text>
                </View>
              )}
              {Boolean(req.city) && (
                <View style={styles.addressRow}>
                  <Text style={styles.addressLabel}>{t('collector.pickups.city') || 'City'}:</Text>
                  <Text style={styles.addressValue}>{req.city}</Text>
                </View>
              )}
              {Boolean(req.district) && (
                <View style={styles.addressRow}>
                  <Text style={styles.addressLabel}>{t('collector.pickups.district') || 'District'}:</Text>
                  <Text style={styles.addressValue}>{req.district}</Text>
                </View>
              )}
              {Boolean(req.state) && (
                <View style={styles.addressRow}>
                  <Text style={styles.addressLabel}>{t('collector.pickups.state') || 'State'}:</Text>
                  <Text style={styles.addressValue}>{req.state}</Text>
                </View>
              )}
              {Boolean(req.pincode) && (
                <View style={styles.addressRow}>
                  <Text style={styles.addressLabel}>{t('collector.pickups.pincode') || 'PIN Code'}:</Text>
                  <Text style={styles.addressValue}>{req.pincode}</Text>
                </View>
              )}

              <View style={styles.addressDivider} />
              <Text style={styles.fullAddressText}>
                {req.pickupAddress || 'Address details confirmed upon assignment'}
              </Text>
            </View>
          ) : (
            <View style={styles.privacyMaskBox}>
              <Text style={styles.privacyMaskSubtitle}>
                {t('collector.browse.exactLocationAfterAcceptance') || 'Exact address revealed upon acceptance'}
              </Text>
            </View>
          )}
        </View>

        {/* ── E-Waste Items Summary ───────────────────────────────────────── */}
        <View style={styles.itemsSection}>
          <Text style={styles.sectionTitle}>
            📦 E-Waste Items ({items.length}) • ~{Math.round(totalEstWeight * 10) / 10} kg est.
          </Text>
          {items.map((it: any, idx: number) => (
            <View key={it.id || idx} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemCategory}>{it.category}</Text>
                <Text style={styles.itemQty}>Qty: {it.quantity ?? 1}</Text>
              </View>
              {Boolean(it.subcategory) && (
                <Text style={styles.itemSubcategory}>{it.subcategory}</Text>
              )}
              <Text style={styles.itemWeight}>
                {it.actualWeightKg != null
                  ? `Collected: ${it.actualWeightKg} kg`
                  : it.estimatedWeightKg != null
                  ? `Estimated: ~${it.estimatedWeightKg} kg`
                  : 'Weight to be verified at doorstep'}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Action Buttons ──────────────────────────────────────────────── */}
        <View style={styles.actionsSection}>
          {isScheduled && (
            <TouchableOpacity
              style={[
                styles.primaryActionBtn,
                (!isConnected || isActionLoading) && styles.btnDisabled,
              ]}
              onPress={handleStartPickup}
              disabled={!isConnected || isActionLoading}
              accessibilityRole="button"
              accessibilityLabel="Start this pickup and notify citizen"
              activeOpacity={0.8}
            >
              {isActionLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryActionBtnText}>▶ {t('collector.pickups.startPickup') || 'Start Pickup'}</Text>
              )}
            </TouchableOpacity>
          )}

          {isInProgress && (
            <View style={styles.inProgressNotice}>
              <Text style={styles.inProgressText}>
                🚚 Pickup is currently in progress. Complete verification at doorstep.
              </Text>
            </View>
          )}

          {isCompleted && (
            <View style={styles.completedNotice}>
              <Text style={styles.completedText}>
                ✓ Pickup successfully completed and recorded in e-waste chain of custody.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundBase,
  },
  loadingContainer: {
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
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.spaceLg,
    paddingVertical: spacing.spaceSm,
    borderRadius: 8,
    minHeight: 48,
    justifyContent: 'center',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  scrollContent: {
    padding: spacing.spaceMd,
    paddingBottom: spacing.spaceXl,
  },
  headerCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.spaceMd,
    borderWidth: 1,
    borderColor: colors.divider,
    marginBottom: spacing.spaceMd,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.spaceXs,
  },
  refText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: 0.5,
  },
  reqRefText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  dateText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: spacing.spaceXs,
  },
  mapSection: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.spaceMd,
    borderWidth: 1,
    borderColor: colors.divider,
    marginBottom: spacing.spaceMd,
  },
  sectionHeader: {
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
  authorizedBadge: {
    backgroundColor: 'rgba(13, 148, 136, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(13, 148, 136, 0.4)',
  },
  authorizedBadgeText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '700',
  },
  protectedBadge: {
    backgroundColor: 'rgba(234, 88, 12, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(234, 88, 12, 0.4)',
  },
  protectedBadgeText: {
    fontSize: 11,
    color: colors.warning,
    fontWeight: '700',
  },
  mapWrapper: {
    position: 'relative',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: spacing.spaceSm,
  },
  map: {
    height: 220,
    width: '100%',
  },
  floatingLocateBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(8, 20, 10, 0.88)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    minHeight: 48,
    justifyContent: 'center',
  },
  locateBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  privacyMaskBox: {
    padding: spacing.spaceLg,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.divider,
    marginBottom: spacing.spaceSm,
  },
  privacyMaskIcon: {
    fontSize: 32,
    marginBottom: spacing.spaceXs,
  },
  privacyMaskTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  privacyMaskSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.spaceMd,
    paddingVertical: 12,
    borderRadius: 10,
    minHeight: 52,
    marginTop: spacing.spaceXs,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonIcon: {
    fontSize: 24,
    marginRight: spacing.spaceSm,
  },
  navButtonTextGroup: {
    flex: 1,
  },
  navButtonTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  navButtonSub: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
  },
  addressSection: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.spaceMd,
    borderWidth: 1,
    borderColor: colors.divider,
    marginBottom: spacing.spaceMd,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.spaceSm,
  },
  readAloudHeaderBtn: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    minHeight: 44,
    paddingHorizontal: spacing.spaceSm + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readAloudHeaderBtnText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  addressCard: {
    marginTop: spacing.spaceSm,
  },
  addressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  addressLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
  },
  addressValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1.5,
    textAlign: 'right',
  },
  addressDivider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.spaceSm,
  },
  fullAddressText: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  itemsSection: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.spaceMd,
    borderWidth: 1,
    borderColor: colors.divider,
    marginBottom: spacing.spaceMd,
  },
  itemCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 8,
    padding: spacing.spaceSm,
    marginTop: spacing.spaceSm,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemCategory: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  itemQty: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  itemSubcategory: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  itemWeight: {
    fontSize: 12,
    color: colors.primary,
    marginTop: 4,
    fontWeight: '600',
  },
  actionsSection: {
    marginTop: spacing.spaceSm,
  },
  primaryActionBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  inProgressNotice: {
    padding: spacing.spaceMd,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  inProgressText: {
    color: colors.textPrimary,
    fontSize: 13,
    textAlign: 'center',
  },
  completedNotice: {
    padding: spacing.spaceMd,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  completedText: {
    color: colors.textPrimary,
    fontSize: 13,
    textAlign: 'center',
  },
});

export default CollectorPickupDetailScreen;
