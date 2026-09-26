/**
 * CollectorDashboardScreen — COMPLETE REDESIGN
 *
 * NEW Information Architecture:
 *  1. COLLECTOR HEADER — identity, availability, connectivity
 *  2. SELL MATERIAL — dominant primary CTA, always visible
 *  3. ACTION HERO — what needs attention right now (dynamic, only if items exist)
 *  4. TODAY WORK QUEUE — quick scan of the day's progress
 *  5. RECENT LISTINGS — last 3 lots, compact row format
 *  6. QUICK ACCESS — Price Board, Pickups, Safety, Browse
 *
 * Design principles:
 *  - HOME = ACTION CENTER, not analytics dashboard
 *  - No decorative metrics for their own sake
 *  - Every element answers: what do I do?
 *  - Dynamic: hide sections when no data
 *  - Large touch targets (min 52dp)
 *  - Skeleton loading, not blocking spinner
 *  - Physical device first: 1260×2800 / ~520dpi Vivo
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import { useNetwork } from '../../hooks/useNetwork';
import { useI18n } from '../../i18n';

import { EcoSetuBackground } from '../../components/glass/EcoSetuBackground';
import { OfflineBanner } from '../../components/common/OfflineBanner';
import {
  CollectorHeader,
  ActionHero,
  WorkQueue,
  SellMaterialCTA,
  CollectorSectionHeader,
  DealStatusRow,
  CollectorSkeletonList,
  EmptyMarketplaceState,
  type WorkItem,
  type AttentionItem,
} from '../../components/collector';

import { colors } from '../../theme/colors';
import { collectorService } from '../../services/collectorService';
import { collectorSyncService } from '../../services/collectorSyncService';
import { materialLotService, MaterialLotItem } from '../../services/materialLotService';
import earningsService from '../../services/earningsService';
import voiceService, { AnnouncementPriority } from '../../services/voiceService';
import { MATERIAL_TAXONOMY } from '../../config/materialTaxonomy';
import { AppIcon } from '../../components/ui/AppIcon';
import { PageVoiceGuide } from '../../components/voice/PageVoiceGuide';

// ─────────────────────────────────────────────────────────────────────────────
// QUICK ACCESS ACTIONS (bottom strip)
// ─────────────────────────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  { id: 'prices',  icon: 'trending-up', label: 'Price Board', route: 'CollectorPriceBoard' },
  { id: 'pickups', icon: 'truck', label: 'Pickups',     route: 'CollectorPickups'   },
  { id: 'browse',  icon: 'map-pin',  label: 'Browse',      route: 'CollectorBrowse'    },
  { id: 'safety',  icon: 'shield',  label: 'Safety',      route: 'CollectorSafetyCenter' },
];

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export const CollectorDashboardScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { isConnected } = useNetwork();
  const { t, language } = useI18n();

  // Data
  const [profile, setProfile]             = useState<any>(null);
  const [lots, setLots]                   = useState<MaterialLotItem[]>([]);
  const [draftLots, setDraftLots]         = useState<MaterialLotItem[]>([]);
  const [activePickups, setActivePickups] = useState<any[]>([]);
  const [availableRequests, setAvailableRequests] = useState<any[]>([]);
  const [monthEarnings, setMonthEarnings] = useState<string>('0.00');
  const [isAvailable, setIsAvailable]     = useState<boolean>(true);
  const [isTogglingAvail, setIsTogglingAvail] = useState<boolean>(false);

  // Loading
  const [isLoading, setIsLoading]       = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // ── Data loading ────────────────────────────────────────────────────────────
  const loadData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const [profileRes, lotsRes, allLotsRes, pickupsRes, availableRes, earningsRes] =
        await Promise.allSettled([
          collectorService.getProfile(),
          materialLotService.listLots({ limit: 10 }),
          materialLotService.listLots({ status: 'DRAFT', limit: 20 }),
          collectorService.getMyPickups({ limit: 20 }),
          collectorService.getAvailableRequests({ limit: 10 }),
          earningsService.getEarningsSummary({ period: 'THIS_MONTH' }),
        ]);

      if (profileRes.status === 'fulfilled' && profileRes.value?.profile) {
        const p = profileRes.value.profile as any;
        setProfile(p);
        setIsAvailable(Boolean(p.isAvailable));
      }
      if (lotsRes.status === 'fulfilled' && lotsRes.value?.lots) {
        setLots(lotsRes.value.lots);
      }
      if (allLotsRes.status === 'fulfilled' && allLotsRes.value?.lots) {
        setDraftLots(allLotsRes.value.lots.filter((l: any) => l.status === 'DRAFT' || l.isOfflineDraft));
      }
      if (pickupsRes.status === 'fulfilled') {
        const pickupData = (pickupsRes.value as any);
        const list = pickupData?.pickups || pickupData?.data || [];
        // Capture scheduled, in progress, pending and assigned
        setActivePickups(
          list.filter(
            (p: any) =>
              p.status === 'SCHEDULED' ||
              p.status === 'IN_PROGRESS' ||
              p.status === 'PENDING' ||
              p.status === 'ASSIGNED'
          )
        );
      }
      if (availableRes.status === 'fulfilled') {
        const availData = (availableRes.value as any);
        const reqList = availData?.requests || availData?.data || [];
        setAvailableRequests(reqList);
      }
      if (earningsRes.status === 'fulfilled' && earningsRes.value) {
        setMonthEarnings(earningsRes.value.totalRecordedSales || '0.00');
      }
    } catch (e) {
      console.warn('[CollectorDashboard] load error', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Subscribe to dynamic realtime feed updates
    const unsub = collectorSyncService.subscribe((syncData) => {
      if (syncData) {
        if (typeof syncData.isAvailable === 'boolean') {
          setIsAvailable(syncData.isAvailable);
        }
        if (Array.isArray(syncData.availableRequests)) {
          setAvailableRequests(syncData.availableRequests);
        }
        if (Array.isArray(syncData.pendingPickups) && syncData.pendingPickups.length > 0) {
          setActivePickups(
            syncData.pendingPickups.filter(
              (p: any) =>
                p.status === 'SCHEDULED' ||
                p.status === 'IN_PROGRESS' ||
                p.status === 'PENDING' ||
                p.status === 'ASSIGNED',
            ),
          );
        }
      }
    });

    return () => {
      unsub();
    };
  }, [loadData]);

  const onRefresh = () => { setIsRefreshing(true); loadData(true); };

  // ── Availability toggle ─────────────────────────────────────────────────────
  const handleAvailabilityToggle = async () => {
    if (!isConnected) {
      Alert.alert(t('common.offline', 'Offline'), 'Availability requires network connection.');
      return;
    }
    const next = !isAvailable;
    setIsAvailable(next);
    setIsTogglingAvail(true);
    try {
      await (collectorService as any).toggleAvailability(next);
      // Immediately fetch newly matched available requests
      const res = await (collectorService as any).getAvailableRequests({ limit: 10 });
      const reqs = res?.requests || res?.data || [];
      setAvailableRequests(Array.isArray(reqs) ? reqs : []);
      collectorSyncService.fetchAuthoritative(true).catch(() => {});
    } catch {
      setIsAvailable(!next);
    } finally {
      setIsTogglingAvail(false);
    }
  };

  // ── Derived data ────────────────────────────────────────────────────────────
  const collectorName = profile?.user?.name || user?.name || 'Collector';
  const isVerified    = profile?.user?.status === 'ACTIVE' || user?.status === 'ACTIVE';
  const area          = profile?.serviceArea || profile?.city || '';

  const quotedLots   = lots.filter((l) => l.status === 'QUOTED');
  const acceptedLots = lots.filter((l) => l.status === 'ACCEPTED');
  const openLots     = lots.filter((l) => l.status === 'OPEN');
  const recentLots   = lots.slice(0, 4);

  // ── Attention items (Pickups first) ─────────────────────────────────────────
  const attentionItems: AttentionItem[] = [];
  if (activePickups.length > 0) {
    attentionItems.push({
      id: 'pickup',
      icon: 'truck',
      label: t('collector.pendingPickups', 'Pending Pickups'),
      count: activePickups.length,
      color: '#10B981',
      bgColor: 'rgba(16,185,129,0.12)',
      borderColor: 'rgba(16,185,129,0.35)',
      onPress: () => navigation.navigate('CollectorPickups'),
    });
  }
  if (quotedLots.length > 0) {
    attentionItems.push({
      id: 'offers',
      icon: 'mail',
      label: t('collector.newOffers', 'New Offers'),
      count: quotedLots.length,
      color: '#F59E0B',
      bgColor: 'rgba(245,158,11,0.08)',
      borderColor: 'rgba(245,158,11,0.25)',
      onPress: () => navigation.navigate('CollectorDeals'),
    });
  }
  if (acceptedLots.length > 0) {
    attentionItems.push({
      id: 'handover',
      icon: 'handshake',
      label: t('collector.handoverNeeded', 'Handover Needed'),
      count: acceptedLots.length,
      color: '#34D399',
      bgColor: 'rgba(52,211,153,0.08)',
      borderColor: 'rgba(52,211,153,0.25)',
      onPress: () => navigation.navigate('CollectorHandover', {
        lotId: acceptedLots[0].id,
        lot: acceptedLots[0],
      }),
    });
  }

  // ── Work queue items (Pickups top priority) ─────────────────────────────────
  const workItems: WorkItem[] = [];
  if (activePickups.length > 0) {
    workItems.push({
      id: 'pickup',
      label: t('collector.pickupsScheduledWork', { count: activePickups.length }, `${activePickups.length} pickup${activePickups.length > 1 ? 's' : ''} scheduled for collection today`),
      status: 'action',
      actionLabel: t('collector.collectNow', 'Collect Now'),
      onPress: () => navigation.navigate('CollectorPickups'),
    });
  }
  if (draftLots.length > 0) {
    workItems.push({
      id: 'draft',
      label: t('collector.draftLotsFinish', { count: draftLots.length }, `${draftLots.length} draft ${draftLots.length === 1 ? 'lot' : 'lots'} — finish listing`),
      status: 'action',
      actionLabel: t('common.finish', 'Finish'),
      onPress: () =>
        navigation.navigate('CollectorCreateLot', {
          existingLot: draftLots[0],
          lotId: draftLots[0].id,
        }),
    });
  }
  if (openLots.length > 0) {
    workItems.push({
      id: 'listed',
      label: t('collector.openLotsWaiting', { count: openLots.length }, `${openLots.length} material ${openLots.length === 1 ? 'lot' : 'lots'} listed — waiting for offers`),
      status: 'info',
    });
  }
  if (quotedLots.length > 0) {
    workItems.push({
      id: 'offers',
      label: t('collector.offersReceived', { count: quotedLots.length }, `${quotedLots.length} new ${quotedLots.length === 1 ? 'offer' : 'offers'} received`),
      status: 'action',
      actionLabel: t('common.review', 'Review'),
      onPress: () => navigation.navigate('CollectorDeals'),
    });
  }
  if (acceptedLots.length > 0) {
    workItems.push({
      id: 'handover',
      label: t('collector.dealAcceptedHandover', 'Deal accepted — arrange handover'),
      status: 'action',
      actionLabel: t('common.start', 'Start'),
      onPress: () =>
        navigation.navigate('CollectorHandover', {
          lotId: acceptedLots[0].id,
          lot: acceptedLots[0],
        }),
    });
  }
  if (workItems.length === 0 && lots.length > 0) {
    workItems.push({
      id: 'idle',
      label: t('collector.nothingUrgent', 'Nothing urgent right now'),
      status: 'done',
    });
  }

  // ── Greeting ────────────────────────────────────────────────────────────────
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? t('dashboard.goodMorning', 'Good morning') : hour < 17 ? t('dashboard.goodAfternoon', 'Good afternoon') : t('dashboard.goodEvening', 'Good evening');

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <EcoSetuBackground>
      <SafeAreaView style={styles.safeArea}>
        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <CollectorHeader
          name={collectorName}
          isVerified={isVerified}
          isAvailable={isAvailable}
          onAvailabilityPress={handleAvailabilityToggle}
          greeting={greeting}
          subtitle={area || undefined}
        />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          {/* Offline banner */}
          <OfflineBanner />

          {/* Page Voice Guide for Informal Collector accessibility */}
          <PageVoiceGuide pageKey="CollectorDashboard" />

          {/* ── 1. PRIMARY FEATURED HERO: PENDING PICKUPS ─────────────────── */}
          <View style={styles.pendingPickupsContainer}>
            <View style={styles.pendingPickupsHeader}>
              <View style={styles.pendingPickupsHeaderLeft}>
                <AppIcon name="truck" size={22} color="#10B981" />
                <Text style={styles.pendingPickupsTitle}>{t('collector.pendingPickups', 'Pending Pickups')}</Text>
                {activePickups.length > 0 && (
                  <View style={styles.pendingPickupsBadge}>
                    <Text style={styles.pendingPickupsBadgeText}>{activePickups.length}</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate('CollectorPickups')}
                style={styles.pendingPickupsSeeAll}
              >
                <Text style={styles.pendingPickupsSeeAllText}>
                  {activePickups.length > 0
                    ? t('common.viewAllWithCount', { count: activePickups.length }, `View all (${activePickups.length}) →`)
                    : t('collector.browseMap', 'Browse Map →')}
                </Text>
              </TouchableOpacity>
            </View>

            {isLoading ? (
              <CollectorSkeletonList rows={2} rowHeight={80} />
            ) : activePickups.length > 0 ? (
              <View style={styles.pickupCardsList}>
                {activePickups.slice(0, 3).map((pickup: any) => {
                  const itemsCount = pickup.items?.length || pickup.request?.items?.length || 1;
                  const citizenName = pickup.request?.citizen?.name || pickup.citizenName || t('common.citizen', 'Citizen');
                  const address = pickup.pickupAddress || pickup.request?.pickupAddress || t('common.addressOnFile', 'Address on file');
                  const isScheduled = pickup.status === 'SCHEDULED';
                  const isInProgress = pickup.status === 'IN_PROGRESS';

                  return (
                    <TouchableOpacity
                      key={pickup.id}
                      style={[
                        styles.pickupCard,
                        isInProgress && styles.pickupCardInProgress,
                      ]}
                      onPress={() =>
                        navigation.navigate('CollectorPickupDetail', {
                          pickupId: pickup.id,
                          pickup,
                        })
                      }
                      activeOpacity={0.85}
                    >
                      <View style={styles.pickupCardTop}>
                        <View style={styles.pickupCardRefRow}>
                          <Text style={styles.pickupCardRef}>
                            #PKP-{pickup.id ? pickup.id.slice(0, 6).toUpperCase() : 'REQ'}
                          </Text>
                          <View
                            style={[
                              styles.pickupStatusPill,
                              isInProgress
                                ? styles.statusPillProgress
                                : styles.statusPillScheduled,
                            ]}
                          >
                            <Text
                              style={[
                                styles.pickupStatusPillText,
                                isInProgress
                                  ? styles.statusTextProgress
                                  : styles.statusTextScheduled,
                              ]}
                            >
                              {isInProgress
                                ? t('status.inProgress', 'IN PROGRESS')
                                : isScheduled
                                ? t('status.scheduled', 'SCHEDULED')
                                : pickup.status}
                            </Text>
                          </View>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <AppIcon name="user" size={13} color="#94A3B8" style={{ marginRight: 4 }} />
                          <Text style={styles.pickupCitizenName}>{citizenName}</Text>
                        </View>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginVertical: 4 }}>
                        <AppIcon name="location" size={13} color="#94A3B8" style={{ marginRight: 4, marginTop: 2 }} />
                        <Text style={styles.pickupAddress} numberOfLines={2}>
                          {address}
                        </Text>
                      </View>

                      <View style={styles.pickupCardBottom}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <AppIcon name="box" size={13} color="#94A3B8" style={{ marginRight: 4 }} />
                          <Text style={styles.pickupItemsCount}>
                            {t('collector.itemsToCollect', { count: itemsCount }, `${itemsCount} item${itemsCount > 1 ? 's' : ''} to collect`)}
                          </Text>
                        </View>
                        <View style={styles.pickupActionTag}>
                          <Text style={styles.pickupActionTagText}>
                            {isInProgress ? t('collector.resume', 'Resume →') : t('collector.startPickup', 'Start Pickup →')}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyPickupCard}>
                <View style={styles.emptyPickupLeft}>
                  <AppIcon name="truck" size={24} color="#10B981" />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.emptyPickupTitle}>{t('collector.noPickupsAssigned', 'No pickups assigned right now')}</Text>
                    <Text style={styles.emptyPickupSub}>
                      {availableRequests.length > 0
                        ? t('collector.nearbyRequestsClaim', { count: availableRequests.length }, `${availableRequests.length} nearby e-waste requests ready to claim!`)
                        : t('collector.exploreNearbyCitizen', 'Explore nearby citizen e-waste requests on the live map.')}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.claimPickupsBtn}
                  onPress={() => navigation.navigate('CollectorBrowse')}
                >
                  <Text style={styles.claimPickupsBtnText}>
                    {availableRequests.length > 0
                      ? t('collector.claimPickups', { count: availableRequests.length }, `Claim Pickups (${availableRequests.length} available) →`)
                      : t('collector.findPickupsOnMap', 'Find Pickups on Map →')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* ── 2. SELL MATERIAL — PRIMARY CTA ──────────────────────────── */}
          <SellMaterialCTA
            onPress={() => navigation.navigate('CollectorSell')}
            subtitle={t('collector.sellMaterialSub', 'Photograph material · set price · list for sale')}
          />

          {/* ── 3. ATTENTION HERO — only if items exist ───────────────────── */}
          {isLoading ? null : attentionItems.length > 0 ? (
            <ActionHero items={attentionItems} />
          ) : null}

          {/* ── 4. TODAY WORK QUEUE ───────────────────────────────────────── */}
          {isLoading ? (
            <View style={styles.skeletonPadding}>
              <CollectorSkeletonList rows={3} rowHeight={60} />
            </View>
          ) : workItems.length > 0 ? (
            <WorkQueue items={workItems} title={t('collector.todaysSchedule', "TODAY'S SCHEDULE")} />
          ) : null}

          {/* ── 5. RECENT LISTINGS / DEALS ──────────────────────────────── */}
          <CollectorSectionHeader
            title={t('collector.myDeals', 'My Deals')}
            actionLabel={lots.length > 0 ? t('common.seeAll', 'See all') : undefined}
            onAction={lots.length > 0 ? () => navigation.navigate('CollectorDeals') : undefined}
            count={lots.length > 0 ? lots.length : undefined}
          />

          {isLoading ? (
            <View style={styles.skeletonPadding}>
              <CollectorSkeletonList rows={3} rowHeight={72} />
            </View>
          ) : recentLots.length === 0 ? (
            <View style={styles.emptyWrapper}>
              <EmptyMarketplaceState
                context="no_listings"
                onAction={() => navigation.navigate('CollectorSell')}
              />
            </View>
          ) : (
            <View style={styles.dealsList}>
              {recentLots.map((lot) => {
                const catMeta = MATERIAL_TAXONOMY[lot.category] || {
                  symbol: 'package',
                  defaultName: lot.category,
                };
                const catName = (catMeta as any).i18nKey ? t((catMeta as any).i18nKey, catMeta.defaultName) : catMeta.defaultName;
                const isHighlighted = lot.status === 'QUOTED' || lot.status === 'ACCEPTED';
                const actionLabel =
                  lot.status === 'QUOTED'   ? t('collector.offers', 'Offers')    :
                  lot.status === 'ACCEPTED' ? t('collector.handover', 'Handover')  :
                  undefined;

                return (
                  <DealStatusRow
                    key={lot.id}
                    id={lot.id}
                    material={lot.subcategory || catName}
                    materialIcon={catMeta.symbol}
                    referenceNumber={lot.referenceNumber}
                    status={lot.status}
                    quantityKg={lot.approximateTotalWeightKg}
                    totalAmount={
                      lot.askingPrice ? Number(lot.askingPrice) : undefined
                    }
                    isHighlighted={isHighlighted}
                    actionLabel={actionLabel}
                    onPress={() =>
                      navigation.navigate('CollectorLotDetail', {
                        lotId: lot.id,
                        lot,
                      })
                    }
                    onAction={
                      lot.status === 'QUOTED'
                        ? () =>
                            navigation.navigate('CollectorQuotes', {
                              lotId: lot.id,
                              lot,
                            })
                        : lot.status === 'ACCEPTED'
                        ? () =>
                            navigation.navigate('CollectorHandover', {
                              lotId: lot.id,
                              lot,
                            })
                        : undefined
                    }
                  />
                );
              })}
            </View>
          )}

          {/* ── 6. QUICK ACCESS STRIP ─────────────────────────────────────── */}
          <CollectorSectionHeader title={t('collector.quickAccess', 'Quick Access')} />
          <View style={styles.quickGrid}>
            {[
              { id: 'prices',  icon: 'chart' as const, label: t('collector.priceBoard', 'Price Board'), route: 'CollectorPriceBoard' },
              { id: 'pickups', icon: 'truck' as const, label: t('collector.pickups', 'Pickups'),     route: 'CollectorPickups'   },
              { id: 'browse',  icon: 'location' as const,  label: t('collector.browse', 'Browse'),      route: 'CollectorBrowse'    },
              { id: 'safety',  icon: 'shieldCheck' as const,  label: t('collector.safety', 'Safety'),      route: 'CollectorSafetyCenter' },
            ].map((qa) => (
              <TouchableOpacity
                key={qa.id}
                style={styles.quickTile}
                onPress={() => navigation.navigate(qa.route)}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel={qa.label}
              >
                <AppIcon name={qa.icon} size={22} color="#10B981" style={{ marginBottom: 6 }} />
                <Text style={styles.quickLabel}>{qa.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── 7. RECENT EARNINGS PEEK ───────────────────────────────────── */}
          {Number(monthEarnings) > 0 && (
            <TouchableOpacity
              style={styles.earningsPeek}
              onPress={() => navigation.navigate('CollectorEarnings')}
              activeOpacity={0.8}
            >
              <View style={styles.earningsPeekLeft}>
                <Text style={styles.earningsPeekLabel}>{t('collector.thisMonth', 'THIS MONTH')}</Text>
                <Text style={styles.earningsPeekAmount}>
                  ₹{Number(monthEarnings).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </Text>
              </View>
              <Text style={styles.earningsPeekAction}>{t('collector.viewEarnings', 'View Earnings →')}</Text>
            </TouchableOpacity>
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      </SafeAreaView>
    </EcoSetuBackground>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    gap: 20,
    paddingBottom: 40,
    paddingTop: 16,
  },
  skeletonPadding: {
    paddingHorizontal: 20,
  },

  // ── Pending Pickups Highlight ──
  pendingPickupsContainer: {
    marginHorizontal: 20,
    backgroundColor: 'rgba(10,36,40,0.85)',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(52,211,153,0.35)',
    padding: 16,
    gap: 12,
  },
  pendingPickupsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pendingPickupsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pendingPickupsIcon: {
    fontSize: 20,
  },
  pendingPickupsTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  pendingPickupsBadge: {
    backgroundColor: '#10B981',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  pendingPickupsBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  pendingPickupsSeeAll: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  pendingPickupsSeeAllText: {
    color: '#34D399',
    fontSize: 13,
    fontWeight: '700',
  },
  pickupCardsList: {
    gap: 10,
  },
  pickupCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: 14,
    gap: 8,
  },
  pickupCardInProgress: {
    borderColor: '#34D399',
    backgroundColor: 'rgba(16,185,129,0.12)',
  },
  pickupCardTop: {
    gap: 4,
  },
  pickupCardRefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickupCardRef: {
    fontSize: 12,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.60)',
    letterSpacing: 0.5,
  },
  pickupStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusPillScheduled: {
    backgroundColor: 'rgba(56,189,248,0.20)',
  },
  statusPillProgress: {
    backgroundColor: 'rgba(16,185,129,0.25)',
  },
  pickupStatusPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusTextScheduled: {
    color: '#38BDF8',
  },
  statusTextProgress: {
    color: '#34D399',
  },
  pickupCitizenName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pickupAddress: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 18,
  },
  pickupCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  pickupItemsCount: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.60)',
    fontWeight: '600',
  },
  pickupActionTag: {
    backgroundColor: 'rgba(16,185,129,0.20)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pickupActionTagText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#34D399',
  },
  emptyPickupCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 14,
    gap: 12,
  },
  emptyPickupLeft: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  emptyPickupIcon: {
    fontSize: 24,
  },
  emptyPickupTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyPickupSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.50)',
    marginTop: 2,
    lineHeight: 15,
  },
  claimPickupsBtn: {
    backgroundColor: 'rgba(16,185,129,0.22)',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimPickupsBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#34D399',
  },

  // ── Deals & Other Sections ──
  dealsList: {
    paddingHorizontal: 20,
    gap: 10,
  },
  emptyWrapper: {
    marginHorizontal: 20,
  },
  quickGrid: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 10,
  },
  quickTile: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 6,
    minHeight: 72,
    justifyContent: 'center',
  },
  quickIcon: {
    fontSize: 22,
  },
  quickLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  earningsPeek: {
    marginHorizontal: 20,
    backgroundColor: 'rgba(16,185,129,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.2)',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  earningsPeekLeft: {
    gap: 3,
  },
  earningsPeekLabel: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  earningsPeekAmount: {
    color: '#10B981',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  earningsPeekAction: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '700',
  },
});

export default CollectorDashboardScreen;
