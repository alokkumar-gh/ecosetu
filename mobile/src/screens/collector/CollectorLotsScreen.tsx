/**
 * CollectorLotsScreen.tsx
 * Authenticated INFORMAL_COLLECTOR — Seller Listings Management
 *
 * Requirements:
 * SIH-LOT-005: Human-readable reference number display
 * SIH-LOT-006: Clear lot status display (Draft, Open, Quoted, Accepted, Handover Pending, Completed)
 * Offline support: displays local drafts and pending sync badges
 * Clear seller-side marketplace experience:
 * - Tabs: ALL, OPEN, OFFERS RECEIVED, ACCEPTED, COMPLETED
 * - Clear offer count and direct "View Offers" navigation
 * - Honest empty states
 *
 * Canonical Reference: docs/25_SIH_26229_REQUIREMENTS.md Section 4 Module 2
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useI18n } from '../../i18n';
import { useNetwork } from '../../hooks/useNetwork';
import { TopAppBar } from '../../components/layout/TopAppBar';
import { OfflineBanner } from '../../components/common/OfflineBanner';
import { EmptyState } from '../../components/common/EmptyState';
import { EcoSetuBackground } from '../../components/eco';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { materialLotService, MaterialLotItem } from '../../services/materialLotService';
import { MATERIAL_TAXONOMY } from '../../config/materialTaxonomy';
import { AppIcon } from '../../components/ui/AppIcon';
import { PageVoiceGuide } from '../../components/voice/PageVoiceGuide';

const space = {
  xs: spacing.spaceXs,
  sm: spacing.spaceSm,
  md: spacing.spaceMd,
  lg: spacing.spaceLg,
  xl: spacing.spaceXl,
};

interface CollectorLotsScreenProps {
  navigation: any;
}

type TabStatus = 'ALL' | 'OPEN' | 'QUOTED' | 'ACCEPTED' | 'COMPLETED' | 'DRAFT';

export const CollectorLotsScreen: React.FC<CollectorLotsScreenProps> = ({ navigation }) => {
  const { t } = useI18n();
  const { isConnected } = useNetwork();
  const insets = useSafeAreaInsets();

  const [lots, setLots] = useState<MaterialLotItem[]>([]);
  const [filterStatus, setFilterStatus] = useState<TabStatus>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchLots = useCallback(async () => {
    try {
      const query: any = {};
      if (filterStatus !== 'ALL') {
        query.status = filterStatus;
      }
      // Only fetch lot list — metrics already shown on Dashboard home screen
      const result = await materialLotService.listLots(query);
      setLots(result.lots);
    } catch (err) {
      console.warn('[CollectorLotsScreen] Failed to load lots:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    setIsLoading(true);
    fetchLots();
  }, [fetchLots]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchLots();
  };

  const getCategoryIcon = (cat: string): any => {
    switch (cat) {
      case 'CRT': return 'tv';
      case 'LCD_PANEL': return 'computer';
      case 'PCB': return 'grid';
      case 'CABLE': return 'link';
      case 'BATTERY': return 'battery';
      case 'MOTOR': return 'settings';
      case 'MAGNET_ASSEMBLY': return 'refresh';
      case 'MIXED_PLASTIC': return 'recycle';
      case 'MOBILE_PHONE': return 'mobile';
      case 'LAPTOP': return 'laptop';
      case 'MONITOR': return 'computer';
      case 'PRINTER': return 'file';
      case 'KEYBOARD_MOUSE': return 'grid';
      case 'DESKTOP_COMPUTER': return 'computer';
      case 'TABLET': return 'mobile';
      default: return 'package';
    }
  };

  const renderStatusBadge = (status: string, isDraft?: boolean, pendingSync?: boolean) => {
    if (isDraft) {
      return (
        <View style={[styles.badge, styles.badgeDraft]}>
          <View style={styles.rowCentered}>
            <AppIcon name="document" size={11} color="#F59E0B" />
            <Text style={styles.badgeText}>{pendingSync ? t('materialLots.pendingSyncBadge') : t('materialLots.offlineDraftBadge')}</Text>
          </View>
        </View>
      );
    }

    switch (status) {
      case 'OPEN':
        return (
          <View style={[styles.badge, styles.badgeOpen]}>
            <View style={styles.rowCentered}>
              <AppIcon name="badge" size={11} color="#10B981" />
              <Text style={styles.badgeText}>{t('materialLots.statuses.OPEN') || 'LISTED'}</Text>
            </View>
          </View>
        );
      case 'QUOTED':
        return (
          <View style={[styles.badge, styles.badgeQuoted]}>
            <View style={styles.rowCentered}>
              <AppIcon name="mail" size={11} color="#38BDF8" />
              <Text style={styles.badgeText}>{t('materialLots.statuses.QUOTED') || 'OFFERS RECEIVED'}</Text>
            </View>
          </View>
        );
      case 'ACCEPTED':
        return (
          <View style={[styles.badge, styles.badgeAccepted]}>
            <View style={styles.rowCentered}>
              <AppIcon name="handshake" size={11} color="#818CF8" />
              <Text style={styles.badgeText}>{t('materialLots.statuses.ACCEPTED') || 'DEAL ACCEPTED'}</Text>
            </View>
          </View>
        );
      case 'HANDOVER_PENDING':
        return (
          <View style={[styles.badge, styles.badgeHandover]}>
            <View style={styles.rowCentered}>
              <AppIcon name="package" size={11} color="#FBBF24" />
              <Text style={styles.badgeText}>{t('materialLots.statuses.HANDOVER_PENDING') || 'HANDED OVER'}</Text>
            </View>
          </View>
        );
      case 'COMPLETED':
        return (
          <View style={[styles.badge, styles.badgeCompleted]}>
            <View style={styles.rowCentered}>
              <AppIcon name="check" size={11} color="#34D399" />
              <Text style={styles.badgeText}>{t('materialLots.statuses.COMPLETED') || 'COMPLETED'}</Text>
            </View>
          </View>
        );
      default:
        return (
          <View style={[styles.badge, styles.badgeDefault]}>
            <Text style={styles.badgeText}>{status}</Text>
          </View>
        );
    }
  };

  const renderItem = ({ item }: { item: MaterialLotItem }) => {
    const categoryDef = MATERIAL_TAXONOMY[item.category] || {
      symbol: 'package',
      defaultName: item.category,
      i18nKey: 'materialLots.categories.OTHER',
    };

    const offerCount = (item as any)._count?.quotes || 0;

    return (
      <TouchableOpacity
        style={styles.lotCard}
        onPress={() => navigation.navigate('CollectorLotDetail', { lotId: item.id, lot: item })}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${item.referenceNumber} ${item.category}`}
      >
        <View style={styles.lotCardHeader}>
          <View style={styles.categorySymbolBadge}>
            <AppIcon name={getCategoryIcon(item.category)} size={20} color="#10B981" />
          </View>
          <View style={styles.lotHeaderInfo}>
            <Text style={styles.lotReference}>{item.referenceNumber}</Text>
            <Text style={styles.lotCategoryName}>
              {t(categoryDef.i18nKey) || categoryDef.defaultName} {item.subcategory ? `• ${item.subcategory}` : ''}
            </Text>
          </View>
          {renderStatusBadge(item.status, item.isOfflineDraft, item.pendingSync)}
        </View>

        <View style={styles.lotCardBody}>
          <View style={styles.lotMetaItem}>
            <Text style={styles.lotMetaLabel}>{t('materialLots.weight') || 'Weight'}</Text>
            <Text style={styles.lotMetaValue}>
              {item.approximateTotalWeightKg ? `${item.approximateTotalWeightKg} kg` : '—'}
            </Text>
          </View>

          <View style={styles.lotMetaItem}>
            <Text style={styles.lotMetaLabel}>{t('materialLots.condition') || 'Condition'}</Text>
            <Text style={styles.lotMetaValue}>{item.condition || 'UNKNOWN'}</Text>
          </View>

          {item.photos && item.photos.length > 0 ? (
            <View style={styles.lotMetaItem}>
              <Text style={styles.lotMetaLabel}>{t('materialLots.photos') || 'Photos'}</Text>
              <Text style={styles.lotMetaValue}>{item.photos.length}</Text>
            </View>
          ) : null}

          <View style={styles.lotMetaItem}>
            <Text style={styles.lotMetaLabel}>Offers</Text>
            <View style={styles.rowCentered}>
              <AppIcon name="mail" size={13} color={offerCount > 0 ? '#10B981' : '#94A3B8'} />
              <Text style={[styles.lotMetaValue, offerCount > 0 ? styles.offerHighlight : null]}>
                {offerCount}
              </Text>
            </View>
          </View>
        </View>

        {item.description ? (
          <Text style={styles.lotDescription} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}

        {/* Quick Action Row */}
        <View style={styles.cardActionsRow}>
          {offerCount > 0 ? (
            <TouchableOpacity
              style={styles.viewOffersButton}
              onPress={() => navigation.navigate('CollectorQuotes', { lotId: item.id, lot: item })}
              accessibilityRole="button"
            >
              <View style={styles.btnRow}>
                <AppIcon name="mail" size={14} color="#071E22" />
                <Text style={styles.viewOffersButtonText}>
                  View {offerCount} {offerCount === 1 ? 'Offer' : 'Offers'}
                </Text>
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.findBuyersButton}
              onPress={() => navigation.navigate('CollectorRecyclerMatches', { lotId: item.id, lot: item })}
              accessibilityRole="button"
            >
              <View style={styles.btnRow}>
                <AppIcon name="search" size={14} color="#34D399" />
                <Text style={styles.findBuyersButtonText}>
                  Find Buyers
                </Text>
              </View>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.detailsButton}
            onPress={() => navigation.navigate('CollectorLotDetail', { lotId: item.id, lot: item })}
            accessibilityRole="button"
          >
            <View style={styles.btnRow}>
              <Text style={styles.detailsButtonText}>Details</Text>
              <AppIcon name="arrowRight" size={12} color="#CBD5E1" />
            </View>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const metrics: any = null; // overview metrics not loaded in this legacy screen

  return (
    <EcoSetuBackground>
      <SafeAreaView style={styles.safeArea}>
        <TopAppBar
          title={t('collector.deals') || 'My Deals & Listings'}
          subtitle={lots.length > 0 ? `${lots.length} active listings` : undefined}
          showBack={navigation?.canGoBack ? navigation.canGoBack() : false}
          onBack={() => navigation.canGoBack && navigation.canGoBack() && navigation.goBack()}
        />

        <PageVoiceGuide pageKey="CollectorLots" />

        {/* Sync & Offline status banner */}
        <OfflineBanner />

        {/* Marketplace Summary Section removed — metrics now shown on Home dashboard */}

        {/* Seller Filter Tabs */}
        <View style={styles.filterSection}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={[
              { id: 'ALL', label: 'All', icon: 'grid' },
              { id: 'OPEN', label: 'Listed', icon: 'badge' },
              { id: 'QUOTED', label: 'Offers Received', icon: 'mail' },
              { id: 'ACCEPTED', label: 'Deal Accepted', icon: 'handshake' },
              { id: 'COMPLETED', label: 'Completed', icon: 'check' },
              { id: 'DRAFT', label: 'Drafts', icon: 'document' },
            ]}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.filterScroll}
            renderItem={({ item }) => {
              const isSelected = filterStatus === item.id;
              return (
                <TouchableOpacity
                  style={[styles.filterPill, isSelected && styles.filterPillSelected]}
                  onPress={() => setFilterStatus(item.id as TabStatus)}
                  activeOpacity={0.7}
                >
                  <View style={styles.btnRow}>
                    <AppIcon name={item.icon as any} size={13} color={isSelected ? '#071E22' : '#94A3B8'} />
                    <Text style={[styles.filterPillText, isSelected && styles.filterPillTextSelected]}>
                      {item.label}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </View>

        {/* Main List */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary || '#14B8A6'} />
          </View>
        ) : (
          <FlatList
            data={lots}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary || '#14B8A6'}
              />
            }
            ListEmptyComponent={
              <EmptyState
                icon="package"
                title="No active marketplace listings."
                message="You have no material lots currently listed under this status. Tap below to list material for sale."
                actionLabel={t('lowLiteracy.captureFirstBatch') || 'List Material For Sale'}
                onAction={() => navigation.navigate('CollectorMaterialCapture')}
              />
            }
          />
        )}

        {/* Floating Add Lot Button */}
        <TouchableOpacity
          style={[
            styles.fabButton,
            { bottom: Math.max(insets.bottom + 12, 24) },
          ]}
          onPress={() => navigation.navigate('CollectorMaterialCapture')}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t('materialLots.createNewLot') || 'List Material For Sale'}
        >
          <View style={styles.btnRow}>
            <AppIcon name="plus" size={18} color="#071E22" />
            <Text style={styles.fabText}>List For Sale</Text>
          </View>
        </TouchableOpacity>
      </SafeAreaView>
    </EcoSetuBackground>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  overviewCard: {
    backgroundColor: 'rgba(15, 35, 40, 0.90)',
    borderRadius: 16,
    padding: space.md,
    marginHorizontal: space.md,
    marginTop: space.sm,
    marginBottom: space.xs,
    borderWidth: 1.2,
    borderColor: 'rgba(20, 184, 166, 0.3)',
  },
  overviewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: space.sm,
  },
  overviewTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary || '#14B8A6',
    letterSpacing: 0.5,
  },
  overviewSubtitle: {
    fontSize: 11,
    color: colors.textSecondary || '#94A3B8',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: space.xs,
  },
  metricItem: {
    flex: 1,
    minWidth: '18%',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  highlightMetric: {
    color: '#34D399',
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.textSecondary || '#94A3B8',
    textAlign: 'center',
    marginTop: 2,
  },
  filterSection: {
    paddingVertical: space.xs,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  filterScroll: {
    paddingHorizontal: space.md,
    gap: space.xs,
  },
  filterPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    minHeight: 44,
    justifyContent: 'center',
  },
  filterPillSelected: {
    backgroundColor: 'rgba(20, 184, 166, 0.25)',
    borderColor: colors.primary || '#14B8A6',
  },
  filterPillText: {
    color: colors.textSecondary || '#CBD5E1',
    fontSize: 12,
    fontWeight: '600',
  },
  filterPillTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listContainer: {
    padding: space.md,
    paddingBottom: 90,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lotCard: {
    backgroundColor: 'rgba(15, 35, 40, 0.85)',
    borderRadius: 16,
    padding: space.md,
    marginBottom: space.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  lotCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: space.sm,
  },
  categorySymbolBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(20, 184, 166, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: space.sm,
  },
  categorySymbol: {
    fontSize: 24,
  },
  lotHeaderInfo: {
    flex: 1,
  },
  lotReference: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  lotCategoryName: {
    fontSize: 12,
    color: colors.textSecondary || '#94A3B8',
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeDraft: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderColor: '#F59E0B',
    borderWidth: 1,
  },
  badgeOpen: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: '#10B981',
    borderWidth: 1,
  },
  badgeQuoted: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderColor: '#3B82F6',
    borderWidth: 1,
  },
  badgeAccepted: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderColor: '#8B5CF6',
    borderWidth: 1,
  },
  badgeHandover: {
    backgroundColor: 'rgba(236, 72, 153, 0.2)',
    borderColor: '#EC4899',
    borderWidth: 1,
  },
  badgeCompleted: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderColor: '#22C55E',
    borderWidth: 1,
  },
  badgeDefault: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  badgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  lotCardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 10,
    padding: space.sm,
    marginTop: space.xs,
  },
  lotMetaItem: {
    alignItems: 'center',
    flex: 1,
  },
  lotMetaLabel: {
    fontSize: 10,
    color: colors.textSecondary || '#94A3B8',
    marginBottom: 2,
  },
  lotMetaValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  offerHighlight: {
    color: '#60A5FA',
    fontWeight: '800',
  },
  lotDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.65)',
    marginTop: space.xs,
    fontStyle: 'italic',
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  viewOffersButton: {
    flex: 2,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  viewOffersButtonText: {
    color: '#60A5FA',
    fontSize: 12,
    fontWeight: '700',
  },
  findBuyersButton: {
    flex: 2,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  findBuyersButtonText: {
    color: '#34D399',
    fontSize: 12,
    fontWeight: '700',
  },
  detailsButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  detailsButtonText: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '600',
  },
  fabButton: {
    position: 'absolute',
    right: 20,
    backgroundColor: colors.primary || '#14B8A6',
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    shadowColor: '#14B8A6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
    minHeight: 56,
  },
  fabIcon: {
    fontSize: 20,
    fontWeight: '800',
    color: '#071E22',
    marginRight: 6,
  },
  fabText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#071E22',
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  rowCentered: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});

export default CollectorLotsScreen;
