/**
 * CollectorBrowseScreen
 * Authenticated INFORMAL_COLLECTOR — Browse / Available Collection Requests screen.
 *
 * ECOSETU Business Chain: CITIZEN → LOCAL INFORMAL COLLECTOR / KABADIWALA → FORMAL RECYCLER
 *
 * This screen allows verified collectors to:
 *   - Browse SUBMITTED citizen collection requests available for pickup
 *   - Accept a request (POST /api/v1/collection-requests/:id/accept)
 *   - Paginate through results (page/limit supported by backend)
 *   - Pull-to-refresh the list
 *   - Browse cached results while offline (accept blocked offline)
 *
 * PRIVACY INVARIANTS (server-enforced, must not be reconstructed client-side):
 *   pickupAddress = "Approximate Location (Exact address revealed upon acceptance)"
 *   pickupLat/pickupLng = rounded to 2 decimal places until accepted
 *   No citizen email, phone, or exact address/coordinates displayed
 *
 * DOES NOT IMPLEMENT:
 *   - Pickup execution (start/complete)
 *   - Consignment creation
 *   - Recycler search or discovery
 *   - Citizen→Recycler interactions
 *   - Maps (deferred future task)
 *   - Admin functionality
 *
 * API Endpoints (all verified from backend source):
 *   GET  /api/v1/collection-requests/available  — params: lat, lng, radiusKm, page, limit
 *   POST /api/v1/collection-requests/:id/accept — server-authoritative, requires online
 *
 * Source of Truth:
 *   docs/05_API_SPECIFICATION.md Sections 4, 7
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
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
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

// ─── Constants ────────────────────────────────────────────────────────────────

/** Canonical UserStatus values from Prisma schema */
const USER_STATUS = Object.freeze({
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  DEACTIVATED: 'DEACTIVATED',
});

const PAGE_SIZE = 20; // Matches backend default (max 50)

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (iso?: string | null): string => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
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
    // preferredTimeStart/End stored as 1970-01-01T{HH:mm}:00Z
    const d = new Date(iso);
    const h = d.getUTCHours().toString().padStart(2, '0');
    const m = d.getUTCMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  } catch {
    return '';
  }
};

const fmtCategory = (cat: string): string => {
  if (!cat) return '—';
  return cat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

const summarizeCategories = (ewasteItems: any[]): string => {
  if (!Array.isArray(ewasteItems) || ewasteItems.length === 0) return '—';
  const cats = [...new Set(ewasteItems.map((i) => fmtCategory(i.category)))];
  return cats.slice(0, 2).join(', ') + (cats.length > 2 ? ` +${cats.length - 2}` : '');
};

const countTotalItems = (ewasteItems: any[]): number =>
  Array.isArray(ewasteItems)
    ? ewasteItems.reduce((sum, i) => sum + (parseInt(i.quantity) || 1), 0)
    : 0;

const totalEstimatedWeight = (ewasteItems: any[]): string => {
  if (!Array.isArray(ewasteItems) || ewasteItems.length === 0) return '';
  const total = ewasteItems.reduce((sum, i) => {
    const w = parseFloat(i.estimatedWeightKg);
    return sum + (isNaN(w) ? 0 : w);
  }, 0);
  return total > 0 ? `~${total.toFixed(1)} kg` : '';
};

// ─── Loading Skeletons ─────────────────────────────────────────────────────────

const RequestCardSkeleton: React.FC = () => (
  <View style={skeletonStyles.card}>
    <View style={skeletonStyles.row}>
      <Skeleton width={40} height={40} borderRadius={20} />
      <View style={{ flex: 1, marginLeft: spacing.spaceSm }}>
        <Skeleton height={14} width="65%" style={{ marginBottom: 6 }} />
        <Skeleton height={12} width="45%" />
      </View>
      <Skeleton width={64} height={20} borderRadius={10} />
    </View>
    <View style={{ height: spacing.spaceXs }} />
    <Skeleton height={12} width="80%" style={{ marginBottom: 5 }} />
    <Skeleton height={12} width="60%" style={{ marginBottom: spacing.spaceSm }} />
    <Skeleton height={40} borderRadius={8} />
  </View>
);

const skeletonStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: spacing.spaceMd,
    marginBottom: spacing.spaceSm,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
});

// ─── Request Item Card ─────────────────────────────────────────────────────────

interface RequestCardProps {
  request: any;
  isAccepting: boolean;
  isConnected: boolean;
  isVerified: boolean;
  onAccept: (requestId: string) => void;
}

const RequestCard = React.memo<RequestCardProps>(
  ({ request, isAccepting, isConnected, isVerified, onAccept }) => {
    const itemCount = countTotalItems(request.ewasteItems);
    const categories = summarizeCategories(request.ewasteItems);
    const estWeight = totalEstimatedWeight(request.ewasteItems);
    const canAccept = isConnected && isVerified && !isAccepting;

    const preferredDateLabel =
      request.preferredDate ? fmtDate(request.preferredDate) : null;
    const timeStart = request.preferredTimeStart ? fmtTime(request.preferredTimeStart) : null;
    const timeEnd = request.preferredTimeEnd ? fmtTime(request.preferredTimeEnd) : null;
    const timeWindow =
      timeStart && timeEnd
        ? `${timeStart}–${timeEnd}`
        : timeStart
        ? timeStart
        : null;

    const accessLabel = [
      `Collection request: ${categories}`,
      `${itemCount} item${itemCount !== 1 ? 's' : ''}`,
      estWeight ? estWeight : '',
      preferredDateLabel ? `Preferred ${preferredDateLabel}` : '',
    ]
      .filter(Boolean)
      .join(', ');

    return (
      <View
        style={cardStyles.container}
        accessibilityRole="none"
        accessibilityLabel={accessLabel}
      >
        {/* ── Header row: icon + categories + item count ── */}
        <View style={cardStyles.headerRow}>
          <View style={cardStyles.iconCircle} accessibilityElementsHidden>
            <Text style={cardStyles.iconText}>📦</Text>
          </View>
          <View style={{ flex: 1, marginLeft: spacing.spaceSm }}>
            <Text style={cardStyles.categoryText} numberOfLines={1}>
              {categories}
            </Text>
            <Text style={cardStyles.subText}>
              {itemCount} item{itemCount !== 1 ? 's' : ''}
              {estWeight ? ` · ${estWeight}` : ''}
            </Text>
          </View>
          <StatusBadge status="SUBMITTED" />
        </View>

        <View style={cardStyles.divider} />

        {/* ── Privacy-masked pickup location (backend provides this text) ── */}
        <View style={cardStyles.infoRow}>
          <Text style={cardStyles.infoIcon} accessibilityElementsHidden>
            📍
          </Text>
          <Text style={cardStyles.infoText} numberOfLines={2}>
            {/*
             * Backend always returns:
             * "Approximate Location (Exact address revealed upon acceptance)"
             * We display exactly what the backend provides — no reconstruction.
             */}
            {request.pickupAddress || 'Approximate location'}
          </Text>
        </View>

        {/* ── Preferred pickup date ── */}
        {Boolean(preferredDateLabel) && (
          <View style={cardStyles.infoRow}>
            <Text style={cardStyles.infoIcon} accessibilityElementsHidden>
              🗓
            </Text>
            <Text style={cardStyles.infoText}>
              {preferredDateLabel}
              {timeWindow ? ` · ${timeWindow}` : ''}
            </Text>
          </View>
        )}

        {/* ── Submission date ── */}
        <View style={cardStyles.infoRow}>
          <Text style={cardStyles.infoIcon} accessibilityElementsHidden>
            🕐
          </Text>
          <Text style={cardStyles.infoText}>
            Submitted {fmtDate(request.createdAt || request.submittedAt)}
          </Text>
        </View>

        {/* ── Notes (if any) ── */}
        {Boolean(request.notes) && (
          <Text style={cardStyles.notesText} numberOfLines={3}>
            "{request.notes}"
          </Text>
        )}

        {/* ── E-waste item breakdown ── */}
        {Array.isArray(request.ewasteItems) && request.ewasteItems.length > 0 && (
          <View style={cardStyles.itemsRow}>
            {request.ewasteItems.slice(0, 3).map((item: any, idx: number) => (
              <View key={item.id || idx} style={cardStyles.itemChip}>
                <Text style={cardStyles.itemChipText} numberOfLines={1}>
                  {fmtCategory(item.category)}
                  {item.quantity && item.quantity > 1 ? ` ×${item.quantity}` : ''}
                </Text>
              </View>
            ))}
            {request.ewasteItems.length > 3 && (
              <View style={[cardStyles.itemChip, cardStyles.itemChipMore]}>
                <Text style={cardStyles.itemChipText}>
                  +{request.ewasteItems.length - 3} more
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ── Accept action ── */}
        <TouchableOpacity
          style={[
            cardStyles.acceptButton,
            !canAccept && cardStyles.acceptButtonDisabled,
          ]}
          onPress={() => onAccept(request.id)}
          disabled={!canAccept}
          accessibilityRole="button"
          accessibilityLabel={
            isAccepting
              ? 'Accepting this request, please wait'
              : !isVerified
              ? 'Account verification required to accept requests'
              : !isConnected
              ? 'Internet connection required to accept request'
              : `Accept ${categories} collection request`
          }
          accessibilityState={{
            disabled: !canAccept,
            busy: isAccepting,
          }}
          accessibilityHint={
            canAccept ? 'Double tap to accept this collection request' : undefined
          }
          activeOpacity={0.75}
        >
          {isAccepting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={cardStyles.acceptButtonText}>✅ Accept Request</Text>
          )}
        </TouchableOpacity>

        {/* ── Contextual disable hints (color-independent text) ── */}
        {!isConnected && (
          <Text
            style={cardStyles.disabledHint}
            accessibilityRole="text"
            accessibilityLabel="Internet connection required to accept this request"
          >
            📡 Internet required to accept
          </Text>
        )}
        {isConnected && !isVerified && (
          <Text
            style={[cardStyles.disabledHint, { color: colors.warning }]}
            accessibilityRole="text"
            accessibilityLabel="Account verification required to accept requests"
          >
            🔒 Verification required
          </Text>
        )}
      </View>
    );
  },
);

const cardStyles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: spacing.spaceMd,
    marginBottom: spacing.spaceSm,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.spaceXs,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { fontSize: 18 },
  categoryText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.spaceXs,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 4,
  },
  infoIcon: { fontSize: 12, marginTop: 2 },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  notesText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: spacing.spaceXs,
    marginBottom: spacing.spaceXs,
    lineHeight: 18,
  },
  itemsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: spacing.spaceXs,
    marginBottom: spacing.spaceXs,
  },
  itemChip: {
    backgroundColor: `${colors.primary}12`,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  itemChipMore: {
    backgroundColor: `${colors.textSecondary}12`,
  },
  itemChipText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  acceptButton: {
    marginTop: spacing.spaceSm,
    backgroundColor: colors.primary,
    borderRadius: 8,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButtonDisabled: { opacity: 0.4 },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: typography.Button.fontSize,
    fontWeight: '700',
  },
  disabledHint: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
});

// ─── Load-more footer ─────────────────────────────────────────────────────────

const LoadMoreFooter: React.FC<{ isLoadingMore: boolean }> = ({ isLoadingMore }) => {
  if (!isLoadingMore) return <View style={{ height: spacing.spaceXl }} />;
  return (
    <View style={footerStyles.container} accessibilityRole="progressbar" accessibilityLabel="Loading more requests">
      <ActivityIndicator size="small" color={colors.primary} />
      <Text style={footerStyles.text}>Loading more…</Text>
    </View>
  );
};

const footerStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.spaceSm,
    padding: spacing.spaceMd,
  },
  text: { fontSize: 13, color: colors.textSecondary },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export const CollectorBrowseScreen: React.FC = () => {
  const { user } = useAuth();
  const { isConnected } = useNetwork();

  // ── Data state ─────────────────────────────────────────────────────────────
  const [requests, setRequests] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [fromCache, setFromCache] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isVerificationError, setIsVerificationError] = useState<boolean>(false);

  // ── Accept state ───────────────────────────────────────────────────────────
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const acceptingRef = useRef<boolean>(false);
  const refreshingRef = useRef<boolean>(false);
  const loadingMoreRef = useRef<boolean>(false);

  // ── Verification check ─────────────────────────────────────────────────────
  // Backend enforces this via checkVerified — we provide a UI hint only.
  const collectorStatus = user?.status;
  const isVerified = collectorStatus === USER_STATUS.ACTIVE;

  // ── Load page 1 ────────────────────────────────────────────────────────────

  const loadRequests = useCallback(async (silent = false) => {
    if (!silent) setError(null);
    setIsVerificationError(false);

    try {
      const result = await collectorService.getAvailableRequests({ page: 1, limit: PAGE_SIZE });
      setRequests(result.requests);
      setPagination(result.pagination);
      setFromCache(result.fromCache);
    } catch (err: any) {
      const status = err?.response?.status;
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Unable to load available requests.';

      if (status === 403) {
        // checkVerified returned 403 — collector not ACTIVE
        setIsVerificationError(true);
        setRequests([]);
        setPagination(null);
      } else {
        setError(msg);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadRequests(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Pull-to-refresh ────────────────────────────────────────────────────────

  const handleRefresh = useCallback(() => {
    if (refreshingRef.current) return; // Prevent double refresh
    refreshingRef.current = true;
    setIsRefreshing(true);
    loadRequests(true).finally(() => {
      refreshingRef.current = false;
    });
  }, [loadRequests]);

  // ── Load more (pagination) ─────────────────────────────────────────────────

  const handleLoadMore = useCallback(async () => {
    if (!isConnected) return; // No offline pagination
    if (loadingMoreRef.current) return;
    if (!pagination) return;
    const currentPage = pagination.page ?? 1;
    const totalPages = pagination.totalPages ?? 1;
    if (currentPage >= totalPages) return; // Already on last page

    loadingMoreRef.current = true;
    setIsLoadingMore(true);

    try {
      const nextPage = currentPage + 1;
      const result = await collectorService.getAvailableRequests({
        page: nextPage,
        limit: PAGE_SIZE,
      });
      // Append new results, avoiding duplicates by id
      setRequests((prev) => {
        const existingIds = new Set(prev.map((r) => r.id));
        const newItems = result.requests.filter((r: any) => !existingIds.has(r.id));
        return [...prev, ...newItems];
      });
      setPagination(result.pagination);
      // Do NOT update fromCache here — page 1 cache is the baseline
    } catch {
      // Non-fatal — just stop loading more
    } finally {
      loadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  }, [isConnected, pagination]);

  // ── Accept request ─────────────────────────────────────────────────────────

  const handleAccept = useCallback(
    async (requestId: string) => {
      if (acceptingRef.current) return;

      if (!isConnected) {
        Alert.alert(
          'Offline',
          'An internet connection is required to accept collection requests.\nReal-time availability check is required.',
          [{ text: 'OK' }],
        );
        return;
      }

      if (!isVerified) {
        Alert.alert(
          'Verification Required',
          'Your account must be approved before you can accept collection requests.',
          [{ text: 'OK' }],
        );
        return;
      }

      Alert.alert(
        'Accept Request',
        'Accept this collection request? You will be responsible for collecting the e-waste.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Accept',
            style: 'default',
            onPress: async () => {
              acceptingRef.current = true;
              setAcceptingId(requestId);

              try {
                await collectorService.acceptRequest(requestId);

                // Remove accepted request from the list immediately
                setRequests((prev) => prev.filter((r) => r.id !== requestId));
                // Adjust pagination total if known
                setPagination((prev: any) =>
                  prev ? { ...prev, total: Math.max(0, (prev.total ?? 1) - 1) } : prev,
                );

                Alert.alert(
                  '✅ Request Accepted',
                  'The citizen has been notified. A pickup has been scheduled for you.',
                  [{ text: 'OK' }],
                );
              } catch (err: any) {
                const status = err?.response?.status;
                const msg = err?.response?.data?.message || err?.message || 'Failed to accept request.';

                if (status === 409) {
                  // Another collector already accepted this — remove from list
                  setRequests((prev) => prev.filter((r) => r.id !== requestId));
                  Alert.alert(
                    'Request No Longer Available',
                    'This request was just accepted by another collector.',
                    [{ text: 'OK' }],
                  );
                } else if (status === 403) {
                  Alert.alert(
                    'Access Denied',
                    'You do not have permission to accept this request. Ensure your account is verified.',
                    [{ text: 'OK' }],
                  );
                } else if (status === 404) {
                  setRequests((prev) => prev.filter((r) => r.id !== requestId));
                  Alert.alert(
                    'Request Not Found',
                    'This request may have been cancelled or already accepted.',
                    [{ text: 'OK' }],
                  );
                } else if (status === 429) {
                  Alert.alert(
                    'Too Many Requests',
                    'You are sending requests too quickly. Please try again in a moment.',
                    [{ text: 'OK' }],
                  );
                } else if (err?.isOfflineError) {
                  Alert.alert(
                    'Offline',
                    'Cannot accept requests without an internet connection.',
                    [{ text: 'OK' }],
                  );
                } else {
                  Alert.alert('Error', msg, [{ text: 'OK' }]);
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
    },
    [isConnected, isVerified],
  );

  // ── Render helpers ─────────────────────────────────────────────────────────

  const renderItem = useCallback(
    ({ item }: { item: any }) => (
      <RequestCard
        request={item}
        isAccepting={acceptingId === item.id}
        isConnected={isConnected}
        isVerified={isVerified}
        onAccept={handleAccept}
      />
    ),
    [acceptingId, isConnected, isVerified, handleAccept],
  );

  const keyExtractor = useCallback((item: any) => item.id, []);

  // ─── Initial loading state ────────────────────────────────────────────────

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <TopAppBar
          title="Available Requests"
          subtitle="Browse collection opportunities"
          roleBadge="INFORMAL_COLLECTOR"
        />
        <View style={styles.scrollContent}>
          {[0, 1, 2].map((i) => (
            <RequestCardSkeleton key={i} />
          ))}
        </View>
      </SafeAreaView>
    );
  }

  // ─── Main render ──────────────────────────────────────────────────────────

  const totalCount = pagination?.total ?? requests.length;
  const subtitle =
    totalCount > 0
      ? `${totalCount} request${totalCount !== 1 ? 's' : ''} available`
      : 'Browse collection opportunities';

  return (
    <SafeAreaView style={styles.container}>
      <TopAppBar
        title="Available Requests"
        subtitle={subtitle}
        roleBadge="INFORMAL_COLLECTOR"
      />

      {/* ── Account status banners ── */}
      {collectorStatus === USER_STATUS.SUSPENDED && (
        <View style={styles.alertBanner} accessibilityRole="alert">
          <Text style={[styles.alertText, { color: '#B71C1C' }]}>
            ⚠️ Your account is suspended. You cannot accept requests. Contact support.
          </Text>
        </View>
      )}
      {collectorStatus === USER_STATUS.DEACTIVATED && (
        <View style={styles.alertBanner} accessibilityRole="alert">
          <Text style={[styles.alertText, { color: '#B71C1C' }]}>
            ⚠️ This account has been deactivated.
          </Text>
        </View>
      )}
      {collectorStatus === USER_STATUS.PENDING_VERIFICATION && (
        <View style={[styles.alertBanner, { backgroundColor: '#FFF3E0' }]} accessibilityRole="alert">
          <Text style={[styles.alertText, { color: '#BF360C' }]}>
            🕐 Pending verification. Available requests shown after your account is approved.
          </Text>
        </View>
      )}

      <FlatList
        data={requests}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListHeaderComponent={
          <>
            {/* ── Offline banner ── */}
            {!isConnected && <OfflineBanner />}

            {/* ── Stale cache notice ── */}
            {fromCache && (
              <View style={styles.cacheNotice}>
                <Text style={styles.cacheNoticeText}>
                  📴 Showing cached requests (last synced while online)
                </Text>
              </View>
            )}

            {/* ── Privacy note ── */}
            <View style={styles.privacyNote}>
              <Text style={styles.privacyNoteText}>
                🔒 Exact pickup address is revealed only after you accept a request.
              </Text>
            </View>

            {/* ── Verification required state ── */}
            {isVerificationError && (
              <EmptyState
                icon="🔒"
                title="Verification Required"
                message="Your account must be approved before you can browse available collection requests."
              />
            )}

            {/* ── Error state ── */}
            {Boolean(error) && !isVerificationError && (
              <View style={styles.errorCard} accessibilityRole="alert">
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity
                  onPress={handleRefresh}
                  style={styles.retryBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Retry loading available requests"
                >
                  <Text style={styles.retryBtnText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          !error && !isVerificationError ? (
            <EmptyState
              icon="🔍"
              title="No Requests Available"
              message={
                !isConnected && !fromCache
                  ? 'You are offline and no cached requests are available. Go online and pull down to refresh.'
                  : 'There are no collection requests available in your service area right now. Pull down to refresh.'
              }
              actionLabel={isConnected ? 'Refresh' : undefined}
              onAction={isConnected ? handleRefresh : undefined}
            />
          ) : null
        }
        ListFooterComponent={<LoadMoreFooter isLoadingMore={isLoadingMore} />}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
      />
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.spaceMd,
  },
  listContent: {
    padding: spacing.spaceMd,
    paddingBottom: spacing.spaceXl,
  },

  // ── Banners ──
  alertBanner: {
    backgroundColor: '#FFEBEE',
    padding: spacing.spaceMd,
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  alertText: {
    fontSize: 13,
    lineHeight: 19,
  },
  cacheNotice: {
    backgroundColor: '#FFF9C4',
    borderRadius: 6,
    padding: spacing.spaceXs,
    marginBottom: spacing.spaceSm,
  },
  cacheNoticeText: {
    fontSize: 12,
    color: '#F57F17',
  },
  privacyNote: {
    backgroundColor: `${colors.secondary}10`,
    borderRadius: 6,
    padding: spacing.spaceXs,
    marginBottom: spacing.spaceSm,
  },
  privacyNoteText: {
    fontSize: 11,
    color: colors.secondary,
    lineHeight: 16,
  },

  // ── Error card ──
  errorCard: {
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: spacing.spaceMd,
    marginBottom: spacing.spaceMd,
  },
  errorText: {
    fontSize: 13,
    color: colors.error,
    marginBottom: spacing.spaceSm,
    lineHeight: 19,
  },
  retryBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.spaceMd,
    paddingVertical: spacing.spaceXs + 2,
    backgroundColor: colors.primary,
    borderRadius: 6,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});

export default CollectorBrowseScreen;
