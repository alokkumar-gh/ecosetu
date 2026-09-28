/**
 * EcoSetu Recycler Rates Screen
 * Authenticated Formal Recycler — Manage My Buying Rates
 * Canonical Reference: docs/25_SIH_26229_REQUIREMENTS.md Module 8 (SIH-RATE-001..004)
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useI18n } from '../../i18n';
import { EcoSetuBackground } from '../../components/eco';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { AppIcon } from '../../components/ui/AppIcon';
import { apiClient } from '../../services/apiClient';
import { networkService } from '../../services/networkService';

interface OfferedRate {
  id: string;
  category: string;
  subcategory?: string | null;
  rate: number;
  unit: string;
  currency: string;
  serviceArea?: string | null;
  status: string;
  sourceReference?: string | null;
  effectiveDate: string;
}

const CATEGORY_OPTIONS = [
  'MOBILE_PHONE',
  'LAPTOP',
  'DESKTOP_COMPUTER',
  'PCB',
  'CABLE',
  'BATTERY',
  'MONITOR',
  'PRINTER',
  'KEYBOARD_MOUSE',
  'CRT',
  'OTHER',
];

export const RecyclerRatesScreen: React.FC = () => {
  const { t } = useI18n();
  const navigation = useNavigation<any>();

  const [rates, setRates] = useState<OfferedRate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Modal state for Add/Edit
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [editingRate, setEditingRate] = useState<OfferedRate | null>(null);
  const [category, setCategory] = useState<string>('MOBILE_PHONE');
  const [subcategory, setSubcategory] = useState<string>('');
  const [rateValue, setRateValue] = useState<string>('');
  const [unit, setUnit] = useState<string>('PER_KG');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const fetchRates = useCallback(async () => {
    try {
      setError(null);
      const res = await apiClient.get('/recyclers/rates');
      const data = res?.data?.data || res?.data || res;
      setRates(data.rates || []);
    } catch (err: any) {
      console.warn('Failed to load recycler rates:', err);
      setError(err.message || 'Failed to fetch offered rates');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRates();
  };

  const handleOpenAddModal = () => {
    setEditingRate(null);
    setCategory('MOBILE_PHONE');
    setSubcategory('');
    setRateValue('');
    setUnit('PER_KG');
    setModalVisible(true);
  };

  const handleOpenEditModal = (item: OfferedRate) => {
    setEditingRate(item);
    setCategory(item.category);
    setSubcategory(item.subcategory || '');
    setRateValue(String(item.rate));
    setUnit(item.unit || 'PER_KG');
    setModalVisible(true);
  };

  const handleSaveRate = async () => {
    const numRate = parseFloat(rateValue);
    if (isNaN(numRate) || numRate <= 0) {
      Alert.alert(t('common.error') || 'Error', 'Please enter a strictly positive rate number');
      return;
    }

    if (!networkService.isOnline()) {
      Alert.alert(t('common.offline') || 'Offline', 'Internet connection required to update rates.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingRate) {
        // Update existing rate
        await apiClient.patch(`/recyclers/rates/${editingRate.id}`, {
          rate: numRate,
          unit,
          sourceReference: 'Recycler Direct Offer Update',
        });
        Alert.alert(t('common.success') || 'Success', 'Offered rate updated successfully');
      } else {
        // Create new rate
        await apiClient.post('/recyclers/rates', {
          category,
          subcategory: subcategory.trim() || undefined,
          rate: numRate,
          unit,
          sourceReference: 'Recycler Direct Offer',
        });
        Alert.alert(t('common.success') || 'Success', 'New buying rate created successfully');
      }
      setModalVisible(false);
      fetchRates();
    } catch (err: any) {
      Alert.alert(t('common.error') || 'Error', err.message || 'Failed to save rate');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivateRate = (item: OfferedRate) => {
    Alert.alert(
      'Deactivate Rate',
      `Are you sure you want to deactivate buying rate for ${item.category}? (History will be preserved)`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.delete(`/recyclers/rates/${item.id}`);
              Alert.alert('Success', 'Rate deactivated successfully');
              fetchRates();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to deactivate rate');
            }
          },
        },
      ]
    );
  };

  return (
    <EcoSetuBackground>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
          >
            <Text style={styles.backButtonText}>← {t('common.back') || 'Back'}</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>My Buying Rates</Text>
            <Text style={styles.headerSubtitle}>Managed by authenticated formal recycler</Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={handleOpenAddModal}>
            <Text style={styles.addButtonText}>+ Add Rate</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#10B981']} tintColor="#10B981" />}
        >
          {loading && !refreshing ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color="#10B981" />
              <Text style={styles.loadingText}>Loading rates...</Text>
            </View>
          ) : null}

          {error ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={fetchRates}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {!loading && !error && rates.length === 0 ? (
            <View style={styles.emptyCard}>
              <AppIcon name="tag" size={40} color="#64748B" style={{ marginBottom: 8 }} />
              <Text style={styles.emptyTitle}>No Active Buying Rates</Text>
              <Text style={styles.emptySubtitle}>
                Add rates per material category to let collectors know what you pay per kg.
              </Text>
              <TouchableOpacity style={styles.createBtn} onPress={handleOpenAddModal}>
                <Text style={styles.createBtnText}>+ Add First Rate</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {!loading && !error && rates.map((item) => (
            <View key={item.id} style={styles.rateCard}>
              <View style={styles.cardHeader}>
                <View style={styles.categoryBadge}>
                  <AppIcon name="package" size={12} color="#34D399" style={{ marginRight: 4 }} />
                  <Text style={styles.categoryText}>{item.category}</Text>
                </View>
                <View style={[styles.statusBadge, item.status === 'ACTIVE' ? styles.statusActive : styles.statusInactive]}>
                  <Text style={styles.statusBadgeText}>● {item.status}</Text>
                </View>
              </View>

              {item.subcategory ? (
                <Text style={styles.subcategoryText}>Subcategory: {item.subcategory}</Text>
              ) : null}

              <View style={styles.priceRow}>
                <Text style={styles.ratePrice}>₹{item.rate}</Text>
                <Text style={styles.unitText}>/ {item.unit === 'PER_KG' ? 'kg' : (item.unit === 'PER_UNIT' ? 'unit' : 'lot')}</Text>
              </View>

              <View style={styles.footerRow}>
                <Text style={styles.dateText}>
                  Effective: {new Date(item.effectiveDate).toLocaleDateString()}
                </Text>
                <View style={styles.actionBtnGroup}>
                  <TouchableOpacity style={styles.editBtn} onPress={() => handleOpenEditModal(item)}>
                    <Text style={styles.editBtnText}>Edit</Text>
                  </TouchableOpacity>
                  {item.status === 'ACTIVE' ? (
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeactivateRate(item)}>
                      <Text style={styles.deleteBtnText}>Deactivate</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Add/Edit Modal */}
        <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>{editingRate ? 'Edit Buying Rate' : 'Add Buying Rate'}</Text>

              {!editingRate ? (
                <>
                  <Text style={styles.inputLabel}>Material Category *</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                    {CATEGORY_OPTIONS.map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[styles.chip, category === cat && styles.chipActive]}
                        onPress={() => setCategory(cat)}
                      >
                        <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>{cat}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <Text style={styles.inputLabel}>Subcategory (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. High Grade, RAM, CPU..."
                    placeholderTextColor="#64748B"
                    value={subcategory}
                    onChangeText={setSubcategory}
                  />
                </>
              ) : null}

              <Text style={styles.inputLabel}>Offered Rate (₹) *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 450"
                placeholderTextColor="#64748B"
                keyboardType="numeric"
                value={rateValue}
                onChangeText={setRateValue}
              />

              <Text style={styles.inputLabel}>Unit</Text>
              <View style={styles.unitRow}>
                {['PER_KG', 'PER_UNIT', 'PER_LOT'].map((u) => (
                  <TouchableOpacity
                    key={u}
                    style={[styles.unitChip, unit === u && styles.unitChipActive]}
                    onPress={() => setUnit(u)}
                  >
                    <Text style={[styles.unitChipText, unit === u && styles.unitChipTextActive]}>
                      {u === 'PER_KG' ? 'Per KG' : (u === 'PER_UNIT' ? 'Per Unit' : 'Per Lot')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalBtnRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveRate} disabled={submitting}>
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveBtnText}>{editingRate ? 'Update' : 'Save'}</Text>
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
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.spaceMd,
    paddingVertical: spacing.spaceSm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: { marginRight: 12 },
  backButtonText: { color: '#10B981', fontSize: 14, fontWeight: '600' },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  headerSubtitle: { color: '#94A3B8', fontSize: 11 },
  addButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 12 },
  scrollContent: { padding: spacing.spaceMd },
  centerBox: { paddingVertical: 40, alignItems: 'center' },
  loadingText: { color: '#94A3B8', marginTop: 8 },
  errorCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: '#EF4444',
    borderWidth: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  errorText: { color: '#FCA5A5', marginBottom: 8 },
  retryBtn: { backgroundColor: '#EF4444', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 6 },
  retryBtnText: { color: '#FFFFFF', fontWeight: '600' },
  emptyCard: {
    backgroundColor: '#1E293B',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 20,
  },
  emptyTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  emptySubtitle: { color: '#94A3B8', fontSize: 13, textAlign: 'center', marginBottom: 16 },
  createBtn: { backgroundColor: '#10B981', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  createBtnText: { color: '#FFFFFF', fontWeight: '600' },
  rateCard: {
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  categoryBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16, 185, 129, 0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  categoryText: { color: '#34D399', fontSize: 12, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  statusActive: { backgroundColor: 'rgba(16, 185, 129, 0.2)' },
  statusInactive: { backgroundColor: 'rgba(148, 163, 184, 0.2)' },
  statusBadgeText: { color: '#F8FAFC', fontSize: 11, fontWeight: '600' },
  subcategoryText: { color: '#CBD5E1', fontSize: 12, marginBottom: 6 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginVertical: 6 },
  ratePrice: { color: '#F59E0B', fontSize: 24, fontWeight: '800', marginRight: 4 },
  unitText: { color: '#94A3B8', fontSize: 13 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.05)' },
  dateText: { color: '#64748B', fontSize: 11 },
  actionBtnGroup: { flexDirection: 'row', gap: 8 },
  editBtn: { backgroundColor: 'rgba(59, 130, 246, 0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  editBtnText: { color: '#60A5FA', fontSize: 12, fontWeight: '600' },
  deleteBtn: { backgroundColor: 'rgba(239, 68, 68, 0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  deleteBtnText: { color: '#FCA5A5', fontSize: 12, fontWeight: '600' },

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', padding: 16 },
  modalContainer: { backgroundColor: '#1E293B', borderRadius: 16, padding: 20 },
  modalTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', marginBottom: 16 },
  inputLabel: { color: '#94A3B8', fontSize: 12, fontWeight: '600', marginTop: 12, marginBottom: 4 },
  chipRow: { flexGrow: 0, marginBottom: 8 },
  chip: { backgroundColor: '#334155', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginRight: 6 },
  chipActive: { backgroundColor: '#10B981' },
  chipText: { color: '#CBD5E1', fontSize: 12 },
  chipTextActive: { color: '#FFFFFF', fontWeight: '700' },
  input: { backgroundColor: '#0F172A', color: '#FFFFFF', padding: 10, borderRadius: 8, fontSize: 14, borderWidth: 1, borderColor: '#334155' },
  unitRow: { flexDirection: 'row', gap: 8, marginVertical: 4 },
  unitChip: { flex: 1, backgroundColor: '#334155', paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  unitChipActive: { backgroundColor: '#10B981' },
  unitChipText: { color: '#CBD5E1', fontSize: 12 },
  unitChipTextActive: { color: '#FFFFFF', fontWeight: '700' },
  modalBtnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 20 },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  cancelBtnText: { color: '#94A3B8', fontWeight: '600' },
  saveBtn: { backgroundColor: '#10B981', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8, minWidth: 80, alignItems: 'center' },
  saveBtnText: { color: '#FFFFFF', fontWeight: '700' },
});

export default RecyclerRatesScreen;
