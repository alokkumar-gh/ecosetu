/**
 * CreateConsignmentScreen
 * Authenticated INFORMAL_COLLECTOR — Create Consignment to Formal Recycler.
 *
 * Operational Chain:
 *   CITIZEN → COLLECTION REQUEST → COLLECTOR PICKUP COMPLETED (COLLECTED)
 *   → CONSIGNMENT CREATION (CREATED) → FORMAL RECYCLER
 *
 * Critical Business Model & Rules:
 *   - Informal collectors bundle collected e-waste into consignments for delivery to licensed formal recyclers.
 *   - Strictly ONLINE-ONLY: consignment creation is server-authoritative and locks items.
 *   - Zero offline mutation queueing for consignment creation.
 *   - Citizens have ZERO access to this screen (collector-only).
 *   - Zero citizen PII exposed (only e-waste item categories and weights).
 *   - Zero maps, payments, chat, or external phone dialer actions.
 *   - Full WCAG accessibility compliance (>= 48dp touch targets, semantic roles/labels/states).
 *
 * Source of Truth:
 *   docs/05_API_SPECIFICATION.md Section 9 (POST /api/v1/consignments)
 *   docs/06_ROLES_AND_PERMISSIONS.md
 *   docs/07_BUSINESS_WORKFLOWS.md Section 2.3
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
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { useNetwork } from '../../hooks/useNetwork';
import { TopAppBar } from '../../components/layout/TopAppBar';
import { Skeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { OfflineBanner } from '../../components/common/OfflineBanner';
import { StatusBadge } from '../../components/common/StatusBadge';
import { AppIcon } from '../../components/ui';
import { recyclingService } from '../../services/recyclingService';
import { useI18n } from '../../i18n';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { ROLES } from '../../utils/constants';
import { EcoSetuBackground, EcoGlassTextArea } from '../../components/eco';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatCategoryName = (cat?: string): string => {
  if (!cat) return '—';
  return cat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

const USER_STATUS = Object.freeze({
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  DEACTIVATED: 'DEACTIVATED',
});

interface Props {
  navigation?: any;
  route?: {
    params?: {
      recyclerId?: string;
      recycler?: any;
    };
  };
}

export const CreateConsignmentScreen: React.FC<Props> = ({ navigation, route }) => {
  const { user } = useAuth();
  const { isConnected } = useNetwork();
  const { t } = useI18n();

  // Route params
  const initialRecyclerId = route?.params?.recyclerId;
  const initialRecycler = route?.params?.recycler;

  // ── Data States ─────────────────────────────────────────────────────────────
  const [selectedRecycler, setSelectedRecycler] = useState<any | null>(initialRecycler || null);
  const [availableRecyclers, setAvailableRecyclers] = useState<any[]>([]);
  const [isSelectingRecycler, setIsSelectingRecycler] = useState<boolean>(!initialRecyclerId);

  const [eligibleItems, setEligibleItems] = useState<any[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

  const [deliveryNotes, setDeliveryNotes] = useState<string>('');
  const [manualWeight, setManualWeight] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // ── Submission States ───────────────────────────────────────────────────────
  const [isConfirmModalVisible, setIsConfirmModalVisible] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [createdConsignment, setCreatedConsignment] = useState<any | null>(null);

  const submittingRef = useRef<boolean>(false);

  // ── Authorization & Verification ───────────────────────────────────────────
  const isCollector = user?.role === ROLES.INFORMAL_COLLECTOR;
  const collectorStatus = user?.status;
  const isVerified = collectorStatus === USER_STATUS.ACTIVE;

  // ── Load Initial Data (Recyclers + Eligible Items) ──────────────────────────
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [recyclersRes, itemsRes] = await Promise.all([
        recyclingService.getRecyclers(),
        recyclingService.getEligibleItems(),
      ]);

      const recyclersList = recyclersRes.recyclers || [];
      setAvailableRecyclers(recyclersList);

      // If initial recyclerId passed, find matching recycler
      if (initialRecyclerId) {
        const found = recyclersList.find((r: any) => r.id === initialRecyclerId);
        if (found) {
          setSelectedRecycler(found);
          setIsSelectingRecycler(false);
        } else if (!selectedRecycler) {
          setIsSelectingRecycler(true);
        }
      } else if (!selectedRecycler && recyclersList.length > 0) {
        setIsSelectingRecycler(true);
      }

      setEligibleItems(itemsRes);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to load consignment data.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [initialRecyclerId, selectedRecycler]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Auto-Calculate Total Weight ────────────────────────────────────────────
  const calculatedWeight = useMemo(() => {
    let sum = 0;
    for (const item of eligibleItems) {
      if (selectedItemIds.has(item.id)) {
        const w = parseFloat(item.actualWeightKg || item.estimatedWeightKg || '0');
        sum += isNaN(w) ? 0 : w;
      }
    }
    return sum;
  }, [eligibleItems, selectedItemIds]);

  const displayTotalWeight = manualWeight.trim()
    ? parseFloat(manualWeight.trim()) || calculatedWeight
    : calculatedWeight;

  // ── Selection Handlers ─────────────────────────────────────────────────────
  const toggleItemSelection = useCallback((itemId: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedItemIds.size === eligibleItems.length) {
      setSelectedItemIds(new Set());
    } else {
      setSelectedItemIds(new Set(eligibleItems.map((i) => i.id)));
    }
  }, [eligibleItems, selectedItemIds.size]);

  // ── Open Confirmation Dialog ───────────────────────────────────────────────
  const handleReviewConsignment = useCallback(() => {
    if (!isConnected) {
      Alert.alert(
        'Offline',
        'Creating a consignment requires an active internet connection. Please connect and try again.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!isVerified) {
      Alert.alert(
        'Verification Required',
        'Your collector account must be verified by an administrator before creating consignments.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!selectedRecycler) {
      Alert.alert('Recycler Required', 'Please select a formal recycler for this consignment.', [
        { text: 'OK' },
      ]);
      return;
    }

    if (selectedItemIds.size === 0) {
      Alert.alert('Items Required', 'Please select at least one collected e-waste item to consign.', [
        { text: 'OK' },
      ]);
      return;
    }

    setIsConfirmModalVisible(true);
  }, [isConnected, isVerified, selectedRecycler, selectedItemIds.size]);

  // ── Submit Consignment (ONLINE-ONLY) ───────────────────────────────────────
  const handleConfirmSubmit = useCallback(async () => {
    if (submittingRef.current) return;
    if (!selectedRecycler) return;

    if (!isConnected) {
      setIsConfirmModalVisible(false);
      Alert.alert('Offline', 'Connecting to the internet is required to create a consignment.', [
        { text: 'OK' },
      ]);
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      const payload: any = {
        recyclerId: selectedRecycler.id,
        itemIds: Array.from(selectedItemIds),
      };

      if (deliveryNotes.trim()) {
        payload.deliveryNotes = deliveryNotes.trim();
      }

      if (displayTotalWeight > 0) {
        payload.totalWeightKg = displayTotalWeight;
      }

      const result = await recyclingService.createConsignment(payload);

      setIsConfirmModalVisible(false);
      setCreatedConsignment(result);
    } catch (err: any) {
      setIsConfirmModalVisible(false);
      const status = err?.response?.status;
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Could not create consignment. Please try again.';

      if (status === 409 || msg.includes('already in an active consignment')) {
        Alert.alert(
          'Item Already Consigned',
          'One or more of the selected items is already part of an active consignment. Updating available items list...',
          [{ text: 'OK', onPress: () => loadData() }]
        );
      } else if (err?.isOfflineError) {
        Alert.alert(
          'Offline',
          'Consignment creation is blocked without an active internet connection.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Consignment Failed', msg, [{ text: 'OK' }]);
      }
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [selectedRecycler, selectedItemIds, deliveryNotes, displayTotalWeight, isConnected, loadData]);

  // ── Role Guard ─────────────────────────────────────────────────────────────
  if (!isCollector) {
    return (
      <EcoSetuBackground>
        <SafeAreaView style={styles.container}>
          <TopAppBar title="Create Consignment" onBack={() => navigation.goBack()} />
          <View style={styles.contentPadding}>
            <EmptyState
              icon="lock"
              title="Access Restricted"
              message="Only authenticated informal collectors can create e-waste consignments."
              actionLabel="Go Back"
              onAction={() => navigation.goBack()}
            />
          </View>
        </SafeAreaView>
      </EcoSetuBackground>
    );
  }

  // ── Success State View ─────────────────────────────────────────────────────
  if (createdConsignment) {
    const csgId = createdConsignment.id || '—';
    const csgStatus = createdConsignment.status || 'CREATED';
    const totalCount = createdConsignment.totalItems || selectedItemIds.size;
    const totalWeight = createdConsignment.totalWeightKg || displayTotalWeight;
    const targetFacility =
      createdConsignment.recycler?.facilityName ||
      selectedRecycler?.facilityName ||
      'Authorized Recycling Facility';

    return (
      <EcoSetuBackground>
        <SafeAreaView style={styles.container}>
          <TopAppBar title="Consignment Created" onBack={() => navigation.goBack()} />
          <ScrollView contentContainerStyle={styles.successContainer}>
            <View style={styles.successIconCircle} accessibilityElementsHidden>
              <AppIcon name="check" size={32} color={colors.success} strokeWidth={2.5} />
            </View>
            <Text style={styles.successTitle} accessibilityRole="header">
              Consignment Created Successfully!
            </Text>
            <Text style={styles.successSubtitle}>
              Your collected e-waste has been bundled and assigned to the formal recycler.
            </Text>

            {/* Receipt Details Card */}
            <View style={styles.receiptCard}>
              <View style={styles.receiptHeader}>
                <Text style={styles.receiptRefText}>Ref #{csgId.slice(0, 8).toUpperCase()}</Text>
                <StatusBadge status={csgStatus} />
              </View>
              <View style={styles.receiptDivider} />

              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Receiving Facility:</Text>
                <Text style={styles.receiptValue}>{targetFacility}</Text>
              </View>

              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Items Consigned:</Text>
                <Text style={styles.receiptValue}>{totalCount} items</Text>
              </View>

              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Batch Weight:</Text>
                <Text style={styles.receiptValue}>{totalWeight.toFixed(1)} kg</Text>
              </View>

              {Boolean(createdConsignment.deliveryNotes) && (
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Notes:</Text>
                  <Text style={styles.receiptValue}>{createdConsignment.deliveryNotes}</Text>
                </View>
              )}
            </View>

            {/* Recycler Notification Notice */}
            <View style={styles.notificationNotice} accessibilityRole="alert">
              <AppIcon name="mail" size={16} color="#67E8F9" style={{ marginTop: 2, marginRight: 8 }} />
              <Text style={styles.notificationNoticeText}>
                The receiving formal recycler has been automatically notified of this incoming delivery. Deliver the batch to their facility to complete handover.
              </Text>
            </View>

            {/* Actions */}
            <TouchableOpacity
              style={styles.trackButton}
              onPress={() => {
                navigation.replace('CollectorConsignmentStatus', {
                  consignmentId: csgId,
                  consignment: createdConsignment,
                });
              }}
              accessibilityRole="button"
              accessibilityLabel="Track this consignment"
              activeOpacity={0.8}
            >
              <Text style={styles.trackButtonText}>{(t('collector.consignments.title') || 'Track Consignment') + ' →'}</Text>
            </TouchableOpacity>

            {/* Done Action */}
            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => navigation.goBack()}
              accessibilityRole="button"
              accessibilityLabel="Done and return to recycler directory"
              activeOpacity={0.8}
            >
              <Text style={styles.doneButtonText}>{t('common.done') || 'Done (Back to Directory)'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </EcoSetuBackground>
    );
  }

  return (
    <EcoSetuBackground>
      <SafeAreaView style={styles.container}>
      <TopAppBar
        title={t('collector.consignments.createConsignment') || "Create Consignment"}
        subtitle="Bundle collected e-waste for recycler"
        onBack={() => navigation.goBack()}
      />

      {/* Offline Banner */}
      <OfflineBanner />

      {/* Verification Warning */}
      {collectorStatus && !isVerified && (
        <View style={styles.warningBanner} accessibilityRole="alert">
          <AppIcon name="clock" size={16} color="#B45309" />
          <Text style={styles.warningBannerText}>
            Account Pending Verification: You can prepare batches, but submission will be enabled once your account is verified.
          </Text>
        </View>
      )}

      {isLoading ? (
        <View style={styles.contentPadding}>
          <Skeleton height={80} borderRadius={10} style={{ marginBottom: 12 }} />
          <Skeleton height={140} borderRadius={10} style={{ marginBottom: 12 }} />
          <Skeleton height={60} borderRadius={10} />
        </View>
      ) : error ? (
        <View style={styles.contentPadding}>
          <EmptyState
            icon="alert-triangle"
            title="Unable to Load Data"
            message={error}
            actionLabel="Retry"
            onAction={loadData}
          />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* ── Section 1: Selected Formal Recycler ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle} accessibilityRole="header">
                {t('collector.consignments.selectRecycler') || '1. Receiving Formal Recycler'}
              </Text>
              {Boolean(selectedRecycler) && (
                <TouchableOpacity
                  onPress={() => setIsSelectingRecycler(!isSelectingRecycler)}
                  accessibilityRole="button"
                  accessibilityLabel="Change target recycler"
                >
                  <Text style={styles.changeLinkText}>
                    {isSelectingRecycler ? (t('common.close') || 'Close List') : (t('common.edit') || 'Change Facility')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {selectedRecycler && !isSelectingRecycler ? (
              <View style={styles.recyclerCard}>
                <View style={styles.recyclerHeader}>
                  <View style={styles.recyclerIconContainer}>
                    <AppIcon name="factory" size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.recyclerName}>{selectedRecycler.facilityName}</Text>
                    <View style={styles.addressRow}>
                      <AppIcon name="map-pin" size={12} color={colors.textSecondary} />
                      <Text style={styles.recyclerAddress} numberOfLines={2}>
                        {selectedRecycler.facilityAddress}
                      </Text>
                    </View>
                  </View>
                  <StatusBadge status="ACTIVE" />
                </View>
                {Array.isArray(selectedRecycler.acceptedCategories) &&
                  selectedRecycler.acceptedCategories.length > 0 && (
                    <View style={styles.acceptedCatsRow}>
                      <Text style={styles.acceptedCatsLabel}>Accepted:</Text>
                      <Text style={styles.acceptedCatsList}>
                        {selectedRecycler.acceptedCategories
                          .map(formatCategoryName)
                          .join(', ')}
                      </Text>
                    </View>
                  )}
              </View>
            ) : (
              <View style={styles.recyclerSelectorContainer}>
                <Text style={styles.selectPromptText}>
                  {t('collector.consignments.selectRecycler') || 'Choose an authorized formal recycling facility:'}
                </Text>
                {availableRecyclers.length === 0 ? (
                  <Text style={styles.noRecyclersText}>
                    No verified recyclers available. Please connect to the internet to load the directory.
                  </Text>
                ) : (
                  availableRecyclers.map((r) => {
                    const isCurrent = selectedRecycler?.id === r.id;
                    return (
                      <TouchableOpacity
                        key={r.id}
                        style={[
                          styles.recyclerOption,
                          isCurrent && styles.recyclerOptionSelected,
                        ]}
                        onPress={() => {
                          setSelectedRecycler(r);
                          setIsSelectingRecycler(false);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`Select ${r.facilityName}`}
                        accessibilityState={{ selected: isCurrent }}
                      >
                        <Text style={styles.recyclerOptionName}>{r.facilityName}</Text>
                        <View style={styles.addressRow}>
                          <AppIcon name="map-pin" size={11} color={colors.textSecondary} />
                          <Text style={styles.recyclerOptionAddress} numberOfLines={1}>
                            {r.facilityAddress}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            )}
          </View>

          {/* ── Section 2: Eligible E-Waste Items ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionTitle} accessibilityRole="header">
                  {t('collector.consignments.selectItems') || '2. Select Collected E-Waste Items'}
                </Text>
                <Text style={styles.sectionSubtitle}>
                  {eligibleItems.length}{' '}
                  {eligibleItems.length === 1 ? 'item' : 'items'} in COLLECTED status
                </Text>
              </View>
              {eligibleItems.length > 0 && (
                <TouchableOpacity
                  onPress={handleSelectAll}
                  style={styles.selectAllButton}
                  accessibilityRole="button"
                  accessibilityLabel={
                    selectedItemIds.size === eligibleItems.length
                      ? 'Deselect all items'
                      : 'Select all items'
                  }
                >
                  <Text style={styles.selectAllText}>
                    {selectedItemIds.size === eligibleItems.length ? 'Deselect All' : 'Select All'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {eligibleItems.length === 0 ? (
              <EmptyState
                icon="package"
                title="No Collected Items Available"
                message="You need items in COLLECTED status from completed pickups before you can create a consignment."
              />
            ) : (
              eligibleItems.map((item) => {
                const isSelected = selectedItemIds.has(item.id);
                const weight =
                  parseFloat(item.actualWeightKg || item.estimatedWeightKg || '0') || 0;

                // Check category acceptance with selected recycler
                const isCatAccepted =
                  !selectedRecycler ||
                  !Array.isArray(selectedRecycler.acceptedCategories) ||
                  selectedRecycler.acceptedCategories.length === 0 ||
                  selectedRecycler.acceptedCategories.includes(item.category);

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.itemCard, isSelected && styles.itemCardSelected]}
                    onPress={() => toggleItemSelection(item.id)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isSelected }}
                    accessibilityLabel={`${formatCategoryName(item.category)}, condition ${item.condition}, weight ${weight.toFixed(1)} kg`}
                    activeOpacity={0.7}
                  >
                    <View style={styles.itemCheckboxContainer}>
                      <View
                        style={[
                          styles.itemCheckbox,
                          isSelected && styles.itemCheckboxChecked,
                        ]}
                      >
                        {isSelected && <AppIcon name="check" size={14} color="#FFFFFF" strokeWidth={2.5} />}
                      </View>
                    </View>

                    <View style={styles.itemInfo}>
                      <Text style={styles.itemCategoryTitle}>
                        {formatCategoryName(item.category)}
                      </Text>
                      <Text style={styles.itemMetaText}>
                        Condition: {item.condition || 'UNKNOWN'} · Qty: {item.quantity || 1}
                        {weight > 0 ? ` · ${weight.toFixed(1)} kg` : ''}
                      </Text>
                      {item.description ? (
                        <Text style={styles.itemDescription} numberOfLines={1}>
                          "{item.description}"
                        </Text>
                      ) : null}

                      {/* Compatibility Hint */}
                      <View style={styles.compatibilityRow}>
                        <AppIcon
                          name={isCatAccepted ? 'check-circle' : 'alert-triangle'}
                          size={12}
                          color={isCatAccepted ? colors.success : colors.warning}
                        />
                        <Text
                          style={[
                            styles.catCompatibilityText,
                            { color: isCatAccepted ? colors.success : colors.warning },
                          ]}
                        >
                          {isCatAccepted ? 'Category accepted by facility' : 'Category not listed by facility'}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          {/* ── Section 3: Delivery Notes & Summary ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle} accessibilityRole="header">
              {t('collector.consignments.deliveryNotes') || '3. Consignment Notes & Summary'}
            </Text>

            <EcoGlassTextArea
              label={t('collector.consignments.deliveryNotes') || 'Delivery / Handling Notes (Optional)'}
              placeholder="e.g., Aggregated smartphone and laptop batch from South Delhi pickups..."
              value={deliveryNotes}
              onChangeText={setDeliveryNotes}
              maxLength={500}
              showCharCount
              accessibilityLabel="Delivery notes for formal recycler"
            />

            <View style={styles.summaryBox}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Items Selected:</Text>
                <Text style={styles.summaryValue}>{selectedItemIds.size} items</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Calculated Weight:</Text>
                <Text style={styles.summaryValue}>{displayTotalWeight.toFixed(1)} kg</Text>
              </View>
            </View>
          </View>

          {/* ── Submit Action Button ── */}
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={[
                styles.submitButton,
                (selectedItemIds.size === 0 || !selectedRecycler || !isConnected) &&
                  styles.submitButtonDisabled,
              ]}
              onPress={handleReviewConsignment}
              accessibilityRole="button"
              accessibilityLabel="Review and create consignment"
              disabled={selectedItemIds.size === 0 || !selectedRecycler || !isConnected}
              activeOpacity={0.8}
            >
              <Text style={styles.submitButtonText}>
                {(t('collector.consignments.submitConsignment') || 'Review Consignment')} ({selectedItemIds.size} items) →
              </Text>
            </TouchableOpacity>

            {!isConnected && (
              <View style={styles.offlineRow}>
                <AppIcon name="wifi-off" size={13} color={colors.warning} />
                <Text style={styles.offlineHintText}>
                  Internet connection required to create consignments.
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {/* ── Confirmation Modal ── */}
      <Modal
        visible={isConfirmModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsConfirmModalVisible(false)}
      >
        <View style={modalStyles.overlay}>
          <View style={modalStyles.modalContainer}>
            <Text style={modalStyles.modalTitle} accessibilityRole="header">
              {t('collector.delivery.confirmDelivery') || 'Confirm Consignment'}
            </Text>
            <Text style={modalStyles.modalSubtitle}>
              Please review your consignment details before submitting:
            </Text>

            <View style={modalStyles.detailsCard}>
              <View style={modalStyles.row}>
                <Text style={modalStyles.label}>Target Facility:</Text>
                <Text style={modalStyles.value}>{selectedRecycler?.facilityName}</Text>
              </View>
              <View style={modalStyles.row}>
                <Text style={modalStyles.label}>Items to Consign:</Text>
                <Text style={modalStyles.value}>{selectedItemIds.size} items</Text>
              </View>
              <View style={modalStyles.row}>
                <Text style={modalStyles.label}>Total Batch Weight:</Text>
                <Text style={modalStyles.value}>{displayTotalWeight.toFixed(1)} kg</Text>
              </View>
              {Boolean(deliveryNotes.trim()) && (
                <View style={modalStyles.row}>
                  <Text style={modalStyles.label}>Delivery Notes:</Text>
                  <Text style={modalStyles.value}>{deliveryNotes.trim()}</Text>
                </View>
              )}
            </View>

            <View style={modalStyles.lockNotice}>
              <AppIcon name="lock" size={14} color="#FCD34D" style={{ marginTop: 2, marginRight: 6 }} />
              <Text style={modalStyles.lockNoticeText}>
                Once confirmed, these items will be locked to this consignment and the recycler will be notified of incoming delivery.
              </Text>
            </View>

            <View style={modalStyles.modalButtons}>
              <TouchableOpacity
                style={modalStyles.cancelButton}
                onPress={() => setIsConfirmModalVisible(false)}
                disabled={isSubmitting}
                accessibilityRole="button"
                accessibilityLabel="Cancel consignment confirmation"
              >
                <Text style={modalStyles.cancelButtonText}>{t('common.back') || 'Go Back'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[modalStyles.confirmButton, isSubmitting && modalStyles.confirmButtonDisabled]}
                onPress={handleConfirmSubmit}
                disabled={isSubmitting}
                accessibilityRole="button"
                accessibilityLabel="Confirm and create consignment"
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={modalStyles.confirmButtonText}>Confirm & Create</Text>
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
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  contentPadding: {
    padding: spacing.spaceMd,
  },
  scrollContent: {
    padding: spacing.spaceMd,
    paddingBottom: spacing.spaceXl * 2,
  },
  section: {
    marginBottom: spacing.spaceLg,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.spaceSm,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  changeLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  recyclerCard: {
    backgroundColor: 'rgba(6, 21, 27, 0.85)',
    borderRadius: 10,
    padding: spacing.spaceMd,
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.22)',
  },
  recyclerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recyclerIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(45, 212, 191, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recyclerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  recyclerAddress: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
  },
  acceptedCatsRow: {
    marginTop: spacing.spaceSm,
    paddingTop: spacing.spaceSm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(45, 212, 191, 0.20)',
  },
  acceptedCatsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  acceptedCatsList: {
    fontSize: 12,
    color: '#E2E8F0',
    marginTop: 2,
  },
  recyclerSelectorContainer: {
    backgroundColor: 'rgba(6, 21, 27, 0.85)',
    borderRadius: 10,
    padding: spacing.spaceMd,
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.22)',
  },
  selectPromptText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F8FAFC',
    marginBottom: spacing.spaceSm,
  },
  noRecyclersText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  recyclerOption: {
    padding: spacing.spaceSm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.20)',
    marginBottom: spacing.spaceXs,
    backgroundColor: 'rgba(6, 21, 27, 0.75)',
  },
  recyclerOptionSelected: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  recyclerOptionName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  recyclerOptionAddress: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  selectAllButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: `${colors.primary}15`,
    minHeight: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  noItemsCard: {
    backgroundColor: 'rgba(6, 21, 27, 0.85)',
    padding: spacing.spaceLg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.22)',
    alignItems: 'center',
  },
  noItemsIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  noItemsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  noItemsBody: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(6, 21, 27, 0.85)',
    borderRadius: 10,
    padding: spacing.spaceMd,
    marginBottom: spacing.spaceSm,
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.22)',
    minHeight: 56,
  },
  itemCardSelected: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  itemCheckboxContainer: {
    marginRight: spacing.spaceSm,
  },
  itemCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemCheckboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxCheck: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  itemInfo: {
    flex: 1,
  },
  itemCategoryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  itemMetaText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  itemDescription: {
    fontSize: 11,
    fontStyle: 'italic',
    color: colors.textSecondary,
    marginTop: 2,
  },
  catCompatibilityText: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  compatibilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  summaryBox: {
    backgroundColor: 'rgba(6, 21, 27, 0.85)',
    padding: spacing.spaceMd,
    borderRadius: 8,
    marginTop: spacing.spaceSm,
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.22)',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#94A3B8',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  actionContainer: {
    marginTop: spacing.spaceMd,
    marginBottom: spacing.spaceLg,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  submitButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: typography.Button.fontSize,
    fontWeight: '700',
  },
  offlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  offlineHintText: {
    fontSize: 11,
    color: colors.warning,
    textAlign: 'center',
  },
  warningBanner: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    padding: spacing.spaceSm,
    borderRadius: 8,
    margin: spacing.spaceMd,
    marginBottom: 0,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.30)',
  },
  warningBannerText: {
    fontSize: 12,
    color: '#FBBF24',
    lineHeight: 18,
  },
  // Success receipt styles
  successContainer: {
    padding: spacing.spaceLg,
    alignItems: 'center',
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(16, 185, 129, 0.20)',
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.40)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.spaceMd,
  },
  successCheckIcon: {
    fontSize: 32,
    color: colors.success,
    fontWeight: '700',
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
    textAlign: 'center',
    marginBottom: 6,
  },
  successSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.spaceLg,
  },
  receiptCard: {
    width: '100%',
    backgroundColor: 'rgba(6, 21, 27, 0.85)',
    borderRadius: 12,
    padding: spacing.spaceMd,
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.22)',
    marginBottom: spacing.spaceMd,
  },
  receiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptRefText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2DD4BF',
  },
  receiptDivider: {
    height: 1,
    backgroundColor: 'rgba(45, 212, 191, 0.20)',
    marginVertical: spacing.spaceSm,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  receiptLabel: {
    fontSize: 12,
    color: '#94A3B8',
  },
  receiptValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F8FAFC',
    flexShrink: 1,
    textAlign: 'right',
  },
  notificationNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    padding: spacing.spaceMd,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.30)',
    marginBottom: spacing.spaceLg,
    width: '100%',
  },
  notificationNoticeText: {
    fontSize: 12,
    color: '#67E8F9',
    lineHeight: 18,
    flex: 1,
  },
  trackButton: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    minHeight: 48,
    marginBottom: spacing.spaceSm,
  },
  trackButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  doneButton: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    minHeight: 48,
  },
  doneButtonText: {
    color: '#F1F5F9',
    fontSize: 14,
    fontWeight: '600',
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 8, 13, 0.85)',
    justifyContent: 'center',
    padding: spacing.spaceLg,
  },
  modalContainer: {
    backgroundColor: '#071A21',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.35)',
    padding: spacing.spaceLg,
    elevation: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: spacing.spaceMd,
    lineHeight: 18,
  },
  detailsCard: {
    backgroundColor: 'rgba(6, 21, 27, 0.85)',
    borderRadius: 10,
    padding: spacing.spaceMd,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    marginBottom: spacing.spaceMd,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    color: '#94A3B8',
  },
  value: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    flexShrink: 1,
    textAlign: 'right',
  },
  lockNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(217, 119, 6, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.35)',
    padding: spacing.spaceSm,
    borderRadius: 8,
    marginBottom: spacing.spaceLg,
  },
  lockNoticeText: {
    fontSize: 12,
    color: '#FCD34D',
    lineHeight: 18,
    flex: 1,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.spaceMd,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.20)',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#CBD5E1',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#10B981',
    borderWidth: 1,
    borderColor: '#34D399',
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: 'rgba(16, 185, 129, 0.30)',
    borderColor: 'transparent',
  },
  confirmButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#03120E',
  },
});

export default CreateConsignmentScreen;
