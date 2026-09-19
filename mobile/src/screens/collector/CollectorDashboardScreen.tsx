/**
 * CollectorDashboardScreen
 * Authenticated INFORMAL_COLLECTOR — Home / Dashboard screen.
 *
 * ECOSETU Business Chain: CITIZEN → LOCAL INFORMAL COLLECTOR / KABADIWALA → FORMAL RECYCLER
 *
 * This screen:
 *   - Displays collector greeting, verification/status state
 *   - Shows availability toggle (PATCH /api/v1/collectors/availability)
 *   - Shows key metrics (GET /api/v1/collectors/stats):
 *       totalPickups, totalWeightKg, totalConsignments, activeRequests
 *   - Shows available citizen collection requests (GET /api/v1/collection-requests/available)
 *       with backend-applied privacy masking (approximate location only)
 *   - Provides Accept action for each available request (POST /api/v1/collection-requests/:id/accept)
 *       server-authoritative, 409-conflict-aware, offline-blocked
 *   - Shows active pickups summary (GET /api/v1/pickups)
 *   - Handles unverified collector state (checkVerified middleware)
 *   - Does NOT expose exact citizen address, email, phone, or coordinates
 *   - Does NOT implement consignment, recycler discovery, or Citizen→Recycler paths
 *
 * Source of Truth:
 *   docs/05_API_SPECIFICATION.md Sections 4, 7, 8
 *   docs/06_ROLES_AND_PERMISSIONS.md
 *   docs/07_BUSINESS_WORKFLOWS.md Section 2
 *   docs/08_UI_UX_SPECIFICATION.md
 *   docs/09_FRONTEND_ARCHITECTURE.md
 *   docs/13_SECURITY_PRIVACY.md
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Switch,
  Platform,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { useNetwork } from '../../hooks/useNetwork';
import { TopAppBar } from '../../components/layout/TopAppBar';
import { MetricCard } from '../../components/common/MetricCard';
import { Skeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { OfflineBanner } from '../../components/common/OfflineBanner';
import { StatusBadge } from '../../components/common/StatusBadge';
import { GradientBackground } from '../../components/glass/GradientBackground';
import { GlassMetricCard } from '../../components/glass/GlassMetricCard';
import { collectorService } from '../../services/collectorService';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { useI18n } from '../../i18n';
import { voiceService, AnnouncementPriority } from '../../services/voiceService';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Canonical UserStatus from Prisma schema */
const USER_STATUS = Object.freeze({
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  DEACTIVATED: 'DEACTIVATED',
});

/** Canonical RequestStatus from Prisma schema */
const REQUEST_STATUS = Object.freeze({
  SUBMITTED: 'SUBMITTED',
  ACCEPTED: 'ACCEPTED',
  PICKUP_SCHEDULED: 'PICKUP_SCHEDULED',
  PICKED_UP: 'PICKED_UP',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
});

/** Canonical PickupStatus from Prisma schema */
const PICKUP_STATUS = Object.freeze({
  SCHEDULED: 'SCHEDULED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (iso?: string | null): string => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return '—'; }
};

const fmtWeight = (kg?: number | null): string => {
  if (kg == null) return '—';
  return `${kg.toFixed(1)} kg`;
};

const getPickupStatusColor = (status: string): string => {
  switch (status) {
    case PICKUP_STATUS.SCHEDULED:   return colors.warning;
    case PICKUP_STATUS.IN_PROGRESS: return colors.secondary;
    case PICKUP_STATUS.COMPLETED:   return colors.success;
    case PICKUP_STATUS.FAILED:      return colors.error;
    case PICKUP_STATUS.CANCELLED:   return colors.textSecondary;
    default: return colors.textSecondary;
  }
};

const getPickupStatusLabel = (status: string): string => {
  switch (status) {
    case PICKUP_STATUS.SCHEDULED:   return 'Scheduled';
    case PICKUP_STATUS.IN_PROGRESS: return 'In Progress';
    case PICKUP_STATUS.COMPLETED:   return 'Completed';
    case PICKUP_STATUS.FAILED:      return 'Failed';
    case PICKUP_STATUS.CANCELLED:   return 'Cancelled';
    default: return status || '—';
  }
};

const countItems = (ewasteItems: any[]): number =>
  Array.isArray(ewasteItems) ? ewasteItems.reduce((sum, i) => sum + (i.quantity || 1), 0) : 0;

const summarizeCategories = (ewasteItems: any[]): string => {
  if (!Array.isArray(ewasteItems) || ewasteItems.length === 0) return '—';
  const cats = [...new Set(ewasteItems.map((i) => fmtCategory(i.category)))];
  return cats.slice(0, 2).join(', ') + (cats.length > 2 ? ` +${cats.length - 2}` : '');
};

const fmtCategory = (cat: string): string => {
  if (!cat) return '—';
  return cat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

const totalEstWeight = (ewasteItems: any[]): string => {
  if (!Array.isArray(ewasteItems) || ewasteItems.length === 0) return '—';
  const total = ewasteItems.reduce((sum, i) => {
    const w = parseFloat(i.estimatedWeightKg);
    return sum + (isNaN(w) ? 0 : w);
  }, 0);
  return total > 0 ? `~${total.toFixed(1)} kg est.` : '—';
};

// ─── Dashboard Skeleton ───────────────────────────────────────────────────────

const DashboardSkeleton: React.FC = () => (
  <View style={skeletonStyles.wrapper}>
    {/* Header */}
    <View style={skeletonStyles.headerCard}>
      <Skeleton width={56} height={56} borderRadius={28} />
      <View style={{ flex: 1, marginLeft: spacing.spaceSm }}>
        <Skeleton height={18} width="60%" style={{ marginBottom: 6 }} />
        <Skeleton height={14} width="40%" />
      </View>
    </View>
    {/* Metrics row */}
    <View style={skeletonStyles.metricsRow}>
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} width="22%" height={100} borderRadius={8} />
      ))}
    </View>
    {/* Section header */}
    <Skeleton height={16} width="50%" style={skeletonStyles.sectionLabel} />
    {/* Request cards */}
    {[0, 1].map((i) => (
      <Skeleton key={i} height={110} style={skeletonStyles.card} borderRadius={10} />
    ))}
    <Skeleton height={16} width="50%" style={skeletonStyles.sectionLabel} />
    <Skeleton height={90} style={skeletonStyles.card} borderRadius={10} />
  </View>
);

const skeletonStyles = StyleSheet.create({
  wrapper: { padding: spacing.spaceMd },
  headerCard: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.spaceMd },
  metricsRow: { flexDirection: 'row', gap: spacing.spaceXs, marginBottom: spacing.spaceMd },
  sectionLabel: { marginBottom: spacing.spaceSm },
  card: { marginBottom: spacing.spaceSm },
});

// ─── Request Card ─────────────────────────────────────────────────────────────

interface RequestCardProps {
  request: any;
  isAccepting: boolean;
  isConnected: boolean;
  isVerified: boolean;
  onAccept: (requestId: string) => void;
}

const RequestCard: React.FC<RequestCardProps> = ({
  request, isAccepting, isConnected, isVerified, onAccept,
}) => {
  const { t } = useI18n();
  const itemCount = countItems(request.ewasteItems);
  const categories = summarizeCategories(request.ewasteItems);
  const estWeight = totalEstWeight(request.ewasteItems);
  const canAccept = isConnected && isVerified && !isAccepting;

  return (
    <View
      style={cardStyles.container}
      accessibilityRole="none"
      accessibilityLabel={`Collection request: ${itemCount} item${itemCount !== 1 ? 's' : ''}, ${categories}`}
    >
      {/* Category / item summary */}
      <View style={cardStyles.row}>
        <View style={cardStyles.iconCircle}>
          <Text style={cardStyles.icon}>📦</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={cardStyles.categoryText}>{categories}</Text>
          <Text style={cardStyles.subText}>
            {itemCount} {itemCount === 1 ? (t('collector.browse.item') || 'item') : (t('collector.browse.items') || 'items')}{estWeight !== '—' ? ` · ${estWeight}` : ''}
          </Text>
        </View>
        <View style={cardStyles.statusChip}>
          <Text style={cardStyles.statusText}>{t('collector.browse.availableBadge') || 'Available'}</Text>
        </View>
      </View>

      <View style={cardStyles.divider} />

      {/* Privacy-masked location (backend provides "Approximate Location...") */}
      <View style={cardStyles.locationRow}>
        <Text style={cardStyles.locationIcon} accessibilityElementsHidden>📍</Text>
        <Text style={cardStyles.locationText} numberOfLines={2}>
          {request.pickupAddress || t('collector.browse.approximateLocation') || 'Approximate location'}
        </Text>
      </View>

      {/* Preferred date if provided */}
      {Boolean(request.preferredDate) && (
        <Text style={cardStyles.dateText}>
          🗓 {t('collector.browse.preferred') || 'Preferred'}: {fmtDate(request.preferredDate)}
        </Text>
      )}

      {/* Notes (truncated) */}
      {Boolean(request.notes) && (
        <Text style={cardStyles.notesText} numberOfLines={2}>
          {request.notes}
        </Text>
      )}

      {/* Accept button */}
      <TouchableOpacity
        style={[
          cardStyles.acceptButton,
          (!canAccept) && cardStyles.acceptButtonDisabled,
        ]}
        onPress={() => onAccept(request.id)}
        disabled={!canAccept}
        accessibilityRole="button"
        accessibilityLabel={
          isAccepting
            ? (t('collector.dashboard.accepting') || 'Accepting request, please wait')
            : !isVerified
            ? (t('collector.dashboard.verificationHint') || 'Account verification required to accept requests')
            : !isConnected
            ? (t('collector.dashboard.offlineHint') || 'Internet connection required to accept request')
            : `Accept collection request for ${categories}`
        }
        accessibilityState={{ disabled: !canAccept, busy: isAccepting }}
        activeOpacity={0.75}
      >
        {isAccepting ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={cardStyles.acceptButtonText}>✅ {t('collector.dashboard.acceptRequest') || 'Accept Request'}</Text>
        )}
      </TouchableOpacity>

      {/* Offline accept warning */}
      {!isConnected && (
        <Text style={cardStyles.offlineHint}>{t('collector.dashboard.offlineHint') || 'Internet required to accept'}</Text>
      )}
      {!isVerified && isConnected && (
        <Text style={cardStyles.offlineHint}>{t('collector.dashboard.verificationHint') || 'Account verification required'}</Text>
      )}
    </View>
  );
};

const cardStyles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(16, 44, 48, 0.72)',
    borderRadius: 20,
    padding: spacing.spaceMd,
    marginBottom: spacing.spaceSm,
    elevation: 4,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.spaceSm, marginBottom: spacing.spaceSm },
  iconCircle: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1, borderColor: '#34D399',
    alignItems: 'center', justifyContent: 'center',
  },
  icon: { fontSize: 20 },
  categoryText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  subText: { fontSize: 12, color: 'rgba(255, 255, 255, 0.65)', marginTop: 2 },
  statusChip: {
    backgroundColor: 'rgba(16, 185, 129, 0.20)',
    borderWidth: 1, borderColor: '#34D399',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
  },
  statusText: { fontSize: 11, fontWeight: '800', color: '#34D399' },
  divider: { height: 1, backgroundColor: 'rgba(255, 255, 255, 0.10)', marginVertical: spacing.spaceXs },
  locationRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: spacing.spaceXs },
  locationIcon: { fontSize: 13, marginTop: 1 },
  locationText: { flex: 1, fontSize: 12, color: 'rgba(255, 255, 255, 0.70)', lineHeight: 18 },
  dateText: { fontSize: 12, color: 'rgba(255, 255, 255, 0.65)', marginBottom: spacing.spaceXs },
  notesText: { fontSize: 12, color: 'rgba(255, 255, 255, 0.60)', fontStyle: 'italic', marginBottom: spacing.spaceXs },
  acceptButton: {
    marginTop: spacing.spaceSm, backgroundColor: '#10B981',
    borderRadius: 14, minHeight: 48, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.2, borderColor: '#34D399',
    elevation: 4,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  acceptButtonDisabled: { opacity: 0.45 },
  acceptButtonText: { color: '#051417', fontSize: 15, fontWeight: '800' },
  offlineHint: { fontSize: 11, color: '#FBBF24', textAlign: 'center', marginTop: 4 },
});

// ─── Pickup Summary Card ──────────────────────────────────────────────────────

const PickupSummaryCard: React.FC<{ pickup: any }> = ({ pickup }) => {
  const statusColor = getPickupStatusColor(pickup.status);
  const statusLabel = getPickupStatusLabel(pickup.status);
  const req = pickup.collectionRequest;
  const itemCount = req ? countItems(req.ewasteItems) : 0;

  return (
    <View
      style={pickupCardStyles.container}
      accessibilityRole="none"
      accessibilityLabel={`Pickup: ${statusLabel}, ${itemCount} item${itemCount !== 1 ? 's' : ''}`}
    >
      <View style={pickupCardStyles.row}>
        <View style={[pickupCardStyles.statusBar, { backgroundColor: statusColor }]} accessibilityElementsHidden />
        <View style={{ flex: 1 }}>
          <View style={pickupCardStyles.headerRow}>
            <Text style={pickupCardStyles.title}>
              {itemCount} item{itemCount !== 1 ? 's' : ''}
              {req && req.ewasteItems ? ` — ${summarizeCategories(req.ewasteItems)}` : ''}
            </Text>
            <View style={[pickupCardStyles.badge, { backgroundColor: `${statusColor}18` }]}>
              <Text style={[pickupCardStyles.badgeText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
          </View>
          {pickup.scheduledDate && (
            <Text style={pickupCardStyles.dateText}>
              🗓 {fmtDate(pickup.scheduledDate)}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

const pickupCardStyles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(7, 30, 34, 0.72)', borderRadius: 16, padding: spacing.spaceSm + 2,
    marginBottom: spacing.spaceXs, elevation: 2,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.12)',
    flexDirection: 'row', overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  statusBar: { width: 4, borderRadius: 2, alignSelf: 'stretch', marginRight: spacing.spaceSm },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 13, fontWeight: '700', color: '#FFFFFF', flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginLeft: 6 },
  badgeText: { fontSize: 11, fontWeight: '800' },
  dateText: { fontSize: 11, color: 'rgba(255, 255, 255, 0.60)', marginTop: 3 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export const CollectorDashboardScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const { isConnected } = useNetwork();
  const { t, language } = useI18n();

  // ── Data state ─────────────────────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [dataFromCache, setDataFromCache] = useState<boolean>(false);

  const [profile, setProfile] = useState<any>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [stats, setStats] = useState<any>(null);
  const [statsError, setStatsError] = useState<string | null>(null);

  const [availableRequests, setAvailableRequests] = useState<any[]>([]);
  const [requestsError, setRequestsError] = useState<string | null>(null);

  const [activePickups, setActivePickups] = useState<any[]>([]);
  const [pickupsError, setPickupsError] = useState<string | null>(null);

  // ── Voice Assistance state ────────────────────────────────────────────────
  const [isVoiceEnabled, setIsVoiceEnabled] = useState<boolean>(false);
  const hasAnnouncedDashboardRef = useRef<boolean>(false);

  useEffect(() => {
    voiceService.isVoiceAssistanceEnabled().then(setIsVoiceEnabled);
    const unsub = voiceService.subscribe(setIsVoiceEnabled);
    return () => unsub();
  }, []);

  // Announce concise dashboard summary once on initial data load if Voice Assistance is enabled
  useEffect(() => {
    if (!isLoading && !hasAnnouncedDashboardRef.current && isVoiceEnabled) {
      hasAnnouncedDashboardRef.current = true;
      const availCount = availableRequests.length;
      const actCount = activePickups.length;
      const summaryText = t('voice.dashboardSummary', {
        available: availCount,
        active: actCount,
      }) || `You have ${availCount} available requests and ${actCount} active pickups.`;

      voiceService.speak(summaryText, {
        priority: AnnouncementPriority.NORMAL,
        language,
      });
    }
  }, [isLoading, isVoiceEnabled, availableRequests.length, activePickups.length, language, t]);

  const handleVoiceHeaderPress = async () => {
    if (!isVoiceEnabled) {
      await voiceService.setVoiceAssistanceEnabled(true);
      setIsVoiceEnabled(true);
      await voiceService.speak(
        t('voice.voiceEnabled') || 'Voice Enabled',
        { priority: AnnouncementPriority.HIGH, language, force: true }
      );
    } else {
      const availCount = availableRequests.length;
      const actCount = activePickups.length;
      const summaryText = t('voice.dashboardSummary', {
        available: availCount,
        active: actCount,
      }) || `You have ${availCount} available requests and ${actCount} active pickups.`;

      await voiceService.speak(summaryText, {
        priority: AnnouncementPriority.NORMAL,
        language,
        force: true,
      });
    }
  };

  // ── Availability state ─────────────────────────────────────────────────────
  const [isAvailable, setIsAvailable] = useState<boolean>(true);
  const [isTogglingAvailability, setIsTogglingAvailability] = useState<boolean>(false);
  const availabilityRef = useRef<boolean>(false);

  // ── Accept state ───────────────────────────────────────────────────────────
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const acceptingRef = useRef<boolean>(false);

  // ── Verification check ─────────────────────────────────────────────────────
  // The backend checkVerified middleware enforces this server-side.
  // We display a UI hint when the collector is not ACTIVE.
  const collectorStatus = profile?.user?.status || user?.status;
  const isVerified = collectorStatus === USER_STATUS.ACTIVE;

  // ── Load all dashboard data ────────────────────────────────────────────────

  const loadDashboard = useCallback(async (silent = false) => {
    if (!silent) {
      setProfileError(null);
      setStatsError(null);
      setRequestsError(null);
      setPickupsError(null);
    }

    let anyFromCache = false;

    // Run all fetches in parallel; individual errors are isolated
    const [profileResult, statsResult, requestsResult, pickupsResult] = await Promise.allSettled([
      collectorService.getProfile(),
      collectorService.getStats(),
      collectorService.getAvailableRequests({ limit: 10 }),
      collectorService.getMyPickups({ limit: 10 }),
    ]);

    if (profileResult.status === 'fulfilled') {
      const { profile: p, fromCache } = profileResult.value;
      if (p) {
        setProfile(p);
        setIsAvailable(Boolean((p as any)?.isAvailable));
        if (fromCache) anyFromCache = true;
      } else {
        setProfileError('Could not load your collector profile.');
      }
    } else {
      const msg = (profileResult.reason as any)?.response?.data?.message
        || (profileResult.reason as any)?.message
        || 'Unable to load collector profile.';
      setProfileError(msg);
    }

    if (statsResult.status === 'fulfilled') {
      const { stats: s, fromCache } = statsResult.value;
      setStats(s);
      if (fromCache) anyFromCache = true;
    } else {
      setStatsError('Unable to load statistics.');
    }

    if (requestsResult.status === 'fulfilled') {
      const { requests: r, fromCache } = requestsResult.value;
      setAvailableRequests(Array.isArray(r) ? r : []);
      if (fromCache) anyFromCache = true;
    } else {
      const err = requestsResult.reason as any;
      // 403 from checkVerified: collector not yet verified — expected; not an error
      if (err?.response?.status === 403) {
        setAvailableRequests([]);
      } else {
        setRequestsError('Unable to load available requests.');
      }
    }

    if (pickupsResult.status === 'fulfilled') {
      const { pickups: p, fromCache } = pickupsResult.value;
      // Show only active pickups on dashboard (SCHEDULED + IN_PROGRESS)
      const active = (Array.isArray(p) ? p : []).filter(
        (pk: any) => pk.status === PICKUP_STATUS.SCHEDULED || pk.status === PICKUP_STATUS.IN_PROGRESS,
      );
      setActivePickups(active);
      if (fromCache) anyFromCache = true;
    } else {
      const err = pickupsResult.reason as any;
      if (err?.response?.status === 403) {
        setActivePickups([]);
      } else {
        setPickupsError('Unable to load active pickups.');
      }
    }

    setDataFromCache(anyFromCache);
    setIsLoading(false);
    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    loadDashboard(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadDashboard(true);
  }, [loadDashboard]);

  // ── Availability toggle ────────────────────────────────────────────────────

  const handleAvailabilityToggle = useCallback(async (newValue: boolean) => {
    if (availabilityRef.current) return;

    if (!isConnected) {
      Alert.alert(
        t('collector.dashboard.offlineAlert') || 'Offline',
        t('collector.dashboard.offlineAvailability') || 'Availability changes require an internet connection.',
        [{ text: t('common.done') || 'OK' }],
      );
      return;
    }

    if (!isVerified) {
      Alert.alert(
        t('collector.browse.verificationAlert') || 'Verification Required',
        t('collector.browse.verificationRequiredDesc') || 'Your account must be verified before you can toggle availability.',
        [{ text: t('common.done') || 'OK' }],
      );
      return;
    }

    availabilityRef.current = true;
    setIsTogglingAvailability(true);
    // Optimistic update
    setIsAvailable(newValue);

    try {
      const updatedProfile = await collectorService.toggleAvailability(newValue);
      setProfile(updatedProfile);
      setIsAvailable(Boolean((updatedProfile as any)?.isAvailable ?? newValue));
    } catch (err: any) {
      // Roll back on failure
      setIsAvailable(!newValue);
      const msg = err?.response?.data?.message
        || err?.message
        || 'Failed to update availability. Please try again.';
      Alert.alert('Error', msg, [{ text: 'OK' }]);
    } finally {
      availabilityRef.current = false;
      setIsTogglingAvailability(false);
    }
  }, [isConnected, isVerified]);

  // ── Accept request ─────────────────────────────────────────────────────────

  const handleAcceptRequest = useCallback(async (requestId: string) => {
    if (acceptingRef.current) return;

    if (!isConnected) {
      Alert.alert(
        t('collector.dashboard.offlineAlert') || 'Offline',
        t('collector.dashboard.offlineAccept') || 'Accepting collection requests requires an internet connection.\nReal-time availability check is required.',
        [{ text: t('common.done') || 'OK' }],
      );
      return;
    }

    if (!isVerified) {
      Alert.alert(
        t('collector.browse.verificationAlert') || 'Verification Required',
        t('collector.browse.verificationRequiredDesc') || 'Your account must be verified to accept collection requests.',
        [{ text: t('common.done') || 'OK' }],
      );
      return;
    }

    Alert.alert(
      t('collector.dashboard.acceptConfirmTitle') || 'Accept Request',
      t('collector.dashboard.acceptConfirmMessage') || 'Accept this collection request? You will be responsible for picking up the e-waste.',
      [
        { text: t('common.cancel') || 'Cancel', style: 'cancel' },
        {
          text: t('collector.dashboard.acceptRequest') || 'Accept',
          style: 'default',
          onPress: async () => {
            acceptingRef.current = true;
            setAcceptingId(requestId);

            try {
              const acceptResult: any = await collectorService.acceptRequest(requestId);
              const newPickupId = acceptResult?.pickup?.id || acceptResult?.data?.pickup?.id;

              // Remove the accepted request from available list
              setAvailableRequests((prev) => prev.filter((r) => r.id !== requestId));
              // Refresh dashboard to get updated stats and pickup list
              await loadDashboard(true);
              if (isVoiceEnabled) {
                voiceService.speak(
                  t('voice.requestAccepted') || 'Collection request accepted.',
                  { priority: AnnouncementPriority.HIGH, language }
                );
              }
              Alert.alert(
                t('collector.dashboard.acceptSuccessTitle') || '✅ Request Accepted',
                t('collector.dashboard.acceptSuccessMessage') || 'The citizen has been notified. A pickup has been scheduled.',
                [
                  { text: t('common.done') || 'OK' },
                  ...(newPickupId
                    ? [
                        {
                          text: t('collector.pickups.pickupDetails') || 'View Details',
                          onPress: () => {
                            navigation?.navigate('CollectorPickups', {
                              screen: 'CollectorPickupDetail',
                              params: { pickupId: newPickupId },
                            });
                          },
                        },
                      ]
                    : []),
                ],
              );
            } catch (err: any) {
              const status = err?.response?.status;
              const msg = err?.response?.data?.message || err?.message || (t('collector.dashboard.error') || 'Failed to accept request.');

              if (status === 409) {
                // Another collector accepted first — remove from list
                setAvailableRequests((prev) => prev.filter((r) => r.id !== requestId));
                if (isVoiceEnabled) {
                  voiceService.speak(
                    t('collector.dashboard.conflictMessage') || 'This request was just accepted by another collector.',
                    { priority: AnnouncementPriority.HIGH, language }
                  );
                }
                Alert.alert(
                  t('collector.dashboard.conflictTitle') || 'Request No Longer Available',
                  t('collector.dashboard.conflictMessage') || 'This request was just accepted by another collector.',
                  [{ text: t('common.done') || 'OK' }],
                );
              } else if (status === 403) {
                Alert.alert(
                  t('collector.dashboard.accessDenied') || 'Access Denied',
                  t('collector.dashboard.accessDeniedMessage') || 'You do not have permission to accept this request. Ensure your account is verified.',
                  [{ text: t('common.done') || 'OK' }],
                );
              } else if (status === 404) {
                setAvailableRequests((prev) => prev.filter((r) => r.id !== requestId));
                Alert.alert(
                  t('collector.dashboard.notFoundTitle') || 'Request Not Found',
                  t('collector.dashboard.notFoundMessage') || 'This request may have been cancelled.',
                  [{ text: t('common.done') || 'OK' }],
                );
              } else {
                Alert.alert(t('common.error') || 'Error', msg, [{ text: t('common.done') || 'OK' }]);
              }
            } finally {
              acceptingRef.current = false;
              setAcceptingId(null);
            }
          },
        },
      ],
      { cancelable: true },
    );
  }, [isConnected, isVerified, loadDashboard]);

  // ── Loading state ──────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <TopAppBar title="Kabadiwala Dashboard" roleBadge="INFORMAL_COLLECTOR" />
        <DashboardSkeleton />
      </SafeAreaView>
    );
  }

  // ── Account status banner ──────────────────────────────────────────────────

  const renderStatusBanner = () => {
    if (!collectorStatus) return null;
    if (collectorStatus === USER_STATUS.ACTIVE) return null;
    if (collectorStatus === USER_STATUS.SUSPENDED) {
      return (
        <View style={styles.suspendedBanner} accessibilityRole="alert">
          <Text style={styles.suspendedText}>
            {t('collector.dashboard.suspendedNotice') || '⚠️ Your account is suspended. You cannot accept new collection requests. Please contact support.'}
          </Text>
        </View>
      );
    }
    if (collectorStatus === USER_STATUS.PENDING_VERIFICATION) {
      return (
        <View style={styles.pendingBanner} accessibilityRole="alert">
          <Text style={styles.pendingText}>
            {t('collector.dashboard.pendingNotice') || '🕐 Account pending verification. Available requests will appear once your account is approved.'}
          </Text>
        </View>
      );
    }
    if (collectorStatus === USER_STATUS.DEACTIVATED) {
      return (
        <View style={styles.suspendedBanner} accessibilityRole="alert">
          <Text style={styles.suspendedText}>{t('collector.dashboard.deactivatedNotice') || '⚠️ This account has been deactivated.'}</Text>
        </View>
      );
    }
    return null;
  };

  const collectorName = profile?.user?.name || user?.name || (t('roles.collector') || 'Collector');
  const hour = new Date().getHours();
  const greeting = hour < 12
    ? (t('collector.dashboard.greetingMorning') || 'Good morning')
    : hour < 18
    ? (t('collector.dashboard.greetingAfternoon') || 'Good afternoon')
    : (t('collector.dashboard.greetingEvening') || 'Good evening');

  // ─── Main render ─────────────────────────────────────────────────────────

  return (
    <GradientBackground>
      <TopAppBar title="Kabadiwala Dashboard" roleBadge="INFORMAL_COLLECTOR" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Offline banner */}
        {!isConnected && <OfflineBanner />}

        {/* Stale data notice */}
        {dataFromCache && (
          <View style={styles.cachedNotice}>
            <Text style={styles.cachedText}>📴 {t('offline.cachedNotice') || 'Showing cached data (last synced while online)'}</Text>
          </View>
        )}

        {/* Account status banner */}
        {renderStatusBanner()}

        {/* ── COLLECTOR HEADER ────────────────────────────────────────── */}
        <View style={styles.headerCard}>
          <View style={styles.headerTopRow}>
            <View style={styles.avatarCircle} accessibilityElementsHidden>
              <Text style={styles.avatarInitial}>
                {collectorName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.greetingText}>{greeting.replace(/,+$/, '')},</Text>
              <Text style={styles.collectorName} accessibilityRole="header" numberOfLines={1}>
                {collectorName}
              </Text>
              <Text style={styles.roleLabel} numberOfLines={1}>
                {t('collector.dashboard.roleTag') || 'Informal Collector · Kabadiwala'}
              </Text>
            </View>
          </View>

          {/* ── CONTROLS (AVAILABILITY & VOICE) ───────────────────── */}
          <View style={styles.headerControlsRow}>
            {/* Voice Assistance Indicator / Read Aloud Action */}
            <TouchableOpacity
              style={[styles.voiceControlBtn, isVoiceEnabled && styles.voiceControlBtnActive]}
              onPress={handleVoiceHeaderPress}
              accessibilityRole="button"
              accessibilityLabel={`${t('voice.voiceAssistance') || 'Voice Assistance'}: ${isVoiceEnabled ? t('voice.voiceEnabled') : t('voice.voiceDisabled')}`}
              accessibilityHint="Tap to hear dashboard summary or enable voice assistance"
            >
              <Text style={styles.voiceControlIcon}>{isVoiceEnabled ? '🔊' : '🔇'}</Text>
              <Text style={[styles.voiceControlLabel, isVoiceEnabled && styles.voiceControlLabelActive]}>
                {isVoiceEnabled ? (t('voice.listen') || 'Listen') : (t('voice.voiceAssistance') || 'Voice')}
              </Text>
            </TouchableOpacity>

            {/* Availability Toggle */}
            <View style={styles.availabilitySection}>
              <Text
                style={[styles.availabilityLabel, { color: isAvailable ? colors.success : colors.textSecondary }]}
                accessibilityElementsHidden
              >
                {isTogglingAvailability ? '…' : isAvailable ? (t('collector.dashboard.available') || 'Available') : (t('collector.dashboard.unavailable') || 'Unavailable')}
              </Text>
              <Switch
                value={isAvailable}
                onValueChange={handleAvailabilityToggle}
                disabled={isTogglingAvailability || !isConnected || !isVerified}
                trackColor={{ false: colors.divider, true: `${colors.success}80` }}
                thumbColor={isAvailable ? colors.success : colors.textSecondary}
                accessibilityRole="switch"
                accessibilityLabel={`Availability: ${isAvailable ? (t('collector.dashboard.available') || 'Available') : (t('collector.dashboard.unavailable') || 'Unavailable')}`}
                accessibilityState={{ checked: isAvailable, disabled: isTogglingAvailability || !isConnected || !isVerified, busy: isTogglingAvailability }}
                accessibilityHint="Toggle your availability to accept new collection requests"
              />
            </View>
          </View>
        </View>

        {/* ── METRICS ─────────────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>{t('collector.dashboard.yourActivity') || 'Your Activity'}</Text>
        {statsError ? (
          <View style={styles.errorInline} accessibilityRole="alert">
            <Text style={styles.errorInlineText}>{statsError}</Text>
          </View>
        ) : (
          <View style={styles.metricsGrid}>
            <View style={styles.metricsGridRow}>
              <GlassMetricCard
                value={stats?.totalPickups ?? '—'}
                label={t('collector.dashboard.completedPickups') || 'Completed Pickups'}
                icon="✅"
                accentColor={colors.success}
              />
              <GlassMetricCard
                value={stats ? `${stats.totalWeightKg ?? 0} kg` : '—'}
                label={t('collector.dashboard.totalCollected') || 'Total Collected'}
                icon="⚖️"
                accentColor={colors.secondary}
              />
            </View>
            <View style={styles.metricsGridRow}>
              <GlassMetricCard
                value={stats?.activeRequests ?? '—'}
                label={t('collector.dashboard.activeRequests') || 'Active Requests'}
                icon="📋"
                accentColor={colors.warning}
              />
              <GlassMetricCard
                value={stats?.totalConsignments ?? '—'}
                label={t('collector.dashboard.consignments') || 'Consignments'}
                icon="🏭"
                accentColor={colors.primary}
              />
            </View>
          </View>
        )}

        {/* ── ACTIVE PICKUPS ───────────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('collector.dashboard.activePickups') || 'Active Pickups'}</Text>
          {activePickups.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{activePickups.length}</Text>
            </View>
          )}
        </View>

        {pickupsError ? (
          <View style={styles.errorInline} accessibilityRole="alert">
            <Text style={styles.errorInlineText}>{pickupsError}</Text>
          </View>
        ) : activePickups.length === 0 ? (
          <EmptyState
            icon="🚚"
            title={t('collector.dashboard.noActivePickups') || 'No Active Pickups'}
            message={t('collector.dashboard.noActivePickupsDesc') || 'Your scheduled and in-progress pickups will appear here.'}
          />
        ) : (
          activePickups.slice(0, 5).map((pickup: any) => (
            <PickupSummaryCard key={pickup.id} pickup={pickup} />
          ))
        )}

        {/* ── AVAILABLE COLLECTION REQUESTS ────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('collector.dashboard.availableRequests') || 'Available Requests'}</Text>
          {availableRequests.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{availableRequests.length}</Text>
            </View>
          )}
        </View>

        {/* Privacy note */}
        <View style={styles.privacyNote}>
          <Text style={styles.privacyNoteText}>
            {t('collector.dashboard.privacyNote') || '📍 Exact pickup address is revealed only after you accept a request.'}
          </Text>
        </View>

        {requestsError ? (
          <View style={styles.errorInline} accessibilityRole="alert">
            <Text style={styles.errorInlineText}>{requestsError}</Text>
            <TouchableOpacity onPress={handleRefresh} style={styles.retryLink}>
              <Text style={styles.retryLinkText}>{t('collector.dashboard.retry') || 'Retry'}</Text>
            </TouchableOpacity>
          </View>
        ) : !isVerified && isConnected ? (
          <EmptyState
            icon="🔒"
            title={t('collector.dashboard.verificationRequired') || 'Verification Required'}
            message={t('collector.dashboard.verificationRequiredDesc') || 'Your account must be approved before you can see and accept collection requests.'}
          />
        ) : availableRequests.length === 0 ? (
          <EmptyState
            icon="🔍"
            title={t('collector.dashboard.noRequestsAvailable') || 'No Requests Available'}
            message={t('collector.dashboard.noRequestsAvailableDesc') || 'There are no collection requests in your service area right now. Check back later or pull down to refresh.'}
            actionLabel={t('collector.dashboard.refresh') || 'Refresh'}
            onAction={handleRefresh}
          />
        ) : (
          availableRequests.map((request: any) => (
            <RequestCard
              key={request.id}
              request={request}
              isAccepting={acceptingId === request.id}
              isConnected={isConnected}
              isVerified={isVerified}
              onAccept={handleAcceptRequest}
            />
          ))
        )}

        {/* ── ECOSETU CHAIN FOOTER ─────────────────────────────────── */}
        {/*
         * Business chain: CITIZEN → INFORMAL COLLECTOR (Kabadiwala) → FORMAL RECYCLER
         * The collector is the essential bridge between citizens and formal recyclers.
         * No direct Citizen → Recycler path is introduced here.
         */}
        <View style={styles.chainFooter}>
          <Text style={styles.chainText}>
            {t('collector.dashboard.chainNote') || 'ECOSETU connects Kabadiwalas with citizens to ensure responsible e-waste collection.'}
          </Text>
        </View>

        <View style={{ height: spacing.spaceXl }} />
      </ScrollView>
    </GradientBackground>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    padding: spacing.spaceMd,
    paddingBottom: spacing.spaceXl + 20,
  },

  // ── Banners ──
  cachedNotice: {
    backgroundColor: 'rgba(252, 211, 77, 0.12)', borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(252, 211, 77, 0.35)',
    padding: spacing.spaceXs + 2, marginBottom: spacing.spaceSm,
  },
  cachedText: { fontSize: 12, color: colors.warning },
  suspendedBanner: {
    backgroundColor: 'rgba(248, 113, 113, 0.12)', borderRadius: 12,
    padding: spacing.spaceMd, marginBottom: spacing.spaceMd,
    borderLeftWidth: 4, borderLeftColor: colors.error,
    borderWidth: 1, borderColor: 'rgba(248, 113, 113, 0.35)',
  },
  suspendedText: { fontSize: 13, color: colors.error, lineHeight: 19 },
  pendingBanner: {
    backgroundColor: 'rgba(252, 211, 77, 0.12)', borderRadius: 12,
    padding: spacing.spaceMd, marginBottom: spacing.spaceMd,
    borderLeftWidth: 4, borderLeftColor: colors.warning,
    borderWidth: 1, borderColor: 'rgba(252, 211, 77, 0.35)',
  },
  pendingText: { fontSize: 13, color: colors.warning, lineHeight: 19 },

  // ── Header card ──
  headerCard: {
    backgroundColor: 'rgba(16, 44, 48, 0.75)', borderRadius: 22,
    padding: spacing.spaceMd, marginBottom: spacing.spaceMd,
    elevation: 4, borderWidth: 1.2, borderColor: 'rgba(255, 255, 255, 0.16)',
    shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.spaceSm,
  },
  avatarCircle: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(16, 185, 129, 0.20)',
    borderWidth: 1.5, borderColor: '#34D399',
    alignItems: 'center', justifyContent: 'center',
    marginRight: spacing.spaceSm,
    shadowColor: '#10B981', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 6,
  },
  avatarInitial: { fontSize: 22, fontWeight: '800', color: '#34D399' },
  headerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  greetingText: { fontSize: 13, color: 'rgba(255, 255, 255, 0.65)', fontWeight: '500' },
  collectorName: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3 },
  roleLabel: { fontSize: 12, color: '#34D399', fontWeight: '600', marginTop: 2 },

  // ── Header Controls ──
  headerControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.spaceSm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
    gap: spacing.spaceSm,
  },
  voiceControlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minHeight: 44,
  },
  voiceControlBtnActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderColor: colors.success,
  },
  voiceControlIcon: {
    fontSize: 14,
  },
  voiceControlLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.65)',
  },
  voiceControlLabelActive: {
    color: '#34D399',
  },

  // ── Availability ──
  availabilitySection: { alignItems: 'center', gap: 2 },
  availabilityLabel: { fontSize: 10, fontWeight: '700', textAlign: 'center' },

  // ── Section ──
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.spaceXs,
    marginBottom: spacing.spaceXs, marginTop: spacing.spaceSm,
  },
  sectionTitle: {
    fontSize: 17, fontWeight: '800', color: '#FFFFFF',
    letterSpacing: -0.3, marginBottom: spacing.spaceXs, marginTop: spacing.spaceSm,
  },
  countBadge: {
    backgroundColor: '#10B981', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 2, marginBottom: spacing.spaceXs,
  },
  countBadgeText: { fontSize: 11, fontWeight: '800', color: '#051417' },

  // ── Metrics ──
  metricsGrid: {
    gap: spacing.spaceSm,
    marginBottom: spacing.spaceSm,
  },
  metricsGridRow: {
    flexDirection: 'row',
    gap: spacing.spaceSm,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.spaceXs,
    marginBottom: spacing.spaceSm,
  },

  // ── Privacy note ──
  privacyNote: {
    backgroundColor: 'rgba(96, 165, 250, 0.12)', borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(96, 165, 250, 0.3)',
    padding: spacing.spaceXs + 2, marginBottom: spacing.spaceSm,
  },
  privacyNoteText: { fontSize: 11, color: colors.secondaryLight, lineHeight: 16 },

  // ── Error inline ──
  errorInline: {
    backgroundColor: 'rgba(248, 113, 113, 0.12)', borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(248, 113, 113, 0.35)',
    padding: spacing.spaceMd, marginBottom: spacing.spaceSm,
  },
  errorInlineText: { fontSize: 13, color: colors.error },
  retryLink: { marginTop: spacing.spaceXs },
  retryLinkText: { fontSize: 13, color: colors.primary, fontWeight: '600', textDecorationLine: 'underline' },

  // ── Chain footer ──
  chainFooter: {
    paddingTop: spacing.spaceMd, paddingHorizontal: spacing.spaceMd,
  },
  chainText: {
    fontSize: 12, color: colors.textTertiary,
    textAlign: 'center', fontStyle: 'italic', lineHeight: 18,
  },
});

export default CollectorDashboardScreen;
