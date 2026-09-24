/**
 * CitizenPurchasesScreen — COMPLETE REBUILD
 * My marketplace purchases / offers.
 * Goal: Track active purchase offers + completed purchases.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useNetwork } from '../../hooks/useNetwork';
import { EcoSetuBackground } from '../../components/glass/EcoSetuBackground';
import { quoteService, RecyclerQuote } from '../../services/quoteService';
import { MATERIAL_TAXONOMY } from '../../config/materialTaxonomy';
import { colors } from '../../theme/colors';

type FilterTab = 'ACTIVE' | 'ACCEPTED' | 'COMPLETED' | 'CANCELLED';

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'ACTIVE',    label: 'Pending' },
  { key: 'ACCEPTED',  label: 'Accepted' },
  { key: 'COMPLETED', label: 'Done' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

// ─── Status meta ──────────────────────────────────────────────────────────────

function quoteMeta(status: string) {
  switch (status) {
    case 'SENT':
    case 'VIEWED':
      return { label: 'Awaiting Reply', color: '#60A5FA', bg: 'rgba(59,130,246,0.15)', tab: 'ACTIVE' };
    case 'ACCEPTED':
      return { label: '✓ Accepted', color: '#10B981', bg: 'rgba(16,185,129,0.15)', tab: 'ACCEPTED' };
    case 'COMPLETED':
    case 'PAID':
    case 'HANDED_OVER':
      return { label: 'Completed', color: '#34D399', bg: 'rgba(52,211,153,0.15)', tab: 'COMPLETED' };
    case 'REJECTED':
    case 'CANCELLED':
    case 'EXPIRED':
      return { label: status === 'REJECTED' ? 'Declined' : status === 'EXPIRED' ? 'Expired' : 'Cancelled',
               color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)', tab: 'CANCELLED' };
    default:
      return { label: status, color: '#94A3B8', bg: 'rgba(148,163,184,0.12)', tab: 'ACTIVE' };
  }
}

// ─── Counter Offer Modal ──────────────────────────────────────────────────────

interface CounterModalProps {
  quote: RecyclerQuote | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (quoteId: string, amount: number, notes: string) => void;
}

const CounterModal: React.FC<CounterModalProps> = ({ quote, isSubmitting, onClose, onSubmit }) => {
  const [amount, setAmount] = useState(String(quote?.quotedUnitPrice || ''));
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (quote) {
      setAmount(String(quote.quotedUnitPrice || ''));
      setNotes('');
    }
  }, [quote]);

  if (!quote) return null;

  const parsed = parseFloat(amount);
  const valid = !isNaN(parsed) && parsed > 0;
  const cat = MATERIAL_TAXONOMY[quote.category] || { symbol: '📦', defaultName: quote.category };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose} />
      <View style={styles.modalSheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.modalTitle}>Revise Offer</Text>
        <Text style={styles.modalSubtitle}>
          {cat.symbol} {quote.materialLot?.subcategory || cat.defaultName}
        </Text>

        <Text style={styles.fieldLabel}>Your revised offer (₹) *</Text>
        <TextInput
          style={styles.modalInput}
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          placeholder="Enter new amount"
          placeholderTextColor="rgba(255,255,255,0.30)"
          autoFocus
        />

        <Text style={styles.fieldLabel}>Message (optional)</Text>
        <TextInput
          style={[styles.modalInput, { height: 70, paddingTop: 12, textAlignVertical: 'top' }]}
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder="Why you're revising…"
          placeholderTextColor="rgba(255,255,255,0.30)"
        />

        <View style={styles.modalActions}>
          <TouchableOpacity style={styles.modalCancelBtn} onPress={onClose} disabled={isSubmitting}>
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modalSubmitBtn, !valid && { opacity: 0.4 }]}
            onPress={() => valid && onSubmit(quote.id, parsed, notes.trim())}
            disabled={!valid || isSubmitting}
          >
            {isSubmitting
              ? <ActivityIndicator size="small" color="#FFF" />
              : <Text style={styles.modalSubmitText}>Send Revised Offer</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ─── Order Card ───────────────────────────────────────────────────────────────

interface OrderCardProps {
  quote: RecyclerQuote;
  onCancel: (q: RecyclerQuote) => void;
  onCounter: (q: RecyclerQuote) => void;
  onViewBills: () => void;
}

const OrderCard: React.FC<OrderCardProps> = React.memo(({ quote, onCancel, onCounter, onViewBills }) => {
  const cat = MATERIAL_TAXONOMY[quote.materialLot?.category || quote.category] || { symbol: '📦', defaultName: quote.category };
  const meta = quoteMeta(quote.status);
  const isPending = quote.status === 'SENT' || quote.status === 'VIEWED';
  const isAccepted = quote.status === 'ACCEPTED';
  const itemName = quote.materialLot?.subcategory || cat.defaultName;
  const offeredPrice = `₹${Number(quote.quotedUnitPrice).toLocaleString('en-IN')}`;
  const askingPrice = quote.materialLot?.askingPrice;

  return (
    <View style={styles.orderCard}>
      {/* Header */}
      <View style={styles.orderCardHeader}>
        <View style={styles.orderCardHeaderLeft}>
          <Text style={styles.orderCategoryIcon}>{cat.symbol}</Text>
          <View style={styles.orderTitleBlock}>
            <Text style={styles.orderTitle} numberOfLines={1}>{itemName}</Text>
            <Text style={styles.orderRef}>
              Offer · …{(quote.referenceNumber || '').slice(-6)}
            </Text>
          </View>
        </View>
        <View style={[styles.orderStatusBadge, { backgroundColor: meta.bg }]}>
          <Text style={[styles.orderStatusText, { color: meta.color }]}>{meta.label}</Text>
        </View>
      </View>

      {/* Price row */}
      <View style={styles.orderPriceRow}>
        <View>
          <Text style={styles.priceSublabel}>Your Offer</Text>
          <Text style={styles.offerPrice}>{offeredPrice}</Text>
        </View>
        {askingPrice && askingPrice > 0 && (
          <View style={styles.askingBox}>
            <Text style={styles.priceSublabel}>Asking Price</Text>
            <Text style={styles.askingPriceText}>₹{Number(askingPrice).toLocaleString('en-IN')}</Text>
          </View>
        )}
      </View>

      {/* Collector info (revealed after acceptance) */}
      {isAccepted && quote.materialLot?.collector?.user && (
        <View style={styles.collectorReveal}>
          <Text style={styles.collectorRevealIcon}>🤝</Text>
          <View>
            <Text style={styles.collectorRevealName}>{quote.materialLot.collector.user.name}</Text>
            <Text style={styles.collectorRevealArea}>
              {quote.materialLot.collector.serviceArea
                ? `${quote.materialLot.collector.serviceArea}, ${quote.materialLot.collector.city}`
                : quote.materialLot.collector.city || 'Local Collector'}
            </Text>
          </View>
        </View>
      )}

      {/* Negotiation timeline if there's history */}
      {quote.negotiationTimeline && quote.negotiationTimeline.length > 0 && (
        <View style={styles.negotiationTimeline}>
          {quote.negotiationTimeline.slice(-3).map((neg: any, i: number) => (
            <View key={i} style={[
              styles.negRow,
              neg.fromRole === 'CITIZEN' ? styles.negRowRight : styles.negRowLeft,
            ]}>
              <View style={[
                styles.negBubble,
                neg.fromRole === 'CITIZEN' ? styles.negBubbleCitizen : styles.negBubbleSeller,
              ]}>
                <Text style={styles.negBubbleAmount}>
                  ₹{Number(neg.price).toLocaleString('en-IN')}
                </Text>
                <Text style={styles.negBubbleRole}>
                  {neg.fromRole === 'CITIZEN' ? 'You' : 'Seller'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Actions */}
      <View style={styles.orderActions}>
        {isPending && (
          <>
            <TouchableOpacity
              style={styles.cancelOfferBtn}
              onPress={() => onCancel(quote)}
              accessibilityRole="button"
              accessibilityLabel="Cancel offer"
            >
              <Text style={styles.cancelOfferText}>Retract</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.reviseBtn}
              onPress={() => onCounter(quote)}
              accessibilityRole="button"
              accessibilityLabel="Revise offer"
            >
              <Text style={styles.reviseBtnText}>Revise Offer</Text>
            </TouchableOpacity>
          </>
        )}
        {isAccepted && (
          <TouchableOpacity
            style={styles.viewBillsBtn}
            onPress={onViewBills}
            accessibilityRole="button"
            accessibilityLabel="View bills"
          >
            <Text style={styles.viewBillsText}>🧾 View Bills & Receipt</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export const CitizenPurchasesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { isConnected } = useNetwork();

  const [quotes, setQuotes] = useState<RecyclerQuote[]>([]);
  const [activeTab, setActiveTab] = useState<FilterTab>('ACTIVE');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [counterQuote, setCounterQuote] = useState<RecyclerQuote | null>(null);

  const fetchQuotes = useCallback(async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    try {
      const data = await quoteService.getCitizenQuotes();
      setQuotes(data || []);
    } catch {
      // silent — show empty state
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchQuotes(); }, [fetchQuotes]);

  const filtered = useMemo(() => {
    return quotes.filter((q) => {
      const meta = quoteMeta(q.status);
      return meta.tab === activeTab;
    });
  }, [quotes, activeTab]);

  const handleCancel = useCallback((quote: RecyclerQuote) => {
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
              await fetchQuotes(true);
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to retract offer.');
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ],
    );
  }, [fetchQuotes]);

  const handleCounterSubmit = useCallback(async (quoteId: string, amount: number, notes: string) => {
    setIsSubmitting(true);
    try {
      await quoteService.counterQuote(quoteId, amount, notes || 'Citizen revised offer.');
      setCounterQuote(null);
      await fetchQuotes(true);
      Alert.alert('Revised Offer Sent', 'Your revised offer has been sent to the seller.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to send revised offer.');
    } finally {
      setIsSubmitting(false);
    }
  }, [fetchQuotes]);

  const tabCounts = useMemo(() => {
    const counts: Record<FilterTab, number> = { ACTIVE: 0, ACCEPTED: 0, COMPLETED: 0, CANCELLED: 0 };
    quotes.forEach((q) => {
      const m = quoteMeta(q.status);
      counts[m.tab as FilterTab] = (counts[m.tab as FilterTab] || 0) + 1;
    });
    return counts;
  }, [quotes]);

  const renderItem = useCallback(({ item }: { item: RecyclerQuote }) => (
    <OrderCard
      quote={item}
      onCancel={handleCancel}
      onCounter={setCounterQuote}
      onViewBills={() => navigation.navigate('CitizenBills')}
    />
  ), [handleCancel, navigation]);

  const keyExtractor = useCallback((item: RecyclerQuote) => item.id, []);

  return (
    <EcoSetuBackground>
      <SafeAreaView style={styles.safe}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Orders</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Tab bar */}
        <View style={styles.tabBar}>
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            const count = tabCounts[tab.key];
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, active && styles.tabActive]}
                onPress={() => setActiveTab(tab.key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={tab.label}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                  {tab.label}
                </Text>
                {count > 0 && (
                  <View style={[styles.tabBadge, active && styles.tabBadgeActive]}>
                    <Text style={[styles.tabBadgeText, active && styles.tabBadgeTextActive]}>
                      {count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Content */}
        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#10B981" />
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews
            maxToRenderPerBatch={8}
            windowSize={7}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => fetchQuotes(true)}
                tintColor="#10B981"
                colors={['#10B981']}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Text style={styles.emptyIcon}>
                  {activeTab === 'ACTIVE' ? '🛍️' : activeTab === 'ACCEPTED' ? '🤝' : activeTab === 'COMPLETED' ? '✅' : '📁'}
                </Text>
                <Text style={styles.emptyTitle}>
                  {activeTab === 'ACTIVE' ? 'No pending offers'
                    : activeTab === 'ACCEPTED' ? 'No accepted offers'
                    : activeTab === 'COMPLETED' ? 'No completed orders yet'
                    : 'No cancelled offers'}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {activeTab === 'ACTIVE'
                    ? 'Browse the Shop to make purchase offers on reusable electronics.'
                    : 'Offers you make in the Shop will appear here.'}
                </Text>
                {activeTab === 'ACTIVE' && (
                  <TouchableOpacity
                    style={styles.shopBtn}
                    onPress={() => navigation.navigate('CitizenMarketplace')}
                    accessibilityRole="button"
                  >
                    <Text style={styles.shopBtnText}>Browse Shop →</Text>
                  </TouchableOpacity>
                )}
              </View>
            }
          />
        )}

        {/* Counter Offer Modal */}
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: 'transparent' },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: { fontSize: 22, color: '#FFFFFF', fontWeight: '700' },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  headerSpacer: { width: 40 },

  // ── Tabs ──
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    padding: 4,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 11,
    gap: 5,
  },
  tabActive: {
    backgroundColor: 'rgba(16,185,129,0.20)',
  },
  tabText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.45)',
  },
  tabTextActive: { color: '#34D399', fontWeight: '700' },
  tabBadge: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: 'center',
  },
  tabBadgeActive: { backgroundColor: 'rgba(16,185,129,0.30)' },
  tabBadgeText: { fontSize: 9, color: 'rgba(255,255,255,0.55)', fontWeight: '700' },
  tabBadgeTextActive: { color: '#34D399' },

  // ── List ──
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    flexGrow: 1,
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Order Card ──
  orderCard: {
    backgroundColor: 'rgba(16,44,48,0.85)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    padding: 16,
    marginBottom: 12,
    gap: 14,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  orderCardHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  orderCategoryIcon: { fontSize: 24 },
  orderTitleBlock: { flex: 1 },
  orderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  orderRef: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.40)',
    fontWeight: '500',
    marginTop: 2,
  },
  orderStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  orderStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // ── Price ──
  orderPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
    paddingTop: 12,
  },
  priceSublabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '600',
    letterSpacing: 0.3,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  offerPrice: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  askingBox: { alignItems: 'flex-end' },
  askingPriceText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.50)',
  },

  // ── Collector reveal ──
  collectorReveal: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(16,185,129,0.10)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.25)',
  },
  collectorRevealIcon: { fontSize: 18 },
  collectorRevealName: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  collectorRevealArea: { fontSize: 12, color: 'rgba(255,255,255,0.50)', marginTop: 2 },

  // ── Negotiation timeline ──
  negotiationTimeline: {
    gap: 6,
    paddingTop: 4,
  },
  negRow: {
    flexDirection: 'row',
  },
  negRowLeft: { justifyContent: 'flex-start' },
  negRowRight: { justifyContent: 'flex-end' },
  negBubble: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    maxWidth: '60%',
    gap: 2,
  },
  negBubbleSeller: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  negBubbleCitizen: {
    backgroundColor: 'rgba(16,185,129,0.18)',
  },
  negBubbleAmount: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  negBubbleRole: { fontSize: 10, color: 'rgba(255,255,255,0.50)', fontWeight: '600' },

  // ── Actions ──
  orderActions: {
    flexDirection: 'row',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
    paddingTop: 12,
  },
  cancelOfferBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(239,68,68,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelOfferText: { fontSize: 13, color: '#F87171', fontWeight: '600' },
  reviseBtn: {
    flex: 2,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(16,185,129,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviseBtnText: { fontSize: 13, color: '#34D399', fontWeight: '700' },
  viewBillsBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewBillsText: { fontSize: 13, color: '#FFFFFF', fontWeight: '700' },

  // ── Empty ──
  emptyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  emptyIcon: { fontSize: 52, marginBottom: 14 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#FFFFFF', textAlign: 'center', marginBottom: 8 },
  emptySubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.50)', textAlign: 'center', lineHeight: 20 },
  shopBtn: {
    marginTop: 20,
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  shopBtnText: { fontSize: 14, color: '#FFFFFF', fontWeight: '700' },

  // ── Modal ──
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
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
  modalSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.55)', marginBottom: 16 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 0.4,
    marginBottom: 6,
    marginTop: 12,
    textTransform: 'uppercase',
  },
  modalInput: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
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
  modalSubmitBtn: {
    flex: 2,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubmitText: { fontSize: 15, color: '#FFFFFF', fontWeight: '700' },
});

export default CitizenPurchasesScreen;
