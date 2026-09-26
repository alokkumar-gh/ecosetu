/**
 * CollectorHandoverScreen.tsx
 * Collector Digital Handover Initiation & Confirmation Screen
 * Canonical Reference: docs/25_SIH_26229_REQUIREMENTS.md Module 11 (SIH-HAND-001..007)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useI18n } from '../../i18n';
import handoverService, { HandoverRecord } from '../../services/handoverService';
import { getCurrentLocation } from '../../services/locationService';
import networkService from '../../services/networkService';
import voiceService from '../../services/voiceService';
import { QuickNumberStepper } from '../../components/common/QuickNumberStepper';
import { AppIcon } from '../../components/ui/AppIcon';

export const CollectorHandoverScreen: React.FC = () => {
  const { t, language } = useI18n();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();

  const { lotId, quoteId, lot, quote, handoverId } = route.params || {};

  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [existingHandover, setExistingHandover] = useState<HandoverRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [weightKg, setWeightKg] = useState('');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [locationStatus, setLocationStatus] = useState<'IDLE' | 'CAPTURING' | 'CAPTURED' | 'UNAVAILABLE'>('IDLE');
  const [coords, setCoords] = useState<{ latitude: number; longitude: number; accuracy?: number } | null>(null);

  const isOnline = networkService.isOnline();
  const declaredWeight = lot?.approximateTotalWeightKg ? Number(lot.approximateTotalWeightKg) : (existingHandover?.declaredWeightKg || null);

  useEffect(() => {
    if (handoverId) {
      fetchExistingHandover(handoverId);
    } else if (lot?.approximateTotalWeightKg) {
      setWeightKg(String(lot.approximateTotalWeightKg));
    }
  }, [handoverId]);

  const fetchExistingHandover = async (id: string) => {
    try {
      setLoading(true);
      const hdo = await handoverService.getHandoverById(id);
      setExistingHandover(hdo);
      if (hdo.handoverWeightKg) {
        setWeightKg(String(hdo.handoverWeightKg));
      }
      if (hdo.latitude && hdo.longitude) {
        setCoords({
          latitude: Number(hdo.latitude),
          longitude: Number(hdo.longitude),
          accuracy: hdo.locationAccuracyMeters ? Number(hdo.locationAccuracyMeters) : undefined,
        });
        setLocationStatus('CAPTURED');
      } else {
        setLocationStatus('UNAVAILABLE');
      }
      if (hdo.photos && hdo.photos.length > 0) {
        setPhotos(hdo.photos.map((p) => p.photoUrl));
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load handover');
    } finally {
      setLoading(false);
    }
  };

  const handleCaptureLocation = async () => {
    try {
      setLocationStatus('CAPTURING');
      const locResult = await getCurrentLocation();
      if (locResult.success && locResult.coords) {
        setCoords({
          latitude: locResult.coords.latitude,
          longitude: locResult.coords.longitude,
          accuracy: locResult.coords.accuracy ?? undefined,
        });
        setLocationStatus('CAPTURED');
      } else {
        setLocationStatus('UNAVAILABLE');
        Alert.alert(
          t('handover.gpsUnavailable') || 'Location Unavailable',
          'GPS signal could not be captured. You may proceed without location coordinates.'
        );
      }
    } catch (e) {
      setLocationStatus('UNAVAILABLE');
    }
  };

  const handleStartOrConfirm = () => {
    if (!isOnline) {
      Alert.alert(
        'Offline',
        t('handover.connectToInternet') || 'Connect to internet to initiate or confirm material handover.'
      );
      return;
    }

    const parsedWeight = parseFloat(weightKg);
    if (isNaN(parsedWeight) || parsedWeight <= 0) {
      Alert.alert(t('handover.invalidWeightTitle'), t('handover.invalidWeightMsg'));
      return;
    }

    setConfirmModalVisible(true);
  };

  const executeHandoverConfirm = async () => {
    const parsedWeight = parseFloat(weightKg);
    if (isNaN(parsedWeight) || parsedWeight <= 0) return;

    try {
      setSubmitting(true);
      if (existingHandover) {
        // Confirm existing handover
        const updated = await handoverService.collectorConfirm(existingHandover.id, {
          handoverWeightKg: parsedWeight,
          latitude: coords?.latitude,
          longitude: coords?.longitude,
          locationAccuracyMeters: coords?.accuracy,
          notes,
          photos: photos.map((url) => ({ photoUrl: url, caption: 'COLLECTOR_EVIDENCE' })),
        });

        setExistingHandover(updated);
        setConfirmModalVisible(false);

        Alert.alert(
          t('handover.handoverConfirmed'),
          `Handover ${updated.referenceNumber} has been confirmed.`,
          [
            {
              text: t('common.done'),
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        // Initiate new handover
        const created = await handoverService.createHandover({
          materialLotId: lot.id,
          quoteId: quote?.id,
          handoverWeightKg: parsedWeight,
          latitude: coords?.latitude,
          longitude: coords?.longitude,
          locationAccuracyMeters: coords?.accuracy,
          notes,
          photos: photos.map((url) => ({ photoUrl: url, caption: 'COLLECTOR_EVIDENCE' })),
        });

        setExistingHandover(created);
        setConfirmModalVisible(false);

        Alert.alert(
          t('handover.startHandover'),
          `Digital Handover ${created.referenceNumber} initiated successfully. Awaiting recycler confirmation.`,
          [
            {
              text: t('common.done'),
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (err: any) {
      setConfirmModalVisible(false);
      Alert.alert(t('common.error'), err.message || t('handover.invalidWeightMsg'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSpeak = async () => {
    const locale = language || 'en';
    const fakeReceipt: any = {
      referenceNumber: existingHandover?.referenceNumber || lot?.referenceNumber || '',
      category: lot?.category || '',
      declaredWeightKg: declaredWeight || 0,
      confirmedWeightKg: parseFloat(weightKg) || declaredWeight || 0,
      recycler: existingHandover?.recycler || quote?.recycler,
      status: existingHandover?.status || 'PENDING',
    };
    const text = handoverService.generateHandoverSpeechText(fakeReceipt, locale);
    await voiceService.speak(text, { language: locale });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#16a34a" />
        <Text style={styles.loadingText}>{t('common.loading') || 'Loading handover details...'}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header with TTS */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t('handover.digitalHandover') || 'Digital Handover'}</Text>
          <Text style={styles.subtitle}>
            {existingHandover ? `Ref: ${existingHandover.referenceNumber}` : (t('handover.title') || 'Record Material Transfer')}
          </Text>
        </View>
        <TouchableOpacity style={styles.speechBtn} onPress={handleSpeak}>
          <View style={styles.btnRow}>
            <AppIcon name="volume2" size={14} color="#0D9488" />
            <Text style={styles.speechBtnText}>{t('common.listen') || 'Listen'}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {!isOnline && (
        <View style={styles.offlineBanner}>
          <View style={styles.rowCentered}>
            <AppIcon name="alertTriangle" size={14} color="#D97706" />
            <Text style={styles.offlineBannerText}>
              {t('handover.connectToInternet') || 'You are currently offline. Connect to internet to confirm handover.'}
            </Text>
          </View>
        </View>
      )}

      {/* Lot & Quote Commercial Basis */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>{t('quotation.notes') || 'Commercial Transfer Terms'}</Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('handover.lotReference') || 'Lot Reference'}:</Text>
          <Text style={styles.infoValue}>{lot?.referenceNumber || existingHandover?.materialLot?.referenceNumber || 'N/A'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('common.category') || 'Material'}:</Text>
          <Text style={styles.infoValue}>{lot?.category || existingHandover?.materialLot?.category}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('handover.declaredWeight') || 'Declared Lot Weight'}:</Text>
          <Text style={styles.infoValue}>{declaredWeight != null ? `${declaredWeight} kg` : 'N/A'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('quotation.quotedRate') || 'Accepted Rate'}:</Text>
          <Text style={[styles.infoValue, { color: '#16a34a', fontWeight: 'bold' }]}>
            ₹{quote?.quotedUnitPrice || existingHandover?.quote?.quotedUnitPrice} / {quote?.unit || existingHandover?.quote?.unit || 'PER_KG'}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('quotation.total') || 'Estimated Total'}:</Text>
          <Text style={[styles.infoValue, { color: '#16a34a', fontWeight: 'bold' }]}>
            ₹{quote?.quotedTotal || existingHandover?.quote?.quotedTotal || 'N/A'}
          </Text>
        </View>
      </View>

      {/* Handover Weight Entry (SIH-LIT-008, SIH-LIT-009) */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>{t('handover.confirmedWeight') || 'Handover Measured Weight'}</Text>
        <Text style={styles.cardDesc}>
          {t('handover.enterConfirmedWeight') || 'Enter the actual physical weight measured at the handover scale. Both declared and actual weight will be preserved.'}
        </Text>

        <QuickNumberStepper
          value={parseFloat(weightKg) || 0}
          onChange={(val) => setWeightKg(val > 0 ? String(val) : '')}
          unit="kg"
          presets={[5, 10, 25, 50]}
          min={0}
          max={10000}
          step={1}
          accessibilityLabel={t('handover.confirmedWeight')}
        />

        {declaredWeight != null && weightKg && parseFloat(weightKg) !== declaredWeight && (
          <View style={styles.varianceNotice}>
            <Text style={styles.varianceText}>
              Variance: {(parseFloat(weightKg) - declaredWeight).toFixed(2)} kg ({(((parseFloat(weightKg) - declaredWeight) / declaredWeight) * 100).toFixed(1)}%)
            </Text>
          </View>
        )}
      </View>

      {/* GPS Location Evidence */}
      <View style={styles.card}>
        <View style={styles.locationHeaderRow}>
          <Text style={styles.cardHeader}>{t('handover.locationStatus') || 'Location Evidence'}</Text>
          <TouchableOpacity
            style={[styles.gpsBtn, locationStatus === 'CAPTURED' && styles.gpsBtnCaptured]}
            onPress={handleCaptureLocation}
            disabled={locationStatus === 'CAPTURING'}
          >
            <View style={styles.btnRow}>
              <AppIcon
                name={locationStatus === 'CAPTURING' ? 'clock' : locationStatus === 'CAPTURED' ? 'check' : 'mapPin'}
                size={14}
                color={locationStatus === 'CAPTURED' ? '#166534' : '#ffffff'}
              />
              <Text style={styles.gpsBtnText}>
                {locationStatus === 'CAPTURING'
                  ? 'Acquiring GPS...'
                  : locationStatus === 'CAPTURED'
                  ? (t('handover.gpsCaptured') || 'GPS Captured')
                  : (t('handover.gpsCaptured') || 'Capture GPS')}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {coords ? (
          <View style={styles.coordsContainer}>
            <Text style={styles.coordsText}>
              Lat: {coords.latitude.toFixed(6)}, Lng: {coords.longitude.toFixed(6)}
            </Text>
            {coords.accuracy != null && (
              <Text style={styles.coordsAccuracy}>Accuracy: ±{coords.accuracy.toFixed(0)}m</Text>
            )}
          </View>
        ) : (
          <Text style={styles.gpsMutedText}>
            {locationStatus === 'UNAVAILABLE'
              ? (t('handover.gpsUnavailable') || 'GPS Unavailable — will be recorded without coordinates.')
              : 'Tap "Capture GPS" to attach verifiable geolocation evidence.'}
          </Text>
        )}
      </View>

      {/* Notes / Remarks */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>{t('handover.notes') || 'Transfer Notes / Conditions'}</Text>
        <TextInput
          style={styles.notesInput}
          multiline
          numberOfLines={3}
          value={notes}
          onChangeText={setNotes}
          placeholder={t('handover.notesPlaceholder') || 'e.g. Verified packaging condition, weight recorded on calibrated platform scale.'}
          editable={!existingHandover?.collectorConfirmedAt}
        />
      </View>

      {/* Compliance Disclaimer */}
      <View style={styles.disclaimerBox}>
        <View style={[styles.rowCentered, { marginBottom: 4 }]}>
          <AppIcon name="shieldCheck" size={16} color="#0369a1" />
          <Text style={styles.disclaimerTitle}>{t('handover.legalDisclaimer') || 'Legal & Economic Confirmation'}</Text>
        </View>
        <Text style={styles.disclaimerText}>
          {t('handover.legalDisclaimer') ||
            'This digital handover record verifies that the physical material has been handed over to the authorized recycler. This record DOES NOT process payment or confirm recycling completion.'}
        </Text>
      </View>

      {/* Action Button */}
      <TouchableOpacity
        style={[styles.submitBtn, (!isOnline || submitting) && styles.submitBtnDisabled]}
        onPress={handleStartOrConfirm}
        disabled={!isOnline || submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <View style={styles.btnRow}>
            <AppIcon name="check" size={18} color="#ffffff" />
            <Text style={styles.submitBtnText}>
              {existingHandover ? (t('handover.confirmHandover') || 'Confirm Material Handover') : (t('handover.startHandover') || 'Start & Confirm Handover')}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Handover Confirmation Modal - UX Rule 7 */}
      <Modal
        visible={confirmModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setConfirmModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={[styles.rowCentered, { marginBottom: 6 }]}>
              <AppIcon name="users" size={20} color="#0f172a" />
              <Text style={styles.modalTitle}>{t('lowLiteracy.handoverConfirmTitle') || 'Confirm Material Handover'}</Text>
            </View>
            <Text style={styles.modalMessage}>
              {t('lowLiteracy.handoverConfirmMessage') || 'Please check the measured scale weight and buyer details before confirming.'}
            </Text>

            <View style={styles.modalSummaryBox}>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>{t('lowLiteracy.handoverRef')}:</Text>
                <Text style={styles.confirmValue}>{existingHandover?.referenceNumber || lot?.referenceNumber || 'New Handover'}</Text>
              </View>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>{t('lowLiteracy.buyer')}:</Text>
                <Text style={styles.confirmValue}>
                  {(quote as any)?.recycler?.facilityName || (existingHandover as any)?.quote?.recycler?.facilityName || 'Authorized Recycler'}
                </Text>
              </View>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>{t('lowLiteracy.category')}:</Text>
                <Text style={styles.confirmValue}>{lot?.category || existingHandover?.materialLot?.category || 'E-Waste'}</Text>
              </View>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>{t('lowLiteracy.weight')}:</Text>
                <Text style={[styles.confirmValue, { fontSize: 16, color: '#16a34a', fontWeight: '800' }]}>
                  {parseFloat(weightKg) || 0} kg
                </Text>
              </View>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>{t('lowLiteracy.locationStatus')}:</Text>
                <View style={styles.rowCentered}>
                  <AppIcon
                    name={locationStatus === 'CAPTURED' ? 'check' : 'alertTriangle'}
                    size={14}
                    color={locationStatus === 'CAPTURED' ? '#16a34a' : '#d97706'}
                  />
                  <Text style={styles.confirmValue}>
                    {locationStatus === 'CAPTURED' ? (t('handover.gpsCaptured') || 'Captured') : (t('handover.gpsUnavailable') || 'Unavailable')}
                  </Text>
                </View>
              </View>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>{t('lowLiteracy.photoCount')}:</Text>
                <Text style={styles.confirmValue}>{photos.length} photos</Text>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setConfirmModalVisible(false)}
                disabled={submitting}
                accessibilityRole="button"
              >
                <Text style={styles.modalCancelBtnText}>{t('lowLiteracy.cancelAction') || 'Cancel'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={executeHandoverConfirm}
                disabled={submitting}
                accessibilityRole="button"
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <View style={styles.btnRow}>
                    <AppIcon name="check" size={16} color="#ffffff" />
                    <Text style={styles.modalConfirmBtnText}>
                      {t('lowLiteracy.confirmHandoverAction') || 'Confirm Handover'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  speechBtn: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#86efac',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    minHeight: 48,
    minWidth: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  speechBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#16a34a',
  },
  offlineBanner: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde047',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  offlineBannerText: {
    fontSize: 13,
    color: '#92400e',
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  cardDesc: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 12,
    lineHeight: 18,
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
  weightInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  weightInput: {
    flex: 1,
    fontSize: 26,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  weightUnit: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
    marginLeft: 8,
  },
  varianceNotice: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 6,
  },
  varianceText: {
    fontSize: 13,
    color: '#1d4ed8',
    fontWeight: '500',
  },
  locationHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  gpsBtn: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gpsBtnCaptured: {
    backgroundColor: '#dcfce7',
  },
  gpsBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
  },
  coordsContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
  },
  coordsText: {
    fontSize: 13,
    color: '#1e293b',
    fontFamily: 'monospace',
  },
  coordsAccuracy: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  gpsMutedText: {
    fontSize: 13,
    color: '#94a3b8',
    fontStyle: 'italic',
    marginTop: 4,
  },
  notesInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#0f172a',
    textAlignVertical: 'top',
  },
  disclaimerBox: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fef08a',
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
  },
  disclaimerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#854d0e',
    marginBottom: 6,
  },
  disclaimerText: {
    fontSize: 12,
    color: '#713f12',
    lineHeight: 18,
  },
  submitBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 12,
    paddingVertical: 16,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#16a34a',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
  submitBtnDisabled: {
    backgroundColor: '#94a3b8',
    elevation: 0,
  },
  submitBtnText: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 380,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 6,
  },
  modalMessage: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 16,
    lineHeight: 18,
  },
  modalSummaryBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  confirmLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  confirmValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    textAlign: 'right',
    flexShrink: 1,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancelBtn: {
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  modalConfirmBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 140,
  },
  modalConfirmBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  rowCentered: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});

export default CollectorHandoverScreen;
