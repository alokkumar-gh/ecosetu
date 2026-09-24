/**
 * CitizenOrdersScreen — Unified Citizen Transaction Center
 *
 * Combines:
 *   A. E-WASTE PICKUPS — outbound e-waste disposal requests
 *   B. PURCHASES       — inbound marketplace purchase offers
 *
 * Navigation Architecture:
 *   CitizenRequests tab → this screen
 *   Segments: [E-WASTE] [PURCHASES]
 *
 * Business Logic Preserved:
 *   - requestService.getRequests() / cancelRequest()
 *   - quoteService.getCitizenQuotes() / cancelQuote() / counterQuote()
 *   - offlineStore.getCachedRequests()
 *   - REQUEST_STATUS constants
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CitizenTabParamList, CitizenStackParamList } from '../../navigation/types';
import { useNetwork } from '../../hooks/useNetwork';
import { useI18n } from '../../i18n';
import { requestService } from '../../services/requestService';
import { quoteService, RecyclerQuote } from '../../services/quoteService';
import { offlineStore } from '../../services/offlineStore';
import { REQUEST_STATUS } from '../../utils/constants';
import { MATERIAL_TAXONOMY } from '../../config/materialTaxonomy';
import { EcoSetuBackground } from '../../components/glass/EcoSetuBackground';
import { colors } from '../../theme/colors';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<CitizenTabParamList, 'CitizenRequests'>,
  NativeStackNavigationProp<CitizenStackParamList>
>;

interface Props {
  navigation: Nav;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const canCancelRequest = (status: string): boolean => {
  const s = (status || '').toUpperCase();
  return s !== REQUEST_STATUS.PICKED_UP && s !== REQUEST_STATUS.CANCELLED && s !== REQUEST_STATUS.EXPIRED;
};

function getRequestStatusMeta(status: string, t: (k: string, d?: string) => string) {
  const s = (status || '').toUpperCase();
  if (['COMPLETED', 'PICKED_UP'].includes(s))
    return { label: t('status.pickedUp', 'Collected'), color: '#10B981', bg: 'rgba(16,185,129,0.14)', icon: '✅' };
  if (['CANCELLED', 'EXPIRED'].includes(s))
    return { label: s === 'EXPIRED' ? t('status.rejected', 'Expired') : t('status.cancelled', 'Cancelled'), color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)', icon: '🚫' };
  if (s === 'ACCEPTED' || s === 'PICKUP_SCHEDULED')
    return { label: s === 'PICKUP_SCHEDULED' ? t('status.pickupScheduled', 'Scheduled') : t('status.accepted', 'Accepted'), color: '#34D399', bg: 'rgba(52,211,153,0.14)', icon: '📅' };
  return { label: t('status.submitted', 'Submitted'), color: '#FBBF24', bg: 'rgba(251,191,36,0.14)', icon: '📦' };
}

function getQuoteMeta(status: string, t: (k: string, d?: string) => string) {
  switch (status) {
    case 'SENT':
    case 'VIEWED':
      return { label: t('status.pending', 'Awaiting Reply'), color: '#60A5FA', bg: 'rgba(59,130,246,0.14)', tab: 'ACTIVE' };
    case 'ACCEPTED':
      return { label: t('status.accepted', 'Accepted'), color: '#10B981', bg: 'rgba(16,185,129,0.14)', tab: 'ACCEPTED' };
    case 'COMPLETED':
    case 'PAID':
    case 'HANDED_OVER':
      return { label: t('status.completed', 'Done'), color: '#34D399', bg: 'rgba(52,211,153,0.14)', tab: 'COMPLETED' };
    case 'REJECTED':
    case 'CANCELLED':
    case 'EXPIRED':
      return {
        label: status === 'REJECTED' ? t('status.rejected', 'Declined') : status === 'EXPIRED' ? t('status.rejected', 'Expired') : t('status.cancelled', 'Cancelled'),
        color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)', tab: 'CANCELLED',
      };
    default:
      return { label: status, color: '#94A3B8', bg: 'rgba(148,163,184,0.12)', tab: 'ACTIVE' };
  }
}

type MainSegment = 'EWASTE' | 'PURCHASES';
type EwasteFilter = 'ALL' | 'ACTIVE' | 'COLLECTED' | 'CANCELLED';
type PurchaseFilter = 'ACTIVE' | 'ACCEPTED' | 'COMPLETED' | 'CANCELLED';

// ─── Request Card ─────────────────────────────────────────────────────────────

const RequestCard = React.memo(({
  item,
  onPress,
  onCancel,
}: {
  item: any;
  onPress: () => void;
  onCancel: () => void;
}) => {
  const { t } = useI18n();
  const meta = getRequestStatusMeta(item.status, t);
  const itemCount = Array.isArray(item.ewasteItems) ? item.ewasteItems.length : (item.itemCount || 1);
  const refId = `REQ-${(item.id || '').substring(0, 8).toUpperCase()}`;
  const cancellable = canCancelRequest(item.status);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.82}
      accessibilityRole="button" accessibilityLabel={`Request ${refId}, ${item.status}`}>
      <View style={styles.cardHeader}>
        <View style={[styles.cardIconBox, { backgroundColor: meta.bg }]}>
          <Text style={styles.cardIconText}>{meta.icon}</Text>
        </View>
        <View style={styles.cardHeaderText}>
          <Text style={styles.cardRef}>{refId}</Text>
          <Text style={styles.cardSub} numberOfLines={1}>
            {itemCount} {itemCount === 1 ? t('collector.browse.item', 'item') : t('collector.browse.items', 'items')} • {t('citizen.requestDetail.doorstepAddress', 'Doorstep Pickup')}
          </Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: meta.bg, borderColor: meta.color }]}>
          <Text style={[styles.statusPillText, { color: meta.color }]}>{meta.label}</Text>
        </View>
      </View>

      {Boolean(item.pickupAddress) && (
        <View style={styles.cardMeta}>
          <Text style={styles.cardMetaIcon}>📍</Text>
          <Text style={styles.cardMetaText} numberOfLines={1}>{item.pickupAddress}</Text>
        </View>
      )}
      {Boolean(item.preferredDate) && (
        <View style={styles.cardMeta}>
          <Text style={styles.cardMetaIcon}>📅</Text>
          <Text style={styles.cardMetaText}>
            {new Date(item.preferredDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </Text>
        </View>
      )}

      <View style={styles.cardFooter}>
        <Text style={styles.viewLink}>{t('citizen.requests.viewDetails', 'View Details →')}</Text>
        {cancellable && (
          <TouchableOpacity onPress={onCancel} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button" accessibilityLabel={`Cancel request ${refId}`}>
            <Text style={styles.cancelLink}>{t('citizen.requests.cancelRequest', 'Cancel')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
});

// ─── Purchase Card ────────────────────────────────────────────────────────────

const PurchaseCard = React.memo(({
  quote,
  onCancel,
  onCounter,
  onViewBills,
}: {
  quote: RecyclerQuote;
  onCancel: () => void;
  onCounter: () => void;
  onViewBills: () => void;
}) => {
  const { t } = useI18n();
  const cat = MATERIAL_TAXONOMY[quote.materialLot?.category || quote.category] || { symbol: '📦', defaultName: quote.category };
  const meta = getQuoteMeta(quote.status, t);
  const isPending = quote.status === 'SENT' || quote.status === 'VIEWED';
  const isAccepted = quote.status === 'ACCEPTED';
  const isDone = ['COMPLETED', 'PAID', 'HANDED_OVER'].includes(quote.status);
  const itemName = quote.materialLot?.subcategory || (cat.i18nKey ? t(cat.i18nKey, cat.defaultName) : cat.defaultName);
  const price = `₹${Number(quote.quotedUnitPrice).toLocaleString('en-IN')}`;

  return (
    <View style={styles.card} accessibilityRole="none">
      <View style={styles.cardHeader}>
        <View style={[styles.cardIconBox, { backgroundColor: 'rgba(139,92,246,0.14)' }]}>
          <Text style={styles.cardIconText}>{cat.symbol}</Text>
        </View>
        <View style={styles.cardHeaderText}>
          <Text style={styles.cardRef} numberOfLines={1}>{itemName}</Text>
          <Text style={styles.cardSub}>{t('quotation.offer', 'Offer')} · …{(quote.referenceNumber || '').slice(-6)}</Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: meta.bg, borderColor: meta.color }]}>
          <Text style={[styles.statusPillText, { color: meta.color }]}>{meta.label}</Text>
        </View>
      </View>

      <View style={styles.priceRow}>
        <Text style={styles.priceLabel}>{t('marketplace.offerPriceLabel', 'Your Offer')}</Text>
        <Text style={styles.priceValue}>{price}</Text>
        {quote.materialLot?.askingPrice && Number(quote.materialLot.askingPrice) > 0 && (
          <View style={styles.askingBox}>
            <Text style={styles.askingLabel}>{t('marketplace.sellerAskingPrice', 'Asking')}</Text>
            <Text style={styles.askingValue}>₹{Number(quote.materialLot.askingPrice).toLocaleString('en-IN')}</Text>
          </View>
        )}
      </View>

      {isAccepted && quote.materialLot?.collector?.user && (
        <View style={styles.sellerRow}>
          <Text style={styles.sellerIcon}>🤝</Text>
          <Text style={styles.sellerName}>{quote.materialLot.collector.user.name}</Text>
          <Text style={styles.sellerArea}>{quote.materialLot.collector.city || t('roles.collector', 'Local Collector')}</Text>
        </View>
      )}

      {quote.negotiationTimeline && quote.negotiationTimeline.length > 0 && (
        <View style={styles.negotiationRow}>
          {quote.negotiationTimeline.slice(-3).map((neg: any, i: number) => (
            <View key={i} style={[styles.negBubbleWrap, neg.fromRole === 'CITIZEN' ? styles.negRight : styles.negLeft]}>
              <View style={[styles.negBubble, neg.fromRole === 'CITIZEN' ? styles.negBubbleSelf : styles.negBubbleOther]}>
                <Text style={styles.negPrice}>₹{Number(neg.price).toLocaleString('en-IN')}</Text>
                <Text style={styles.negRole}>{neg.fromRole === 'CITIZEN' ? t('payments.payer', 'You') : t('payments.receiver', 'Seller')}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.cardFooter}>
        {isPending && (
          <>
            <TouchableOpacity style={styles.retractBtn} onPress={onCancel} accessibilityRole="button">
              <Text style={styles.retractText}>{t('purchases.cancelOfferTitle', 'Retract')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.reviseBtn} onPress={onCounter} accessibilityRole="button">
              <Text style={styles.reviseBtnText}>{t('quotation.counterOffer', 'Revise Offer')}</Text>
            </TouchableOpacity>
          </>
        )}
        {(isAccepted || isDone) && (
          <TouchableOpacity style={styles.billsBtn} onPress={onViewBills} accessibilityRole="button">
            <Text style={styles.billsBtnText}>🧾 {t('payments.viewBill', 'View Bills')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});

// ─── Counter Offer Modal ──────────────────────────────────────────────────────

const CounterModal = ({
  quote,
  isSubmitting,
  onClose,
  onSubmit,
}: {
  quote: RecyclerQuote;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (quoteId: string, amount: number, notes: string) => void;
}) => {
  const { t } = useI18n();
  const [amount, setAmount] = useState(String(quote.quotedUnitPrice || ''));
  const [notes, setNotes] = useState('');
  const parsed = parseFloat(amount);
  const valid = !isNaN(parsed) && parsed > 0;

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose} />
      <View style={styles.modalSheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.modalTitle}>{t('quotation.counterOffer', 'Revise Offer')}</Text>
        <Text style={styles.modalSub}>{quote.materialLot?.subcategory || quote.category}</Text>
        <Text style={styles.fieldLabel}>{t('marketplace.offerPriceLabel', 'Your revised offer (₹) *')}</Text>
        <TextInput style={styles.fieldInput} value={amount} onChangeText={setAmount}
          keyboardType="numeric" placeholder={t('marketplace.offerPriceLabel', 'Enter amount')} placeholderTextColor="rgba(255,255,255,0.30)" autoFocus />
        <Text style={styles.fieldLabel}>{t('marketplace.offerNotesLabel', 'Message (optional)')}</Text>
        <TextInput style={[styles.fieldInput, { height: 64, paddingTop: 10, textAlignVertical: 'top' }]}
          value={notes} onChangeText={setNotes} multiline
          placeholder={t('marketplace.offerNotesLabel', 'Why you\'re revising…')} placeholderTextColor="rgba(255,255,255,0.30)" />
        <View style={styles.modalActions}>
          <TouchableOpacity style={styles.modalCancelBtn} onPress={onClose} disabled={isSubmitting}>
            <Text style={styles.modalCancelText}>{t('common.cancel', 'Cancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.modalSubmitBtn, !valid && { opacity: 0.4 }]}
            onPress={() => valid && onSubmit(quote.id, parsed, notes.trim())}
            disabled={!valid || isSubmitting}>
            {isSubmitting
              ? <ActivityIndicator size="small" color="#FFF" />
              : <Text style={styles.modalSubmitText}>{t('marketplace.sendOffer', 'Send Offer')}</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ─── Cancel Modal ─────────────────────────────────────────────────────────────

const CancelRequestModal = ({
  request,
  isCancelling,
  cancelError,
  onClose,
  onConfirm,
}: {
  request: any;
  isCancelling: boolean;
  cancelError: string | null;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) => {
  const [reason, setReason] = useState('');
  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => !isCancelling && onClose()}>
      <View style={styles.cancelOverlay}>
        <View style={styles.cancelCard} accessibilityViewIsModal>
          <Text style={styles.cancelTitle}>Cancel Pickup Request</Text>
          <Text style={styles.cancelSub}>
            #{(request?.id || '').substring(0, 8).toUpperCase()} — Any assigned collector will be notified.
          </Text>
          {Boolean(cancelError) && (
            <View style={styles.cancelError}>
              <Text style={styles.cancelErrorText}>{cancelError}</Text>
            </View>
          )}
          <Text style={styles.fieldLabel}>Reason for cancellation *</Text>
          <TextInput style={[styles.fieldInput, { minHeight: 72, textAlignVertical: 'top' }]}
            placeholder="e.g. Schedule conflict, no longer needed"
            placeholderTextColor="rgba(255,255,255,0.35)"
            value={reason} onChangeText={setReason}
            maxLength={500} multiline editable={!isCancelling} />
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={onClose} disabled={isCancelling}>
              <Text style={styles.modalCancelText}>Keep Request</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.destructiveBtn} onPress={() => onConfirm(reason)} disabled={isCancelling}>
              {isCancelling
                ? <ActivityIndicator size="small" color="#FFF" />
                : <Text style={styles.destructiveBtnText}>Confirm Cancel</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─── Empty State ──────────────────────────────────────────────────────────────

const CitizenEmptyState = ({ icon, title, message, actionLabel, onAction }: {
  icon: string; title: string; message: string; actionLabel?: string; onAction?: () => void;
}) => (
  <View style={styles.emptyBox}>
    <Text style={styles.emptyIcon}>{icon}</Text>
    <Text style={styles.emptyTitle}>{title}</Text>
    <Text style={styles.emptyMessage}>{message}</Text>
    {actionLabel && onAction && (
      <TouchableOpacity style={styles.emptyAction} onPress={onAction} accessibilityRole="button">
        <Text style={styles.emptyActionText}>{actionLabel}</Text>
      </TouchableOpacity>
    )}
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

export const CitizenOrdersScreen: React.FC<Props> = ({ navigation }) => {
  const { isConnected } = useNetwork();
  const { t } = useI18n();

  // Segment state
  const [mainSegment, setMainSegment] = useState<MainSegment>('EWASTE');
  const segmentAnim = useRef(new Animated.Value(0)).current;

  // E-waste state
  const [requests, setRequests] = useState<any[]>([]);
  const [ewasteFilter, setEwasteFilter] = useState<EwasteFilter>('ALL');
  const [ewasteLoading, setEwasteLoading] = useState(true);
  const [ewasteRefreshing, setEwasteRefreshing] = useState(false);
  const [ewasteError, setEwasteError] = useState<string | null>(null);

  // Cancel modal state
  const [cancelRequest, setCancelRequest] = useState<any | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Purchases state
  const [quotes, setQuotes] = useState<RecyclerQuote[]>([]);
  const [purchaseFilter, setPurchaseFilter] = useState<PurchaseFilter>('ACTIVE');
  const [purchasesLoading, setPurchasesLoading] = useState(false);
  const [purchasesRefreshing, setPurchasesRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [counterQuote, setCounterQuote] = useState<RecyclerQuote | null>(null);

  // ── E-waste loading ──

  const loadRequests = useCallback(async (initial = false) => {
    setEwasteError(null);
    let hadCached = false;
    if (initial) {
      try {
        const cached = await offlineStore.getCachedRequests();
        if (Array.isArray(cached) && cached.length > 0) {
          setRequests(cached);
          setEwasteLoading(false);
          hadCached = true;
        }
      } catch {}
    }
    try {
      const data = await requestService.getRequests();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err: any) {
      if (!hadCached) {
        setEwasteError(err?.message || 'Could not load requests.');
      }
    } finally {
      setEwasteLoading(false);
      setEwasteRefreshing(false);
    }
  }, []);

  // ── Purchases loading ──

  const loadQuotes = useCallback(async (refresh = false) => {
    if (refresh) setPurchasesRefreshing(true);
    else setPurchasesLoading(true);
    try {
      const data = await quoteService.getCitizenQuotes();
      setQuotes(data || []);
    } catch {
      // show empty state
    } finally {
      setPurchasesLoading(false);
      setPurchasesRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadRequests(true);
  }, [loadRequests]);

  useEffect(() => {
    if (mainSegment === 'PURCHASES' && quotes.length === 0) {
      loadQuotes();
    }
  }, [mainSegment, loadQuotes, quotes.length]);

  // ── Segment switch animation ──

  const switchSegment = (seg: MainSegment) => {
    setMainSegment(seg);
    Animated.spring(segmentAnim, {
      toValue: seg === 'EWASTE' ? 0 : 1,
      useNativeDriver: false,
      friction: 8,
    }).start();
  };

  // ── Filtered requests ──

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const s = (r.status || '').toUpperCase();
      if (ewasteFilter === 'ALL') return true;
      if (ewasteFilter === 'ACTIVE') {
        return [REQUEST_STATUS.SUBMITTED, REQUEST_STATUS.ACCEPTED, REQUEST_STATUS.PICKUP_SCHEDULED, REQUEST_STATUS.DRAFT].includes(s);
      }
      if (ewasteFilter === 'COLLECTED') return s === REQUEST_STATUS.PICKED_UP || s === 'COMPLETED';
      if (ewasteFilter === 'CANCELLED') return s === REQUEST_STATUS.CANCELLED || s === REQUEST_STATUS.EXPIRED;
      return true;
    });
  }, [requests, ewasteFilter]);

  // ── Filtered quotes ──

  const filteredQuotes = useMemo(() => {
    return quotes.filter((q) => {
      const meta = getQuoteMeta(q.status, t);
      return meta.tab === purchaseFilter;
    });
  }, [quotes, purchaseFilter, t]);

  const quoteCounts = useMemo(() => {
    const counts: Record<PurchaseFilter, number> = { ACTIVE: 0, ACCEPTED: 0, COMPLETED: 0, CANCELLED: 0 };
    quotes.forEach((q) => {
      const m = getQuoteMeta(q.status, t);
      counts[m.tab as PurchaseFilter] = (counts[m.tab as PurchaseFilter] || 0) + 1;
    });
    return counts;
  }, [quotes, t]);

  // ── Cancel request ──

  const handleInitiateCancel = (req: any) => {
    if (!isConnected) {
      Alert.alert('Offline', 'Cancelling a request requires an internet connection.');
      return;
    }
    setCancelError(null);
    setCancelRequest(req);
  };

  const handleConfirmCancel = async (reason: string) => {
    if (!cancelRequest) return;
    if (!reason.trim()) {
      setCancelError('Please provide a reason for cancellation.');
      return;
    }
    setIsCancelling(true);
    setCancelError(null);
    try {
      await requestService.cancelRequest(cancelRequest.id, reason.trim());
      setCancelRequest(null);
      await loadRequests();
      Alert.alert('Request Cancelled', 'Your pickup request has been cancelled.');
    } catch (err: any) {
      setCancelError(err?.message || 'Failed to cancel. Please try again.');
    } finally {
      setIsCancelling(false);
    }
  };

  // ── Cancel quote ──

  const handleCancelQuote = (quote: RecyclerQuote) => {
    Alert.alert(
      'Retract Offer',
      'Are you sure you want to retract this purchase offer?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Retract',
          style: 'destructive',
          onPress: async () => {
            setIsSubmitting(true);
            try {
              await quoteService.cancelQuote(quote.id, 'Citizen retracted offer.');
              await loadQuotes(true);
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to retract offer.');
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const handleCounterSubmit = useCallback(async (quoteId: string, amount: number, notes: string) => {
    setIsSubmitting(true);
    try {
      await quoteService.counterQuote(quoteId, amount, notes || 'Citizen revised offer.');
      setCounterQuote(null);
      await loadQuotes(true);
      Alert.alert('Revised Offer Sent', 'Your revised offer has been sent to the seller.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to send revised offer.');
    } finally {
      setIsSubmitting(false);
    }
  }, [loadQuotes]);

  // ── Render ──

  const activeRequestsCount = requests.filter((r) =>
    [REQUEST_STATUS.SUBMITTED, REQUEST_STATUS.ACCEPTED, REQUEST_STATUS.PICKUP_SCHEDULED].includes((r.status || '').toUpperCase())
  ).length;

  const activeQuotesCount = quoteCounts.ACTIVE;

  return (
    <EcoSetuBackground>
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>{t('navigation.requests', 'My Orders')}</Text>
            <Text style={styles.headerSub}>{t('citizen.dashboard.activityOverview', 'Track all your activity')}</Text>
          </View>
          <TouchableOpacity
            style={styles.newPickupBtn}
            onPress={() => navigation.navigate('CitizenSubmit')}
            accessibilityRole="button"
            accessibilityLabel={t('citizen.dashboard.submitNewEwaste', 'Schedule new pickup')}
          >
            <Text style={styles.newPickupText}>+ {t('collection.pickup', 'Pickup')}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Offline Banner ── */}
        {!isConnected && (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineText}>📡 {t('common.offline', 'Offline — showing cached data')}</Text>
          </View>
        )}

        {/* ── Segment Switcher ── */}
        <View style={styles.segmentWrapper}>
          <View style={styles.segmentBar}>
            {/* sliding indicator */}
            <Animated.View style={[
              styles.segmentIndicator,
              {
                left: segmentAnim.interpolate({ inputRange: [0, 1], outputRange: ['2%', '51%'] }),
              },
            ]} />
            <TouchableOpacity
              style={styles.segmentBtn}
              onPress={() => switchSegment('EWASTE')}
              accessibilityRole="tab"
              accessibilityState={{ selected: mainSegment === 'EWASTE' }}
            >
              <Text style={[styles.segmentText, mainSegment === 'EWASTE' && styles.segmentTextActive]}>
                ♻️ {t('ewaste.ewaste', 'E-Waste')}
                {activeRequestsCount > 0 ? ` (${activeRequestsCount})` : ''}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.segmentBtn}
              onPress={() => switchSegment('PURCHASES')}
              accessibilityRole="tab"
              accessibilityState={{ selected: mainSegment === 'PURCHASES' }}
            >
              <Text style={[styles.segmentText, mainSegment === 'PURCHASES' && styles.segmentTextActive]}>
                🛍️ {t('marketplace.myPurchases', 'Purchases')}
                {activeQuotesCount > 0 ? ` (${activeQuotesCount})` : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── E-WASTE TAB ── */}
        {mainSegment === 'EWASTE' && (
          <>
            {/* Filter pills */}
            <View style={styles.filterRow}>
              {(['ALL', 'ACTIVE', 'COLLECTED', 'CANCELLED'] as EwasteFilter[]).map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[styles.filterPill, ewasteFilter === f && styles.filterPillActive]}
                  onPress={() => setEwasteFilter(f)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: ewasteFilter === f }}
                >
                  <Text style={[styles.filterText, ewasteFilter === f && styles.filterTextActive]}>
                    {f === 'ALL' ? `${t('marketplace.allCategories', 'All')} (${requests.length})` : f === 'ACTIVE' ? t('status.inProgress', 'Active') : f === 'COLLECTED' ? t('status.pickedUp', 'Collected') : t('status.cancelled', 'Cancelled')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {ewasteError && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{ewasteError}</Text>
                <TouchableOpacity onPress={() => loadRequests()} style={styles.retryBtn}>
                  <Text style={styles.retryText}>{t('common.retry', 'Retry')}</Text>
                </TouchableOpacity>
              </View>
            )}

            {ewasteLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color="#10B981" />
                <Text style={styles.loadingText}>{t('common.loading', 'Loading pickups…')}</Text>
              </View>
            ) : (
              <FlatList
                data={filteredRequests}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={ewasteRefreshing}
                    onRefresh={() => { setEwasteRefreshing(true); loadRequests(); }}
                    tintColor="#10B981" colors={['#10B981']}
                  />
                }
                ListEmptyComponent={
                  <CitizenEmptyState
                    icon="📦"
                    title={ewasteFilter === 'ALL' ? t('citizen.requests.noRequestsTitle', 'No Pickup Requests') : t('citizen.requests.noRequestsFilterMessage', 'No requests found.')}
                    message={ewasteFilter === 'ALL'
                      ? t('citizen.requests.noRequestsMessage', 'Schedule your first free e-waste pickup. We come to you!')
                      : t('citizen.requests.noRequestsFilterMessage', 'No requests found in this filter.')}
                    actionLabel={ewasteFilter === 'ALL' ? `+ ${t('citizen.requests.submitItemBtn', 'Schedule Pickup')}` : undefined}
                    onAction={ewasteFilter === 'ALL' ? () => navigation.navigate('CitizenSubmit') : undefined}
                  />
                }
                renderItem={({ item }) => (
                  <RequestCard
                    item={item}
                    onPress={() => (navigation as any).navigate('RequestDetail', { requestId: item.id })}
                    onCancel={() => handleInitiateCancel(item)}
                  />
                )}
              />
            )}
          </>
        )}

        {/* ── PURCHASES TAB ── */}
        {mainSegment === 'PURCHASES' && (
          <>
            {/* Purchase filter pills */}
            <View style={styles.filterRow}>
              {([
                { key: 'ACTIVE', label: t('status.pending', 'Pending') },
                { key: 'ACCEPTED', label: t('status.accepted', 'Accepted') },
                { key: 'COMPLETED', label: t('status.completed', 'Done') },
                { key: 'CANCELLED', label: t('status.cancelled', 'Cancelled') },
              ] as { key: PurchaseFilter; label: string }[]).map(({ key, label }) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.filterPill, styles.filterPillPurple, purchaseFilter === key && styles.filterPillPurpleActive]}
                  onPress={() => setPurchaseFilter(key)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: purchaseFilter === key }}
                >
                  <Text style={[styles.filterText, purchaseFilter === key && styles.filterTextPurpleActive]}>
                    {label}{quoteCounts[key] > 0 ? ` (${quoteCounts[key]})` : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {purchasesLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color="#8B5CF6" />
                <Text style={styles.loadingText}>{t('common.loading', 'Loading offers…')}</Text>
              </View>
            ) : (
              <FlatList
                data={filteredQuotes}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={purchasesRefreshing}
                    onRefresh={() => loadQuotes(true)}
                    tintColor="#8B5CF6" colors={['#8B5CF6']}
                  />
                }
                ListEmptyComponent={
                  <CitizenEmptyState
                    icon="🛍️"
                    title={purchaseFilter === 'ACTIVE' ? t('purchases.noPurchases', 'No pending offers') : t('purchases.noPurchases', 'No offers found')}
                    message={purchaseFilter === 'ACTIVE'
                      ? t('purchases.subtitle', 'Browse the Shop and make offers on reusable electronics.')
                      : t('purchases.subtitle', 'Your purchase offers in this category will appear here.')}
                    actionLabel={purchaseFilter === 'ACTIVE' ? `${t('purchases.exploreStore', 'Browse Shop')} →` : undefined}
                    onAction={purchaseFilter === 'ACTIVE' ? () => (navigation as any).navigate('CitizenMarketplace') : undefined}
                  />
                }
                renderItem={({ item }) => (
                  <PurchaseCard
                    quote={item}
                    onCancel={() => handleCancelQuote(item)}
                    onCounter={() => setCounterQuote(item)}
                    onViewBills={() => (navigation as any).navigate('CitizenBills')}
                  />
                )}
              />
            )}
          </>
        )}

        {/* ── Modals ── */}
        {cancelRequest && (
          <CancelRequestModal
            request={cancelRequest}
            isCancelling={isCancelling}
            cancelError={cancelError}
            onClose={() => { if (!isCancelling) { setCancelRequest(null); setCancelError(null); } }}
            onConfirm={handleConfirmCancel}
          />
        )}

        {counterQuote && (
          <CounterModal
            quote={counterQuote}
            isSubmitting={isSubmitting}
            onClose={() => setCounterQuote(null)}
            onSubmit={handleCounterSubmit}
          />
        )}
      </SafeAreaView>
    </EcoSetuBackground>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const C = {
  bg: '#071E22',
  surface: 'rgba(16,44,48,0.85)',
  border: 'rgba(255,255,255,0.10)',
  green: '#10B981',
  greenMid: '#34D399',
  purple: '#8B5CF6',
  text: '#FFFFFF',
  textSub: 'rgba(255,255,255,0.55)',
  textDim: 'rgba(255,255,255,0.35)',
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8,
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
  headerSub: { fontSize: 12, color: C.textSub, marginTop: 2 },
  newPickupBtn: {
    backgroundColor: C.green, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 9,
  },
  newPickupText: { fontSize: 13, fontWeight: '800', color: C.bg },

  // Offline
  offlineBanner: {
    backgroundColor: 'rgba(245,158,11,0.14)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.30)',
    marginHorizontal: 20, borderRadius: 10, padding: 8, marginBottom: 4, alignItems: 'center',
  },
  offlineText: { fontSize: 12, color: '#FBBF24', fontWeight: '600' },

  // Segment
  segmentWrapper: { paddingHorizontal: 20, paddingBottom: 10 },
  segmentBar: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 16, padding: 3, position: 'relative', overflow: 'hidden',
  },
  segmentIndicator: {
    position: 'absolute', top: 3, bottom: 3, width: '49%',
    backgroundColor: 'rgba(16,185,129,0.22)', borderRadius: 13,
    borderWidth: 1, borderColor: 'rgba(52,211,153,0.35)',
  },
  segmentBtn: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 13 },
  segmentText: { fontSize: 13, fontWeight: '600', color: C.textSub },
  segmentTextActive: { color: C.greenMid, fontWeight: '800' },

  // Filter pills
  filterRow: {
    flexDirection: 'row', gap: 7, paddingHorizontal: 20, marginBottom: 10, flexWrap: 'wrap',
  },
  filterPill: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: C.border,
  },
  filterPillActive: {
    backgroundColor: 'rgba(16,185,129,0.18)', borderColor: C.green,
  },
  filterPillPurple: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderColor: C.border,
  },
  filterPillPurpleActive: {
    backgroundColor: 'rgba(139,92,246,0.18)', borderColor: C.purple,
  },
  filterText: { fontSize: 11, fontWeight: '600', color: C.textSub },
  filterTextActive: { color: C.green },
  filterTextPurpleActive: { color: '#A78BFA' },

  // Error
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(239,68,68,0.13)', borderWidth: 1, borderColor: 'rgba(248,113,113,0.30)',
    borderRadius: 12, marginHorizontal: 20, padding: 10, marginBottom: 8,
  },
  errorText: { fontSize: 12, color: '#FCA5A5', flex: 1, marginRight: 8 },
  retryBtn: { backgroundColor: 'rgba(239,68,68,0.22)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  retryText: { fontSize: 11, fontWeight: '700', color: '#FFF' },

  // Loading
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  loadingText: { fontSize: 13, color: C.textSub, marginTop: 10 },

  // List
  listContent: { paddingHorizontal: 20, paddingBottom: 110, flexGrow: 1 },

  // Card
  card: {
    backgroundColor: C.surface, borderRadius: 20, borderWidth: 1.5, borderColor: C.border,
    padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 3,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  cardIconBox: {
    width: 44, height: 44, borderRadius: 13, justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  cardIconText: { fontSize: 20 },
  cardHeaderText: { flex: 1, marginRight: 8 },
  cardRef: { fontSize: 14, fontWeight: '800', color: C.text, letterSpacing: 0.2 },
  cardSub: { fontSize: 12, color: C.textSub, marginTop: 2 },
  statusPill: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1,
  },
  statusPillText: { fontSize: 10, fontWeight: '700' },

  cardMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  cardMetaIcon: { fontSize: 12, marginRight: 5 },
  cardMetaText: { fontSize: 12, color: C.textSub, flex: 1 },

  cardFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 10, marginTop: 6, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)',
  },
  viewLink: { fontSize: 13, fontWeight: '700', color: C.greenMid },
  cancelLink: { fontSize: 12, fontWeight: '700', color: '#F87171' },

  // Purchase card extras
  priceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  priceLabel: { fontSize: 10, color: C.textSub, fontWeight: '600', textTransform: 'uppercase', marginRight: 6 },
  priceValue: { fontSize: 20, fontWeight: '800', color: C.text },
  askingBox: { marginLeft: 'auto' as any, alignItems: 'flex-end' },
  askingLabel: { fontSize: 9, color: C.textDim, textTransform: 'uppercase' },
  askingValue: { fontSize: 13, color: C.textSub, fontWeight: '600' },

  sellerRow: { flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(16,185,129,0.10)', borderRadius: 10, padding: 10, marginBottom: 8 },
  sellerIcon: { fontSize: 16 },
  sellerName: { fontSize: 13, fontWeight: '700', color: C.text },
  sellerArea: { fontSize: 11, color: C.textSub },

  negotiationRow: { gap: 6, paddingTop: 4, marginBottom: 6 },
  negBubbleWrap: { flexDirection: 'row' },
  negLeft: { justifyContent: 'flex-start' },
  negRight: { justifyContent: 'flex-end' },
  negBubble: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, maxWidth: '60%' },
  negBubbleOther: { backgroundColor: 'rgba(255,255,255,0.07)' },
  negBubbleSelf: { backgroundColor: 'rgba(16,185,129,0.16)' },
  negPrice: { fontSize: 13, fontWeight: '700', color: C.text },
  negRole: { fontSize: 10, color: C.textSub, fontWeight: '600' },

  retractBtn: {
    flex: 1, height: 40, borderRadius: 10, borderWidth: 1.5,
    borderColor: 'rgba(239,68,68,0.35)', alignItems: 'center', justifyContent: 'center', marginRight: 8,
  },
  retractText: { fontSize: 12, color: '#F87171', fontWeight: '700' },
  reviseBtn: {
    flex: 2, height: 40, borderRadius: 10, backgroundColor: 'rgba(139,92,246,0.18)',
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.35)', alignItems: 'center', justifyContent: 'center',
  },
  reviseBtnText: { fontSize: 12, color: '#A78BFA', fontWeight: '700' },
  billsBtn: {
    flex: 1, height: 40, borderRadius: 10, backgroundColor: C.green,
    alignItems: 'center', justifyContent: 'center',
  },
  billsBtnText: { fontSize: 12, color: C.bg, fontWeight: '700' },

  // Empty state
  emptyBox: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingTop: 56 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: C.text, textAlign: 'center', marginBottom: 8 },
  emptyMessage: { fontSize: 14, color: C.textSub, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  emptyAction: {
    backgroundColor: C.green, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12,
  },
  emptyActionText: { fontSize: 14, fontWeight: '800', color: C.bg },

  // Counter modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.60)' },
  modalSheet: {
    backgroundColor: '#0D2E32', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 36, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)',
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.20)',
    alignSelf: 'center', marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: C.text, marginBottom: 4 },
  modalSub: { fontSize: 14, color: C.textSub, marginBottom: 16 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: C.textSub, letterSpacing: 0.4, marginBottom: 6, marginTop: 12, textTransform: 'uppercase' },
  fieldInput: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 16, color: C.text, fontWeight: '500',
  },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalCancelBtn: {
    flex: 1, height: 50, borderRadius: 14, borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.20)', alignItems: 'center', justifyContent: 'center',
  },
  modalCancelText: { fontSize: 14, color: 'rgba(255,255,255,0.65)', fontWeight: '600' },
  modalSubmitBtn: { flex: 2, height: 50, borderRadius: 14, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center' },
  modalSubmitText: { fontSize: 14, color: C.bg, fontWeight: '700' },

  // Cancel modal
  cancelOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  cancelCard: {
    backgroundColor: '#0B2D33', borderRadius: 22, padding: 24, width: '100%', maxWidth: 400,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)',
  },
  cancelTitle: { fontSize: 17, fontWeight: '800', color: C.text, marginBottom: 8 },
  cancelSub: { fontSize: 13, color: C.textSub, marginBottom: 16, lineHeight: 18 },
  cancelError: { backgroundColor: 'rgba(239,68,68,0.14)', borderRadius: 10, padding: 10, marginBottom: 12 },
  cancelErrorText: { fontSize: 12, color: '#FCA5A5' },
  destructiveBtn: {
    flex: 2, height: 48, borderRadius: 12, backgroundColor: '#EF4444',
    alignItems: 'center', justifyContent: 'center',
  },
  destructiveBtnText: { fontSize: 13, fontWeight: '700', color: '#FFF' },
});

export default CitizenOrdersScreen;
