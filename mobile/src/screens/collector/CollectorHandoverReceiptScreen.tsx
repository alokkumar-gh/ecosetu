/**
 * CollectorHandoverReceiptScreen.tsx
 * Verifiable Digital Handover Receipt Screen
 * Canonical Reference: docs/25_SIH_26229_REQUIREMENTS.md Module 11 (SIH-HAND-007)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useI18n } from '../../i18n';
import handoverService, { HandoverReceipt } from '../../services/handoverService';
import voiceService from '../../services/voiceService';
import { ReportProblemModal } from '../../components/dispute/ReportProblemModal';

export const CollectorHandoverReceiptScreen: React.FC = () => {
  const { t, language } = useI18n();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();

  const { handoverId } = route.params || {};

  const [receipt, setReceipt] = useState<HandoverReceipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [problemModalVisible, setProblemModalVisible] = useState(false);

  useEffect(() => {
    if (handoverId) {
      loadReceipt(handoverId);
    }
  }, [handoverId]);

  const loadReceipt = async (id: string) => {
    try {
      setLoading(true);
      const data = await handoverService.getHandoverReceipt(id);
      setReceipt(data);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load handover receipt');
    } finally {
      setLoading(false);
    }
  };

  const handleSpeak = async () => {
    if (!receipt) return;
    const locale = language || 'en';
    const text = handoverService.generateHandoverSpeechText(receipt, locale);
    await voiceService.speak(text, { language: locale });
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return { bg: '#dcfce7', text: '#15803d', label: t('handover.handoverConfirmed') || 'CONFIRMED' };
      case 'COLLECTOR_CONFIRMED':
        return { bg: '#dbeafe', text: '#1d4ed8', label: t('handover.statusPendingRecycler') || 'PENDING RECYCLER' };
      case 'RECYCLER_CONFIRMED':
        return { bg: '#e0e7ff', text: '#4338ca', label: t('handover.statusPendingCollector') || 'PENDING COLLECTOR' };
      case 'CANCELLED':
        return { bg: '#fee2e2', text: '#b91c1c', label: t('handover.cancelled') || 'CANCELLED' };
      default:
        return { bg: '#f1f5f9', text: '#475569', label: 'PENDING' };
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#16a34a" />
        <Text style={styles.loadingText}>{t('common.loading') || 'Loading verifiable receipt...'}</Text>
      </View>
    );
  }

  if (!receipt) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{'Receipt not found'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => loadReceipt(handoverId)}>
          <Text style={styles.retryBtnText}>{t('common.retry') || 'Retry'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const badge = getStatusBadgeStyle(receipt.status);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Offline Stale Notice */}
      {receipt.isFromCache && (
        <View style={styles.cachedBanner}>
          <Text style={styles.cachedBannerText}>
            📦 {t('handover.cachedReceiptNotice') || 'Viewing cached offline receipt'}
            {receipt.cachedAt ? ` (Saved: ${new Date(receipt.cachedAt).toLocaleTimeString()})` : ''}
          </Text>
        </View>
      )}

      {/* Header Container */}
      <View style={styles.headerBox}>
        <View style={styles.topRow}>
          <Text style={styles.brandTitle}>ECOSETU</Text>
          <View style={[styles.badgeContainer, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
          </View>
        </View>

        <Text style={styles.docTitle}>{receipt.title}</Text>
        <Text style={styles.refNumber}>{receipt.referenceNumber}</Text>

        <View style={styles.speechRow}>
          <TouchableOpacity style={styles.speechBtn} onPress={handleSpeak}>
            <Text style={styles.speechBtnText}>🔊 {t('handover.speakDetails') || 'Listen to Receipt'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Two-Party Verification Cards */}
      <View style={styles.card}>
        <Text style={styles.cardSectionTitle}>{t('handover.transferStatus') || 'Parties & Verification'}</Text>

        {/* Collector Row */}
        <View style={styles.partyBox}>
          <View style={styles.partyHeaderRow}>
            <Text style={styles.partyRole}>{t('roles.collector') || 'Collector'}</Text>
            {receipt.confirmations.collector.confirmed ? (
              <Text style={styles.confirmedCheck}>✓ {t('handover.collectorConfirmed') || 'Confirmed'}</Text>
            ) : (
              <Text style={styles.pendingCheck}>⏳ {'Pending'}</Text>
            )}
          </View>
          <Text style={styles.partyName}>{receipt.collector.name}</Text>
          {receipt.collector.city && (
            <Text style={styles.partySub}>{receipt.collector.city}, {receipt.collector.state}</Text>
          )}
          {receipt.confirmations.collector.timestamp && (
            <Text style={styles.timestampText}>
              {new Date(receipt.confirmations.collector.timestamp).toLocaleString()}
            </Text>
          )}
        </View>

        {/* Recycler Row */}
        <View style={[styles.partyBox, { borderLeftColor: '#2563eb' }]}>
          <View style={styles.partyHeaderRow}>
            <Text style={[styles.partyRole, { color: '#2563eb' }]}>{t('roles.recycler') || 'Authorized Recycler'}</Text>
            {receipt.confirmations.recycler.confirmed ? (
              <Text style={styles.confirmedCheck}>✓ {t('handover.recyclerConfirmed') || 'Confirmed'}</Text>
            ) : (
              <Text style={styles.pendingCheck}>⏳ {'Pending'}</Text>
            )}
          </View>
          <Text style={styles.partyName}>{receipt.recycler.facilityName}</Text>
          {receipt.recycler.city && (
            <Text style={styles.partySub}>{receipt.recycler.city}, {receipt.recycler.state}</Text>
          )}
          {receipt.confirmations.recycler.timestamp && (
            <Text style={styles.timestampText}>
              {new Date(receipt.confirmations.recycler.timestamp).toLocaleString()}
            </Text>
          )}
        </View>
      </View>

      {/* Material & Commercial Terms */}
      <View style={styles.card}>
        <Text style={styles.cardSectionTitle}>{t('quotation.notes') || 'Material & Valuation'}</Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('handover.lotReference') || 'Lot Reference'}:</Text>
          <Text style={styles.infoValue}>{receipt.lotReference}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('common.category') || 'Category'}:</Text>
          <Text style={styles.infoValue}>{receipt.category} {receipt.subcategory ? `(${receipt.subcategory})` : ''}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('handover.declaredWeight') || 'Declared Weight'}:</Text>
          <Text style={styles.infoValue}>{receipt.declaredWeightKg != null ? `${receipt.declaredWeightKg} kg` : 'N/A'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('handover.confirmedWeight') || 'Confirmed Weight'}:</Text>
          <Text style={[styles.infoValue, { fontWeight: 'bold', color: '#16a34a' }]}>
            {receipt.confirmedWeightKg != null ? `${receipt.confirmedWeightKg} kg` : 'Pending'}
          </Text>
        </View>

        {receipt.weightVarianceKg != null && receipt.weightVarianceKg !== 0 && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('handover.weightVariance') || 'Variance'}:</Text>
            <Text style={[styles.infoValue, { color: receipt.weightVarianceKg < 0 ? '#dc2626' : '#2563eb' }]}>
              {receipt.weightVarianceKg > 0 ? `+${receipt.weightVarianceKg}` : receipt.weightVarianceKg} kg
              {receipt.weightVariancePercent != null ? ` (${receipt.weightVariancePercent}%)` : ''}
            </Text>
          </View>
        )}

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('quotation.quotedRate') || 'Accepted Rate'}:</Text>
          <Text style={styles.infoValue}>₹{receipt.quotedUnitPrice} / {receipt.unit}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('quotation.total') || 'Estimated Total'}:</Text>
          <Text style={[styles.infoValue, { fontSize: 16, fontWeight: 'bold', color: '#0f172a' }]}>
            {receipt.quotedTotal != null ? `₹${receipt.quotedTotal}` : 'N/A'}
          </Text>
        </View>
      </View>

      {/* Location Evidence */}
      <View style={styles.card}>
        <Text style={styles.cardSectionTitle}>{t('handover.locationStatus') || 'Location Evidence'}</Text>
        <View style={styles.locationRow}>
          <Text style={styles.locationStatusBadge}>
            {receipt.location.status === 'GPS_CAPTURED' ? `📍 ${t('handover.gpsCaptured') || 'GPS CAPTURED'}` : `⚠️ ${t('handover.gpsUnavailable') || 'GPS UNAVAILABLE'}`}
          </Text>
        </View>
        {receipt.location.latitude != null && receipt.location.longitude != null && (
          <Text style={styles.geoText}>
            Coordinates: {receipt.location.latitude.toFixed(6)}, {receipt.location.longitude.toFixed(6)}
            {receipt.location.accuracyMeters != null ? ` (±${receipt.location.accuracyMeters}m)` : ''}
          </Text>
        )}
      </View>

      {/* Photo Evidence */}
      {receipt.photos && receipt.photos.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>{t('handover.evidencePhotos') || 'Evidence Photographs'}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
            {receipt.photos.map((p) => (
              <View key={p.id} style={styles.photoContainer}>
                <Image source={{ uri: p.photoUrl }} style={styles.evidenceImage} />
                {p.caption && <Text style={styles.photoCaption}>{p.caption}</Text>}
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Compliance Box */}
      <View style={styles.complianceBox}>
        <Text style={styles.complianceTitle}>⚖️ {t('handover.legalDisclaimer') || 'Legal Transfer Acknowledgment'}</Text>
        <Text style={styles.complianceText}>{receipt.complianceDisclaimer}</Text>
        <Text style={[styles.complianceText, { marginTop: 6, fontStyle: 'italic' }]}>
          {receipt.traceabilityBasis}
        </Text>
      </View>

      {/* Record Sale / Payment Action */}
      {receipt.status === 'CONFIRMED' && (
        <TouchableOpacity
          style={styles.recordSaleBtn}
          onPress={() =>
            navigation.navigate('CollectorRecordSale', {
              handoverId: handoverId,
            })
          }
        >
          <Text style={styles.recordSaleBtnText}>💰 Record Sale / Payment</Text>
        </TouchableOpacity>
      )}

      {/* Report Handover Dispute Action */}
      <TouchableOpacity
        style={styles.disputeBtn}
        onPress={() => setProblemModalVisible(true)}
      >
        <Text style={styles.disputeBtnText}>🚨 Report Handover Problem / Weight Mismatch</Text>
      </TouchableOpacity>

      {/* Return Action */}
      <TouchableOpacity
        style={styles.doneBtn}
        onPress={() => navigation.navigate('CollectorLots')}
      >
        <Text style={styles.doneBtnText}>{t('common.back') || 'Back to Material Lots'}</Text>
      </TouchableOpacity>

      {receipt && (
        <ReportProblemModal
          visible={problemModalVisible}
          onClose={() => setProblemModalVisible(false)}
          materialLotId={(receipt as any).materialLotId || (route.params as any)?.materialLotId || (route.params as any)?.lotId || ''}
          handoverId={handoverId}
          initialDisputeType="HANDOVER_DISPUTE"
          estimatedWeightKg={receipt.declaredWeightKg ? Number(receipt.declaredWeightKg) : undefined}
          finalWeightKg={receipt.confirmedWeightKg ? Number(receipt.confirmedWeightKg) : undefined}
          onDisputeCreated={() => {
            navigation.navigate('CollectorDisputes');
          }}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#64748b',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    marginBottom: 12,
  },
  retryBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  retryBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  cachedBanner: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde047',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  cachedBannerText: {
    fontSize: 12,
    color: '#92400e',
    fontWeight: '500',
  },
  headerBox: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  brandTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#16a34a',
    letterSpacing: 2,
  },
  badgeContainer: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  docTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  refNumber: {
    fontSize: 14,
    color: '#64748b',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  speechRow: {
    marginTop: 12,
    flexDirection: 'row',
  },
  speechBtn: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#86efac',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  speechBtnText: {
    fontSize: 12,
    color: '#16a34a',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardSectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
  },
  partyBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#16a34a',
  },
  partyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  partyRole: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16a34a',
    textTransform: 'uppercase',
  },
  confirmedCheck: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#16a34a',
  },
  pendingCheck: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#d97706',
  },
  partyName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  partySub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  timestampText: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  infoLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 6,
  },
  locationRow: {
    marginBottom: 6,
  },
  locationStatusBadge: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  geoText: {
    fontSize: 12,
    color: '#475569',
    fontFamily: 'monospace',
  },
  photoScroll: {
    flexDirection: 'row',
  },
  photoContainer: {
    marginRight: 12,
  },
  evidenceImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
  },
  photoCaption: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  complianceBox: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fef08a',
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
  },
  complianceTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#854d0e',
    marginBottom: 4,
  },
  complianceText: {
    fontSize: 12,
    color: '#713f12',
    lineHeight: 18,
  },
  recordSaleBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#16a34a',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  recordSaleBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  disputeBtn: {
    backgroundColor: '#fff1f2',
    borderWidth: 1.5,
    borderColor: '#f43f5e',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  disputeBtnText: {
    color: '#e11d48',
    fontWeight: 'bold',
    fontSize: 15,
  },
  doneBtn: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 15,
  },
});

export default CollectorHandoverReceiptScreen;
