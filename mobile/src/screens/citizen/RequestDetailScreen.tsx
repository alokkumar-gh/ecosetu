/**
 * RequestDetailScreen — COMPLETE REBUILD
 * Citizen views their e-waste collection request status.
 * Goal: What I submitted → Current status → What happens next → What I need to do.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CitizenStackParamList } from '../../navigation/types';
import { useNetwork } from '../../hooks/useNetwork';
import { useI18n } from '../../i18n';
import { requestService } from '../../services/requestService';
import { offlineStore } from '../../services/offlineStore';
import { REQUEST_STATUS } from '../../utils/constants';
import { EcoSetuBackground } from '../../components/eco';
import { AuthorizedImage } from '../../components/common/AuthorizedImage';
import { colors } from '../../theme/colors';
import { AppIcon, IconName } from '../../components/ui/AppIcon';

type Props = NativeStackScreenProps<CitizenStackParamList, 'RequestDetail'>;

// ─── Status config ─────────────────────────────────────────────────────────────

const canCancelRequest = (status: string): boolean => {
  const s = (status || '').toUpperCase();
  return s !== REQUEST_STATUS.PICKED_UP && s !== REQUEST_STATUS.CANCELLED && s !== REQUEST_STATUS.EXPIRED;
};

const STATUS_ORDER: Record<string, number> = {
  [REQUEST_STATUS.DRAFT]: 0,
  [REQUEST_STATUS.SUBMITTED]: 1,
  [REQUEST_STATUS.ACCEPTED]: 2,
  [REQUEST_STATUS.PICKUP_SCHEDULED]: 3,
  [REQUEST_STATUS.PICKED_UP]: 4,
};

const TIMELINE_STEPS: Array<{ id: string; icon: IconName; label: string; next: string }> = [
  {
    id: 'SUBMITTED',
    icon: 'upload',
    label: 'Request Sent',
    next: 'Your request is being broadcast to nearby collectors.',
  },
  {
    id: 'ACCEPTED',
    icon: 'handshake',
    label: 'Collector Assigned',
    next: 'A local collector (Kabadiwala) will contact you to schedule pickup.',
  },
  {
    id: 'PICKUP_SCHEDULED',
    icon: 'calendar',
    label: 'Pickup Scheduled',
    next: 'The collector will arrive at your address on the scheduled date.',
  },
  {
    id: 'PICKED_UP',
    icon: 'checkCircle',
    label: 'Items Collected',
    next: 'Your e-waste has been responsibly handed over for recycling.',
  },
];

function getStepState(stepId: string, currentStatus: string): 'done' | 'current' | 'pending' | 'cancelled' {
  const norm = (currentStatus || '').toUpperCase();
  if (norm === REQUEST_STATUS.CANCELLED || norm === REQUEST_STATUS.EXPIRED) return 'cancelled';
  const current = STATUS_ORDER[norm] ?? -1;
  const stepLevel = STATUS_ORDER[stepId] ?? 0;
  if (stepLevel < current) return 'done';
  if (stepLevel === current) return 'current';
  return 'pending';
}

function getStatusBadgeMeta(status: string, t: any) {
  const s = (status || '').toUpperCase();
  switch (s) {
    case REQUEST_STATUS.DRAFT:           return { label: t('status.draft', 'Draft'),             color: '#A78BFA', bg: 'rgba(139,92,246,0.15)' };
    case REQUEST_STATUS.SUBMITTED:       return { label: t('status.awaitingCollector', 'Awaiting Collector'), color: '#60A5FA', bg: 'rgba(59,130,246,0.15)' };
    case REQUEST_STATUS.ACCEPTED:        return { label: t('status.collectorAssigned', 'Collector Assigned'), color: '#10B981', bg: 'rgba(16,185,129,0.15)' };
    case REQUEST_STATUS.PICKUP_SCHEDULED:return { label: t('status.pickupScheduled', 'Pickup Scheduled'),   color: '#34D399', bg: 'rgba(52,211,153,0.15)' };
    case REQUEST_STATUS.PICKED_UP:       return { label: t('status.collected', 'Collected'),        color: '#10B981', bg: 'rgba(16,185,129,0.18)' };
    case REQUEST_STATUS.CANCELLED:       return { label: t('status.cancelled', 'Cancelled'),           color: '#F87171', bg: 'rgba(239,68,68,0.15)' };
    case REQUEST_STATUS.EXPIRED:         return { label: t('status.expired', 'Expired'),             color: '#FBBF24', bg: 'rgba(245,158,11,0.15)' };
    default:                             return { label: status,               color: '#94A3B8', bg: 'rgba(148,163,184,0.15)' };
  }
}

// ─── Cancel Modal ─────────────────────────────────────────────────────────────

interface CancelModalProps {
  visible: boolean;
  isCancelling: boolean;
  cancelError: string | null;
  reason: string;
  onChangeReason: (r: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

const CancelModal: React.FC<CancelModalProps> = ({
  visible, isCancelling, cancelError, reason, onChangeReason, onConfirm, onClose,
}) => {
  const { t } = useI18n();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose} />
      <View style={styles.modalSheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.modalTitle}>{t('common.cancelRequest', 'Cancel Request')}</Text>
        <Text style={styles.modalSubtitle}>
          {t('common.cancelReasonHelp', "Please tell us why you're cancelling. This helps us improve.")}
        </Text>

        <TextInput
          style={styles.modalTextArea}
          value={reason}
          onChangeText={onChangeReason}
          multiline
          numberOfLines={4}
          placeholder={t('common.cancelReasonPlaceholder', 'Reason for cancellation…')}
          placeholderTextColor="rgba(255,255,255,0.30)"
          textAlignVertical="top"
          autoFocus
        />

        {cancelError && (
          <Text style={styles.modalError}>{cancelError}</Text>
        )}

        <View style={styles.modalActions}>
          <TouchableOpacity style={styles.modalCancelBtn} onPress={onClose} disabled={isCancelling}>
            <Text style={styles.modalCancelText}>{t('common.keepRequest', 'Keep Request')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modalDestructiveBtn, isCancelling && { opacity: 0.6 }]}
            onPress={onConfirm}
            disabled={isCancelling}
          >
            {isCancelling
              ? <ActivityIndicator size="small" color="#FFF" />
              : <Text style={styles.modalDestructiveText}>{t('common.cancelRequest', 'Cancel Request')}</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export const RequestDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { requestId } = route.params;
  const { isConnected } = useNetwork();
  const { t } = useI18n();

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [request, setRequest] = useState<any | null>(null);

  const [cancelVisible, setCancelVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const timelineSteps: Array<{ id: string; icon: IconName; label: string; next: string }> = [
    {
      id: 'SUBMITTED',
      icon: 'upload',
      label: t('status.requestSent', 'Request Sent'),
      next: t('status.requestSentNext', 'Your request is being broadcast to nearby collectors.'),
    },
    {
      id: 'ACCEPTED',
      icon: 'handshake',
      label: t('status.collectorAssigned', 'Collector Assigned'),
      next: t('status.collectorAssignedNext', 'A local collector (Kabadiwala) will contact you to schedule pickup.'),
    },
    {
      id: 'PICKUP_SCHEDULED',
      icon: 'calendar',
      label: t('status.pickupScheduled', 'Pickup Scheduled'),
      next: t('status.pickupScheduledNext', 'The collector will arrive at your address on the scheduled date.'),
    },
    {
      id: 'PICKED_UP',
      icon: 'checkCircle',
      label: t('status.itemsCollected', 'Items Collected'),
      next: t('status.itemsCollectedNext', 'Your e-waste has been responsibly handed over for recycling.'),
    },
  ];

  const getNextActionText = (statusVal: string, req?: any): string | null => {
    const s = (statusVal || '').toUpperCase();
    switch (s) {
      case REQUEST_STATUS.SUBMITTED:
        return t('status.submittedNext', "Nothing needed from you right now. We're finding a collector in your area.");
      case REQUEST_STATUS.ACCEPTED:
        return t('status.acceptedNext', 'A collector has been assigned. They will contact you to confirm pickup.');
      case REQUEST_STATUS.PICKUP_SCHEDULED:
        return req?.preferredDate
          ? `${t('status.beAvailableOn', 'Be available on')} ${new Date(req.preferredDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}.`
          : t('status.beAvailableAtAddress', 'Be available at your address at the scheduled time.');
      case REQUEST_STATUS.PICKED_UP:
      case REQUEST_STATUS.CANCELLED:
      case REQUEST_STATUS.EXPIRED:
        return null;
      default:
        return t('status.nothingNeeded', 'Nothing needed from you right now.');
    }
  };

  const loadRequest = useCallback(async (initial = false) => {
    setErrorMessage(null);
    if (initial) {
      try {
        const cached = await offlineStore.getCachedRequests();
        const found = (cached || []).find((r: any) => r.id === requestId);
        if (found) { setRequest(found); setIsLoading(false); }
      } catch {}
    }
    try {
      const data = await requestService.getRequestById(requestId);
      if (!data) {
        setErrorMessage('Request not found.');
      } else {
        setRequest(data);
      }
    } catch (err: any) {
      if (!request) {
        const code = err?.status || err?.code;
        if (code === 403 || code === 'FORBIDDEN') {
          setErrorMessage('Access denied. You can only view your own requests.');
        } else if (code === 404 || code === 'NOT_FOUND') {
          setErrorMessage('Request not found.');
        } else {
          setErrorMessage(err?.message || 'Unable to load request. Check your connection.');
        }
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [requestId]);

  useEffect(() => { loadRequest(true); }, [loadRequest]);

  const handleConfirmCancel = async () => {
    if (!cancelReason.trim()) {
      setCancelError('Please provide a reason for cancelling.');
      return;
    }
    if (!isConnected) {
      Alert.alert('Offline', 'Cancellation requires an internet connection.');
      return;
    }
    setIsCancelling(true);
    setCancelError(null);
    try {
      await requestService.cancelRequest(requestId, cancelReason.trim());
      setCancelVisible(false);
      setCancelReason('');
      await loadRequest();
      Alert.alert('Request Cancelled', 'Your collection request has been cancelled.');
    } catch (err: any) {
      setCancelError(err?.message || 'Failed to cancel. Please try again.');
    } finally {
      setIsCancelling(false);
    }
  };

  // ── Loading / Error ────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <EcoSetuBackground>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      </EcoSetuBackground>
    );
  }

  if (errorMessage && !request) {
    return (
      <EcoSetuBackground>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.errorBox}>
          <AppIcon name="alert" size={32} color="#EF4444" style={{ marginBottom: 12 }} />
          <Text style={styles.errorTitle}>Couldn't Load Request</Text>
          <Text style={styles.errorMessage}>{errorMessage}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => { setIsLoading(true); loadRequest(); }}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </EcoSetuBackground>
    );
  }

  // ── Data ───────────────────────────────────────────────────────────────────

  const status = (request?.status || '').toUpperCase();
  const badge = getStatusBadgeMeta(status, t);
  const nextAction = getNextActionText(status, request);
  const cancellable = canCancelRequest(status);
  const items: any[] = Array.isArray(request?.ewasteItems) ? request.ewasteItems : [];
  const refId = `REQ-${(requestId || '').substring(0, 8).toUpperCase()}`;

  const isTerminal = status === REQUEST_STATUS.CANCELLED || status === REQUEST_STATUS.EXPIRED || status === REQUEST_STATUS.PICKED_UP;

  return (
    <EcoSetuBackground>

      {/* Back button */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => navigation.goBack()}
        accessibilityRole="button"
        accessibilityLabel={t('common.back', 'Go back')}
      >
        <Text style={styles.backIcon}>← {t('common.back', 'Back')}</Text>
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => { setIsRefreshing(true); loadRequest(); }}
            tintColor="#10B981"
            colors={['#10B981']}
          />
        }
      >
        {/* ── Request hero ── */}
        <View style={styles.hero}>
          <View>
            <Text style={styles.heroRef}>{refId}</Text>
            <Text style={styles.heroTitle}>{t('collection.collectionRequest', 'Collection Request')}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: badge.color }]} />
            <Text style={[styles.statusLabel, { color: badge.color }]}>{badge.label}</Text>
          </View>
        </View>

        {/* ── Next action card ── */}
        {nextAction && (
          <View style={styles.nextActionCard}>
            <Text style={styles.nextActionLabel}>{t('common.next', 'NEXT')}</Text>
            <Text style={styles.nextActionText}>{nextAction}</Text>
          </View>
        )}

        {status === REQUEST_STATUS.PICKED_UP && (
          <View style={styles.successCard}>
            <AppIcon name="checkCircle" size={24} color="#10B981" style={{ marginRight: 10 }} />
            <Text style={styles.successText}>
              {t('common.collectedSuccessMsg', 'Your e-waste has been collected and handed to a verified recycler. Thank you for recycling responsibly!')}
            </Text>
          </View>
        )}

        {/* ── Timeline ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('common.journey', 'Journey')}</Text>
          <View style={styles.timeline}>
            {timelineSteps.map((stepItem, i) => {
              const state = isTerminal && status === REQUEST_STATUS.PICKED_UP
                ? 'done'
                : getStepState(stepItem.id, status);
              const isCancelledState = status === REQUEST_STATUS.CANCELLED || status === REQUEST_STATUS.EXPIRED;

              return (
                <View key={stepItem.id} style={styles.timelineRow}>
                  {/* Connector line */}
                  <View style={styles.timelineLeft}>
                    <View style={[
                      styles.timelineNode,
                      state === 'done' && styles.timelineNodeDone,
                      state === 'current' && styles.timelineNodeCurrent,
                      isCancelledState && styles.timelineNodeCancelled,
                    ]}>
                      {state === 'done'
                        ? <AppIcon name="check" size={10} color="#FFF" />
                        : state === 'current'
                          ? <View style={styles.timelinePulse} />
                          : <Text style={styles.timelineNum}>{i + 1}</Text>}
                    </View>
                    {i < timelineSteps.length - 1 && (
                      <View style={[
                        styles.timelineLine,
                        state === 'done' && styles.timelineLineDone,
                      ]} />
                    )}
                  </View>

                  {/* Content */}
                  <View style={[styles.timelineContent, { marginBottom: i < timelineSteps.length - 1 ? 0 : 4 }]}>
                    <View style={{ width: 26, alignItems: 'center' }}>
                      <AppIcon
                        name={stepItem.icon}
                        size={18}
                        color={state === 'done' ? '#10B981' : state === 'current' ? '#38BDF8' : '#94A3B8'}
                      />
                    </View>
                    <View style={styles.timelineTextBlock}>
                      <Text style={[
                        styles.timelineLabel,
                        state === 'done' && styles.timelineLabelDone,
                        state === 'current' && styles.timelineLabelCurrent,
                        (state === 'pending' || isCancelledState) && styles.timelineLabelPending,
                      ]}>
                        {stepItem.label}
                      </Text>
                      {state === 'current' && (
                        <Text style={styles.timelineNext}>{stepItem.next}</Text>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}

            {/* Cancelled / expired terminal */}
            {(status === REQUEST_STATUS.CANCELLED || status === REQUEST_STATUS.EXPIRED) && (
              <View style={styles.cancelledBanner}>
                <AppIcon
                  name={status === REQUEST_STATUS.CANCELLED ? 'close' : 'clock'}
                  size={18}
                  color="#F87171"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.cancelledText}>
                  {status === REQUEST_STATUS.CANCELLED
                    ? t('status.cancelledMsg', 'Request cancelled.')
                    : t('status.expiredMsg', 'Request expired. Submit a new request to restart.')}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Items ── */}
        {items.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('common.yourItems', 'Your Items')} ({items.length})</Text>
            {items.map((item: any) => (
              <View key={item.id} style={styles.itemCard}>
                {item.imageUrl && (
                  <AuthorizedImage uri={item.imageUrl} style={styles.itemPhoto} />
                )}
                <View style={styles.itemInfo}>
                  <Text style={styles.itemCategory}>
                    {item.category?.replace(/_/g, ' ') || 'Electronics'}
                  </Text>
                  <Text style={styles.itemCondition}>{item.condition || '—'}</Text>
                  {item.quantity > 1 && (
                    <Text style={styles.itemQty}>×{item.quantity}</Text>
                  )}
                </View>
                {status === REQUEST_STATUS.PICKED_UP && item.id && (
                  <TouchableOpacity
                    style={styles.traceBtn}
                    onPress={() => navigation.navigate('ItemTraceability', { itemId: item.id })}
                    accessibilityRole="button"
                    accessibilityLabel={t('traceability.viewTraceability', 'View traceability')}
                  >
                    <Text style={styles.traceBtnText}>{t('common.track', 'Track')} ↗</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}

        {/* ── Pickup address ── */}
        {request?.pickupAddress && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('location.pickupLocation', 'Collection Address')}</Text>
            <View style={styles.addressCard}>
              <AppIcon name="location" size={18} color="#10B981" style={{ marginRight: 8 }} />
              <Text style={styles.addressText}>{request.pickupAddress}</Text>
            </View>
          </View>
        )}

        {/* ── Collector info ── */}
        {request?.collector && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('common.yourCollector', 'Your Collector')}</Text>
            <View style={styles.collectorCard}>
              <View style={styles.collectorAvatar}>
                <Text style={styles.collectorAvatarText}>
                  {(request.collector.name || 'C').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.collectorInfo}>
                <Text style={styles.collectorName}>{request.collector.name || t('roles.collector', 'Local Collector')}</Text>
                <Text style={styles.collectorRole}>{t('common.collectorSub', 'Informal Collector · Kabadiwala')}</Text>
              </View>
            </View>
          </View>
        )}

        {/* ── Cancel ── */}
        {cancellable && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.cancelRequestBtn}
              onPress={() => {
                if (!isConnected) {
                  Alert.alert(t('common.offline', 'Offline'), t('common.offlineCancel', 'Cancellation requires an internet connection.'));
                  return;
                }
                setCancelReason('');
                setCancelError(null);
                setCancelVisible(true);
              }}
              accessibilityRole="button"
              accessibilityLabel={t('common.cancelThisRequest', 'Cancel this request')}
            >
              <Text style={styles.cancelRequestText}>{t('common.cancelThisRequest', 'Cancel This Request')}</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* ── Cancel Modal ── */}
      <CancelModal
        visible={cancelVisible}
        isCancelling={isCancelling}
        cancelError={cancelError}
        reason={cancelReason}
        onChangeReason={setCancelReason}
        onConfirm={handleConfirmCancel}
        onClose={() => setCancelVisible(false)}
      />
    </EcoSetuBackground>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Back ──
  backBtn: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 12,
  },
  backIcon: {
    fontSize: 15,
    color: '#34D399',
    fontWeight: '700',
  },

  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 60,
  },

  // ── Hero ──
  hero: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  heroRef: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.40)',
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginTop: 4,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusLabel: { fontSize: 12, fontWeight: '700' },

  // ── Next Action ──
  nextActionCard: {
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.30)',
    padding: 16,
    marginBottom: 16,
    gap: 4,
  },
  nextActionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#34D399',
    letterSpacing: 1,
  },
  nextActionText: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 21,
    fontWeight: '500',
  },

  // ── Success ──
  successCard: {
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.30)',
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  successIcon: { fontSize: 24 },
  successText: {
    flex: 1,
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 21,
    fontWeight: '500',
  },

  // ── Section ──
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.40)',
    letterSpacing: 1,
    marginBottom: 12,
    textTransform: 'uppercase',
  },

  // ── Timeline ──
  timeline: { gap: 0 },
  timelineRow: {
    flexDirection: 'row',
    gap: 12,
    minHeight: 52,
  },
  timelineLeft: {
    alignItems: 'center',
    width: 28,
  },
  timelineNode: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineNodeDone: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  timelineNodeCurrent: {
    backgroundColor: 'rgba(16,185,129,0.20)',
    borderColor: '#10B981',
  },
  timelineNodeCancelled: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderColor: 'rgba(239,68,68,0.30)',
  },
  timelineCheck: { fontSize: 13, color: '#FFFFFF', fontWeight: '800' },
  timelinePulse: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
  },
  timelineNum: { fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: '700' },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: 'rgba(255,255,255,0.10)',
    marginVertical: 3,
  },
  timelineLineDone: { backgroundColor: '#10B981' },
  timelineContent: {
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 16,
    alignItems: 'flex-start',
  },
  timelineIcon: { fontSize: 16, marginTop: 4 },
  timelineTextBlock: { flex: 1 },
  timelineLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
    color: 'rgba(255,255,255,0.40)',
  },
  timelineLabelDone: { color: '#34D399' },
  timelineLabelCurrent: { color: '#FFFFFF' },
  timelineLabelPending: { color: 'rgba(255,255,255,0.35)' },
  timelineNext: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    lineHeight: 18,
    marginTop: 3,
  },
  cancelledBanner: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  cancelledIcon: { fontSize: 18 },
  cancelledText: { flex: 1, fontSize: 13, color: '#FCA5A5', lineHeight: 19 },

  // ── Items ──
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16,44,48,0.80)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 12,
    gap: 12,
    marginBottom: 8,
  },
  itemPhoto: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  itemInfo: { flex: 1 },
  itemCategory: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
  itemCondition: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.50)',
    fontWeight: '500',
    marginTop: 2,
  },
  itemQty: {
    fontSize: 11,
    color: '#34D399',
    fontWeight: '700',
    marginTop: 2,
  },
  traceBtn: {
    backgroundColor: 'rgba(16,185,129,0.18)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  traceBtnText: { fontSize: 12, color: '#34D399', fontWeight: '700' },

  // ── Address ──
  addressCard: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: 'rgba(16,44,48,0.80)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 14,
    alignItems: 'flex-start',
  },
  addressIcon: { fontSize: 16 },
  addressText: { flex: 1, fontSize: 14, color: 'rgba(255,255,255,0.80)', lineHeight: 21 },

  // ── Collector ──
  collectorCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'rgba(16,44,48,0.80)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 14,
    alignItems: 'center',
  },
  collectorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(16,185,129,0.20)',
    borderWidth: 1.5,
    borderColor: '#34D399',
    alignItems: 'center',
    justifyContent: 'center',
  },
  collectorAvatarText: { fontSize: 18, fontWeight: '800', color: '#34D399' },
  collectorInfo: { flex: 1 },
  collectorName: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  collectorRole: { fontSize: 12, color: 'rgba(255,255,255,0.50)', marginTop: 2 },

  // ── Cancel request ──
  cancelRequestBtn: {
    borderWidth: 1.5,
    borderColor: 'rgba(239,68,68,0.40)',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelRequestText: { fontSize: 15, color: '#F87171', fontWeight: '600' },

  // ── Error ──
  errorBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorIcon: { fontSize: 48, marginBottom: 12 },
  errorTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginBottom: 8, textAlign: 'center' },
  errorMessage: { fontSize: 14, color: 'rgba(255,255,255,0.55)', textAlign: 'center', lineHeight: 21 },
  retryBtn: {
    marginTop: 20,
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryBtnText: { fontSize: 15, color: '#FFFFFF', fontWeight: '700' },

  // ── Cancel Modal ──
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.60)' },
  modalSheet: {
    backgroundColor: '#0D2E32',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.20)',
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', marginBottom: 6 },
  modalSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.55)', marginBottom: 16, lineHeight: 21 },
  modalTextArea: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#FFFFFF',
    height: 100,
    marginBottom: 12,
  },
  modalError: { fontSize: 13, color: '#FCA5A5', marginBottom: 10 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalCancelBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: { fontSize: 15, color: 'rgba(255,255,255,0.65)', fontWeight: '600' },
  modalDestructiveBtn: {
    flex: 1.5,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDestructiveText: { fontSize: 15, color: '#FFFFFF', fontWeight: '700' },
});

export default RequestDetailScreen;
