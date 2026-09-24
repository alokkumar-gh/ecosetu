/**
 * CollectorPickupsScreen
 * Authenticated INFORMAL_COLLECTOR — Pickup Management screen for ECOSETU.
 *
 * Operational Chain:
 *   CITIZEN → COLLECTION REQUEST → INFORMAL COLLECTOR ACCEPTS
 *   → PICKUP SCHEDULED → PICKUP IN PROGRESS → PICKUP COMPLETED → E-WASTE COLLECTED
 *
 * Critical Business Model:
 *   CITIZEN → INFORMAL COLLECTOR (KABADIWALA) → FORMAL RECYCLER
 *   Do NOT introduce direct Citizen → Recycler functionality.
 *
 * Features:
 *   - List assigned pickups via GET /api/v1/pickups (paginated & filtered)
 *   - Start scheduled pickup via PATCH /api/v1/pickups/:id/start (SCHEDULED -> IN_PROGRESS)
 *   - Complete active pickup via PATCH /api/v1/pickups/:id/complete (IN_PROGRESS -> COMPLETED)
 *     with item weights, total weight, and optional collector notes
 *   - Citizen privacy protection (NO citizen phone, email, or exact coordinates displayed)
 *   - Server-authoritative lifecycle (no client-side mutation of Request, Item, or Profile)
 *   - Offline caching with stale-cache indication; write operations blocked offline
 *   - Per-pickup in-flight submission guards
 *   - Status filtering (All, Scheduled, In Progress, Completed)
 *   - Native pull-to-refresh and Skeleton loading
 *   - Full WCAG accessibility compliance (>= 48dp touch targets, semantic roles/labels/states)
 *
 * Source of Truth:
 *   docs/05_API_SPECIFICATION.md Section 8
 *   docs/07_BUSINESS_WORKFLOWS.md Section 2.2
 *   docs/08_UI_UX_SPECIFICATION.md
 *   docs/09_FRONTEND_ARCHITECTURE.md
 *   docs/10_BACKEND_ARCHITECTURE.md
 *   docs/13_SECURITY_PRIVACY.md
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { useNetwork } from '../../hooks/useNetwork';
import { TopAppBar } from '../../components/layout/TopAppBar';
import { Skeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { OfflineBanner } from '../../components/common/OfflineBanner';
import { StatusBadge } from '../../components/common/StatusBadge';
import { collectorService } from '../../services/collectorService';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { PICKUP_STATUS, REQUEST_STATUS } from '../../utils/constants';
import { useI18n } from '../../i18n';
import { voiceService, AnnouncementPriority } from '../../services/voiceService';
import { useCollectorVoice } from '../../context/CollectorVoiceContext';
import { EcoSetuBackground } from '../../components/eco';
import { AuthorizedImage } from '../../components/common/AuthorizedImage';

// ─── Constants ────────────────────────────────────────────────────────────────

const USER_STATUS = Object.freeze({
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  DEACTIVATED: 'DEACTIVATED',
});

type FilterTab = 'ALL' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED';

interface Props {
  navigation?: any;
  route?: any;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Component ────────────────────────────────────────────────────────────────

export const CollectorPickupsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { user } = useAuth();
  const { isConnected } = useNetwork();
  const { t, language } = useI18n();
  const { registerActions } = useCollectorVoice();

  const [isVoiceEnabled, setIsVoiceEnabled] = useState<boolean>(false);

  useEffect(() => {
    voiceService.isVoiceAssistanceEnabled().then(setIsVoiceEnabled);
    const unsub = voiceService.subscribe(setIsVoiceEnabled);
    return () => unsub();
  }, []);

  // Pickups state
  const [pickups, setPickups] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [fromCache, setFromCache] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isVerificationError, setIsVerificationError] = useState<boolean>(false);

  // Active filter tab
  const [activeFilter, setActiveFilter] = useState<FilterTab>('ALL');

  // Per-pickup action tracking
  const [actionPickupId, setActionPickupId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'START' | 'COMPLETE' | null>(null);

  // Concurrency guards
  const inFlightRef = useRef<{ [id: string]: boolean }>({});
  const refreshingRef = useRef<boolean>(false);

  // Completion Modal State
  const [completingPickup, setCompletingPickup] = useState<any | null>(null);
  const [itemWeights, setItemWeights] = useState<{ [itemId: string]: string }>({});
  const [collectorNotes, setCollectorNotes] = useState<string>('');
  const [isSubmittingCompletion, setIsSubmittingCompletion] = useState<boolean>(false);
  const [completionError, setCompletionError] = useState<string | null>(null);

  // Verification checks
  const collectorStatus = user?.status;
  const isVerified = collectorStatus === USER_STATUS.ACTIVE;

  // ── Load Pickups ────────────────────────────────────────────────────────────

  const loadPickups = useCallback(async (silent = false) => {
    if (!silent) setError(null);
    setIsVerificationError(false);

    try {
      const result = await collectorService.getMyPickups({ page: 1, limit: 50 });
      setPickups(result.pickups || []);
      setPagination(result.pagination || null);
      setFromCache(result.fromCache);
    } catch (err: any) {
      const status = err?.response?.status;
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Unable to load your assigned pickups.';

      if (status === 403) {
        setIsVerificationError(true);
        setPickups([]);
      } else {
        setError(msg);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPickups(false);
  }, [loadPickups]);

  // ── Pull-to-refresh ────────────────────────────────────────────────────────

  const handleRefresh = useCallback(() => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setIsRefreshing(true);
    loadPickups(true).finally(() => {
      refreshingRef.current = false;
    });
  }, [loadPickups]);

  // ── Start Pickup Flow ──────────────────────────────────────────────────────

  const handleStartPickup = useCallback(
    (pickup: any) => {
      const pickupId = pickup.id;

      if (!isConnected) {
        Alert.alert(
          'Internet Connection Required',
          'Starting a pickup requires real-time connection to the ECOSETU network so citizens can track their collection.',
          [{ text: 'OK' }],
        );
        return;
      }

      if (!isVerified) {
        Alert.alert(
          'Verification Required',
          'Your account is not yet verified as an active collector. Only verified collectors can start pickups.',
          [{ text: 'OK' }],
        );
        return;
      }

      if (inFlightRef.current[pickupId]) return;

      Alert.alert(
        'Start Pickup',
        'Are you on your way to collect e-waste from the citizen doorstep?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Start',
            onPress: async () => {
              if (inFlightRef.current[pickupId]) return;
              inFlightRef.current[pickupId] = true;
              setActionPickupId(pickupId);
              setActionType('START');

              try {
                const updated = await collectorService.startPickup(pickupId);
                // Update local list with authoritative server response
                setPickups((prev) =>
                  prev.map((p) => (p.id === pickupId ? { ...p, ...updated, status: PICKUP_STATUS.IN_PROGRESS } : p)),
                );
                if (isVoiceEnabled) {
                  voiceService.speak(
                    t('voice.pickupStarted') || 'Pickup started. Heading to citizen location.',
                    { priority: AnnouncementPriority.HIGH, language }
                  );
                }
                Alert.alert(
                  'Pickup In Progress',
                  'Pickup has been started. You are now en route to the citizen doorstep.',
                  [{ text: 'OK' }],
                );
              } catch (err: any) {
                const status = err?.response?.status;
                const msg = err?.response?.data?.message || err?.message;

                if (status === 409) {
                  Alert.alert(
                    'Status Conflict',
                    'This pickup status has already been modified on the server. Refreshing your pickups list.',
                    [{ text: 'Refresh', onPress: () => loadPickups(true) }],
                  );
                } else if (status === 403) {
                  Alert.alert(
                    'Access Restricted',
                    'You are not authorized to start this pickup or your account verification is pending.',
                    [{ text: 'OK' }],
                  );
                } else if (status === 404) {
                  Alert.alert(
                    'Pickup Not Found',
                    'This pickup is no longer available.',
                    [{ text: 'OK', onPress: () => loadPickups(true) }],
                  );
                } else {
                  Alert.alert('Error', msg || 'Could not start the pickup. Please try again.');
                }
              } finally {
                inFlightRef.current[pickupId] = false;
                setActionPickupId(null);
                setActionType(null);
              }
            },
          },
        ],
      );
    },
    [isConnected, isVerified, loadPickups],
  );

  // ── Complete Pickup Flow ───────────────────────────────────────────────────

  const handleOpenCompleteModal = useCallback(
    (pickup: any) => {
      if (!isConnected) {
        Alert.alert(
          'Internet Connection Required',
          'Completing a pickup requires real-time connection to record actual e-waste weights and update the chain of custody.',
          [{ text: 'OK' }],
        );
        return;
      }

      if (!isVerified) {
        Alert.alert(
          'Verification Required',
          'Only verified collectors can finalize and complete pickups.',
          [{ text: 'OK' }],
        );
        return;
      }

      // Initialize weights from items
      const items = pickup.collectionRequest?.ewasteItems || [];
      const initialWeights: { [itemId: string]: string } = {};
      items.forEach((item: any) => {
        const est = item.estimatedWeightKg != null ? String(item.estimatedWeightKg) : '1.0';
        initialWeights[item.id] = est;
      });

      setItemWeights(initialWeights);
      setCollectorNotes('');
      setCompletionError(null);
      setCompletingPickup(pickup);
    },
    [isConnected, isVerified],
  );

  const handleCloseCompleteModal = useCallback(() => {
    if (isSubmittingCompletion) return;
    setCompletingPickup(null);
    setItemWeights({});
    setCollectorNotes('');
    setCompletionError(null);
  }, [isSubmittingCompletion]);

  const handleItemWeightChange = useCallback((itemId: string, val: string) => {
    // Allow numbers and single decimal point
    const sanitized = val.replace(/[^0-9.]/g, '');
    setItemWeights((prev) => ({ ...prev, [itemId]: sanitized }));
  }, []);

  const calculatedTotalWeight = useMemo(() => {
    if (!completingPickup) return 0;
    const items = completingPickup.collectionRequest?.ewasteItems || [];
    let sum = 0;
    items.forEach((item: any) => {
      const w = parseFloat(itemWeights[item.id] || '0');
      if (!isNaN(w) && w > 0) sum += w;
    });
    return Math.round(sum * 100) / 100;
  }, [completingPickup, itemWeights]);

  const handleConfirmCompletion = useCallback(async () => {
    if (!completingPickup) return;
    const pickupId = completingPickup.id;

    if (!isConnected) {
      setCompletionError('Internet connection required. Please connect to complete this pickup.');
      return;
    }

    const items = completingPickup.collectionRequest?.ewasteItems || [];
    if (items.length === 0) {
      setCompletionError('No e-waste items associated with this pickup.');
      return;
    }

    // Validate weights
    const payloadItems = [];
    for (const item of items) {
      const rawVal = itemWeights[item.id];
      const weight = parseFloat(rawVal);
      if (isNaN(weight) || weight <= 0) {
        setCompletionError(`Please enter a valid weight (> 0 kg) for ${item.category}.`);
        return;
      }
      payloadItems.push({
        itemId: item.id,
        actualWeightKg: weight,
      });
    }

    if (calculatedTotalWeight < 0.01) {
      setCompletionError('Total weight must be at least 0.01 kg.');
      return;
    }

    if (inFlightRef.current[pickupId]) return;
    inFlightRef.current[pickupId] = true;
    setIsSubmittingCompletion(true);
    setCompletionError(null);

    const payload = {
      totalWeightKg: calculatedTotalWeight,
      collectorNotes: collectorNotes.trim() || undefined,
      items: payloadItems,
    };

    try {
      const completed = await collectorService.completePickup(pickupId, payload);
      // Update local state
      setPickups((prev) =>
        prev.map((p) =>
          p.id === pickupId
            ? {
                ...p,
                ...completed,
                status: PICKUP_STATUS.COMPLETED,
                totalWeightKg: calculatedTotalWeight,
                collectorNotes: collectorNotes.trim() || null,
                completedAt: new Date().toISOString(),
              }
            : p,
        ),
      );
      handleCloseCompleteModal();
      if (isVoiceEnabled) {
        voiceService.speak(
          t('voice.pickupCompleted') || 'Pickup completed successfully.',
          { priority: AnnouncementPriority.HIGH, language }
        );
      }
      Alert.alert(
        'Pickup Completed!',
        `Successfully collected ${items.length} item(s) totaling ${calculatedTotalWeight} kg. E-waste is now in your collection inventory.`,
        [{ text: 'OK' }],
      );
      // Background re-fetch to ensure complete synchronization with backend
      loadPickups(true);
    } catch (err: any) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message || err?.message;

      if (status === 409) {
        setCompletionError('Conflict: This pickup was already modified. Please refresh.');
        loadPickups(true);
      } else if (status === 403) {
        setCompletionError('Access restricted: You cannot complete this pickup.');
      } else if (status === 400) {
        setCompletionError(msg || 'Invalid submission. Please check item weights.');
      } else {
        setCompletionError(msg || 'Failed to complete pickup. Please try again.');
      }
    } finally {
      inFlightRef.current[pickupId] = false;
      setIsSubmittingCompletion(false);
    }
  }, [
    completingPickup,
    isConnected,
    itemWeights,
    calculatedTotalWeight,
    collectorNotes,
    handleCloseCompleteModal,
    loadPickups,
  ]);

  // Connect voice actions and route params
  useEffect(() => {
    const unregister = registerActions({
      onStartPickup: async (id) => {
        handleStartPickup(id);
      },
      onCompletePickup: async (id) => {
        const p = pickups.find((it) => it.id === id);
        if (p) {
          handleOpenCompleteModal(p);
        } else if (pickups.length > 0) {
          handleOpenCompleteModal(pickups[0]);
        }
      },
    });
    return () => unregister();
  }, [registerActions, handleStartPickup, handleOpenCompleteModal, pickups]);

  useEffect(() => {
    const targetId = route?.params?.completePickupId;
    if (targetId && pickups.length > 0) {
      const p = pickups.find((it) => it.id === targetId);
      if (p) {
        handleOpenCompleteModal(p);
      }
    }
  }, [route, pickups, handleOpenCompleteModal]);

  // ── Filtered Pickups ───────────────────────────────────────────────────────

  const filteredPickups = useMemo(() => {
    if (activeFilter === 'ALL') return pickups;
    if (activeFilter === 'SCHEDULED') {
      return pickups.filter((p) => p.status === PICKUP_STATUS.SCHEDULED);
    }
    if (activeFilter === 'IN_PROGRESS') {
      return pickups.filter((p) => p.status === PICKUP_STATUS.IN_PROGRESS);
    }
    if (activeFilter === 'COMPLETED') {
      return pickups.filter(
        (p) =>
          p.status === PICKUP_STATUS.COMPLETED ||
          p.status === PICKUP_STATUS.CANCELLED ||
          p.status === PICKUP_STATUS.FAILED,
      );
    }
    return pickups;
  }, [pickups, activeFilter]);

  // Counts for tabs
  const counts = useMemo(() => {
    let scheduled = 0;
    let inProgress = 0;
    let completed = 0;
    pickups.forEach((p) => {
      if (p.status === PICKUP_STATUS.SCHEDULED) scheduled++;
      else if (p.status === PICKUP_STATUS.IN_PROGRESS) inProgress++;
      else if (
        p.status === PICKUP_STATUS.COMPLETED ||
        p.status === PICKUP_STATUS.CANCELLED ||
        p.status === PICKUP_STATUS.FAILED
      ) {
        completed++;
      }
    });
    return { all: pickups.length, scheduled, inProgress, completed };
  }, [pickups]);

  // ── Render Filter Chips ───────────────────────────────────────────────────

  const renderFilterChips = () => (
    <View
      style={styles.filterRow}
      accessibilityRole="tablist"
      accessibilityLabel="Filter pickups by status"
    >
      <TouchableOpacity
        style={[styles.filterChip, activeFilter === 'ALL' && styles.filterChipActive]}
        onPress={() => setActiveFilter('ALL')}
        accessibilityRole="tab"
        accessibilityLabel={`All pickups (${counts.all})`}
        accessibilityState={{ selected: activeFilter === 'ALL' }}
      >
        <Text
          style={[
            styles.filterChipText,
            activeFilter === 'ALL' && styles.filterChipTextActive,
          ]}
        >
          {t('collector.pickups.tabAll') || 'All'} ({counts.all})
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.filterChip, activeFilter === 'SCHEDULED' && styles.filterChipActive]}
        onPress={() => setActiveFilter('SCHEDULED')}
        accessibilityRole="tab"
        accessibilityLabel={`Scheduled pickups (${counts.scheduled})`}
        accessibilityState={{ selected: activeFilter === 'SCHEDULED' }}
      >
        <Text
          style={[
            styles.filterChipText,
            activeFilter === 'SCHEDULED' && styles.filterChipTextActive,
          ]}
        >
          {t('collector.pickups.tabScheduled') || 'Scheduled'} ({counts.scheduled})
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.filterChip, activeFilter === 'IN_PROGRESS' && styles.filterChipActive]}
        onPress={() => setActiveFilter('IN_PROGRESS')}
        accessibilityRole="tab"
        accessibilityLabel={`In Progress pickups (${counts.inProgress})`}
        accessibilityState={{ selected: activeFilter === 'IN_PROGRESS' }}
      >
        <Text
          style={[
            styles.filterChipText,
            activeFilter === 'IN_PROGRESS' && styles.filterChipTextActive,
          ]}
        >
          {t('collector.pickups.tabInProgress') || 'In Progress'} ({counts.inProgress})
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.filterChip, activeFilter === 'COMPLETED' && styles.filterChipActive]}
        onPress={() => setActiveFilter('COMPLETED')}
        accessibilityRole="tab"
        accessibilityLabel={`Completed pickups (${counts.completed})`}
        accessibilityState={{ selected: activeFilter === 'COMPLETED' }}
      >
        <Text
          style={[
            styles.filterChipText,
            activeFilter === 'COMPLETED' && styles.filterChipTextActive,
          ]}
        >
          History ({counts.completed})
        </Text>
      </TouchableOpacity>
    </View>
  );

  // ── Render Empty State ────────────────────────────────────────────────────

  const renderEmptyState = () => {
    if (isVerificationError) {
      return (
        <EmptyState
          icon="⏳"
          title="Account Pending Verification"
          message="Your collector account is awaiting administrative verification. Once approved, assigned pickups will be manageable here."
        />
      );
    }

    if (!isConnected && pickups.length === 0) {
      return (
        <EmptyState
          icon="📡"
          title="Offline — No Cached Pickups"
          message="You are currently offline and have no pickups cached on this device. Reconnect to sync with ECOSETU."
        />
      );
    }

    if (activeFilter === 'SCHEDULED') {
      return (
        <EmptyState
          icon="📅"
          title={t('collector.pickups.noPickupsTitle') || 'No Scheduled Pickups'}
          message={t('collector.pickups.noPickupsMessage') || 'You have no upcoming pickups scheduled. Browse available citizen requests to accept new collection jobs.'}
          actionLabel="Browse Available Requests"
          onAction={() => navigation?.navigate?.('CollectorBrowse')}
        />
      );
    }

    if (activeFilter === 'IN_PROGRESS') {
      return (
        <EmptyState
          icon="🚚"
          title={t('collector.dashboard.noActivePickups') || 'No Active Pickups'}
          message={t('collector.dashboard.noActivePickupsDesc') || 'You do not currently have any pickups in progress. Start a scheduled pickup when you are en route.'}
        />
      );
    }

    if (activeFilter === 'COMPLETED') {
      return (
        <EmptyState
          icon="✅"
          title={t('collector.pickups.noPickupsTitle') || 'No Completed Pickups'}
          message={t('collector.pickups.noPickupsMessage') || 'You have not finalized any pickups yet. Completed e-waste collections will be recorded here for your history.'}
        />
      );
    }

    return (
      <EmptyState
        icon="📦"
        title={t('collector.pickups.noPickupsTitle') || 'No Pickups Assigned'}
        message={t('collector.pickups.noPickupsMessage') || 'You have not accepted any collection requests yet. Discover citizen collection requests in your neighborhood to get started.'}
        actionLabel="Browse Requests"
        onAction={() => navigation?.navigate?.('CollectorBrowse')}
      />
    );
  };

  // ── Render Pickup Card ────────────────────────────────────────────────────

  const renderPickupCard = ({ item }: { item: any }) => {
    const pickupId = item.id;
    const isThisPickupActionLoading = actionPickupId === pickupId;
    const req = item.collectionRequest || {};
    const items = req.ewasteItems || [];
    const isScheduled = item.status === PICKUP_STATUS.SCHEDULED;
    const isInProgress = item.status === PICKUP_STATUS.IN_PROGRESS;
    const isCompleted = item.status === PICKUP_STATUS.COMPLETED;
    const isCancelled = item.status === PICKUP_STATUS.CANCELLED;
    const isFailed = item.status === PICKUP_STATUS.FAILED;

    // Compute estimated total weight
    const totalEstWeight = items.reduce(
      (sum: number, it: any) => sum + (Number(it.estimatedWeightKg) || 0),
      0,
    );

    // Pickup scheduled date display
    const scheduledDateStr = fmtDate(item.scheduledDate || req.preferredDate);
    const scheduledTimeStr = item.timeSlot || req.timeSlot || fmtTime(req.preferredTimeStart);

    return (
      <View
        style={styles.card}
        accessibilityRole="none"
        accessibilityLabel={`Pickup ${scheduledDateStr}, status ${item.status}`}
      >
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardRef} accessibilityRole="header">
              PICKUP #{item.id ? String(item.id).slice(0, 8).toUpperCase() : 'ECO'}
            </Text>
            {req.requestId && (
              <Text style={styles.cardReqRef}>Request: #{req.requestId}</Text>
            )}
          </View>
          <StatusBadge status={item.status} />
        </View>

        {/* Date & Time */}
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>📅</Text>
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoLabel}>Scheduled Collection</Text>
            <Text style={styles.infoValue}>
              {scheduledDateStr} {scheduledTimeStr ? `• ${scheduledTimeStr}` : ''}
            </Text>
          </View>
        </View>

        {/* Location (Privacy Safe pickupAddress, no exact coordinates displayed) */}
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>📍</Text>
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoLabel}>Pickup Address</Text>
            <Text style={styles.infoValue}>
              {req.pickupAddress || 'Address details confirmed upon assignment'}
            </Text>
          </View>
        </View>

        {/* Citizen Privacy Safe Label (NO citizen phone or email displayed) */}
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>👤</Text>
          <View style={styles.infoTextContainer}>
            <Text style={styles.infoLabel}>Citizen Contact</Text>
            <Text style={styles.infoValue}>
              Citizen Doorstep Pickup (Verified by EcoSetu)
            </Text>
          </View>
        </View>

        {/* Associated Items */}
        <View style={styles.itemsSection}>
          <Text style={styles.itemsTitle}>
            E-Waste Items ({items.length}) • ~{Math.round(totalEstWeight * 10) / 10} kg est.
          </Text>
          {items.map((it: any, idx: number) => (
            <View key={it.id || idx} style={styles.itemRow}>
              {Boolean(it.imageUrl) && (
                <View style={{ width: 44, height: 44, borderRadius: 6, overflow: 'hidden', marginRight: 8 }}>
                  <AuthorizedImage
                    uri={it.imageUrl}
                    style={{ width: 44, height: 44 }}
                    categoryLabel={it.category}
                  />
                </View>
              )}
              <Text style={styles.itemBullet}>•</Text>
              <Text style={styles.itemDesc}>
                {it.category}
                {it.subcategory ? ` (${it.subcategory})` : ''} — Qty: {it.quantity ?? 1}
                {it.condition ? ` • ${it.condition}` : ''}
                {it.actualWeightKg != null
                  ? ` • ${it.actualWeightKg} kg collected`
                  : it.estimatedWeightKg != null
                  ? ` • ~${it.estimatedWeightKg} kg`
                  : ''}
              </Text>
            </View>
          ))}
        </View>

        {/* Completed Metadata */}
        {isCompleted && (
          <View style={styles.completedMetaBox}>
            <Text style={styles.completedMetaText}>
              ✓ Total Weight Collected: {item.totalWeightKg ?? totalEstWeight} kg
            </Text>
            {item.completedAt && (
              <Text style={styles.completedMetaSub}>
                Completed on {fmtDate(item.completedAt)} at {fmtTime(item.completedAt)}
              </Text>
            )}
            {item.collectorNotes && (
              <Text style={styles.completedNotes}>Notes: {item.collectorNotes}</Text>
            )}
          </View>
        )}

        {/* In-Progress Timestamps */}
        {isInProgress && item.startedAt && (
          <View style={styles.inProgressMetaBox}>
            <Text style={styles.inProgressMetaText}>
              🚚 Started: {fmtDate(item.startedAt)} at {fmtTime(item.startedAt)}
            </Text>
          </View>
        )}

        {/* Terminal States */}
        {(isCancelled || isFailed) && (
          <View style={styles.cancelledMetaBox}>
            <Text style={styles.cancelledMetaText}>
              {isCancelled ? 'Pickup Cancelled' : 'Pickup Failed'}
            </Text>
          </View>
        )}

        {/* Action Controls */}
        <View style={styles.actionContainer}>
          {/* View Details Button */}
          <TouchableOpacity
            style={[styles.actionBtn, styles.mapNavBtn]}
            onPress={() =>
              navigation?.navigate?.('PickupDetail', {
                pickupId: item.id,
                pickup: item,
              })
            }
            accessibilityRole="button"
            accessibilityLabel={`${t('collector.pickups.pickupDetails') || 'View Details'} for pickup ${item.id ? String(item.id).slice(0, 8).toUpperCase() : ''}`}
            accessibilityHint="Opens pickup details, map, and items"
            activeOpacity={0.8}
          >
            <Text style={styles.mapNavBtnText}>
              🔍 {t('collector.pickups.pickupDetails') || 'View Details'}
            </Text>
          </TouchableOpacity>

          {isScheduled && (
            <TouchableOpacity
              style={[
                styles.actionBtn,
                styles.startBtn,
                (!isVerified || !isConnected || isThisPickupActionLoading) && styles.btnDisabled,
              ]}
              onPress={() => handleStartPickup(item)}
              disabled={!isVerified || !isConnected || isThisPickupActionLoading}
              accessibilityRole="button"
              accessibilityLabel={`Start pickup for request ${req.requestId || item.id}`}
              accessibilityHint="Marks pickup as in-progress and notifies citizen that you are en route"
              accessibilityState={{
                disabled: !isVerified || !isConnected || isThisPickupActionLoading,
                busy: isThisPickupActionLoading && actionType === 'START',
              }}
              activeOpacity={0.8}
            >
              {isThisPickupActionLoading && actionType === 'START' ? (
                <ActivityIndicator size="small" color={colors.surface} />
              ) : (
                <Text style={styles.startBtnText}>▶ {t('collector.pickups.startPickup') || 'Start Pickup'}</Text>
              )}
            </TouchableOpacity>
          )}

          {isInProgress && (
            <TouchableOpacity
              style={[
                styles.actionBtn,
                styles.completeBtn,
                (!isVerified || !isConnected || isThisPickupActionLoading) && styles.btnDisabled,
              ]}
              onPress={() => handleOpenCompleteModal(item)}
              disabled={!isVerified || !isConnected || isThisPickupActionLoading}
              accessibilityRole="button"
              accessibilityLabel={`Complete pickup for request ${req.requestId || item.id}`}
              accessibilityHint="Opens modal to record collected weights and finalize pickup"
              accessibilityState={{
                disabled: !isVerified || !isConnected || isThisPickupActionLoading,
                busy: isThisPickupActionLoading && actionType === 'COMPLETE',
              }}
              activeOpacity={0.8}
            >
              {isThisPickupActionLoading && actionType === 'COMPLETE' ? (
                <ActivityIndicator size="small" color={colors.surface} />
              ) : (
                <Text style={styles.completeBtnText}>✓ {t('collector.pickups.completePickup') || 'Complete Pickup'}</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <EcoSetuBackground>
      <SafeAreaView style={styles.container}>
        <TopAppBar
          title="Assigned Pickups"
          subtitle="Manage active and scheduled collections"
        />

      {/* Offline Banner */}
      <OfflineBanner />

      {/* Stale Cache Notice */}
      {isConnected && fromCache && (
        <View style={styles.cacheNotice} accessibilityRole="alert">
          <Text style={styles.cacheNoticeText}>
            ℹ Displaying cached pickup data. Pull down to refresh live status.
          </Text>
        </View>
      )}

      {/* Verification Warning Banner */}
      {collectorStatus && collectorStatus !== USER_STATUS.ACTIVE && (
        <View style={styles.warningBanner} accessibilityRole="alert">
          <Text style={styles.warningBannerText}>
            {collectorStatus === USER_STATUS.PENDING_VERIFICATION
              ? '⏳ Account Pending Verification: You can view assigned pickups, but starting or completing collections requires administrative approval.'
              : '⚠ Account Suspended: Your collector account privileges are temporarily restricted.'}
          </Text>
        </View>
      )}

      {/* Error Banner */}
      {Boolean(error) && (
        <View style={styles.errorBanner} accessibilityRole="alert">
          <Text style={styles.errorBannerText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => loadPickups(false)}
            accessibilityRole="button"
            accessibilityLabel="Retry loading pickups"
          >
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Filter Tabs */}
      {renderFilterChips()}

      {/* Main Content */}
      {isLoading ? (
        <View style={styles.skeletonContainer}>
          <Skeleton width="100%" height={160} style={styles.skeletonCard} />
          <Skeleton width="100%" height={160} style={styles.skeletonCard} />
          <Skeleton width="100%" height={160} style={styles.skeletonCard} />
        </View>
      ) : (
        <FlatList
          data={filteredPickups}
          renderItem={renderPickupCard}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={renderEmptyState}
          initialNumToRender={5}
          maxToRenderPerBatch={10}
          windowSize={5}
        />
      )}

      {/* Complete Pickup Modal */}
      <Modal
        visible={Boolean(completingPickup)}
        transparent
        animationType="slide"
        onRequestClose={handleCloseCompleteModal}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardAvoidContainer}
          >
            <View
              style={styles.modalContainer}
              accessibilityRole="none"
              accessibilityLabel="Complete Pickup Modal"
            >
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('collector.pickups.completeModalTitle') || 'Complete Pickup'}</Text>
                <Text style={styles.modalSubtitle}>
                  Record verified e-waste weights collected at the citizen doorstep.
                </Text>
              </View>

              {/* Error Message */}
              {Boolean(completionError) && (
                <View style={styles.modalErrorBox} accessibilityRole="alert">
                  <Text style={styles.modalErrorText}>{completionError}</Text>
                </View>
              )}

              {/* Items List for Weight Recording */}
              <Text style={styles.modalSectionTitle}>{t('collector.pickups.verifiedWeights') || 'E-Waste Items Collected'}</Text>
              {(completingPickup?.collectionRequest?.ewasteItems || []).map((item: any) => (
                <View key={item.id} style={styles.modalItemRow}>
                  <View style={styles.modalItemInfo}>
                    <Text style={styles.modalItemCategory}>
                      {item.category}
                      {item.subcategory ? ` (${item.subcategory})` : ''}
                    </Text>
                    <Text style={styles.modalItemSub}>
                      Est: {item.estimatedWeightKg ?? 1.0} kg • Qty: {item.quantity ?? 1}
                    </Text>
                  </View>
                  <View style={styles.modalWeightInputContainer}>
                    <TextInput
                      style={styles.weightInput}
                      value={itemWeights[item.id] || ''}
                      onChangeText={(val) => handleItemWeightChange(item.id, val)}
                      placeholder="0.0"
                      keyboardType="decimal-pad"
                      accessibilityLabel={`Actual weight for ${item.category} in kilograms`}
                      editable={!isSubmittingCompletion}
                    />
                    <Text style={styles.weightUnit}>kg</Text>
                  </View>
                </View>
              ))}

              {/* Calculated Total Weight */}
              <View style={styles.totalWeightBox}>
                <Text style={styles.totalWeightLabel}>{t('collector.delivery.totalWeight') || 'Total Collected Weight'}:</Text>
                <Text style={styles.totalWeightValue}>{calculatedTotalWeight} kg</Text>
              </View>

              {/* Collector Notes */}
              <Text style={styles.modalSectionTitle}>{t('collector.pickups.collectorNotes') || 'Collector Notes (Optional)'}</Text>
              <TextInput
                style={styles.notesInput}
                value={collectorNotes}
                onChangeText={setCollectorNotes}
                placeholder={t('collector.pickups.notesPlaceholder') || 'e.g. Collected in good condition from doorstep...'}
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={3}
                maxLength={500}
                accessibilityLabel="Collector completion notes"
                editable={!isSubmittingCompletion}
              />

              {/* Modal Action Buttons */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={handleCloseCompleteModal}
                  disabled={isSubmittingCompletion}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel pickup completion"
                >
                  <Text style={styles.modalCancelText}>{t('collector.pickups.cancel') || 'Cancel'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modalSubmitBtn,
                    (isSubmittingCompletion || calculatedTotalWeight < 0.01) &&
                      styles.btnDisabled,
                  ]}
                  onPress={handleConfirmCompletion}
                  disabled={isSubmittingCompletion || calculatedTotalWeight < 0.01}
                  accessibilityRole="button"
                  accessibilityLabel="Submit and finalize pickup"
                  accessibilityState={{
                    disabled: isSubmittingCompletion || calculatedTotalWeight < 0.01,
                    busy: isSubmittingCompletion,
                  }}
                >
                  {isSubmittingCompletion ? (
                    <ActivityIndicator size="small" color={colors.surface} />
                  ) : (
                    <Text style={styles.modalSubmitText}>{t('collector.pickups.confirmCompletion') || 'Confirm Completion'}</Text>
                  )}
                </TouchableOpacity>
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  cacheNotice: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: spacing.spaceMd,
    paddingVertical: spacing.spaceSm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 158, 11, 0.30)',
  },
  cacheNoticeText: {
    fontSize: typography.Caption.fontSize,
    color: '#FBBF24',
    textAlign: 'center',
    fontWeight: '500',
  },
  warningBanner: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: spacing.spaceMd,
    paddingVertical: spacing.spaceSm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 158, 11, 0.30)',
  },
  warningBannerText: {
    fontSize: typography.Caption.fontSize,
    color: '#FBBF24',
    fontWeight: '600',
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    padding: spacing.spaceMd,
    marginHorizontal: spacing.spaceMd,
    marginTop: spacing.spaceSm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorBannerText: {
    fontSize: typography.Body.fontSize,
    color: '#FCA5A5',
    flex: 1,
    marginRight: spacing.spaceSm,
  },
  retryBtn: {
    backgroundColor: colors.error,
    paddingHorizontal: spacing.spaceMd,
    paddingVertical: spacing.spaceXs,
    borderRadius: 4,
    minHeight: 48,
    justifyContent: 'center',
  },
  retryBtnText: {
    color: colors.surface,
    fontWeight: '700',
    fontSize: typography.Caption.fontSize,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.spaceMd,
    paddingVertical: spacing.spaceSm,
    backgroundColor: 'rgba(6, 21, 27, 0.75)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(45, 212, 191, 0.20)',
  },
  filterChip: {
    paddingHorizontal: spacing.spaceSm + 4,
    paddingVertical: spacing.spaceXs + 2,
    borderRadius: 16,
    backgroundColor: 'rgba(6, 21, 27, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.20)',
    marginRight: spacing.spaceXs,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: typography.Caption.fontSize,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  skeletonContainer: {
    padding: spacing.spaceMd,
  },
  skeletonCard: {
    marginBottom: spacing.spaceMd,
    borderRadius: 14,
  },
  listContent: {
    padding: spacing.spaceMd,
    paddingBottom: spacing.spaceXl * 2,
  },
  card: {
    backgroundColor: colors.glassFillElevated,
    borderRadius: 14,
    padding: spacing.spaceMd,
    marginBottom: spacing.spaceMd,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.spaceSm,
    paddingBottom: spacing.spaceSm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  cardRef: {
    fontSize: typography.Subheading.fontSize,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cardReqRef: {
    fontSize: typography.Caption.fontSize,
    color: colors.textSecondary,
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.spaceSm,
  },
  infoIcon: {
    fontSize: 16,
    marginRight: spacing.spaceSm,
    marginTop: 2,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: typography.Body.fontSize,
    color: colors.textPrimary,
    fontWeight: '500',
    marginTop: 1,
  },
  itemsSection: {
    backgroundColor: 'rgba(6, 21, 27, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.25)',
    borderRadius: 8,
    padding: spacing.spaceSm,
    marginVertical: spacing.spaceSm,
  },
  itemsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: spacing.spaceXs,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  itemBullet: {
    fontSize: 12,
    color: colors.primary,
    marginRight: 6,
  },
  itemDesc: {
    fontSize: 12,
    color: colors.textPrimary,
    flex: 1,
  },
  completedMetaBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    borderRadius: 8,
    padding: spacing.spaceSm,
    marginVertical: spacing.spaceSm,
  },
  completedMetaText: {
    fontSize: typography.Body.fontSize,
    color: '#34D399',
    fontWeight: '700',
  },
  completedMetaSub: {
    fontSize: 11,
    color: '#A7F3D0',
    marginTop: 2,
  },
  completedNotes: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  inProgressMetaBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    borderRadius: 8,
    padding: spacing.spaceSm,
    marginVertical: spacing.spaceSm,
  },
  inProgressMetaText: {
    fontSize: 12,
    color: '#FBBF24',
    fontWeight: '600',
  },
  cancelledMetaBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    borderRadius: 8,
    padding: spacing.spaceSm,
    marginVertical: spacing.spaceSm,
  },
  cancelledMetaText: {
    fontSize: 12,
    color: '#F87171',
    fontWeight: '600',
  },
  actionContainer: {
    marginTop: spacing.spaceSm,
  },
  actionBtn: {
    borderRadius: 8,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapNavBtn: {
    backgroundColor: 'rgba(13, 148, 136, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(13, 148, 136, 0.35)',
    marginBottom: spacing.spaceXs,
  },
  mapNavBtnText: {
    color: colors.primary,
    fontSize: typography.Button.fontSize,
    fontWeight: '700',
  },
  startBtn: {
    backgroundColor: colors.primary,
  },
  startBtnText: {
    color: colors.surface,
    fontSize: typography.Button.fontSize,
    fontWeight: '700',
  },
  completeBtn: {
    backgroundColor: '#2E7D32',
  },
  completeBtnText: {
    color: colors.surface,
    fontSize: typography.Button.fontSize,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  keyboardAvoidContainer: {
    width: '100%',
    justifyContent: 'flex-end',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 8, 13, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#071A21',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.35)',
    padding: spacing.spaceLg,
    maxHeight: '90%',
    elevation: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
  },
  modalHeader: {
    marginBottom: spacing.spaceMd,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
    lineHeight: 18,
  },
  modalErrorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.40)',
    padding: spacing.spaceSm,
    borderRadius: 8,
    marginBottom: spacing.spaceSm,
  },
  modalErrorText: {
    color: '#FCA5A5',
    fontSize: 12,
    fontWeight: '600',
  },
  modalSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#E2E8F0',
    marginBottom: spacing.spaceSm,
    marginTop: spacing.spaceSm,
  },
  modalItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.spaceSm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.10)',
  },
  modalItemInfo: {
    flex: 1,
  },
  modalItemCategory: {
    fontSize: typography.Body.fontSize,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalItemSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  modalWeightInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weightInput: {
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.35)',
    borderRadius: 8,
    paddingHorizontal: spacing.spaceSm,
    paddingVertical: spacing.spaceXs,
    width: 80,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
    textAlign: 'center',
    backgroundColor: 'rgba(6, 21, 27, 0.90)',
    minHeight: 48,
  },
  weightUnit: {
    fontSize: typography.Body.fontSize,
    color: '#10B981',
    marginLeft: 6,
    fontWeight: '700',
  },
  totalWeightBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    padding: spacing.spaceMd,
    borderRadius: 10,
    marginVertical: spacing.spaceMd,
  },
  totalWeightLabel: {
    fontSize: typography.Body.fontSize,
    fontWeight: '700',
    color: '#A7F3D0',
  },
  totalWeightValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#34D399',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.25)',
    borderRadius: 10,
    padding: spacing.spaceSm,
    fontSize: typography.Body.fontSize,
    color: '#FFFFFF',
    minHeight: 70,
    textAlignVertical: 'top',
    backgroundColor: 'rgba(6, 21, 27, 0.90)',
    marginBottom: spacing.spaceLg,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.spaceMd,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: spacing.spaceMd,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.20)',
    minHeight: 48,
  },
  modalCancelText: {
    color: '#CBD5E1',
    fontSize: typography.Button.fontSize,
    fontWeight: '600',
  },
  modalSubmitBtn: {
    flex: 2,
    backgroundColor: '#10B981',
    borderWidth: 1,
    borderColor: '#34D399',
    paddingVertical: spacing.spaceMd,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    minHeight: 48,
  },
  modalSubmitText: {
    color: '#03120E',
    fontSize: typography.Button.fontSize,
    fontWeight: '800',
  },
});

export default CollectorPickupsScreen;
