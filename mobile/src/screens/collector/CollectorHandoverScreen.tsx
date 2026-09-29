/**
 * CollectorHandoverScreen.tsx
 * Collector Digital Handover Initiation & Confirmation Screen
 * Canonical Reference: docs/25_SIH_26229_REQUIREMENTS.md Module 11 (SIH-HAND-001..007)
 *
 * Visually aligned to ECOSETU Collector Dark Glassmorphic Design System.
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
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useI18n } from '../../i18n';
import handoverService, { HandoverRecord } from '../../services/handoverService';
import { getCurrentLocation } from '../../services/locationService';
import networkService from '../../services/networkService';
import voiceService from '../../services/voiceService';
import { QuickNumberStepper } from '../../components/common/QuickNumberStepper';
import { AppIcon } from '../../components/ui/AppIcon';
import { EcoSetuBackground } from '../../components/glass/EcoSetuBackground';
import { TopAppBar } from '../../components/layout/TopAppBar';
import { OfflineBanner } from '../../components/common/OfflineBanner';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

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
      Alert.alert(t('common.error') || 'Error', err.message || 'Failed to load handover');
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
      Alert.alert(t('handover.invalidWeightTitle') || 'Invalid Weight', t('handover.invalidWeightMsg') || 'Please enter a valid weight.');
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
          t('handover.handoverConfirmed') || 'Handover Confirmed',
          `Handover ${updated.referenceNumber} has been confirmed.`,
          [
            {
              text: t('common.done') || 'Done',
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
          t('handover.startHandover') || 'Handover Initiated',
          `Digital Handover ${created.referenceNumber} initiated successfully. Awaiting recycler confirmation.`,
          [
            {
              text: t('common.done') || 'Done',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (err: any) {
      setConfirmModalVisible(false);
      Alert.alert(t('common.error') || 'Error', err.message || t('handover.invalidWeightMsg'));
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
      <EcoSetuBackground>
        <SafeAreaView style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{t('common.loading') || 'Loading handover details...'}</Text>
        </SafeAreaView>
      </EcoSetuBackground>
    );
  }

  return (
    <EcoSetuBackground>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <TopAppBar
          title={t('handover.digitalHandover') || 'Digital Handover'}
          subtitle={existingHandover ? `Ref: ${existingHandover.referenceNumber}` : (t('handover.title') || 'Record Material Transfer')}
          showBack
          onBack={() => navigation.goBack()}
        />

        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          {/* Top toolbar */}
          <View style={styles.topActionBar}>
            <View style={styles.refBadge}>
              <AppIcon name="package" size={13} color={colors.secondaryLight} />
              <Text style={styles.refBadgeText}>
                {lot?.referenceNumber || existingHandover?.materialLot?.referenceNumber || 'Handover'}
              </Text>
            </View>

            <TouchableOpacity style={styles.speechBtn} onPress={handleSpeak} accessibilityRole="button">
              <View style={styles.btnRow}>
                <AppIcon name="volume2" size={14} color={colors.primary} />
                <Text style={styles.speechBtnText}>{t('common.listen') || 'Listen'}</Text>
              </View>
            </TouchableOpacity>
          </View>

          {!isOnline && (
            <View style={{ marginBottom: 14 }}>
              <OfflineBanner />
            </View>
          )}

          {/* Lot & Quote Commercial Basis */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <AppIcon name="fileText" size={16} color={colors.primary} />
              <Text style={styles.cardHeader}>{t('quotation.notes') || 'Commercial Transfer Terms'}</Text>
            </View>

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
              <Text style={[styles.infoValue, { color: colors.primaryLight, fontWeight: '800' }]}>
                ₹{quote?.quotedUnitPrice || existingHandover?.quote?.quotedUnitPrice || '—'} / {quote?.unit || existingHandover?.quote?.unit || 'PER_KG'}
              </Text>
            </View>

            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.infoLabel}>{t('quotation.total') || 'Estimated Total'}:</Text>
              <Text style={[styles.infoValue, { color: colors.primaryLight, fontWeight: '800' }]}>
                ₹{quote?.quotedTotal || existingHandover?.quote?.quotedTotal || 'N/A'}
              </Text>
            </View>
          </View>

          {/* Handover Weight Entry (SIH-LIT-008, SIH-LIT-009) */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <AppIcon name="scale" size={16} color={colors.primary} />
              <Text style={styles.cardHeader}>{t('handover.confirmedWeight') || 'Handover Measured Weight'}</Text>
            </View>
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
                <AppIcon name="alertTriangle" size={14} color="#FBBF24" style={{ marginRight: 6 }} />
                <Text style={styles.varianceText}>
                  Variance: {(parseFloat(weightKg) - declaredWeight).toFixed(2)} kg ({(((parseFloat(weightKg) - declaredWeight) / declaredWeight) * 100).toFixed(1)}%)
                </Text>
              </View>
            )}
          </View>

          {/* GPS Location Evidence */}
          <View style={styles.card}>
            <View style={styles.locationHeaderRow}>
              <View style={styles.cardHeaderRow}>
                <AppIcon name="mapPin" size={16} color={colors.primary} />
                <Text style={styles.cardHeader}>{t('handover.locationStatus') || 'Location Evidence'}</Text>
              </View>
              <TouchableOpacity
                style={[styles.gpsBtn, locationStatus === 'CAPTURED' && styles.gpsBtnCaptured]}
                onPress={handleCaptureLocation}
                disabled={locationStatus === 'CAPTURING'}
              >
                <View style={styles.btnRow}>
                  <AppIcon
                    name={locationStatus === 'CAPTURING' ? 'clock' : locationStatus === 'CAPTURED' ? 'check' : 'mapPin'}
                    size={14}
                    color={locationStatus === 'CAPTURED' ? '#071E22' : colors.primaryLight}
                  />
                  <Text style={[styles.gpsBtnText, locationStatus === 'CAPTURED' && styles.gpsBtnTextCaptured]}>
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
            <View style={styles.cardHeaderRow}>
              <AppIcon name="edit" size={16} color={colors.primary} />
              <Text style={styles.cardHeader}>{t('handover.notes') || 'Transfer Notes / Conditions'}</Text>
            </View>
            <TextInput
              style={styles.notesInput}
              multiline
              numberOfLines={3}
              value={notes}
              onChangeText={setNotes}
              placeholder={t('handover.notesPlaceholder') || 'e.g. Verified packaging condition, weight recorded on calibrated platform scale.'}
              placeholderTextColor="rgba(255, 255, 255, 0.35)"
              editable={!existingHandover?.collectorConfirmedAt}
            />
          </View>

          {/* Compliance Disclaimer */}
          <View style={styles.disclaimerBox}>
            <View style={[styles.rowCentered, { marginBottom: 6 }]}>
              <AppIcon name="shieldCheck" size={16} color={colors.secondaryLight} />
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
            accessibilityRole="button"
          >
            {submitting ? (
              <ActivityIndicator color="#071E22" />
            ) : (
              <View style={styles.btnRow}>
                <AppIcon name="check" size={18} color="#071E22" strokeWidth={2.5} />
                <Text style={styles.submitBtnText}>
                  {existingHandover ? (t('handover.confirmHandover') || 'Confirm Material Handover') : (t('handover.startHandover') || 'Start & Confirm Handover')}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Handover Confirmation Modal - UX Rule 7 */}
        <Modal
          visible={confirmModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setConfirmModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={[styles.rowCentered, { marginBottom: 8 }]}>
                <AppIcon name="users" size={20} color={colors.primaryLight} />
                <Text style={styles.modalTitle}>{t('lowLiteracy.handoverConfirmTitle') || 'Confirm Material Handover'}</Text>
              </View>
              <Text style={styles.modalMessage}>
                {t('lowLiteracy.handoverConfirmMessage') || 'Please check the measured scale weight and buyer details before confirming.'}
              </Text>

              <View style={styles.modalSummaryBox}>
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>{t('lowLiteracy.handoverRef') || 'Reference'}:</Text>
                  <Text style={styles.confirmValue}>{existingHandover?.referenceNumber || lot?.referenceNumber || 'New Handover'}</Text>
                </View>
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>{t('lowLiteracy.buyer') || 'Buyer'}:</Text>
                  <Text style={styles.confirmValue}>
                    {(quote as any)?.recycler?.facilityName || (existingHandover as any)?.quote?.recycler?.facilityName || 'Authorized Recycler'}
                  </Text>
                </View>
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>{t('lowLiteracy.category') || 'Category'}:</Text>
                  <Text style={styles.confirmValue}>{lot?.category || existingHandover?.materialLot?.category || 'E-Waste'}</Text>
                </View>
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>{t('lowLiteracy.weight') || 'Weight'}:</Text>
                  <Text style={[styles.confirmValue, { fontSize: 16, color: colors.primaryLight, fontWeight: '800' }]}>
                    {parseFloat(weightKg) || 0} kg
                  </Text>
                </View>
                <View style={styles.confirmRow}>
                  <Text style={styles.confirmLabel}>{t('lowLiteracy.locationStatus') || 'Location'}:</Text>
                  <View style={styles.rowCentered}>
                    <AppIcon
                      name={locationStatus === 'CAPTURED' ? 'check' : 'alertTriangle'}
                      size={14}
                      color={locationStatus === 'CAPTURED' ? colors.primaryLight : '#FBBF24'}
                    />
                    <Text style={styles.confirmValue}>
                      {locationStatus === 'CAPTURED' ? (t('handover.gpsCaptured') || 'Captured') : (t('handover.gpsUnavailable') || 'Unavailable')}
                    </Text>
                  </View>
                </View>
                <View style={[styles.confirmRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.confirmLabel}>{t('lowLiteracy.photoCount') || 'Evidence'}:</Text>
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
                    <ActivityIndicator color="#071E22" />
                  ) : (
                    <View style={styles.btnRow}>
                      <AppIcon name="check" size={16} color="#071E22" strokeWidth={2.5} />
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
      </SafeAreaView>
    </EcoSetuBackground>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
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
    color: colors.textSecondary,
    fontWeight: '500',
  },
  topActionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  refBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  refBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.secondaryLight,
    letterSpacing: 0.3,
  },
  speechBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  speechBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  card: {
    backgroundColor: colors.glassFill,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  cardHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cardDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 14,
    lineHeight: 18,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  infoLabel: {
    fontSize: 13,
    color: colors.textTertiary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  varianceNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    padding: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 10,
  },
  varianceText: {
    fontSize: 12,
    color: '#FBBF24',
    fontWeight: '600',
    flex: 1,
  },
  locationHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  gpsBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gpsBtnCaptured: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  gpsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryLight,
  },
  gpsBtnTextCaptured: {
    color: '#071E22',
  },
  coordsContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: 10,
    padding: 10,
    marginTop: 6,
  },
  coordsText: {
    fontSize: 13,
    color: colors.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  coordsAccuracy: {
    fontSize: 12,
    color: colors.primaryLight,
    marginTop: 2,
  },
  gpsMutedText: {
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: 4,
  },
  notesInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: colors.textPrimary,
    textAlignVertical: 'top',
    minHeight: 70,
  },
  disclaimerBox: {
    backgroundColor: 'rgba(6, 182, 212, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.25)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  disclaimerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.secondaryLight,
  },
  disclaimerText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
  },
  submitBtnDisabled: {
    opacity: 0.4,
    elevation: 0,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#071E22',
    letterSpacing: 0.3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.glassOverlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#0A1A22',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  modalMessage: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },
  modalSummaryBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    marginBottom: 18,
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  confirmLabel: {
    fontSize: 13,
    color: colors.textTertiary,
  },
  confirmValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'right',
    flexShrink: 1,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancelBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modalConfirmBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  modalConfirmBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#071E22',
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
