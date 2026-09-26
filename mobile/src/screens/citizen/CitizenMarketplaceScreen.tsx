/**
 * CitizenMarketplaceScreen — COMPLETE REBUILD
 * Consumer SHOP experience for reusable electronics.
 * Goal: SHOP REUSABLE ELECTRONICS
 * Information hierarchy: Search → Categories → Product Grid
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
  TextInput,
  Image,
  RefreshControl,
  ActivityIndicator,
  Modal,
  ScrollView,
  Dimensions,
  ListRenderItemInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useI18n } from '../../i18n';
import { useNetwork } from '../../hooks/useNetwork';
import { materialLotService, MaterialLotItem } from '../../services/materialLotService';
import { MATERIAL_TAXONOMY } from '../../config/materialTaxonomy';
import { EcoSetuBackground } from '../../components/glass/EcoSetuBackground';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { AppIcon, IconName } from '../../components/ui/AppIcon';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = (SCREEN_W - 48) / 2;

// ─── Categories ───────────────────────────────────────────────────────────────

const CATEGORIES: Array<{ key: string; label: string; icon: IconName }> = [
  { key: 'ALL',          label: 'All',         icon: 'store' },
  { key: 'MOBILE_PHONE', label: 'Phones',       icon: 'phone' },
  { key: 'LAPTOP',       label: 'Laptops',      icon: 'laptop' },
  { key: 'TABLET',       label: 'Tablets',      icon: 'tablet' },
  { key: 'BATTERY',      label: 'Batteries',    icon: 'battery' },
  { key: 'CABLE',        label: 'Cables',       icon: 'cable' },
  { key: 'OTHER',        label: 'Other',        icon: 'box' },
];

const CONDITIONS = [
  { key: 'ALL',            label: 'Any Condition' },
  { key: 'WORKING',        label: 'Working' },
  { key: 'TESTED_WORKING', label: 'Tested & Working' },
  { key: 'REPAIRABLE',     label: 'Repairable' },
  { key: 'REFURBISHED',    label: 'Refurbished' },
];

const SORTS = [
  { key: 'NEWEST',     label: 'Newest First' },
  { key: 'PRICE_ASC',  label: 'Price: Low → High' },
  { key: 'PRICE_DESC', label: 'Price: High → Low' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function conditionMeta(condition: string) {
  switch (condition) {
    case 'WORKING':
    case 'TESTED_WORKING':
      return { label: 'Working', color: '#10B981', bg: 'rgba(16,185,129,0.15)' };
    case 'REPAIRABLE':
    case 'PARTIALLY_WORKING':
      return { label: 'Repairable', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' };
    case 'REFURBISHED':
      return { label: 'Refurbished', color: '#60A5FA', bg: 'rgba(59,130,246,0.15)' };
    default:
      return { label: condition || 'Good', color: '#A78BFA', bg: 'rgba(139,92,246,0.15)' };
  }
}

// ─── Product Card (2-column grid) ─────────────────────────────────────────────

interface ProductCardProps {
  item: MaterialLotItem;
  onPress: (item: MaterialLotItem) => void;
}

const ProductCard = React.memo<ProductCardProps>(({ item, onPress }) => {
  const { t } = useI18n();
  const cat = MATERIAL_TAXONOMY[item.category] || { defaultName: item.category };
  const photoUrl = item.photos?.[0]?.photoUrl ?? null;
  const cond = conditionMeta(item.condition ?? '');
  const price = item.askingPrice && item.askingPrice > 0
    ? `₹${Number(item.askingPrice).toLocaleString('en-IN')}`
    : t('marketplace.makeCustomOffer', 'Make Offer');
  const title = item.subcategory || (cat.i18nKey ? t(cat.i18nKey, cat.defaultName) : cat.defaultName);

  return (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => onPress(item)}
      activeOpacity={0.88}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${cond.label}, ${price}`}
    >
      {/* Photo */}
      <View style={styles.productPhoto}>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.productImg} resizeMode="cover" />
        ) : (
          <View style={styles.productImgPlaceholder}>
            <AppIcon name="box" size={24} color="rgba(255,255,255,0.4)" />
          </View>
        )}
        <View style={[styles.condPill, { backgroundColor: cond.bg }]}>
          <Text style={[styles.condPillText, { color: cond.color }]}>{cond.label}</Text>
        </View>
      </View>

      {/* Info */}
      <View style={styles.productInfo}>
        <Text style={styles.productTitle} numberOfLines={2}>{title}</Text>
        {item.collector?.city ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <AppIcon name="location" size={11} color="#94A3B8" style={{ marginRight: 3 }} />
            <Text style={styles.productLocation} numberOfLines={1}>
              {item.collector.city}
            </Text>
          </View>
        ) : null}
        <View style={styles.productFooter}>
          <Text style={styles.productPrice}>{price}</Text>
          <View style={styles.viewBtn}>
            <Text style={styles.viewBtnText}>{t('common.search', 'View')}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

// ─── Filter Bottom Sheet ───────────────────────────────────────────────────────

interface FilterSheetProps {
  visible: boolean;
  condition: string;
  sort: string;
  onApply: (condition: string, sort: string) => void;
  onClose: () => void;
}

const FilterSheet: React.FC<FilterSheetProps> = ({
  visible, condition, sort, onApply, onClose,
}) => {
  const { t } = useI18n();
  const [localCond, setLocalCond] = useState(condition);
  const [localSort, setLocalSort] = useState(sort);

  useEffect(() => {
    if (visible) {
      setLocalCond(condition);
      setLocalSort(sort);
    }
  }, [visible, condition, sort]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheetContainer}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>{t('common.selectLanguage', 'Filter & Sort')}</Text>

        <Text style={styles.sheetSectionLabel}>{t('marketplace.conditionHeading', 'CONDITION')}</Text>
        {CONDITIONS.map((c) => (
          <TouchableOpacity
            key={c.key}
            style={[styles.sheetOption, localCond === c.key && styles.sheetOptionActive]}
            onPress={() => setLocalCond(c.key)}
          >
            <Text style={[styles.sheetOptionText, localCond === c.key && styles.sheetOptionTextActive]}>
              {c.label}
            </Text>
            {localCond === c.key && <AppIcon name="check" size={14} color="#10B981" />}
          </TouchableOpacity>
        ))}

        <View style={styles.sheetDivider} />

        <Text style={styles.sheetSectionLabel}>{t('common.search', 'SORT BY')}</Text>
        {SORTS.map((s) => (
          <TouchableOpacity
            key={s.key}
            style={[styles.sheetOption, localSort === s.key && styles.sheetOptionActive]}
            onPress={() => setLocalSort(s.key)}
          >
            <Text style={[styles.sheetOptionText, localSort === s.key && styles.sheetOptionTextActive]}>
              {s.label}
            </Text>
            {localSort === s.key && <AppIcon name="check" size={14} color="#10B981" />}
          </TouchableOpacity>
        ))}

        <View style={styles.sheetActions}>
          <TouchableOpacity
            style={styles.sheetClearBtn}
            onPress={() => { setLocalCond('ALL'); setLocalSort('NEWEST'); }}
          >
            <Text style={styles.sheetClearText}>{t('common.cancel', 'Clear')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.sheetApplyBtn}
            onPress={() => { onApply(localCond, localSort); onClose(); }}
          >
            <Text style={styles.sheetApplyText}>{t('common.save', 'Apply')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const ProductSkeleton: React.FC = () => (
  <View style={styles.skeletonGrid}>
    {[1, 2, 3, 4, 5, 6].map((n) => (
      <View key={n} style={[styles.productCard, styles.skeletonCard]}>
        <View style={styles.skeletonPhoto} />
        <View style={styles.skeletonLine} />
        <View style={[styles.skeletonLine, { width: '60%' }]} />
      </View>
    ))}
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

export const CitizenMarketplaceScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { isConnected } = useNetwork();
  const { t } = useI18n();

  const [lots, setLots] = useState<MaterialLotItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedCondition, setSelectedCondition] = useState('ALL');
  const [sortBy, setSortBy] = useState<'NEWEST' | 'PRICE_ASC' | 'PRICE_DESC'>('NEWEST');
  const [showFilters, setShowFilters] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadLots = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const query: any = {};
      if (selectedCategory !== 'ALL') query.category = selectedCategory;
      if (searchQuery.trim()) query.search = searchQuery.trim();

      const response = await materialLotService.getConsumerMarketplaceLots({
        ...query,
        forceRefresh: isRefresh,
      });
      let items: MaterialLotItem[] = response.lots || [];

      if (selectedCondition !== 'ALL') {
        items = items.filter((l) => l.condition === selectedCondition);
      }
      if (sortBy === 'PRICE_ASC') {
        items.sort((a, b) => (a.askingPrice || 0) - (b.askingPrice || 0));
      } else if (sortBy === 'PRICE_DESC') {
        items.sort((a, b) => (b.askingPrice || 0) - (a.askingPrice || 0));
      } else {
        items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }

      setLots(items);
    } catch {
      // silent — show empty state
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedCategory, selectedCondition, searchQuery, sortBy]);

  // Debounced reload on filter/search change
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { loadLots(false); }, 280);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [loadLots]);

  const handleItemPress = useCallback((item: MaterialLotItem) => {
    navigation.navigate('CitizenMarketplaceItemDetail', { lotId: item.id, lot: item });
  }, [navigation]);

  const handleApplyFilters = useCallback((cond: string, sort: string) => {
    setSelectedCondition(cond);
    setSortBy(sort as any);
  }, []);

  const renderItem = useCallback(({ item }: ListRenderItemInfo<MaterialLotItem>) => (
    <ProductCard item={item} onPress={handleItemPress} />
  ), [handleItemPress]);

  const keyExtractor = useCallback((item: MaterialLotItem) => item.id, []);

  const activeFilters = selectedCondition !== 'ALL' || sortBy !== 'NEWEST';

  const ListEmpty = useMemo(() => (
    <View style={styles.emptyContainer}>
      <AppIcon name="search" size={36} color="#94A3B8" style={{ marginBottom: 12 }} />
      <Text style={styles.emptyTitle}>{t('marketplace.noItemsFound', 'No Items Found')}</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery
          ? `${t('common.search', 'No results for')} "${searchQuery}"`
          : t('marketplace.noItemsDesc', 'No electronics available right now. Check back soon.')}
      </Text>
      {!isConnected && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
          <AppIcon name="alert" size={13} color="#F59E0B" style={{ marginRight: 5 }} />
          <Text style={styles.offlineNote}>{t('common.offline', 'You appear to be offline.')}</Text>
        </View>
      )}
    </View>
  ), [searchQuery, isConnected, t]);

  return (
    <EcoSetuBackground>
      <SafeAreaView style={styles.safe}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>{t('navigation.marketplace', 'Shop')}</Text>
            <Text style={styles.headerSubtitle}>{t('marketplace.storeSubtitle', 'Reusable Electronics')}</Text>
          </View>
          <TouchableOpacity
            style={styles.ordersBtn}
            onPress={() => navigation.navigate('CitizenPurchases')}
            accessibilityRole="button"
            accessibilityLabel={t('marketplace.myPurchases', 'My Purchases')}
          >
            <Text style={styles.ordersBtnText}>{t('marketplace.myPurchases', 'My Orders')}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Search Bar ── */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <AppIcon name="search" size={16} color="rgba(255,255,255,0.4)" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t('marketplace.searchPlaceholder', 'Search phones, laptops, batteries…')}
              placeholderTextColor="rgba(255,255,255,0.35)"
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel={t('marketplace.searchPlaceholder', 'Search marketplace')}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearch}>
                <AppIcon name="close" size={13} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[styles.filterBtn, activeFilters && styles.filterBtnActive]}
            onPress={() => setShowFilters(true)}
            accessibilityRole="button"
            accessibilityLabel="Open filters"
          >
            <AppIcon name="settings" size={16} color={activeFilters ? '#10B981' : '#FFFFFF'} />
            {activeFilters && <View style={styles.filterDot} />}
          </TouchableOpacity>
        </View>

        {/* ── Category Chips ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryContent}
        >
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[styles.catChip, active && styles.catChipActive]}
                onPress={() => setSelectedCategory(cat.key)}
                accessibilityRole="button"
                accessibilityLabel={cat.label}
                accessibilityState={{ selected: active }}
              >
                <AppIcon
                  name={cat.icon}
                  size={14}
                  color={active ? '#10B981' : 'rgba(255,255,255,0.7)'}
                  style={{ marginRight: 5 }}
                />
                <Text style={[styles.catChipLabel, active && styles.catChipLabelActive]}>
                  {cat.key === 'ALL' ? t('marketplace.allCategories', 'All') : cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Results count ── */}
        {!isLoading && (
          <View style={styles.resultsRow}>
            <Text style={styles.resultsCount}>
              {lots.length} {lots.length === 1 ? 'item' : 'items'} available
            </Text>
            {activeFilters && (
              <TouchableOpacity
                onPress={() => { setSelectedCondition('ALL'); setSortBy('NEWEST'); }}
                style={styles.clearFiltersBtn}
              >
                <Text style={styles.clearFiltersText}>Clear filters</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── Content ── */}
        {isLoading ? (
          <ProductSkeleton />
        ) : (
          <FlatList
            data={lots}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={ListEmpty}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews
            maxToRenderPerBatch={10}
            windowSize={7}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => loadLots(true)}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
          />
        )}

        {/* ── Filter Sheet ── */}
        <FilterSheet
          visible={showFilters}
          condition={selectedCondition}
          sort={sortBy}
          onApply={handleApplyFilters}
          onClose={() => setShowFilters(false)}
        />
      </SafeAreaView>
    </EcoSetuBackground>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: 'transparent',
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.50)',
    fontWeight: '500',
    marginTop: 1,
  },
  ordersBtn: {
    backgroundColor: 'rgba(16,185,129,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(52,211,153,0.35)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  ordersBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#34D399',
  },

  // ── Search ──
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 12,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    height: 46,
    gap: 8,
  },
  searchIcon: {
    fontSize: 16,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: 0,
  },
  clearSearch: {
    padding: 4,
  },
  clearSearchText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.45)',
  },
  filterBtn: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBtnActive: {
    backgroundColor: 'rgba(16,185,129,0.18)',
    borderColor: 'rgba(52,211,153,0.40)',
  },
  filterBtnIcon: {
    fontSize: 18,
  },
  filterDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
    borderWidth: 1,
    borderColor: '#071E22',
  },

  // ── Categories ──
  categoryScroll: {
    maxHeight: 52,
    marginBottom: 8,
  },
  categoryContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  catChipActive: {
    backgroundColor: 'rgba(16,185,129,0.22)',
    borderColor: '#10B981',
  },
  catChipIcon: {
    fontSize: 14,
  },
  catChipLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.65)',
  },
  catChipLabelActive: {
    color: '#34D399',
  },

  // ── Results row ──
  resultsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  resultsCount: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '500',
  },
  clearFiltersBtn: {
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  clearFiltersText: {
    fontSize: 12,
    color: '#34D399',
    fontWeight: '600',
  },

  // ── Grid ──
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    flexGrow: 1,
  },
  row: {
    gap: 12,
    marginBottom: 12,
  },

  // ── Product Card ──
  productCard: {
    width: CARD_W,
    backgroundColor: 'rgba(16,44,48,0.80)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    overflow: 'hidden',
    elevation: 2,
  },
  productPhoto: {
    width: '100%',
    height: CARD_W * 0.75,
    position: 'relative',
  },
  productImg: {
    width: '100%',
    height: '100%',
  },
  productImgPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productImgIcon: {
    fontSize: 36,
  },
  condPill: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  condPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  productInfo: {
    padding: 12,
    gap: 4,
  },
  productTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 18,
  },
  productLocation: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '500',
  },
  productFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: '#34D399',
    letterSpacing: -0.3,
  },
  viewBtn: {
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  viewBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ── Empty ──
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 52,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.50)',
    textAlign: 'center',
    lineHeight: 21,
  },
  offlineNote: {
    fontSize: 12,
    color: '#FBBF24',
    marginTop: 12,
    textAlign: 'center',
  },

  // ── Skeleton ──
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  skeletonCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'transparent',
  },
  skeletonPhoto: {
    width: '100%',
    height: CARD_W * 0.75,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginHorizontal: 12,
    marginVertical: 5,
    width: '75%',
  },

  // ── Filter Sheet ──
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.60)',
  },
  sheetContainer: {
    backgroundColor: '#0D2E32',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
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
    marginTop: 12,
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  sheetSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.40)',
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 4,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 4,
  },
  sheetOptionActive: {
    backgroundColor: 'rgba(16,185,129,0.15)',
  },
  sheetOptionText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.70)',
    fontWeight: '500',
  },
  sheetOptionTextActive: {
    color: '#34D399',
    fontWeight: '700',
  },
  sheetCheck: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '700',
  },
  sheetDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginVertical: 14,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  sheetClearBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetClearText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '600',
  },
  sheetApplyBtn: {
    flex: 2,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetApplyText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

export default CitizenMarketplaceScreen;
