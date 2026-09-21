/**
 * CollectorLotsScreen.tsx
 * Authenticated INFORMAL_COLLECTOR — List of Material Lots
 *
 * Requirements:
 * SIH-LOT-005: Human-readable reference number display
 * SIH-LOT-006: Clear lot status display (Draft, Open, Quoted, Accepted, Handover Pending, Completed)
 * Offline support: displays local drafts and pending sync badges
 *
 * Canonical Reference: docs/25_SIH_26229_REQUIREMENTS.md Section 4 Module 2
 */import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
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

export const CollectorLotsScreen: React.FC<CollectorLotsScreenProps> = ({ navigation }) => {
  const { t } = useI18n();
  const { isConnected } = useNetwork();

  const [lots, setLots] = useState<MaterialLotItem[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchLots = useCallback(async () => {
    try {
      const query = filterStatus === 'ALL' ? {} : { status: filterStatus };
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

  const renderStatusBadge = (status: string, isDraft?: boolean, pendingSync?: boolean) => {
    if (isDraft) {
      return (
        <View style={[styles.badge, styles.badgeDraft]}>
          <Text style={styles.badgeText}>📝 {pendingSync ? t('materialLots.pendingSyncBadge') : t('materialLots.offlineDraftBadge')}</Text>
        </View>
      );
    }

    switch (status) {
      case 'OPEN':
        return (
          <View style={[styles.badge, styles.badgeOpen]}>
            <Text style={styles.badgeText}>🟢 {t('materialLots.statuses.OPEN')}</Text>
          </View>
        );
      case 'QUOTED':
        return (
          <View style={[styles.badge, styles.badgeQuoted]}>
            <Text style={styles.badgeText}>💬 {t('materialLots.statuses.QUOTED')}</Text>
          </View>
        );
      case 'ACCEPTED':
        return (
          <View style={[styles.badge, styles.badgeAccepted]}>
            <Text style={styles.badgeText}>🤝 {t('materialLots.statuses.ACCEPTED')}</Text>
          </View>
        );
      case 'HANDOVER_PENDING':
        return (
          <View style={[styles.badge, styles.badgeHandover]}>
            <Text style={styles.badgeText}>📦 {t('materialLots.statuses.HANDOVER_PENDING')}</Text>
          </View>
        );
      case 'COMPLETED':
        return (
          <View style={[styles.badge, styles.badgeCompleted]}>
            <Text style={styles.badgeText}>✅ {t('materialLots.statuses.COMPLETED')}</Text>
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
      symbol: '📦',
      defaultName: item.category,
      i18nKey: 'materialLots.categories.OTHER',
    };

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
            <Text style={styles.categorySymbol}>{categoryDef.symbol}</Text>
          </View>
          <View style={styles.lotHeaderInfo}>
            <Text style={styles.lotReference}>{item.referenceNumber}</Text>
            <Text style={styles.lotCategoryName}>
              {t(categoryDef.i18nKey) || categoryDef.defaultName}
            </Text>
          </View>
          {renderStatusBadge(item.status, item.isOfflineDraft, item.pendingSync)}
        </View>

        <View style={styles.lotCardBody}>
          <View style={styles.lotMetaItem}>
            <Text style={styles.lotMetaLabel}>{t('materialLots.weight')}</Text>
            <Text style={styles.lotMetaValue}>
              {item.approximateTotalWeightKg ? `${item.approximateTotalWeightKg} kg` : '—'}
            </Text>
          </View>

          <View style={styles.lotMetaItem}>
            <Text style={styles.lotMetaLabel}>{t('materialLots.condition')}</Text>
            <Text style={styles.lotMetaValue}>{item.condition || 'UNKNOWN'}</Text>
          </View>

          <View style={styles.lotMetaItem}>
            <Text style={styles.lotMetaLabel}>{t('materialLots.photos')}</Text>
            <Text style={styles.lotMetaValue}>{item.photos?.length || 0}</Text>
          </View>
        </View>

        {item.description ? (
          <Text style={styles.lotDescription} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <EcoSetuBackground>
      <SafeAreaView style={styles.safeArea}>
        <TopAppBar
          title={t('materialLots.listTitle')}
          subtitle={lots.length > 0 ? `${lots.length} ${t('materialLots.photosCount')}` : undefined}
          showBack={true}
          onBack={() => navigation.goBack()}
        />

        {/* Sync & Offline status banner */}
        <OfflineBanner />

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          {(['ALL', 'DRAFT', 'OPEN'] as const).map((status) => {
            const isSelected = filterStatus === status;
            return (
              <TouchableOpacity
                key={status}
                style={[styles.filterPill, isSelected && styles.filterPillSelected]}
                onPress={() => setFilterStatus(status)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterPillText, isSelected && styles.filterPillTextSelected]}>
                  {status === 'ALL' ? t('earnings.allStatuses') : status === 'DRAFT' ? t('status.draft') : t('status.submitted')}
                </Text>
              </TouchableOpacity>
            );
          })}
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
                icon="📦"
                title={t('lowLiteracy.emptyBatchesTitle')}
                message={t('lowLiteracy.emptyBatchesDesc')}
                actionLabel={t('lowLiteracy.captureFirstBatch')}
                onAction={() => navigation.navigate('CollectorMaterialCapture')}
              />
            }
          />
        )}

        {/* Floating Add Lot Button */}
        <TouchableOpacity
          style={styles.fabButton}
          onPress={() => navigation.navigate('CollectorMaterialCapture')}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={t('materialLots.createNewLot')}
        >
          <Text style={styles.fabIcon}>＋</Text>
          <Text style={styles.fabText}>{t('materialLots.createNewLot')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </EcoSetuBackground>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    gap: space.xs,
  },
  filterPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    minHeight: 48,
    justifyContent: 'center',
  },
  filterPillSelected: {
    backgroundColor: 'rgba(20, 184, 166, 0.25)',
    borderColor: colors.primary || '#14B8A6',
  },
  filterPillText: {
    color: colors.textSecondary || '#CBD5E1',
    fontSize: 13,
    fontWeight: '500',
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
    backgroundColor: 'rgba(15, 35, 40, 0.8)',
    borderRadius: 16,
    padding: space.md,
    marginBottom: space.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  lotCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: space.sm,
  },
  categorySymbolBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(20, 184, 166, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: space.sm,
  },
  categorySymbol: {
    fontSize: 26,
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
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
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
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
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
  lotDescription: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.65)',
    marginTop: space.xs,
    fontStyle: 'italic',
  },
  fabButton: {
    position: 'absolute',
    bottom: 24,
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
});
