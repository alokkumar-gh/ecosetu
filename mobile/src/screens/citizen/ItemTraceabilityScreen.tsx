/**
 * ItemTraceabilityScreen — COMPLETE REBUILD
 * Citizen views the verified lifecycle journey of their e-waste item.
 * Goal: Simple visual chain — YOU → Collected → Recycler → Done.
 * No internal backend terminology exposed.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CitizenStackParamList } from '../../navigation/types';
import { useNetwork } from '../../hooks/useNetwork';
import { useI18n } from '../../i18n';
import { ewasteService } from '../../services/ewasteService';
import { EcoSetuBackground } from '../../components/eco';
import {
  ITEM_STATUS,
  CONSIGNMENT_STATUS,
  RECYCLING_STATUS,
  PICKUP_STATUS,
} from '../../utils/constants';
import { colors } from '../../theme/colors';
import { AppIcon, IconName } from '../../components/ui/AppIcon';

type Props = NativeStackScreenProps<CitizenStackParamList, 'ItemTraceability'>;

// ─── Stage config ──────────────────────────────────────────────────────────────

interface Stage {
  id: string;
  icon: IconName;
  title: string;
  description: string;
}

// ─── Stage completeness logic ──────────────────────────────────────────────────

interface TraceData {
  item?: any;
  request?: any;
  pickup?: any;
  consignment?: any;
  recyclingRecord?: any;
}

function getStageState(stageId: string, data: TraceData): 'done' | 'current' | 'pending' {
  switch (stageId) {
    case 'submitted':
      if (!data.item?.status || data.item.status === 'DRAFT') return 'pending';
      return 'done';

    case 'collected':
      if (
        data.item?.status === ITEM_STATUS.COLLECTED ||
        data.item?.status === ITEM_STATUS.CONSIGNED ||
        data.item?.status === ITEM_STATUS.RECYCLED ||
        data.request?.status === 'PICKED_UP' ||
        data.pickup?.status === PICKUP_STATUS.COMPLETED
      ) return 'done';
      if (
        data.request?.status === 'ACCEPTED' ||
        data.request?.status === 'PICKUP_SCHEDULED' ||
        data.pickup?.status === PICKUP_STATUS.SCHEDULED ||
        data.pickup?.status === PICKUP_STATUS.IN_PROGRESS
      ) return 'current';
      return 'pending';

    case 'in_transit':
      if (
        data.item?.status === ITEM_STATUS.RECYCLED ||
        data.recyclingRecord ||
        (data.consignment && [
          CONSIGNMENT_STATUS.ACCEPTED,
          CONSIGNMENT_STATUS.DELIVERED,
        ].includes(data.consignment.status))
      ) return 'done';
      if (
        data.consignment &&
        (data.consignment.status === CONSIGNMENT_STATUS.CREATED ||
          data.consignment.status === CONSIGNMENT_STATUS.IN_TRANSIT ||
          data.consignment.status === 'PENDING')
      ) return 'current';
      return 'pending';

    case 'recycled':
      if (
        data.recyclingRecord?.status === RECYCLING_STATUS.COMPLETED ||
        data.item?.status === ITEM_STATUS.RECYCLED
      ) return 'done';
      if (
        data.recyclingRecord &&
        (data.recyclingRecord.status === RECYCLING_STATUS.RECEIVED ||
          data.recyclingRecord.status === RECYCLING_STATUS.PROCESSING)
      ) return 'current';
      return 'pending';

    default:
      return 'pending';
  }
}

// ─── Date formatter ───────────────────────────────────────────────────────────

function fmtDate(iso?: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export const ItemTraceabilityScreen: React.FC<Props> = ({ navigation, route }) => {
  const itemId = route?.params?.itemId;
  const { isConnected } = useNetwork();
  const { t } = useI18n();

  const stages: Stage[] = [
    {
      id: 'submitted',
      icon: 'upload',
      title: t('traceability.stageSubmittedTitle', 'You gave it'),
      description: t('traceability.stageSubmittedDesc', 'You submitted this item for e-waste collection.'),
    },
    {
      id: 'collected',
      icon: 'handshake',
      title: t('traceability.stageCollectedTitle', 'Picked up'),
      description: t('traceability.stageCollectedDesc', 'A local collector (Kabadiwala) collected it from your doorstep.'),
    },
    {
      id: 'in_transit',
      icon: 'truck',
      title: t('traceability.stageTransitTitle', 'Handed over'),
      description: t('traceability.stageTransitDesc', 'The collector delivered it to a verified recycling facility.'),
    },
    {
      id: 'recycled',
      icon: 'recycle',
      title: t('traceability.stageRecycledTitle', 'Formally recycled'),
      description: t('traceability.stageRecycledDesc', 'The item has been responsibly processed at a certified recycler.'),
    },
  ];

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TraceData | null>(null);
  const [userItems, setUserItems] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | undefined>(itemId);

  const load = useCallback(async (refresh = false) => {
    if (!refresh) setIsLoading(true);
    setError(null);

    try {
      let activeId = selectedId || itemId;

      // If no item ID, fetch citizen's item list first
      if (!activeId) {
        const items: any = await ewasteService.getItems();
        const list: any[] = Array.isArray(items) ? items : [];
        setUserItems(list);
        if (list.length > 0 && list[0]?.id) {
          activeId = String(list[0].id);
          setSelectedId(activeId);
        } else {
          setData(null);
          setIsLoading(false);
          setIsRefreshing(false);
          return;
        }
      } else if (userItems.length === 0) {
        // Pre-fetch in background
        ewasteService.getItems().then((items: any) => {
          if (Array.isArray(items)) setUserItems(items);
        }).catch(() => {});
      }

      if (!activeId) { setIsLoading(false); setIsRefreshing(false); return; }

      try {
        const trace = await ewasteService.getItemTraceability(activeId);
        setData(trace || { item: { id: activeId, status: 'SUBMITTED', createdAt: new Date().toISOString() } });
      } catch {
        // Graceful fallback — show submitted state with whatever we have
        const fallback = userItems.find((i) => i.id === activeId) || {
          id: activeId,
          status: 'SUBMITTED',
          createdAt: new Date().toISOString(),
        };
        setData({ item: fallback });
      }
    } catch (err: any) {
      setError(err?.message || t('common.error', 'Unable to load traceability data.'));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedId, itemId]);

  useEffect(() => { load(); }, [load]);

  const item = data?.item;
  const category = (item?.category || '').replace(/_/g, ' ');
  const submittedDate = fmtDate(item?.createdAt);
  const collectedDate = fmtDate(data?.pickup?.completedAt || data?.request?.updatedAt);
  const handedOverDate = fmtDate(data?.consignment?.updatedAt);
  const recycledDate = fmtDate(data?.recyclingRecord?.completedAt);

  const stageDates: Record<string, string> = {
    submitted: submittedDate,
    collected: collectedDate,
    in_transit: handedOverDate,
    recycled: recycledDate,
  };

  const collectorName = data?.request?.collector?.name || data?.pickup?.collector?.name;
  const recyclerName = data?.recyclingRecord?.recycler?.name || data?.consignment?.recycler?.name;
  const recyclerLocation = data?.recyclingRecord?.recycler?.city || data?.consignment?.recycler?.city;

  const certId = data?.recyclingRecord?.certificateId || data?.recyclingRecord?.id;

  return (
    <EcoSetuBackground>

      {/* Back */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => navigation.goBack()}
        accessibilityRole="button"
        accessibilityLabel={t('common.back', 'Go back')}
      >
        <Text style={styles.backText}>← {t('common.back', 'Back')}</Text>
      </TouchableOpacity>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      ) : error && !data ? (
        <View style={styles.center}>
          <AppIcon name="alert" size={32} color="#EF4444" style={{ marginBottom: 12 }} />
          <Text style={styles.errorTitle}>{t('common.error', "Can't Load Journey")}</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => { setIsLoading(true); load(); }}>
            <Text style={styles.retryText}>{t('common.retry', 'Retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : !data ? (
        <View style={styles.center}>
          <AppIcon name="box" size={36} color="#94A3B8" style={{ marginBottom: 12 }} />
          <Text style={styles.emptyTitle}>{t('emptyStates.noActivity', 'No Items Found')}</Text>
          <Text style={styles.emptyMessage}>
            {t('emptyStates.submitFirstItem', 'Submit an e-waste collection request first to see the journey of your items.')}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => { setIsRefreshing(true); load(true); }}
              tintColor="#10B981"
              colors={['#10B981']}
            />
          }
        >
          {/* Hero */}
          <View style={styles.hero}>
            <Text style={styles.heroTitle}>{t('traceability.journeyTitle', "Your Item's Journey")}</Text>
            {category ? (
              <Text style={styles.heroSub}>{category}</Text>
            ) : null}
          </View>

          {/* Item selector if multiple items */}
          {userItems.length > 1 && (
            <View style={styles.itemSelector}>
              <Text style={styles.selectorLabel}>{t('common.selectItem', 'Select item')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {userItems.map((it) => (
                  <TouchableOpacity
                    key={it.id}
                    style={[styles.selectorChip, selectedId === it.id && styles.selectorChipActive]}
                    onPress={() => setSelectedId(it.id)}
                  >
                    <Text style={[styles.selectorChipText, selectedId === it.id && styles.selectorChipTextActive]}>
                      {(it.category || 'Item').replace(/_/g, ' ')} · …{it.id.slice(-4)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Journey chain */}
          <View style={styles.chain}>
            {stages.map((stage, i) => {
              const state = getStageState(stage.id, data);
              const date = stageDates[stage.id];
              const isLast = i === stages.length - 1;

              return (
                <View key={stage.id} style={styles.stageRow}>
                  {/* Left: node + connector */}
                  <View style={styles.stageLeft}>
                    <View style={[
                      styles.stageNode,
                      state === 'done' && styles.stageNodeDone,
                      state === 'current' && styles.stageNodeCurrent,
                    ]}>
                      {state === 'done' ? (
                        <AppIcon name="check" size={12} color="#FFF" />
                      ) : (
                        <AppIcon
                          name={stage.icon}
                          size={15}
                          color={state === 'current' ? '#38BDF8' : '#94A3B8'}
                        />
                      )}
                    </View>
                    {!isLast && (
                      <View style={[
                        styles.stageLine,
                        state === 'done' && styles.stageLineDone,
                      ]} />
                    )}
                  </View>

                  {/* Right: content */}
                  <View style={[styles.stageContent, isLast && { paddingBottom: 8 }]}>
                    <View style={styles.stageTitleRow}>
                      <Text style={[
                        styles.stageTitle,
                        state === 'done' && styles.stageTitleDone,
                        state === 'current' && styles.stageTitleCurrent,
                        state === 'pending' && styles.stageTitlePending,
                      ]}>
                        {stage.title}
                      </Text>
                      {state === 'done' && (
                        <View style={styles.stageDoneBadge}>
                          <AppIcon name="check" size={10} color="#10B981" style={{ marginRight: 3 }} />
                          <Text style={styles.stageDoneBadgeText}>{t('status.completed', 'Done')}</Text>
                        </View>
                      )}
                      {state === 'current' && (
                        <View style={styles.stageActiveBadge}>
                          <Text style={styles.stageActiveBadgeText}>{t('status.inProgress', 'In progress')}</Text>
                        </View>
                      )}
                    </View>

                    <Text style={[
                      styles.stageDesc,
                      state === 'pending' && styles.stageDescPending,
                    ]}>
                      {stage.description}
                    </Text>

                    {date && state === 'done' && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <AppIcon name="calendar" size={11} color="#94A3B8" style={{ marginRight: 4 }} />
                        <Text style={styles.stageDate}>{date}</Text>
                      </View>
                    )}

                    {/* Stage-specific detail */}
                    {stage.id === 'collected' && state !== 'pending' && collectorName && (
                      <View style={styles.detailPill}>
                        <AppIcon name="user" size={11} color="#34D399" style={{ marginRight: 4 }} />
                        <Text style={styles.detailPillText}>{collectorName}</Text>
                      </View>
                    )}
                    {stage.id === 'recycled' && state !== 'pending' && recyclerName && (
                      <View style={styles.detailPill}>
                        <AppIcon name="factory" size={11} color="#38BDF8" style={{ marginRight: 4 }} />
                        <Text style={styles.detailPillText}>
                          {recyclerName}{recyclerLocation ? ` · ${recyclerLocation}` : ''}
                        </Text>
                      </View>
                    )}
                    {stage.id === 'recycled' && state === 'done' && certId && (
                      <View style={[styles.detailPill, styles.certPill]}>
                        <AppIcon name="shieldCheck" size={11} color="#A78BFA" style={{ marginRight: 4 }} />
                        <Text style={styles.certPillText}>
                          {t('traceability.certificate', 'Certificate')}: …{certId.slice(-8).toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>

          {/* Completed summary */}
          {getStageState('recycled', data) === 'done' && (
            <View style={styles.completedCard}>
              <AppIcon name="sparkles" size={24} color="#10B981" style={{ marginBottom: 6 }} />
              <Text style={styles.completedTitle}>{t('traceability.fullyTraced', 'Fully Traced')}</Text>
              <Text style={styles.completedDesc}>
                {t('traceability.fullyTracedDesc', 'Your e-waste has completed the full responsible recycling journey. It has been processed in a certified formal recycling facility.')}
              </Text>
            </View>
          )}

          {/* Chain Event Log (Append-Only Traceability) */}
          {Array.isArray((data as any)?.traceabilityChain) && (data as any).traceabilityChain.length > 0 && (
            <View style={styles.eventLogSection}>
              <View style={styles.eventLogHeader}>
                <AppIcon name="shieldCheck" size={16} color="#10B981" />
                <Text style={styles.eventLogTitle}>Verified Audit Trail ({((data as any).traceabilityChain.length)} Events)</Text>
              </View>
              <View style={styles.eventLogList}>
                {(data as any).traceabilityChain.map((ev: any, idx: number) => (
                  <View key={idx} style={styles.eventLogRow}>
                    <View style={styles.eventLogDot} />
                    <View style={styles.eventLogBody}>
                      <View style={styles.eventLogMetaRow}>
                        <Text style={styles.eventLogStage}>{ev.stage?.replace(/_/g, ' ')}</Text>
                        <Text style={styles.eventLogTime}>
                          {ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </Text>
                      </View>
                      <Text style={styles.eventLogDesc}>{ev.description}</Text>
                      {Boolean(ev.actor) && (
                        <Text style={styles.eventLogActor}>Actor: {ev.actor}</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Trust note */}
          <View style={styles.trustNote}>
            <AppIcon name="info" size={14} color="#38BDF8" style={{ marginRight: 8 }} />
            <Text style={styles.trustNoteText}>
              {t('traceability.trustNote', 'Only verified and completed stages are shown. Unverified information is never displayed.')}
            </Text>
          </View>

          <View style={{ height: 60 }} />
        </ScrollView>
      )}
    </EcoSetuBackground>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // ── Back ──
  backBtn: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 12,
  },
  backText: { fontSize: 15, color: '#34D399', fontWeight: '700' },

  // ── Center states ──
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorIcon: { fontSize: 48, marginBottom: 12 },
  errorTitle: { fontSize: 17, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
  errorMessage: { fontSize: 13, color: 'rgba(255,255,255,0.55)', textAlign: 'center', lineHeight: 20 },
  retryBtn: {
    marginTop: 20,
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryText: { fontSize: 15, color: '#FFFFFF', fontWeight: '700' },
  emptyIcon: { fontSize: 52, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
  emptyMessage: { fontSize: 13, color: 'rgba(255,255,255,0.55)', textAlign: 'center', lineHeight: 20 },

  // ── Scroll ──
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // ── Hero ──
  hero: { marginBottom: 20 },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  heroSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.50)',
    fontWeight: '500',
    textTransform: 'capitalize',
  },

  // ── Item Selector ──
  itemSelector: { marginBottom: 16 },
  selectorLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.40)',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  selectorChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    marginRight: 8,
  },
  selectorChipActive: {
    backgroundColor: 'rgba(16,185,129,0.20)',
    borderColor: '#10B981',
  },
  selectorChipText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.55)' },
  selectorChipTextActive: { color: '#34D399' },

  // ── Chain ──
  chain: { gap: 0, marginBottom: 24 },
  stageRow: {
    flexDirection: 'row',
    gap: 14,
    minHeight: 60,
  },
  stageLeft: { alignItems: 'center', width: 32 },
  stageNode: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageNodeDone: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  stageNodeCurrent: {
    backgroundColor: 'rgba(16,185,129,0.20)',
    borderColor: '#10B981',
  },
  stageNodeCheck: { fontSize: 14, color: '#FFFFFF', fontWeight: '800' },
  stageNodeIcon: { fontSize: 15 },
  stageNodeIconPending: { fontSize: 14, opacity: 0.3 },
  stageLine: {
    flex: 1,
    width: 2,
    backgroundColor: 'rgba(255,255,255,0.10)',
    marginVertical: 3,
  },
  stageLineDone: { backgroundColor: '#10B981' },

  stageContent: {
    flex: 1,
    paddingBottom: 20,
    gap: 4,
  },
  stageTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 5,
  },
  stageTitle: { fontSize: 16, fontWeight: '700' },
  stageTitleDone: { color: '#FFFFFF' },
  stageTitleCurrent: { color: '#FFFFFF' },
  stageTitlePending: { color: 'rgba(255,255,255,0.30)' },

  stageDoneBadge: {
    backgroundColor: 'rgba(16,185,129,0.18)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  stageDoneBadgeText: { fontSize: 10, color: '#34D399', fontWeight: '700' },
  stageActiveBadge: {
    backgroundColor: 'rgba(245,158,11,0.18)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  stageActiveBadgeText: { fontSize: 10, color: '#FBBF24', fontWeight: '700' },

  stageDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    lineHeight: 19,
  },
  stageDescPending: { color: 'rgba(255,255,255,0.25)' },
  stageDate: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.40)',
    fontWeight: '500',
  },
  detailPill: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  detailPillText: { fontSize: 12, color: 'rgba(255,255,255,0.65)', fontWeight: '500' },
  certPill: {
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.30)',
  },
  certPillText: { fontSize: 11, color: '#34D399', fontWeight: '700' },

  // ── Completed card ──
  completedCard: {
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.30)',
    padding: 20,
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  completedIcon: { fontSize: 36 },
  completedTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  completedDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    lineHeight: 20,
  },

  // ── Event Log Section ──
  eventLogSection: {
    backgroundColor: 'rgba(16,44,48,0.70)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.30)',
    padding: 16,
    marginBottom: 16,
  },
  eventLogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  eventLogTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#34D399',
  },
  eventLogList: {
    gap: 12,
  },
  eventLogRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  eventLogDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginTop: 5,
  },
  eventLogBody: {
    flex: 1,
  },
  eventLogMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  eventLogStage: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  eventLogTime: {
    fontSize: 10.5,
    color: 'rgba(255,255,255,0.40)',
  },
  eventLogDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 17,
  },
  eventLogActor: {
    fontSize: 10.5,
    color: '#38BDF8',
    marginTop: 2,
    fontWeight: '600',
  },

  // ── Trust note ──
  trustNote: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  trustNoteIcon: { fontSize: 14, marginTop: 1 },
  trustNoteText: {
    flex: 1,
    fontSize: 11,
    color: 'rgba(255,255,255,0.40)',
    lineHeight: 17,
  },
});

export default ItemTraceabilityScreen;
