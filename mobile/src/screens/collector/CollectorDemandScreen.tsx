/**
 * CollectorDemandScreen.tsx
 * Marketplace Phase 6: Collector Demand Discovery ("Buyer Requests")
 *
 * Exposes real buyer sourcing requests with factual quantities, unpriced honesty,
 * and direct supply response capability. Zero fabricated demand scores.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Platform,
} from 'react-native';
import { TopAppBar } from '../../components/layout/TopAppBar';
import { GlassCard } from '../../components/glass/GlassCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { EcoSetuBackground } from '../../components/glass/EcoSetuBackground';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { useI18n } from '../../i18n';
import sourcingService, { SourcingRequest, SourcingResponse } from '../../services/sourcingService';
import { CollectorSourcingResponseModal } from '../../components/sourcing/CollectorSourcingResponseModal';

interface Props {
  navigation: any;
}

const CATEGORY_FILTERS = [
  'ALL',
  'BATTERY',
  'PCB',
  'DISPLAY',
  'CABLE',
  'METAL',
  'PLASTIC',
  'MIXED_ELECTRONICS',
];

export const CollectorDemandScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useI18n();
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [requests, setRequests] = useState<SourcingRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Response modal state
  const [selectedRequest, setSelectedRequest] = useState<SourcingRequest | null>(null);
  const [modalVisible, setModalVisible] = useState<boolean>(false);

  const fetchDemand = useCallback(async () => {
    try {
      setError(null);
      const params: any = { status: 'OPEN' };
      if (selectedCategory !== 'ALL') {
        params.category = selectedCategory;
      }
      const result = await sourcingService.getRequests(params);
      setRequests(result.requests || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load buyer requests');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    fetchDemand();
  }, [fetchDemand]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDemand();
  };

  const handleOpenRespond = (req: SourcingRequest) => {
    setSelectedRequest(req);
    setModalVisible(true);
  };

  const handleResponseSuccess = (_res: SourcingResponse) => {
    fetchDemand();
  };

  const renderRequestCard = ({ item }: { item: SourcingRequest }) => {
    const isUnpriced = !item.hasOfferedPrice || !item.offeredRatePerKg;
    const dateFormatted = item.requestedByDate
      ? new Date(item.requestedByDate).toLocaleDateString()
      : null;

    return (
      <GlassCard style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{item.materialCategory}</Text>
          </View>
          <Text style={styles.referenceText}>{item.referenceNumber}</Text>
        </View>

        <View style={styles.buyerInfoRow}>
          <Text style={styles.buyerLabel}>{t('sourcing.buyerFacility', 'Buyer:')}</Text>
          <Text style={styles.buyerName} numberOfLines={1}>
            {item.recycler?.facilityName || t('sourcing.authorizedRecycler', 'Authorized Recycler')}
          </Text>
          {item.city && (
            <Text style={styles.buyerCity}> • {item.city}</Text>
          )}
        </View>

        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>{t('sourcing.quantityNeeded', 'Quantity Needed')}</Text>
            <Text style={styles.detailValue}>
              {item.minimumWeightKg} kg
              {item.targetWeightKg ? ` (Target: ${item.targetWeightKg} kg)` : ''}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>{t('sourcing.offeredRate', 'Offered Rate')}</Text>
            <Text
              style={[
                styles.detailValue,
                isUnpriced ? styles.unpricedValue : styles.pricedValue,
              ]}
            >
              {isUnpriced
                ? t('sourcing.priceDiscussed', 'Price discussed after response')
                : item.displayOfferedRate || `₹${Number(item.offeredRatePerKg).toFixed(2)}/kg`}
            </Text>
          </View>
        </View>

        {item.conditionTemplate && (
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>{t('sourcing.requiredCondition', 'Condition:')} </Text>
            <Text style={styles.metaValue}>{item.conditionTemplate.replace('_', ' ')}</Text>
          </View>
        )}

        <View style={styles.footerRow}>
          <View style={styles.badgesGroup}>
            {item.pickupRequired && (
              <View style={styles.pickupBadge}>
                <Text style={styles.pickupBadgeText}>
                  🚚 {t('sourcing.pickupRequired', 'Pickup Required')}
                </Text>
              </View>
            )}
            {dateFormatted && (
              <Text style={styles.expiryText}>
                ⏳ {t('sourcing.neededBy', 'Needed by')} {dateFormatted}
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={styles.respondButton}
            onPress={() => handleOpenRespond(item)}
          >
            <Text style={styles.respondButtonText}>
              {t('sourcing.respond', 'Respond')}
            </Text>
          </TouchableOpacity>
        </View>
      </GlassCard>
    );
  };

  return (
    <EcoSetuBackground>
      <SafeAreaView style={styles.safeArea}>
        <TopAppBar
          title={t('sourcing.buyerRequests', 'Buyer Requests')}
          subtitle={t('sourcing.demandDiscovery', 'Discover active material demand')}
          onBack={() => navigation.goBack()}
        />

        {/* Category Horizontal Filter */}
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {CATEGORY_FILTERS.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.filterChip,
                  selectedCategory === cat && styles.filterChipActive,
                ]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedCategory === cat && styles.filterChipTextActive,
                  ]}
                >
                  {cat === 'ALL' ? t('common.all', 'All') : cat.replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Requests List */}
        {loading && !refreshing ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>
              {t('sourcing.loadingDemand', 'Checking buyer requests...')}
            </Text>
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchDemand}>
              <Text style={styles.retryButtonText}>{t('common.retry', 'Retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={requests}
            keyExtractor={(item) => item.id}
            renderItem={renderRequestCard}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={
              <EmptyState
                icon="📦"
                title={t('sourcing.noActiveRequests', 'No Active Buyer Requests')}
                message={t(
                  'sourcing.noActiveRequestsDesc',
                  'Verified recyclers have not posted open requests in this category. Check back soon.'
                )}
              />
            }
          />
        )}

        {/* Collector Response Modal */}
        <CollectorSourcingResponseModal
          visible={modalVisible}
          request={selectedRequest}
          onClose={() => {
            setModalVisible(false);
            setSelectedRequest(null);
          }}
          onSuccess={handleResponseSuccess}
        />
      </SafeAreaView>
    </EcoSetuBackground>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  filterContainer: {
    paddingVertical: spacing.spaceSm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  filterScroll: {
    paddingHorizontal: spacing.spaceMd,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  filterChipActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: colors.primaryLight,
    fontWeight: '700',
  },
  listContent: {
    padding: spacing.spaceMd,
    paddingBottom: spacing.spaceXl,
  },
  card: {
    marginBottom: spacing.spaceMd,
    padding: spacing.spaceMd,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  referenceText: {
    fontSize: 12,
    color: colors.textTertiary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  buyerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  buyerLabel: {
    fontSize: 12,
    color: colors.textTertiary,
    marginRight: 4,
  },
  buyerName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    flexShrink: 1,
  },
  buyerCity: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  detailsGrid: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 8,
    padding: spacing.spaceSm,
    marginBottom: 10,
    gap: spacing.spaceSm,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: colors.textTertiary,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  pricedValue: {
    color: colors.primaryLight,
  },
  unpricedValue: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  metaLabel: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  metaValue: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  badgesGroup: {
    flex: 1,
    gap: 4,
  },
  pickupBadge: {
    alignSelf: 'flex-start',
  },
  pickupBadgeText: {
    fontSize: 11,
    color: '#38BDF8',
  },
  expiryText: {
    fontSize: 11,
    color: colors.textTertiary,
  },
  respondButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.spaceMd,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  respondButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.spaceXl,
  },
  loadingText: {
    marginTop: spacing.spaceSm,
    fontSize: 13,
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: 14,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.spaceMd,
  },
  retryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: spacing.spaceLg,
    paddingVertical: spacing.spaceSm,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
});
