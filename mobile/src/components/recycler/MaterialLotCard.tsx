import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useI18n } from '../../i18n';
import { RecyclerStatusBadge } from './RecyclerStatusBadge';

import { AppIcon } from '../ui/AppIcon';

export interface MarketLot {
  id: string;
  category: string;
  subcategory?: string;
  materialIcon?: string;
  condition?: string;
  approximateTotalWeightKg?: number;
  quantityUnits?: number;
  location?: string;
  distanceKm?: number;
  pickupAvailable?: boolean;
  offerCount?: number;
  status: string;
  askingPrice?: number | string;
  listingPurpose?: string;
}

interface MaterialLotCardProps {
  lot: MarketLot;
  onView: () => void;
  onOffer?: () => void;
  isHighlighted?: boolean;
}

export const MaterialLotCard: React.FC<MaterialLotCardProps> = ({
  lot,
  onView,
  onOffer,
  isHighlighted = false,
}) => {
  const { t } = useI18n();

  const condLabel = lot.condition === 'WORKING' ? t('condition.working', 'Working')
    : lot.condition === 'REPAIRABLE' ? t('condition.repairable', 'Repairable')
    : lot.condition === 'DAMAGED' ? t('condition.partiallyWorking', 'Partial')
    : lot.condition === 'NOT_WORKING' ? t('condition.notWorking', 'Non-working')
    : lot.condition ? t(`condition.${lot.condition.toLowerCase()}`, lot.condition)
    : '—';

  const hasAsk    = lot.askingPrice && Number(lot.askingPrice) > 0;

  return (
    <TouchableOpacity
      style={[styles.card, isHighlighted && styles.cardHighlighted]}
      onPress={onView}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`${t('common.view', 'View')}: ${lot.subcategory || lot.category}`}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.materialBlock}>
          <View style={styles.iconBox}>
            <AppIcon name="box" size={20} color="#22D3EE" />
          </View>
          <View style={styles.materialText}>
            <Text style={styles.materialName} numberOfLines={1}>
              {lot.subcategory || lot.category}
            </Text>
            <Text style={styles.categoryName} numberOfLines={1}>{lot.category}</Text>
          </View>
        </View>
        <RecyclerStatusBadge status={lot.status} />
      </View>

      {/* Metrics row */}
      <View style={styles.metricsRow}>
        {lot.approximateTotalWeightKg !== undefined && (
          <View style={styles.metric}>
            <Text style={styles.metricVal}>{lot.approximateTotalWeightKg} kg</Text>
            <Text style={styles.metricLbl}>{t('common.weight', 'Weight')}</Text>
          </View>
        )}
        <View style={styles.metricDiv} />
        <View style={styles.metric}>
          <Text style={styles.metricVal}>{condLabel}</Text>
          <Text style={styles.metricLbl}>{t('common.condition', 'Condition')}</Text>
        </View>
        {lot.distanceKm !== undefined && (
          <>
            <View style={styles.metricDiv} />
            <View style={styles.metric}>
              <Text style={styles.metricVal}>{lot.distanceKm.toFixed(1)} km</Text>
              <Text style={styles.metricLbl}>{t('common.distance', 'Distance')}</Text>
            </View>
          </>
        )}
      </View>

      {/* Info strip */}
      <View style={styles.infoStrip}>
        {lot.pickupAvailable && (
          <View style={styles.infoPill}>
            <AppIcon name="truck" size={12} color="rgba(255,255,255,0.65)" />
            <Text style={styles.infoPillText}>{t('collector.pickups', 'Pickup')}</Text>
          </View>
        )}
        {lot.offerCount !== undefined && lot.offerCount > 0 && (
          <View style={[styles.infoPill, styles.infoPillOffers]}>
            <Text style={[styles.infoPillText, { color: '#F59E0B' }]}>
              {t('recycler.offersCount', { count: lot.offerCount }, `${lot.offerCount} offer${lot.offerCount > 1 ? 's' : ''}`)}
            </Text>
          </View>
        )}
        {hasAsk && (
          <View style={[styles.infoPill, styles.infoPillAsk]}>
            <Text style={[styles.infoPillText, { color: '#10B981' }]}>
              {t('marketplace.askingPrice', 'Ask')} ₹{Number(lot.askingPrice).toLocaleString('en-IN')}/kg
            </Text>
          </View>
        )}
        {lot.location && (
          <View style={styles.locationRow}>
            <AppIcon name="location" size={12} color="rgba(255,255,255,0.35)" />
            <Text style={styles.locationText} numberOfLines={1}>{lot.location}</Text>
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.viewBtn}
          onPress={onView}
          accessibilityRole="button"
        >
          <Text style={styles.viewBtnText}>{t('recycler.viewLot', 'VIEW LOT')}</Text>
        </TouchableOpacity>
        {onOffer && (
          <TouchableOpacity
            style={styles.offerBtn}
            onPress={onOffer}
            accessibilityRole="button"
          >
            <Text style={styles.offerBtnText}>{t('recycler.makeOffer', 'MAKE OFFER')}</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  cardHighlighted: {
    borderColor: 'rgba(6,182,212,0.3)',
    backgroundColor: 'rgba(6,182,212,0.05)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  materialBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(34,211,238,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  materialText:  { flex: 1 },
  materialName:  { color: '#FFFFFF', fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  categoryName:  { color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: '600', marginTop: 1 },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  metric:    { flex: 1, alignItems: 'center' },
  metricVal: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  metricLbl: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '600', marginTop: 2 },
  metricDiv: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.08)' },
  infoStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  infoPillOffers: {
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderColor: 'rgba(245,158,11,0.2)',
  },
  infoPillAsk: {
    backgroundColor: 'rgba(16,185,129,0.08)',
    borderColor: 'rgba(16,185,129,0.2)',
  },
  infoPillText: { color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: '700' },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  locationText: { color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '500' },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  viewBtn: {
    flex: 1,
    backgroundColor: '#22D3EE',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    shadowColor: '#22D3EE',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  viewBtnText: { color: '#071E22', fontSize: 13, fontWeight: '900', letterSpacing: 0.4 },
  offerBtn: {
    flex: 1,
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.35)',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  offerBtnText: { color: '#10B981', fontSize: 13, fontWeight: '800', letterSpacing: 0.3 },
});

export default MaterialLotCard;
