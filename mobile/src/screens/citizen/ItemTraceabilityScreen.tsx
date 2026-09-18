/**
 * ItemTraceabilityScreen
 * Citizen view — Full lifecycle chain of custody for an e-waste item.
 *
 * ECOSETU Business Chain:
 *   CITIZEN → LOCAL INFORMAL COLLECTOR (Kabadiwala) → FORMAL RECYCLER
 *
 * This screen shows the item's journey without creating any direct
 * Citizen → Recycler transaction.  The informal collector remains a
 * mandatory intermediary and is always displayed as the collection side.
 *
 * API: GET /api/v1/ewaste-items/:id/traceability
 * Source of Truth:
 *   - docs/05_API_SPECIFICATION.md
 *   - docs/07_BUSINESS_WORKFLOWS.md
 *   - docs/08_UI_UX_SPECIFICATION.md
 *   - docs/09_FRONTEND_ARCHITECTURE.md
 *   - docs/21_TRACEABILITY_AND_AUDIT.md
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CitizenStackParamList } from '../../navigation/types';
import { useNetwork } from '../../hooks/useNetwork';
import { TopAppBar } from '../../components/layout/TopAppBar';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Skeleton } from '../../components/common/Skeleton';
import { OfflineBanner } from '../../components/common/OfflineBanner';
import { ewasteService } from '../../services/ewasteService';
import {
  ITEM_STATUS,
  CONSIGNMENT_STATUS,
  RECYCLING_STATUS,
  PICKUP_STATUS,
} from '../../utils/constants';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

type Props = NativeStackScreenProps<CitizenStackParamList, 'ItemTraceability'>;

// ─── Chain Stage Config ────────────────────────────────────────────────────────

interface ChainStage {
  id: string;
  icon: string;
  actorLabel: string;  // Who is acting
  stageLabel: string;  // What the stage is called
  completedKey: keyof TraceabilityData; // Which field signals completion
}

/**
 * Ordered stages of the ECOSETU lifecycle chain.
 * Aligns with docs/07_BUSINESS_WORKFLOWS.md and docs/21_TRACEABILITY_AND_AUDIT.md.
 *
 * NOTE: Citizen is always Stage 0 (originator), not a "recipient".
 *       Informal Collector is the mandatory collection-side intermediary.
 *       Recycler receives items from the collector, NEVER directly from citizens.
 */
const CHAIN_STAGES: ChainStage[] = [
  {
    id: 'citizen',
    icon: '👤',
    actorLabel: 'You (Citizen)',
    stageLabel: 'Submitted',
    completedKey: 'item',
  },
  {
    id: 'collector',
    icon: '♻️',
    actorLabel: 'Informal Collector (Kabadiwala)',
    stageLabel: 'Collected',
    completedKey: 'request',
  },
  {
    id: 'consignment',
    icon: '🚛',
    actorLabel: 'Collector → Recycler',
    stageLabel: 'Consignment',
    completedKey: 'consignment',
  },
  {
    id: 'recycler',
    icon: '🏭',
    actorLabel: 'Formal Recycler',
    stageLabel: 'Recycled',
    completedKey: 'recyclingRecord',
  },
];

// ─── Data Helpers ──────────────────────────────────────────────────────────────

interface TraceabilityData {
  item?: any;
  request?: any;
  pickup?: any;
  consignment?: any;
  recyclingRecord?: any;
  certificate?: any;
}

/**
 * Determine whether a chain stage is "complete" based on status values.
 * Rules derived from docs/07_BUSINESS_WORKFLOWS.md and docs/04_DATABASE_SCHEMA.md.
 */
const isStageComplete = (stageId: string, data: TraceabilityData): boolean => {
  switch (stageId) {
    case 'citizen':
      return !!(data.item?.status && data.item.status !== ITEM_STATUS.DRAFT);
    case 'collector':
      return !!(
        data.request?.status === 'PICKED_UP' ||
        data.pickup?.status === PICKUP_STATUS.COMPLETED ||
        data.item?.status === ITEM_STATUS.COLLECTED ||
        data.item?.status === ITEM_STATUS.RECYCLED
      );
    case 'consignment':
      return !!(
        data.consignment &&
        [CONSIGNMENT_STATUS.ACCEPTED, CONSIGNMENT_STATUS.IN_TRANSIT].includes(
          data.consignment.status,
        )
      );
    case 'recycler':
      return !!(
        data.recyclingRecord ||
        data.item?.status === ITEM_STATUS.RECYCLED
      );
    default:
      return false;
  }
};

const isStageInProgress = (stageId: string, data: TraceabilityData): boolean => {
  switch (stageId) {
    case 'citizen':
      return data.item?.status === ITEM_STATUS.SUBMITTED;
    case 'collector':
      return !!(
        data.request?.status === 'ACCEPTED' ||
        data.request?.status === 'PICKUP_SCHEDULED' ||
        data.pickup?.status === PICKUP_STATUS.SCHEDULED ||
        data.pickup?.status === PICKUP_STATUS.IN_PROGRESS
      );
    case 'consignment':
      return data.consignment?.status === CONSIGNMENT_STATUS.PENDING;
    case 'recycler':
      return data.recyclingRecord?.status === RECYCLING_STATUS.PROCESSING;
    default:
      return false;
  }
};

/** Friendly formatted date string, or '—' if absent */
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

/** Friendly formatted date+time string */
const fmtDateTime = (iso?: string | null): string => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
};

// ─── Sub-Components ────────────────────────────────────────────────────────────

interface ChainNodeProps {
  stage: ChainStage;
  isComplete: boolean;
  isInProgress: boolean;
  isLast: boolean;
  children?: React.ReactNode;
}

const ChainNode: React.FC<ChainNodeProps> = ({
  stage,
  isComplete,
  isInProgress,
  isLast,
  children,
}) => {
  const nodeBg = isComplete
    ? colors.success
    : isInProgress
    ? colors.warning
    : colors.divider;
  const nodeText = isComplete || isInProgress ? '#FFFFFF' : colors.textSecondary;

  return (
    <View style={styles.chainRow}>
      {/* Left column: icon node + connector */}
      <View style={styles.chainLeft}>
        <View style={[styles.chainNode, { backgroundColor: nodeBg }]}>
          <Text style={[styles.chainNodeIcon, { color: nodeText }]}>{stage.icon}</Text>
        </View>
        {!isLast && (
          <View
            style={[
              styles.chainConnector,
              { backgroundColor: isComplete ? colors.success : colors.divider },
            ]}
          />
        )}
      </View>

      {/* Right column: content */}
      <View style={styles.chainContent}>
        <View style={styles.chainHeader}>
          <Text style={styles.chainActorLabel}>{stage.actorLabel}</Text>
          {isComplete && (
            <View style={styles.completedBadge}>
              <Text style={styles.completedBadgeText}>✓ Done</Text>
            </View>
          )}
          {isInProgress && !isComplete && (
            <View style={styles.inProgressBadge}>
              <Text style={styles.inProgressBadgeText}>In Progress</Text>
            </View>
          )}
        </View>
        <Text style={styles.chainStageLabel}>{stage.stageLabel}</Text>
        {children && <View style={styles.chainDetails}>{children}</View>}
      </View>
    </View>
  );
};

interface InfoRowProps {
  label: string;
  value: string;
}
const InfoRow: React.FC<InfoRowProps> = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

// ─── Main Screen ───────────────────────────────────────────────────────────────

export const ItemTraceabilityScreen: React.FC<Props> = ({ navigation, route }) => {
  const { itemId } = route.params;
  const { isConnected } = useNetwork();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [traceability, setTraceability] = useState<TraceabilityData | null>(null);
  const [isCached, setIsCached] = useState<boolean>(false);

  // ── Data Fetching ────────────────────────────────────────────────────────────

  const loadTraceability = useCallback(
    async (silent = false) => {
      if (!silent) setErrorMessage(null);
      try {
        const data = await ewasteService.getItemTraceability(itemId);
        if (!data) {
          setErrorMessage(
            'Traceability record not found. The item may not have been submitted yet, or data is unavailable offline.',
          );
        } else {
          setTraceability(data);
          setIsCached(!isConnected);
        }
      } catch (err: any) {
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          'Unable to load traceability data. Please try again.';
        setErrorMessage(msg);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [itemId, isConnected],
  );

  useEffect(() => {
    setIsLoading(true);
    loadTraceability();
  }, [loadTraceability]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadTraceability(true);
  }, [loadTraceability]);

  // ── Derived Data ─────────────────────────────────────────────────────────────

  const item = traceability?.item;
  const request = traceability?.request;
  const pickup = traceability?.pickup;
  const consignment = traceability?.consignment;
  const recyclingRecord = traceability?.recyclingRecord;
  const certificate = traceability?.certificate;

  // ── Render: Loading ──────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <TopAppBar
          title="Item Traceability"
          onBack={() => navigation.goBack()}
        />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Skeleton height={80} style={styles.skeletonCard} />
          <Skeleton height={280} style={styles.skeletonCard} />
          <Skeleton height={160} style={styles.skeletonCard} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Render: Error ─────────────────────────────────────────────────────────────

  if (errorMessage && !traceability) {
    return (
      <SafeAreaView style={styles.container}>
        <TopAppBar
          title="Item Traceability"
          onBack={() => navigation.goBack()}
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Could Not Load</Text>
          <Text style={styles.errorMessage}>{errorMessage}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => { setIsLoading(true); loadTraceability(); }}
            accessibilityLabel="Retry loading traceability"
            accessibilityRole="button"
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Render: Main ─────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <TopAppBar
        title="Item Traceability"
        onBack={() => navigation.goBack()}
      />

      {/* Offline banner */}
      {!isConnected && <OfflineBanner />}

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
        {/* ── Item Summary Card ──────────────────────────────────────────── */}
        <View style={styles.card} accessibilityLabel="Item summary">
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>
                {item?.category
                  ? item.category.replace(/_/g, ' ')
                  : 'E-Waste Item'}
              </Text>
              {item?.brand && (
                <Text style={styles.cardSubtitle}>
                  {item.brand}
                  {item.model ? ` · ${item.model}` : ''}
                </Text>
              )}
            </View>
            {item?.status && <StatusBadge status={item.status} />}
          </View>

          <View style={styles.divider} />

          <View style={styles.metaGrid}>
            <InfoRow
              label="Submitted"
              value={fmtDate(item?.createdAt || item?.submittedAt)}
            />
            {item?.estimatedWeightKg != null && (
              <InfoRow
                label="Est. Weight"
                value={`${item.estimatedWeightKg} kg`}
              />
            )}
            {item?.condition && (
              <InfoRow
                label="Condition"
                value={item.condition.replace(/_/g, ' ')}
              />
            )}
          </View>

          {/* Cached data notice */}
          {isCached && (
            <View style={styles.cachedNotice}>
              <Text style={styles.cachedNoticeText}>
                📴 Showing cached data (last synced while online)
              </Text>
            </View>
          )}
        </View>

        {/* ── Chain of Custody ──────────────────────────────────────────── */}
        <View style={styles.card} accessibilityLabel="Chain of custody lifecycle">
          <Text style={styles.sectionTitle}>Chain of Custody</Text>
          <Text style={styles.sectionSubtitle}>
            Your item's journey through the ECOSETU collection chain
          </Text>

          <View style={styles.chainContainer}>
            {CHAIN_STAGES.map((stage, index) => {
              if (!traceability) return null;
              const complete = isStageComplete(stage.id, traceability);
              const inProgress = !complete && isStageInProgress(stage.id, traceability);
              const isLast = index === CHAIN_STAGES.length - 1;

              return (
                <ChainNode
                  key={stage.id}
                  stage={stage}
                  isComplete={complete}
                  isInProgress={inProgress}
                  isLast={isLast}
                >
                  {/* Stage-specific detail rows */}
                  {stage.id === 'citizen' && item && (
                    <>
                      <InfoRow label="Category" value={item.category?.replace(/_/g, ' ') || '—'} />
                      <InfoRow label="Date" value={fmtDate(item.createdAt || item.submittedAt)} />
                    </>
                  )}

                  {stage.id === 'collector' && request && (
                    <>
                      {request.collector?.name && (
                        <InfoRow label="Collector" value={request.collector.name} />
                      )}
                      {pickup?.scheduledAt && (
                        <InfoRow label="Scheduled" value={fmtDateTime(pickup.scheduledAt)} />
                      )}
                      {pickup?.completedAt && (
                        <InfoRow label="Collected" value={fmtDateTime(pickup.completedAt)} />
                      )}
                      {pickup?.verifiedWeightKg != null && (
                        <InfoRow label="Verified Weight" value={`${pickup.verifiedWeightKg} kg`} />
                      )}
                    </>
                  )}

                  {stage.id === 'consignment' && consignment && (
                    <>
                      <InfoRow label="Status" value={consignment.status?.replace(/_/g, ' ') || '—'} />
                      {consignment.totalWeightKg != null && (
                        <InfoRow label="Weight" value={`${consignment.totalWeightKg} kg`} />
                      )}
                      {consignment.createdAt && (
                        <InfoRow label="Dispatched" value={fmtDate(consignment.createdAt)} />
                      )}
                      {consignment.acceptedAt && (
                        <InfoRow label="Accepted by Recycler" value={fmtDate(consignment.acceptedAt)} />
                      )}
                    </>
                  )}

                  {stage.id === 'recycler' && recyclingRecord && (
                    <>
                      {recyclingRecord.recycler?.name && (
                        <InfoRow label="Recycler" value={recyclingRecord.recycler.name} />
                      )}
                      <InfoRow
                        label="Status"
                        value={recyclingRecord.status?.replace(/_/g, ' ') || '—'}
                      />
                      {recyclingRecord.processedAt && (
                        <InfoRow
                          label="Processed"
                          value={fmtDate(recyclingRecord.processedAt)}
                        />
                      )}
                      {recyclingRecord.methodUsed && (
                        <InfoRow label="Method" value={recyclingRecord.methodUsed} />
                      )}
                      {recyclingRecord.materialRecoveredKg != null && (
                        <InfoRow
                          label="Materials Recovered"
                          value={`${recyclingRecord.materialRecoveredKg} kg`}
                        />
                      )}
                      {recyclingRecord.notes && (
                        <InfoRow label="Notes" value={recyclingRecord.notes} />
                      )}
                    </>
                  )}
                </ChainNode>
              );
            })}
          </View>
        </View>

        {/* ── Circular Economy Certificate ─────────────────────────────── */}
        {certificate && (
          <View
            style={[styles.card, styles.certCard]}
            accessibilityLabel="Circular economy certificate"
          >
            <View style={styles.certHeader}>
              <Text style={styles.certIcon}>🏆</Text>
              <View>
                <Text style={styles.certTitle}>Circular Economy Certificate</Text>
                <Text style={styles.certSubtitle}>
                  Your e-waste was responsibly recycled
                </Text>
              </View>
            </View>
            <View style={styles.divider} />
            {certificate.certificateNumber && (
              <InfoRow label="Certificate #" value={certificate.certificateNumber} />
            )}
            {certificate.issuedAt && (
              <InfoRow label="Issued On" value={fmtDate(certificate.issuedAt)} />
            )}
            {certificate.co2SavedKg != null && (
              <InfoRow
                label="CO₂ Saved"
                value={`${certificate.co2SavedKg} kg`}
              />
            )}
          </View>
        )}

        {/* ── Non-Anonymised Audit Note ─────────────────────────────────── */}
        <View style={styles.auditNote}>
          <Text style={styles.auditNoteText}>
            🔒 This traceability record is read-only and cannot be modified.
            All chain-of-custody events are audit-logged by ECOSETU.
          </Text>
        </View>

        <View style={{ height: spacing.spaceLg }} />
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.spaceMd,
    paddingBottom: spacing.spaceXl,
  },

  // ── Cards ──
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.spaceMd,
    marginBottom: spacing.spaceMd,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  certCard: {
    borderWidth: 1.5,
    borderColor: colors.success,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.spaceSm,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    textTransform: 'capitalize',
    maxWidth: '75%',
  },
  cardSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.spaceMd,
  },

  // ── Divider ──
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.spaceSm,
  },

  // ── Meta Grid ──
  metaGrid: {
    gap: 4,
  },

  // ── Info Rows ──
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  infoLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
  },
  infoValue: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },

  // ── Chain of Custody ──
  chainContainer: {
    paddingTop: spacing.spaceSm,
  },
  chainRow: {
    flexDirection: 'row',
    marginBottom: 0,
  },
  chainLeft: {
    width: 40,
    alignItems: 'center',
  },
  chainNode: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chainNodeIcon: {
    fontSize: 16,
  },
  chainConnector: {
    width: 2,
    flex: 1,
    minHeight: 24,
    marginVertical: 2,
  },
  chainContent: {
    flex: 1,
    paddingLeft: spacing.spaceSm,
    paddingBottom: spacing.spaceMd,
  },
  chainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  chainActorLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
  },
  chainStageLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
    marginBottom: 6,
  },
  chainDetails: {
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: spacing.spaceSm,
    paddingVertical: spacing.spaceXs,
  },
  completedBadge: {
    backgroundColor: '#C8E6C9',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  completedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1B5E20',
  },
  inProgressBadge: {
    backgroundColor: '#FFE0B2',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  inProgressBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E65100',
  },

  // ── Certificate ──
  certHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.spaceSm,
    marginBottom: spacing.spaceSm,
  },
  certIcon: {
    fontSize: 32,
  },
  certTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.success,
  },
  certSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },

  // ── Audit Note ──
  auditNote: {
    backgroundColor: '#EDE7F6',
    borderRadius: 8,
    padding: spacing.spaceSm,
    marginBottom: spacing.spaceSm,
  },
  auditNoteText: {
    fontSize: 12,
    color: '#4527A0',
    lineHeight: 18,
  },

  // ── Cached Notice ──
  cachedNotice: {
    marginTop: spacing.spaceSm,
    backgroundColor: '#FFF9C4',
    borderRadius: 6,
    padding: spacing.spaceXs,
  },
  cachedNoticeText: {
    fontSize: 12,
    color: '#F57F17',
  },

  // ── Loading Skeletons ──
  skeletonCard: {
    borderRadius: 12,
    marginBottom: spacing.spaceMd,
  },

  // ── Error State ──
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.spaceLg,
    gap: spacing.spaceSm,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: spacing.spaceSm,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryButton: {
    marginTop: spacing.spaceMd,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.spaceLg,
    paddingVertical: spacing.spaceSm,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default ItemTraceabilityScreen;
