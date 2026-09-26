/**
 * RecyclerHandoverConfirmScreen.tsx
 * Recycler Digital Handover Confirmation Screen
 * Canonical Reference: docs/25_SIH_26229_REQUIREMENTS.md Module 11 (SIH-HAND-002)
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
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useI18n } from '../../i18n';
import handoverService, { HandoverRecord } from '../../services/handoverService';
import networkService from '../../services/networkService';
import { AppIcon } from '../../components/ui/AppIcon';

export const RecyclerHandoverConfirmScreen: React.FC = () => {
  const { t } = useI18n();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();

  const { handoverId } = route.params || {};

  const [handover, setHandover] = useState<HandoverRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [weightKg, setWeightKg] = useState('');
  const [notes, setNotes] = useState('');

  const isOnline = networkService.isOnline();

  useEffect(() => {
    if (handoverId) {
      loadHandover(handoverId);
    }
  }, [handoverId]);

  const loadHandover = async (id: string) => {
    try {
      setLoading(true);
      const data = await handoverService.getHandoverById(id);
      setHandover(data);
      if (data.handoverWeightKg) {
        setWeightKg(String(data.handoverWeightKg));
      } else if (data.declaredWeightKg) {
        setWeightKg(String(data.declaredWeightKg));
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load handover');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReceipt = async () => {
    if (!isOnline) {
      Alert.alert(
        'Offline',
        t('handover.connectToInternet') || 'Connect to internet to confirm receipt.'
      );
      return;
    }

    const parsedWeight = parseFloat(weightKg);
    if (isNaN(parsedWeight) || parsedWeight <= 0) {
      Alert.alert('Invalid Weight', 'Please enter a valid measured weight (kg)');
      return;
    }

    try {
      setSubmitting(true);
      const updated = await handoverService.recyclerConfirm(handoverId, {
        handoverWeightKg: parsedWeight,
        notes,
      });

      Alert.alert(
        t('handover.recyclerConfirmed') || 'Receipt Confirmed',
        'You have digitally confirmed receipt of this material.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Confirmation Failed', err.message || 'Could not confirm receipt');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>{t('common.loading') || 'Loading handover details...'}</Text>
      </View>
    );
  }

  if (!handover) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{'Handover not found'}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('handover.confirmReceipt') || 'Confirm Material Receipt'}</Text>
        <Text style={styles.subtitle}>Ref: {handover.referenceNumber}</Text>
      </View>

      {/* Lot & Quote Details */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>{t('handover.title') || 'Material & Quote Terms'}</Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('handover.lotReference') || 'Lot Reference'}:</Text>
          <Text style={styles.infoValue}>{handover.materialLot?.referenceNumber}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('common.category') || 'Category'}:</Text>
          <Text style={styles.infoValue}>{handover.materialLot?.category}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('handover.declaredWeight') || 'Declared Weight'}:</Text>
          <Text style={styles.infoValue}>{handover.declaredWeightKg ? `${handover.declaredWeightKg} kg` : 'N/A'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('quotation.quotedRate') || 'Quoted Rate'}:</Text>
          <Text style={[styles.infoValue, { color: '#2563eb', fontWeight: 'bold' }]}>
            ₹{handover.quote?.quotedUnitPrice} / {handover.quote?.unit}
          </Text>
        </View>
      </View>

      {/* Actual Measured Scale Weight */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>{t('handover.confirmedWeight') || 'Facility Scale Weight'}</Text>
        <Text style={styles.cardDesc}>
          {t('handover.enterConfirmedWeight') || 'Verify or adjust the physical measured weight (kg) at your facility weighbridge/scale.'}
        </Text>

        <View style={styles.weightInputContainer}>
          <TextInput
            style={styles.weightInput}
            keyboardType="numeric"
            value={weightKg}
            onChangeText={setWeightKg}
            placeholder="0.00"
            editable={!handover.recyclerConfirmedAt}
          />
          <Text style={styles.weightUnit}>kg</Text>
        </View>
      </View>

      {/* Evidence Photos */}
      {handover.photos && handover.photos.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardHeader}>{t('handover.evidencePhotos') || 'Evidence Photos'}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
            {handover.photos.map((p) => (
              <Image key={p.id} source={{ uri: p.photoUrl }} style={styles.photoThumb} />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Recycler Remarks */}
      <View style={styles.card}>
        <Text style={styles.cardHeader}>{t('handover.notes') || 'Inspection Notes'}</Text>
        <TextInput
          style={styles.notesInput}
          multiline
          numberOfLines={3}
          value={notes}
          onChangeText={setNotes}
          placeholder={t('handover.notesPlaceholder') || 'e.g. Material received in good condition, seals verified.'}
          editable={!handover.recyclerConfirmedAt}
        />
      </View>

      {/* Disclaimer */}
      <View style={styles.disclaimerBox}>
        <View style={styles.rowCentered}>
          <AppIcon name="alertTriangle" size={14} color="#B45309" />
          <Text style={styles.disclaimerText}>
            {t('handover.legalDisclaimer') || 'Digital acknowledgment of material receipt only. Financial settlement occurs in the subsequent transaction phase.'}
          </Text>
        </View>
      </View>

      {/* Confirm Button */}
      <TouchableOpacity
        style={[styles.confirmBtn, (!isOnline || submitting || handover.recyclerConfirmedAt != null) && styles.btnDisabled]}
        onPress={handleConfirmReceipt}
        disabled={!isOnline || submitting || handover.recyclerConfirmedAt != null}
      >
        {submitting ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <View style={styles.btnRow}>
            <AppIcon name="check" size={16} color="#ffffff" />
            <Text style={styles.confirmBtnText}>
              {handover.recyclerConfirmedAt ? `Already Confirmed` : (t('handover.confirmReceipt') || 'Confirm Receipt')}
            </Text>
          </View>
        )}
      </TouchableOpacity>
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
  errorText: {
    fontSize: 16,
    color: '#ef4444',
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
    fontFamily: 'monospace',
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  weightUnit: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
    marginLeft: 8,
  },
  photoScroll: {
    flexDirection: 'row',
  },
  photoThumb: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 10,
    backgroundColor: '#e2e8f0',
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
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#fef08a',
  },
  disclaimerText: {
    fontSize: 12,
    color: '#854d0e',
    lineHeight: 18,
  },
  confirmBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  btnDisabled: {
    backgroundColor: '#94a3b8',
    elevation: 0,
  },
  confirmBtnText: {
    fontSize: 16,
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

export default RecyclerHandoverConfirmScreen;
