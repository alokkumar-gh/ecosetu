/**
 * CollectorRecyclerDirectoryScreen
 * Authenticated INFORMAL_COLLECTOR — Formal Recycler Directory / Discovery screen.
 *
 * Operational Chain:
 *   CITIZEN → LOCAL INFORMAL COLLECTOR (KABADIWALA) → FORMAL RECYCLER → RECYCLING
 *
 * Critical Business Model & Rules:
 *   - Informal Collectors discover verified formal recycling facilities to consign collected e-waste.
 *   - Citizens must have ZERO access to this directory (strictly collector/admin only).
 *   - Read-only directory: Strictly NO consignment creation or delivery in this task.
 *   - Zero citizen PII, zero private recycler credentials (passwords, internal doc URLs) exposed.
 *   - Strictly NO maps, payments, chat, or external phone dialer actions.
 *   - Offline-first with AsyncStorage caching (@ecosetu_collector_recyclers) and stale indicator.
 *   - Full WCAG accessibility compliance (>= 48dp touch targets, semantic roles/labels/states).
 *
 * Source of Truth:
 *   docs/05_API_SPECIFICATION.md Section 5 (GET /api/v1/recyclers)
 *   docs/06_ROLES_AND_PERMISSIONS.md
 *   docs/07_BUSINESS_WORKFLOWS.md Section 3
 *   docs/08_UI_UX_SPECIFICATION.md
 *   docs/09_FRONTEND_ARCHITECTURE.md
 *   docs/10_BACKEND_ARCHITECTURE.md
 *   docs/13_SECURITY_PRIVACY.md
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  TextInput,
  ScrollView,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { useNetwork } from '../../hooks/useNetwork';
import { TopAppBar } from '../../components/layout/TopAppBar';
import { Skeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { OfflineBanner } from '../../components/common/OfflineBanner';
import { StatusBadge } from '../../components/common/StatusBadge';
import { recyclingService } from '../../services/recyclingService';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { ROLES, EWASTE_CATEGORIES } from '../../utils/constants';

const USER_STATUS = Object.freeze({
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  DEACTIVATED: 'DEACTIVATED',
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatCategoryName = (cat: string): string => {
  if (!cat) return '—';
  return cat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

const CATEGORY_OPTIONS = [
  { id: 'ALL', label: 'All Categories', value: null },
  { id: EWASTE_CATEGORIES.MOBILE_PHONE, label: 'Mobile Phones', value: EWASTE_CATEGORIES.MOBILE_PHONE },
  { id: EWASTE_CATEGORIES.LAPTOP, label: 'Laptops', value: EWASTE_CATEGORIES.LAPTOP },
  { id: EWASTE_CATEGORIES.DESKTOP, label: 'Desktops', value: EWASTE_CATEGORIES.DESKTOP },
  { id: EWASTE_CATEGORIES.TABLET, label: 'Tablets', value: EWASTE_CATEGORIES.TABLET },
  { id: EWASTE_CATEGORIES.MONITOR, label: 'Monitors', value: EWASTE_CATEGORIES.MONITOR },
  { id: EWASTE_CATEGORIES.PRINTER, label: 'Printers', value: EWASTE_CATEGORIES.PRINTER },
  { id: EWASTE_CATEGORIES.KEYBOARD_MOUSE, label: 'Keyboards & Mice', value: EWASTE_CATEGORIES.KEYBOARD_MOUSE },
  { id: EWASTE_CATEGORIES.CABLE_CHARGER, label: 'Cables & Chargers', value: EWASTE_CATEGORIES.CABLE_CHARGER },
  { id: EWASTE_CATEGORIES.BATTERY, label: 'Batteries', value: EWASTE_CATEGORIES.BATTERY },
  { id: EWASTE_CATEGORIES.CIRCUIT_BOARD, label: 'Circuit Boards', value: EWASTE_CATEGORIES.CIRCUIT_BOARD },
  { id: EWASTE_CATEGORIES.OTHER, label: 'Other E-Waste', value: EWASTE_CATEGORIES.OTHER },
];

// ─── Loading Skeletons ─────────────────────────────────────────────────────────

const RecyclerCardSkeleton: React.FC = () => (
  <View style={skeletonStyles.card}>
    <View style={skeletonStyles.headerRow}>
      <Skeleton width={44} height={44} borderRadius={22} />
      <View style={{ flex: 1, marginLeft: spacing.spaceSm }}>
        <Skeleton height={16} width="70%" style={{ marginBottom: 6 }} />
        <Skeleton height={12} width="40%" />
      </View>
      <Skeleton width={70} height={24} borderRadius={12} />
    </View>
    <View style={skeletonStyles.divider} />
    <Skeleton height={12} width="90%" style={{ marginBottom: 6 }} />
    <Skeleton height={12} width="60%" style={{ marginBottom: 12 }} />
    <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
      <Skeleton width={60} height={20} borderRadius={10} />
      <Skeleton width={70} height={20} borderRadius={10} />
      <Skeleton width={50} height={20} borderRadius={10} />
    </View>
    <Skeleton height={12} width="50%" />
  </View>
);

const skeletonStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.spaceMd,
    marginBottom: spacing.spaceSm,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.spaceSm,
  },
});

// ─── Recycler Card Component ──────────────────────────────────────────────────

interface RecyclerCardProps {
  recycler: any;
  onSelectRecycler?: (recycler: any) => void;
}

const RecyclerCard: React.FC<RecyclerCardProps> = React.memo(({ recycler, onSelectRecycler }) => {
  const facilityName = recycler.facilityName || 'Authorized Recycling Facility';
  const facilityAddress = recycler.facilityAddress || 'Address not listed';
  const categories: string[] = Array.isArray(recycler.acceptedCategories)
    ? recycler.acceptedCategories
    : [];
  const totalConsignments = recycler.totalConsignments ?? 0;
  const contactName = recycler.user?.name || null;
  const contactEmail = recycler.user?.email || null;
  const contactPhone = recycler.user?.phone || null;

  return (
    <View
      style={cardStyles.card}
      accessibilityRole="none"
      accessibilityLabel={`Recycler ${facilityName}, address: ${facilityAddress}`}
    >
      {/* ── Header: Icon + Facility Name + Verified Badge ── */}
      <View style={cardStyles.headerRow}>
        <View style={cardStyles.iconCircle} accessibilityElementsHidden>
          <Text style={cardStyles.iconText}>🏭</Text>
        </View>
        <View style={cardStyles.titleContainer}>
          <Text style={cardStyles.facilityName} numberOfLines={2}>
            {facilityName}
          </Text>
          <Text style={cardStyles.authorizedTag}>Licensed Formal Recycler</Text>
        </View>
        <StatusBadge status="ACTIVE" />
      </View>

      <View style={cardStyles.divider} />

      {/* ── Facility Address ── */}
      <View style={cardStyles.infoRow}>
        <Text style={cardStyles.infoIcon} accessibilityElementsHidden>
          📍
        </Text>
        <Text style={cardStyles.addressText} numberOfLines={3}>
          {facilityAddress}
        </Text>
      </View>

      {/* ── Consignment Stats ── */}
      <View style={cardStyles.statRow}>
        <View style={cardStyles.statBadge}>
          <Text style={cardStyles.statIcon} accessibilityElementsHidden>
            📦
          </Text>
          <Text style={cardStyles.statText}>
            {totalConsignments} {totalConsignments === 1 ? 'consignment' : 'consignments'} processed
          </Text>
        </View>
      </View>

      {/* ── Accepted Categories ── */}
      {categories.length > 0 && (
        <View style={cardStyles.categoriesSection}>
          <Text style={cardStyles.sectionLabel}>Accepted E-Waste Categories:</Text>
          <View style={cardStyles.categoryChipsContainer}>
            {categories.map((cat, idx) => (
              <View key={`${cat}-${idx}`} style={cardStyles.categoryChip}>
                <Text style={cardStyles.categoryChipText}>{formatCategoryName(cat)}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ── Representative Contact Info (Read-Only Text, No Dialer Actions) ── */}
      {(contactName || contactEmail || contactPhone) && (
        <View style={cardStyles.contactSection}>
          <Text style={cardStyles.sectionLabel}>Facility Representative:</Text>
          {Boolean(contactName) && (
            <View style={cardStyles.contactRow}>
              <Text style={cardStyles.contactIcon} accessibilityElementsHidden>
                👤
              </Text>
              <Text style={cardStyles.contactText}>{contactName}</Text>
            </View>
          )}
          {Boolean(contactEmail) && (
            <View style={cardStyles.contactRow}>
              <Text style={cardStyles.contactIcon} accessibilityElementsHidden>
                ✉
              </Text>
              <Text style={cardStyles.contactText}>{contactEmail}</Text>
            </View>
          )}
          {Boolean(contactPhone) && (
            <View style={cardStyles.contactRow}>
              <Text style={cardStyles.contactIcon} accessibilityElementsHidden>
                📞
              </Text>
              <Text style={cardStyles.contactText}>{contactPhone}</Text>
            </View>
          )}
        </View>
      )}

      {/* ── Action: Consign E-Waste ── */}
      {Boolean(onSelectRecycler) && (
        <TouchableOpacity
          style={cardStyles.consignButton}
          onPress={() => onSelectRecycler!(recycler)}
          accessibilityRole="button"
          accessibilityLabel={`Consign collected e-waste to ${facilityName}`}
          activeOpacity={0.8}
        >
          <Text style={cardStyles.consignButtonText}>Consign E-Waste →</Text>
        </TouchableOpacity>
      )}

      {/* ── Card Footer: Safe Consignment Destination Notice ── */}
      <View style={cardStyles.cardFooter}>
        <Text style={cardStyles.footerNotice}>
          ✓ Eligible destination for batch consignment delivery
        </Text>
      </View>
    </View>
  );
});

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.spaceMd,
    marginBottom: spacing.spaceSm,
    borderWidth: 1,
    borderColor: colors.divider,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${colors.primary}18`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 22,
  },
  titleContainer: {
    flex: 1,
    marginLeft: spacing.spaceSm,
    marginRight: spacing.spaceXs,
  },
  facilityName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 20,
  },
  authorizedTag: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.spaceSm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.spaceSm,
  },
  infoIcon: {
    fontSize: 14,
    marginRight: spacing.spaceXs,
    marginTop: 1,
  },
  addressText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  statRow: {
    marginBottom: spacing.spaceSm,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  statIcon: {
    fontSize: 12,
    marginRight: 6,
  },
  statText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  categoriesSection: {
    marginBottom: spacing.spaceSm,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  categoryChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  categoryChip: {
    backgroundColor: `${colors.primary}12`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: `${colors.primary}30`,
  },
  categoryChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primaryDark,
  },
  contactSection: {
    backgroundColor: '#FAFAFA',
    padding: spacing.spaceSm,
    borderRadius: 8,
    marginBottom: spacing.spaceSm,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  contactIcon: {
    fontSize: 12,
    marginRight: 8,
  },
  contactText: {
    fontSize: 12,
    color: colors.textPrimary,
  },
  consignButton: {
    marginTop: spacing.spaceSm,
    backgroundColor: `${colors.primary}15`,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  consignButtonText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  cardFooter: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    marginTop: 8,
  },
  footerNotice: {
    fontSize: 11,
    color: colors.success,
    fontWeight: '600',
  },
});

// ─── Main Screen Component ────────────────────────────────────────────────────

interface Props {
  navigation?: any;
}

export const CollectorRecyclerDirectoryScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const { isConnected } = useNetwork();

  // ── Data states ───────────────────────────────────────────────────────────
  const [recyclers, setRecyclers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [fromCache, setFromCache] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isVerificationError, setIsVerificationError] = useState<boolean>(false);

  // ── Filter states ─────────────────────────────────────────────────────────
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const refreshingRef = useRef<boolean>(false);

  // ── Role and Verification Status ──────────────────────────────────────────
  const isCollectorOrAdmin =
    user?.role === ROLES.INFORMAL_COLLECTOR || user?.role === ROLES.ADMIN;
  const collectorStatus = user?.status;
  const isVerified = collectorStatus === USER_STATUS.ACTIVE;

  // ── Fetch Recyclers ───────────────────────────────────────────────────────
  const loadRecyclers = useCallback(
    async (silent = false, categoryOverride?: string | null) => {
      if (!silent) setError(null);
      setIsVerificationError(false);

      const targetCategory =
        categoryOverride !== undefined ? categoryOverride : selectedCategory;

      try {
        const params: { category?: string } = {};
        if (targetCategory) {
          params.category = targetCategory;
        }

        const result = await recyclingService.getRecyclers(params);
        setRecyclers(result.recyclers);
        setFromCache(result.fromCache);
      } catch (err: any) {
        const status = err?.response?.status;
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          'Unable to load formal recyclers.';

        if (status === 403) {
          setIsVerificationError(true);
          setError(
            'Verification Required: Your collector account must be verified by an administrator before accessing the formal recycler directory.'
          );
        } else {
          setError(msg);
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        refreshingRef.current = false;
      }
    },
    [selectedCategory]
  );

  // Initial load
  useEffect(() => {
    loadRecyclers();
  }, [loadRecyclers]);

  // Pull-to-refresh
  const handleRefresh = useCallback(() => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setIsRefreshing(true);
    loadRecyclers(true);
  }, [loadRecyclers]);

  // Category Filter selection
  const handleCategorySelect = useCallback(
    (catValue: string | null) => {
      setSelectedCategory(catValue);
      setIsLoading(true);
      loadRecyclers(false, catValue);
    },
    [loadRecyclers]
  );

  // Clear search and category filters
  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedCategory(null);
    setIsLoading(true);
    loadRecyclers(false, null);
  }, [loadRecyclers]);

  // Navigate to Consignment Creation with selected formal recycler
  const handleSelectRecycler = useCallback(
    (recycler: any) => {
      if (navigation?.navigate) {
        navigation.navigate('CreateConsignment', {
          recyclerId: recycler.id,
          recycler,
        });
      }
    },
    [navigation]
  );

  // ── Client-side search filtering ──────────────────────────────────────────
  const filteredRecyclers = useMemo(() => {
    if (!searchQuery.trim()) return recyclers;
    const q = searchQuery.toLowerCase().trim();
    return recyclers.filter((r) => {
      const nameMatch = (r.facilityName || '').toLowerCase().includes(q);
      const addressMatch = (r.facilityAddress || '').toLowerCase().includes(q);
      const contactMatch = (r.user?.name || '').toLowerCase().includes(q);
      const categoryMatch = Array.isArray(r.acceptedCategories) &&
        r.acceptedCategories.some((c: string) => c.toLowerCase().includes(q));
      return nameMatch || addressMatch || contactMatch || categoryMatch;
    });
  }, [recyclers, searchQuery]);

  // ── Unauthorized Role Guard ───────────────────────────────────────────────
  if (!isCollectorOrAdmin) {
    return (
      <SafeAreaView style={styles.container}>
        <TopAppBar title="Recycler Directory" />
        <View style={styles.contentPadding}>
          <EmptyState
            icon="🔒"
            title="Access Restricted"
            message="The Formal Recycler Directory is only accessible to verified informal collectors and administrators."
          />
        </View>
      </SafeAreaView>
    );
  }

  // ── Render Header: Search, Category Bar & Status Notice ───────────────────
  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Offline Banner */}
      <OfflineBanner />

      {/* Stale Cache Notice */}
      {isConnected && fromCache && (
        <View style={styles.cacheNotice} accessibilityRole="alert">
          <Text style={styles.cacheNoticeText}>
            ℹ Showing cached recycler directory. Pull down to refresh live facilities.
          </Text>
        </View>
      )}

      {/* Account Verification Warning */}
      {collectorStatus && !isVerified && (
        <View style={styles.warningBanner} accessibilityRole="alert">
          <Text style={styles.warningBannerText}>
            {collectorStatus === USER_STATUS.PENDING_VERIFICATION
              ? '⏳ Account Pending Verification: Your credentials are under administrative review. Once approved, live recycler discovery will be fully active.'
              : '⚠ Account Suspended: Your collector privileges are temporarily restricted.'}
          </Text>
        </View>
      )}

      {/* Educational Model Card */}
      <View style={styles.educationCard}>
        <Text style={styles.educationTitle}>Formal Recycling Network</Text>
        <Text style={styles.educationBody}>
          Discover authorized formal recycling facilities. As an informal collector, you can aggregate collected e-waste and deliver consignments to these licensed processing partners.
        </Text>
      </View>

      {/* Track My Consignments Entry Point */}
      <TouchableOpacity
        style={styles.trackConsignmentsCard}
        onPress={() => {
          if (navigation?.navigate) {
            navigation.navigate('CollectorConsignments');
          }
        }}
        accessibilityRole="button"
        accessibilityLabel="Track My Consignments"
      >
        <View style={styles.trackConsignmentsInner}>
          <Text style={styles.trackConsignmentsIcon}>📦</Text>
          <View style={{ flex: 1, marginLeft: spacing.spaceSm }}>
            <Text style={styles.trackConsignmentsTitle}>Track My Consignments</Text>
            <Text style={styles.trackConsignmentsSubtitle}>
              View lifecycle status and delivery history for submitted batches
            </Text>
          </View>
          <Text style={styles.trackConsignmentsArrow}>→</Text>
        </View>
      </TouchableOpacity>

      {/* Search Input Bar */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon} accessibilityElementsHidden>
          🔍
        </Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by facility name or address..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          accessibilityLabel="Search recyclers by facility name or address"
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => setSearchQuery('')}
            accessibilityRole="button"
            accessibilityLabel="Clear search query"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.clearButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Horizontal Category Chips Filter Bar */}
      <View style={styles.categoryFilterContainer}>
        <Text style={styles.categoryFilterLabel} accessibilityRole="header">
          Filter by Accepted Material:
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScrollContent}
        >
          {CATEGORY_OPTIONS.map((cat) => {
            const isSelected = selectedCategory === cat.value;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryFilterChip,
                  isSelected && styles.categoryFilterChipSelected,
                ]}
                onPress={() => handleCategorySelect(cat.value)}
                accessibilityRole="button"
                accessibilityLabel={`Filter by ${cat.label}`}
                accessibilityState={{ selected: isSelected }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.categoryFilterChipText,
                    isSelected && styles.categoryFilterChipTextSelected,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Results Count Banner */}
      {!isLoading && !error && (
        <View style={styles.countBanner}>
          <Text style={styles.countText}>
            {filteredRecyclers.length}{' '}
            {filteredRecyclers.length === 1 ? 'facility' : 'facilities'} found
            {selectedCategory ? ` for ${formatCategoryName(selectedCategory)}` : ''}
            {searchQuery ? ` matching "${searchQuery}"` : ''}
          </Text>
        </View>
      )}
    </View>
  );

  // ── Render Empty State ─────────────────────────────────────────────────────
  const renderEmpty = () => {
    if (isLoading) return null;

    if (isVerificationError) {
      return (
        <EmptyState
          icon="⏳"
          title="Verification Required"
          message="Your informal collector account is awaiting administrative approval before you can access the live recycler directory."
        />
      );
    }

    if (error) {
      return (
        <EmptyState
          icon="⚠"
          title="Could Not Load Directory"
          message={error}
          actionLabel="Retry"
          onAction={() => loadRecyclers(false)}
        />
      );
    }

    if (!isConnected && recyclers.length === 0) {
      return (
        <EmptyState
          icon="📡"
          title="No Offline Directory"
          message="No cached recycler directory found. Please connect to the internet to discover authorized recycling facilities."
          actionLabel="Retry Connection"
          onAction={() => loadRecyclers(false)}
        />
      );
    }

    return (
      <EmptyState
        icon="🏭"
        title="No Recyclers Found"
        message={
          selectedCategory || searchQuery
            ? 'No authorized formal recyclers matched your selected filter or search term.'
            : 'No authorized formal recyclers are currently listed in your region.'
        }
        actionLabel={selectedCategory || searchQuery ? 'Clear Filters' : 'Refresh'}
        onAction={selectedCategory || searchQuery ? handleClearFilters : () => loadRecyclers(false)}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <TopAppBar
        title="Recycler Directory"
        subtitle="Authorized formal recycling facilities"
      />

      {isLoading ? (
        <View style={styles.contentPadding}>
          {renderHeader()}
          <RecyclerCardSkeleton />
          <RecyclerCardSkeleton />
          <RecyclerCardSkeleton />
        </View>
      ) : (
        <FlatList
          data={filteredRecyclers}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <RecyclerCard recycler={item} onSelectRecycler={handleSelectRecycler} />
          )}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentPadding: {
    padding: spacing.spaceMd,
  },
  listContent: {
    padding: spacing.spaceMd,
    paddingBottom: spacing.spaceXl,
  },
  headerContainer: {
    marginBottom: spacing.spaceMd,
  },
  cacheNotice: {
    backgroundColor: '#E8F5E9',
    padding: spacing.spaceSm,
    borderRadius: 8,
    marginBottom: spacing.spaceSm,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  cacheNoticeText: {
    fontSize: 12,
    color: '#2E7D32',
    textAlign: 'center',
    fontWeight: '500',
  },
  warningBanner: {
    backgroundColor: '#FFF3E0',
    padding: spacing.spaceSm,
    borderRadius: 8,
    marginBottom: spacing.spaceSm,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  warningBannerText: {
    fontSize: 12,
    color: '#E65100',
    lineHeight: 18,
    fontWeight: '500',
  },
  educationCard: {
    backgroundColor: colors.surface,
    padding: spacing.spaceMd,
    borderRadius: 10,
    marginBottom: spacing.spaceSm,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  educationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryDark,
    marginBottom: 4,
  },
  educationBody: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  trackConsignmentsCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 10,
    padding: spacing.spaceMd,
    marginBottom: spacing.spaceSm,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  trackConsignmentsInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackConsignmentsIcon: {
    fontSize: 24,
  },
  trackConsignmentsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryDark,
    marginBottom: 2,
  },
  trackConsignmentsSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  trackConsignmentsArrow: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primaryDark,
    marginLeft: spacing.spaceSm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.divider,
    paddingHorizontal: spacing.spaceSm,
    height: 48,
    marginBottom: spacing.spaceSm,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: spacing.spaceXs,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    height: '100%',
  },
  clearButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButtonText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  categoryFilterContainer: {
    marginBottom: spacing.spaceSm,
  },
  categoryFilterLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  categoryScrollContent: {
    paddingRight: spacing.spaceSm,
    gap: 8,
  },
  categoryFilterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.divider,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryFilterChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryFilterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  categoryFilterChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  countBanner: {
    paddingVertical: 4,
  },
  countText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});

export default CollectorRecyclerDirectoryScreen;
