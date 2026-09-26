/**
 * Supporting recycler components (smaller utilities):
 * - RecyclerEmptyState
 * - RecyclerSkeletonList
 * - RecyclerSectionHeader
 * - RecyclerOfferCard
 * - InventoryLotCard
 * - RecyclerMoneySummary
 * - RecyclerSpendRow
 * - RateRow
 * - SourcingRequestCard
 * - PickupStatusCard
 * - PipelineStage
 *
 * All in one file for efficient bundling of smaller components.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { useI18n } from '../../i18n';
import { RecyclerStatusBadge } from './RecyclerStatusBadge';
import { AppIcon, AppIconName } from '../ui/AppIcon';

// ─── RecyclerEmptyState ───────────────────────────────────────────────────────
interface EmptyConfig {
  icon: AppIconName;
  titleKey: string;
  defaultTitle: string;
  subKey: string;
  defaultSub: string;
  actionKey?: string;
  defaultAction?: string;
}

const EMPTY_CONFIGS: Record<string, EmptyConfig> = {
  no_lots: {
    icon: 'search',
    titleKey: 'recycler.empty.noLotsTitle',
    defaultTitle: 'No material available',
    subKey: 'recycler.empty.noLotsSub',
    defaultSub: 'No lots match your search. Try adjusting filters or check back later.',
    actionKey: 'common.clearFilters',
    defaultAction: 'Clear Filters',
  },
  no_orders: {
    icon: 'fileText',
    titleKey: 'recycler.empty.noOrdersTitle',
    defaultTitle: 'No active orders',
    subKey: 'recycler.empty.noOrdersSub',
    defaultSub: 'Your procurement orders will appear here. Browse material to make an offer.',
    actionKey: 'recycler.browseMaterial',
    defaultAction: 'Browse Material',
  },
  no_inventory: {
    icon: 'package',
    titleKey: 'recycler.empty.noInventoryTitle',
    defaultTitle: 'No received material',
    subKey: 'recycler.empty.noInventorySub',
    defaultSub: 'Material you have purchased and received will appear here.',
    actionKey: 'recycler.browseMarket',
    defaultAction: 'Browse Market',
  },
  no_transactions: {
    icon: 'creditCard',
    titleKey: 'recycler.empty.noTransactionsTitle',
    defaultTitle: 'No transactions yet',
    subKey: 'recycler.empty.noTransactionsSub',
    defaultSub: 'Completed purchases and payment history will appear here.',
  },
  no_rates: {
    icon: 'trendingUp',
    titleKey: 'recycler.empty.noRatesTitle',
    defaultTitle: 'No buying rates published',
    subKey: 'recycler.empty.noRatesSub',
    defaultSub: 'Add your buying rates so collectors can see what you pay.',
    actionKey: 'recycler.addRate',
    defaultAction: 'Add Rate',
  },
  no_sourcing: {
    icon: 'radio',
    titleKey: 'recycler.empty.noSourcingTitle',
    defaultTitle: 'No sourcing requests',
    subKey: 'recycler.empty.noSourcingSub',
    defaultSub: 'Create a sourcing request to find material that matches your needs.',
    actionKey: 'recycler.createRequest',
    defaultAction: 'Create Request',
  },
  offline: {
    icon: 'wifiOff',
    titleKey: 'offline.title',
    defaultTitle: 'You are offline',
    subKey: 'offline.banner',
    defaultSub: 'Showing cached data. Some actions require a connection.',
  },
  generic: {
    icon: 'search',
    titleKey: 'empty.genericTitle',
    defaultTitle: 'Nothing here yet',
    subKey: 'empty.genericSub',
    defaultSub: 'Content will appear here when available.',
  },
};

interface RecyclerEmptyStateProps {
  type?: keyof typeof EMPTY_CONFIGS;
  title?: string;
  sub?: string;
  icon?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const RecyclerEmptyState: React.FC<RecyclerEmptyStateProps> = ({
  type = 'generic',
  title,
  sub,
  icon,
  actionLabel,
  onAction,
}) => {
  const { t } = useI18n();
  const cfg = EMPTY_CONFIGS[type] || EMPTY_CONFIGS.generic;
  const displayTitle = title ?? t(cfg.titleKey, cfg.defaultTitle);
  const displaySub = sub ?? t(cfg.subKey, cfg.defaultSub);
  const displayAction = actionLabel ?? (cfg.actionKey ? t(cfg.actionKey, cfg.defaultAction) : cfg.defaultAction);

  return (
    <View style={emptyStyles.container}>
      <AppIcon name={(icon as any) ?? cfg.icon} size={44} color="#22D3EE" />
      <Text style={emptyStyles.title}>{displayTitle}</Text>
      <Text style={emptyStyles.sub}>{displaySub}</Text>
      {displayAction && onAction && (
        <TouchableOpacity
          style={emptyStyles.btn}
          onPress={onAction}
          accessibilityRole="button"
        >
          <Text style={emptyStyles.btnText}>{displayAction}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};
const emptyStyles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32, gap: 12 },
  icon:      { fontSize: 44 },
  title:     { color: '#FFFFFF', fontSize: 16, fontWeight: '800', textAlign: 'center' },
  sub:       { color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: '500', textAlign: 'center', lineHeight: 20 },
  btn: {
    marginTop: 8,
    backgroundColor: 'rgba(34,211,238,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.3)',
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 24,
  },
  btnText: { color: '#22D3EE', fontSize: 14, fontWeight: '800' },
});

// ─── RecyclerSkeletonList ─────────────────────────────────────────────────────
export const RecyclerSkeletonList: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <View style={skelStyles.container}>
    {Array.from({ length: count }).map((_, i) => (
      <View key={i} style={skelStyles.card}>
        <View style={[skelStyles.shimmer, { width: '45%', height: 14 }]} />
        <View style={[skelStyles.shimmer, { width: '25%', height: 10, marginTop: 4 }]} />
        <View style={[skelStyles.shimmer, { height: 44, marginTop: 10, borderRadius: 12 }]} />
        <View style={[skelStyles.shimmer, { height: 46, marginTop: 10, borderRadius: 12 }]} />
      </View>
    ))}
  </View>
);
const skelStyles = StyleSheet.create({
  container: { gap: 12, paddingHorizontal: 20 },
  card:      { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  shimmer:   { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 6 },
});

// ─── RecyclerSectionHeader ────────────────────────────────────────────────────
interface RecyclerSectionHeaderProps {
  label: string;
  count?: number;
  action?: string;
  onAction?: () => void;
}
export const RecyclerSectionHeader: React.FC<RecyclerSectionHeaderProps> = ({
  label, count, action, onAction,
}) => (
  <View style={secStyles.row}>
    <View style={secStyles.labelRow}>
      <Text style={secStyles.label}>{label}</Text>
      {count !== undefined && count > 0 && (
        <View style={secStyles.countBadge}>
          <Text style={secStyles.countText}>{count}</Text>
        </View>
      )}
    </View>
    {action && onAction && (
      <TouchableOpacity onPress={onAction} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Text style={secStyles.action}>{action}</Text>
      </TouchableOpacity>
    )}
  </View>
);
const secStyles = StyleSheet.create({
  row:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 4 },
  labelRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label:      { color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase' },
  countBadge: { backgroundColor: 'rgba(34,211,238,0.15)', borderRadius: 20, paddingHorizontal: 7, paddingVertical: 2 },
  countText:  { color: '#22D3EE', fontSize: 10, fontWeight: '800' },
  action:     { color: '#22D3EE', fontSize: 12, fontWeight: '700' },
});

const resolveMaterialIcon = (raw?: string): AppIconName => {
  if (!raw) return 'package';
  const lower = raw.toLowerCase();
  if (lower === 'box' || lower === 'package' || raw === '\u{1F4E6}') return 'package';
  if (lower === 'truck' || raw === '\u{1F69A}' || raw === '\u{1F69B}') return 'truck';
  if (lower === 'recycle' || raw === '\u{267B}' || raw === '\u{267B}\u{FE0F}') return 'recycle';
  if (lower === 'radio' || raw === '\u{1F4E1}') return 'radio';
  if (lower === 'cpu' || lower === 'pcb') return 'grid';
  if (lower === 'battery') return 'battery';
  if (lower === 'card' || lower === 'creditcard' || raw === '\u{1F4B3}') return 'creditCard';
  if (lower === 'filetext' || raw === '\u{1F4CB}') return 'fileText';
  return (raw as AppIconName) || 'package';
};

// ─── RecyclerOfferCard ────────────────────────────────────────────────────────
interface RecyclerOfferCardProps {
  material: string;
  materialIcon?: string;
  weightKg: number;
  offeredRate: number;
  sellerAskRate?: number;
  totalValue: number;
  status: string;
  sellerName?: string;
  onView: () => void;
  onAccept?: () => void;
  onCounter?: () => void;
}
export const RecyclerOfferCard: React.FC<RecyclerOfferCardProps> = ({
  material, materialIcon, weightKg, offeredRate, sellerAskRate,
  totalValue, status, sellerName, onView, onAccept, onCounter,
}) => {
  const { t } = useI18n();
  return (
    <TouchableOpacity style={offerStyles.card} onPress={onView} activeOpacity={0.8}>
      <View style={offerStyles.header}>
        <AppIcon name={resolveMaterialIcon(materialIcon)} size={24} color="#22D3EE" />
        <View style={offerStyles.titleBlock}>
          <Text style={offerStyles.material} numberOfLines={1}>{material}</Text>
          {sellerName && <Text style={offerStyles.seller} numberOfLines={1}>{sellerName}</Text>}
        </View>
        <RecyclerStatusBadge status={status} />
      </View>
      <View style={offerStyles.priceRow}>
        <View style={offerStyles.priceBlock}>
          <Text style={offerStyles.rate}>₹{offeredRate}/kg</Text>
          <Text style={offerStyles.rateLabel}>{t('recycler.yourOffer', 'Your offer')}</Text>
        </View>
        {sellerAskRate !== undefined && (
          <View style={offerStyles.priceBlock}>
            <Text style={[offerStyles.rate, { color: '#34D399' }]}>₹{sellerAskRate}/kg</Text>
            <Text style={offerStyles.rateLabel}>{t('recycler.sellerAsk', 'Seller ask')}</Text>
          </View>
        )}
        <View style={offerStyles.priceBlock}>
          <Text style={[offerStyles.rate, { color: '#22D3EE' }]}>
            ₹{totalValue.toLocaleString('en-IN')}
          </Text>
          <Text style={offerStyles.rateLabel}>{t('recycler.totalKg', { weight: weightKg }, `${weightKg} kg total`)}</Text>
        </View>
      </View>
      {(onAccept || onCounter) && (
        <View style={offerStyles.actions}>
          {onAccept && (
            <TouchableOpacity style={offerStyles.acceptBtn} onPress={onAccept}>
              <Text style={offerStyles.acceptText}>{t('common.accept', 'ACCEPT')}</Text>
            </TouchableOpacity>
          )}
          {onCounter && (
            <TouchableOpacity style={offerStyles.counterBtn} onPress={onCounter}>
              <Text style={offerStyles.counterText}>{t('common.counter', 'COUNTER')}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};
const offerStyles = StyleSheet.create({
  card:        { backgroundColor: 'rgba(34,211,238,0.04)', borderWidth: 1, borderColor: 'rgba(34,211,238,0.15)', borderRadius: 18, padding: 16, gap: 12 },
  header:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon:        { fontSize: 24 },
  titleBlock:  { flex: 1, gap: 2 },
  material:    { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  seller:      { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '500' },
  priceRow:    { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, justifyContent: 'space-around' },
  priceBlock:  { alignItems: 'center', gap: 2 },
  rate:        { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  rateLabel:   { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '600' },
  actions:     { flexDirection: 'row', gap: 8 },
  acceptBtn:   { flex: 1, backgroundColor: '#10B981', borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  acceptText:  { color: '#071E22', fontSize: 13, fontWeight: '900' },
  counterBtn:  { flex: 1, backgroundColor: 'rgba(34,211,238,0.1)', borderWidth: 1, borderColor: 'rgba(34,211,238,0.3)', borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  counterText: { color: '#22D3EE', fontSize: 13, fontWeight: '800' },
});

// ─── InventoryLotCard ─────────────────────────────────────────────────────────
interface InventoryLotCardProps {
  material: string;
  materialIcon?: string;
  weightKg: number;
  condition?: string;
  receivedDate?: string;
  source?: string;
  transactionRef?: string;
  inventoryStatus: string;
  onPress: () => void;
}
export const InventoryLotCard: React.FC<InventoryLotCardProps> = ({
  material, materialIcon, weightKg, condition, receivedDate,
  source, transactionRef, inventoryStatus, onPress,
}) => {
  const { t } = useI18n();
  return (
    <TouchableOpacity style={invStyles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={invStyles.header}>
        <AppIcon name={resolveMaterialIcon(materialIcon)} size={22} color="#22D3EE" />
        <View style={invStyles.titleBlock}>
          <Text style={invStyles.material} numberOfLines={1}>{material}</Text>
          {receivedDate && <Text style={invStyles.date}>{receivedDate}</Text>}
        </View>
        <RecyclerStatusBadge status={inventoryStatus} />
      </View>
      <View style={invStyles.metricsRow}>
        <View style={invStyles.metric}>
          <Text style={invStyles.metricVal}>{weightKg} kg</Text>
          <Text style={invStyles.metricLbl}>{t('common.weight', 'Weight')}</Text>
        </View>
        {condition && (
          <>
            <View style={invStyles.div} />
            <View style={invStyles.metric}>
              <Text style={invStyles.metricVal}>{condition}</Text>
              <Text style={invStyles.metricLbl}>{t('common.condition', 'Condition')}</Text>
            </View>
          </>
        )}
        {source && (
          <>
            <View style={invStyles.div} />
            <View style={invStyles.metric}>
              <Text style={invStyles.metricVal} numberOfLines={1}>{source}</Text>
              <Text style={invStyles.metricLbl}>{t('common.source', 'Source')}</Text>
            </View>
          </>
        )}
      </View>
      {transactionRef && (
        <Text style={invStyles.ref}>{t('bills.reference', 'Ref')}: {transactionRef}</Text>
      )}
    </TouchableOpacity>
  );
};
const invStyles = StyleSheet.create({
  card:       { backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 14, gap: 10 },
  header:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon:       { fontSize: 22 },
  titleBlock: { flex: 1, gap: 2 },
  material:   { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  date:       { color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '500' },
  metricsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 },
  metric:     { flex: 1, alignItems: 'center' },
  metricVal:  { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  metricLbl:  { color: 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: '600', marginTop: 1 },
  div:        { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.08)' },
  ref:        { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '500' },
});

// ─── RecyclerMoneySummary ─────────────────────────────────────────────────────
interface RecyclerMoneySummaryProps {
  totalSpend: number;
  pending: number;
  completed: number;
  currency?: string;
}
export const RecyclerMoneySummary: React.FC<RecyclerMoneySummaryProps> = ({
  totalSpend, pending, completed, currency = '₹',
}) => {
  const { t } = useI18n();
  return (
    <View style={moneyStyles.container}>
      <Text style={moneyStyles.label}>{t('recycler.totalPurchases', 'TOTAL PURCHASES')}</Text>
      <Text style={moneyStyles.total}>
        {currency}{totalSpend.toLocaleString('en-IN')}
      </Text>
      <View style={moneyStyles.row}>
        <View style={moneyStyles.block}>
          <Text style={[moneyStyles.blockVal, { color: '#F59E0B' }]}>
            {currency}{pending.toLocaleString('en-IN')}
          </Text>
          <Text style={moneyStyles.blockLbl}>{t('bills.pendingPayment', 'Pending Payment')}</Text>
        </View>
        <View style={moneyStyles.div} />
        <View style={moneyStyles.block}>
          <Text style={[moneyStyles.blockVal, { color: '#34D399' }]}>
            {currency}{completed.toLocaleString('en-IN')}
          </Text>
          <Text style={moneyStyles.blockLbl}>{t('bills.paid', 'Paid')}</Text>
        </View>
      </View>
    </View>
  );
};
const moneyStyles = StyleSheet.create({
  container:  { paddingHorizontal: 20, alignItems: 'center', gap: 10 },
  label:      { color: '#22D3EE', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  total:      { color: '#FFFFFF', fontSize: 42, fontWeight: '900', letterSpacing: -1.5 },
  row:        { flexDirection: 'row', alignItems: 'center', width: '100%', backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', borderRadius: 16, paddingVertical: 12, paddingHorizontal: 20 },
  block:      { flex: 1, alignItems: 'center', gap: 2 },
  blockVal:   { fontSize: 20, fontWeight: '900' },
  blockLbl:   { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '600' },
  div:        { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.08)' },
});

// ─── RecyclerSpendRow ─────────────────────────────────────────────────────────
interface RecyclerSpendRowProps {
  material: string;
  materialIcon?: string;
  source?: string;
  date: string;
  weightKg?: number;
  agreedRate?: number;
  totalValue: number;
  paymentStatus: string;
  onPress: () => void;
}
export const RecyclerSpendRow: React.FC<RecyclerSpendRowProps> = ({
  material, materialIcon, source, date, weightKg, agreedRate,
  totalValue, paymentStatus, onPress,
}) => (
  <TouchableOpacity style={spendStyles.row} onPress={onPress} activeOpacity={0.75}>
    <View style={spendStyles.iconBox}>
      <AppIcon name={resolveMaterialIcon(materialIcon)} size={20} color="#22D3EE" />
    </View>
    <View style={spendStyles.info}>
      <Text style={spendStyles.material} numberOfLines={1}>{material}</Text>
      {source && <Text style={spendStyles.source} numberOfLines={1}>{source}</Text>}
      <Text style={spendStyles.date}>{date}{weightKg !== undefined ? ` · ${weightKg} kg` : ''}</Text>
    </View>
    <View style={spendStyles.right}>
      <Text style={spendStyles.total}>₹{totalValue.toLocaleString('en-IN')}</Text>
      <RecyclerStatusBadge status={paymentStatus} />
    </View>
  </TouchableOpacity>
);
const spendStyles = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, gap: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  iconBox:  { width: 40, height: 40, borderRadius: 11, backgroundColor: 'rgba(34,211,238,0.1)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  icon:     { fontSize: 20 },
  info:     { flex: 1, gap: 2 },
  material: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  source:   { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '500' },
  date:     { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '500' },
  right:    { alignItems: 'flex-end', gap: 4, flexShrink: 0 },
  total:    { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
});

// ─── RateRow ──────────────────────────────────────────────────────────────────
interface RateRowProps {
  category: string;
  subcategory?: string;
  icon?: string;
  ratePerKg: number;
  isActive: boolean;
  updatedAt?: string;
  onEdit?: () => void;
  onToggle?: () => void;
}
export const RateRow: React.FC<RateRowProps> = ({
  category, subcategory, icon, ratePerKg, isActive,
  updatedAt, onEdit, onToggle,
}) => {
  const { t } = useI18n();
  return (
    <View style={rateStyles.row}>
      <View style={rateStyles.iconBox}>
        <AppIcon name={resolveMaterialIcon(icon)} size={18} color="#22D3EE" />
      </View>
      <View style={rateStyles.info}>
        <Text style={rateStyles.category} numberOfLines={1}>{subcategory || category}</Text>
        {subcategory && <Text style={rateStyles.parent} numberOfLines={1}>{category}</Text>}
        {updatedAt && <Text style={rateStyles.updated}>{updatedAt}</Text>}
      </View>
      <View style={rateStyles.right}>
        <Text style={[rateStyles.rate, !isActive && { color: 'rgba(255,255,255,0.3)' }]}>
          ₹{ratePerKg}/kg
        </Text>
        <View style={[rateStyles.activePill, !isActive && rateStyles.inactivePill]}>
          <Text style={[rateStyles.activeText, !isActive && { color: '#94A3B8' }]}>
            {isActive ? t('status.active', 'Active') : t('status.inactive', 'Inactive')}
          </Text>
        </View>
      </View>
      <View style={rateStyles.actions}>
        {onEdit && (
          <TouchableOpacity
            style={rateStyles.editBtn}
            onPress={onEdit}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
          >
            <Text style={rateStyles.editText}>{t('common.edit', 'Edit')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};
const rateStyles = StyleSheet.create({
  row:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, gap: 10, minHeight: 56 },
  iconBox:    { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  icon:       { fontSize: 18 },
  info:       { flex: 1, gap: 2 },
  category:   { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  parent:     { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '500' },
  updated:    { color: 'rgba(255,255,255,0.25)', fontSize: 10, fontWeight: '500' },
  right:      { alignItems: 'flex-end', gap: 3, flexShrink: 0 },
  rate:       { color: '#22D3EE', fontSize: 15, fontWeight: '900' },
  activePill: { backgroundColor: 'rgba(16,185,129,0.12)', borderRadius: 20, paddingHorizontal: 7, paddingVertical: 2 },
  inactivePill: { backgroundColor: 'rgba(148,163,184,0.1)' },
  activeText: { color: '#34D399', fontSize: 10, fontWeight: '700' },
  actions:    { flexShrink: 0 },
  editBtn:    { backgroundColor: 'rgba(34,211,238,0.1)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  editText:   { color: '#22D3EE', fontSize: 12, fontWeight: '700' },
});

// ─── SourcingRequestCard ──────────────────────────────────────────────────────
interface SourcingRequestCardProps {
  material: string;
  materialIcon?: string;
  quantityKg: number;
  distanceKm?: number;
  pickupRequired?: boolean;
  status: string;
  responseCount?: number;
  expiresAt?: string;
  onPress: () => void;
}
export const SourcingRequestCard: React.FC<SourcingRequestCardProps> = ({
  material, materialIcon, quantityKg, distanceKm,
  pickupRequired, status, responseCount, expiresAt, onPress,
}) => {
  const { t } = useI18n();
  return (
    <TouchableOpacity style={sourcStyles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={sourcStyles.header}>
        <View style={sourcStyles.materialBlock}>
          <AppIcon name={resolveMaterialIcon(materialIcon || 'radio')} size={22} color="#22D3EE" />
          <View>
            <Text style={sourcStyles.material} numberOfLines={1}>{material}</Text>
            <Text style={sourcStyles.need}>{t('recycler.kgNeeded', { count: quantityKg }, `${quantityKg} kg needed`)}</Text>
          </View>
        </View>
        <RecyclerStatusBadge status={status} />
      </View>
      <View style={sourcStyles.pills}>
        {distanceKm !== undefined && (
          <View style={sourcStyles.pill}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <AppIcon name="mapPin" size={11} color="rgba(255,255,255,0.6)" />
              <Text style={sourcStyles.pillText}>{t('recycler.kmRadius', { count: distanceKm }, `${distanceKm} km radius`)}</Text>
            </View>
          </View>
        )}
        {pickupRequired && (
          <View style={sourcStyles.pill}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <AppIcon name="truck" size={11} color="rgba(255,255,255,0.6)" />
              <Text style={sourcStyles.pillText}>{t('recycler.pickupNeeded', 'Pickup needed')}</Text>
            </View>
          </View>
        )}
        {responseCount !== undefined && responseCount > 0 && (
          <View style={[sourcStyles.pill, sourcStyles.responsePill]}>
            <Text style={[sourcStyles.pillText, { color: '#22D3EE' }]}>
              {t('recycler.responses', { count: responseCount }, `${responseCount} response${responseCount > 1 ? 's' : ''}`)}
            </Text>
          </View>
        )}
        {expiresAt && (
          <Text style={sourcStyles.expires}>{t('recycler.expires', { date: expiresAt }, `Expires ${expiresAt}`)}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
};
const sourcStyles = StyleSheet.create({
  card:          { backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 14, gap: 10 },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  materialBlock: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  icon:          { fontSize: 22 },
  material:      { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  need:          { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '500', marginTop: 1 },
  pills:         { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  pill:          { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4 },
  responsePill:  { backgroundColor: 'rgba(34,211,238,0.08)', borderWidth: 1, borderColor: 'rgba(34,211,238,0.2)' },
  pillText:      { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '700' },
  expires:       { color: 'rgba(255,255,255,0.25)', fontSize: 11, fontWeight: '500', marginLeft: 'auto' as any },
});

// ─── PickupStatusCard ─────────────────────────────────────────────────────────
interface PickupStatusCardProps {
  material: string;
  materialIcon?: string;
  sellerName?: string;
  location?: string;
  weightKg?: number;
  dealValue?: number;
  status: string;
  scheduledTime?: string;
  onView: () => void;
  onAction?: () => void;
  actionLabel?: string;
}
export const PickupStatusCard: React.FC<PickupStatusCardProps> = ({
  material, materialIcon, sellerName, location, weightKg,
  dealValue, status, scheduledTime, onView, onAction, actionLabel,
}) => (
  <TouchableOpacity style={pickStyles.card} onPress={onView} activeOpacity={0.8}>
    <View style={pickStyles.header}>
      <View style={pickStyles.materialBlock}>
        <AppIcon name={resolveMaterialIcon(materialIcon || 'truck')} size={22} color="#22D3EE" />
        <View>
          <Text style={pickStyles.material} numberOfLines={1}>{material}</Text>
          {sellerName && <Text style={pickStyles.seller} numberOfLines={1}>{sellerName}</Text>}
        </View>
      </View>
      <RecyclerStatusBadge status={status} />
    </View>
    <View style={pickStyles.details}>
      {location && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 }}>
          <AppIcon name="mapPin" size={11} color="rgba(255,255,255,0.45)" />
          <Text style={pickStyles.location} numberOfLines={1}>{location}</Text>
        </View>
      )}
      {scheduledTime && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <AppIcon name="clock" size={11} color="rgba(255,255,255,0.45)" />
          <Text style={pickStyles.time}>{scheduledTime}</Text>
        </View>
      )}
      {weightKg !== undefined && <Text style={pickStyles.weight}>{weightKg} kg</Text>}
      {dealValue !== undefined && (
        <Text style={pickStyles.value}>₹{dealValue.toLocaleString('en-IN')}</Text>
      )}
    </View>
    {onAction && actionLabel && (
      <TouchableOpacity style={pickStyles.actionBtn} onPress={onAction} accessibilityRole="button">
        <Text style={pickStyles.actionText}>{actionLabel}</Text>
      </TouchableOpacity>
    )}
  </TouchableOpacity>
);
const pickStyles = StyleSheet.create({
  card:          { backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 14, gap: 10 },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  materialBlock: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  icon:          { fontSize: 22 },
  material:      { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  seller:        { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '500', marginTop: 1 },
  details:       { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
  location:      { color: 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: '600' },
  time:          { color: 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: '600' },
  weight:        { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '700' },
  value:         { color: '#22D3EE', fontSize: 14, fontWeight: '900' },
  actionBtn:     { backgroundColor: '#22D3EE', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  actionText:    { color: '#071E22', fontSize: 13, fontWeight: '900', letterSpacing: 0.3 },
});

// ─── PipelineStage ────────────────────────────────────────────────────────────
interface PipelineStageProps {
  stages: Array<{ id: string; label: string; done: boolean; current: boolean }>;
}
export const PipelineStage: React.FC<PipelineStageProps> = ({ stages }) => (
  <View style={pipeStyles.container}>
    {stages.map((stage, i) => (
      <React.Fragment key={stage.id}>
        <View style={pipeStyles.stageBlock}>
          <View style={[
            pipeStyles.dot,
            stage.done && pipeStyles.dotDone,
            stage.current && pipeStyles.dotCurrent,
          ]}>
            {stage.done && <AppIcon name="check" size={12} color="#FFFFFF" />}
          </View>
          <Text style={[
            pipeStyles.stageLabel,
            stage.current && pipeStyles.stageLabelCurrent,
            stage.done && pipeStyles.stageLabelDone,
          ]} numberOfLines={2}>{stage.label}</Text>
        </View>
        {i < stages.length - 1 && (
          <View style={[pipeStyles.connector, stages[i + 1].done && pipeStyles.connectorDone]} />
        )}
      </React.Fragment>
    ))}
  </View>
);
const pipeStyles = StyleSheet.create({
  container:          { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 20, paddingVertical: 8 },
  stageBlock:         { alignItems: 'center', gap: 6, width: 56 },
  dot:                { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  dotDone:            { backgroundColor: '#10B981', borderColor: '#10B981' },
  dotCurrent:         { borderColor: '#22D3EE', backgroundColor: 'rgba(34,211,238,0.2)', borderWidth: 2.5 },
  checkmark:          { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  connector:          { flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.1)', marginTop: 11 },
  connectorDone:      { backgroundColor: '#10B981' },
  stageLabel:         { color: 'rgba(255,255,255,0.35)', fontSize: 9, fontWeight: '600', textAlign: 'center', lineHeight: 12 },
  stageLabelCurrent:  { color: '#22D3EE', fontWeight: '800' },
  stageLabelDone:     { color: 'rgba(255,255,255,0.6)' },
});
