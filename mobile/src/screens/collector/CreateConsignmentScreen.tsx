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
import { recyclingService } from '../../services/recyclingService';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { ROLES } from '../../utils/constants';

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
      <SafeAreaView style={styles.container}>
        <TopAppBar title="Create Consignment" onBack={() => navigation.goBack()} />
        <View style={styles.contentPadding}>
          <EmptyState
            icon="🔒"
            title="Access Restricted"
            message="Only authenticated informal collectors can create e-waste consignments."
            actionLabel="Go Back"
            onAction={() => navigation.goBack()}
          />
        </View>
      </SafeAreaView>
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
      <SafeAreaView style={styles.container}>
        <TopAppBar title="Consignment Created" onBack={() => navigation.goBack()} />
        <ScrollView contentContainerStyle={styles.successContainer}>
          <View style={styles.successIconCircle} accessibilityElementsHidden>
            <Text style={styles.successCheckIcon}>✓</Text>
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
            <Text style={styles.notificationNoticeText}>
              📬 The receiving formal recycler has been automatically notified of this incoming delivery. Deliver the batch to their facility to complete handover.
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
            <Text style={styles.trackButtonText}>Track Consignment →</Text>
          </TouchableOpacity>

          {/* Done Action */}
          <TouchableOpacity
            style={styles.doneButton}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Done and return to recycler directory"
            activeOpacity={0.8}
          >
            <Text style={styles.doneButtonText}>Done (Back to Directory)</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <TopAppBar
        title="Create Consignment"
        subtitle="Bundle collected e-waste for recycler"
        onBack={() => navigation.goBack()}
      />

      {/* Offline Banner */}
      <OfflineBanner />

      {/* Verification Warning */}
      {collectorStatus && !isVerified && (
        <View style={styles.warningBanner} accessibilityRole="alert">
          <Text style={styles.warningBannerText}>
            ⏳ Account Pending Verification: You can prepare batches, but submission will be enabled once your account is verified.
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
            icon="⚠"
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
                1. Receiving Formal Recycler
              </Text>
              {Boolean(selectedRecycler) && (
                <TouchableOpacity
                  onPress={() => setIsSelectingRecycler(!isSelectingRecycler)}
                  accessibilityRole="button"
                  accessibilityLabel="Change target recycler"
                >
                  <Text style={styles.changeLinkText}>
                    {isSelectingRecycler ? 'Close List' : 'Change Facility'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {selectedRecycler && !isSelectingRecycler ? (
              <View style={styles.recyclerCard}>
                <View style={styles.recyclerHeader}>
                  <Text style={styles.recyclerIcon} accessibilityElementsHidden>
                    🏭
                  </Text>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.recyclerName}>{selectedRecycler.facilityName}</Text>
                    <Text style={styles.recyclerAddress} numberOfLines={2}>
                      📍 {selectedRecycler.facilityAddress}
                    </Text>
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
                  Choose an authorized formal recycling facility:
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
                        <Text style={styles.recyclerOptionAddress} numberOfLines={1}>
                          📍 {r.facilityAddress}
                        </Text>
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
                  2. Select Collected E-Waste Items
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
                    {selectedItemIds.size === eligibleItems.length
                      ? 'Deselect All'
                      : 'Select All'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {eligibleItems.length === 0 ? (
              <View style={styles.noItemsCard}>
                <Text style={styles.noItemsIcon}>📦</Text>
                <Text style={styles.noItemsTitle}>No Collected Items Available</Text>
                <Text style={styles.noItemsBody}>
                  You do not have any e-waste items in COLLECTED status ready for consignment. Complete assigned pickups from citizens first to collect items.
                </Text>
              </View>
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
                    accessibilityLabel={`${formatCategoryName(item.category)}, condition ${item.condition}, weight ${weight.toFixed(1)} kg`}
                    accessibilityState={{ checked: isSelected }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.itemCheckboxContainer}>
                      <View
                        style={[
                          styles.itemCheckbox,
                          isSelected && styles.itemCheckboxChecked,
                        ]}
                      >
                        {isSelected && <Text style={styles.checkboxCheck}>✓</Text>}
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
                      <Text
                        style={[
                          styles.catCompatibilityText,
                          { color: isCatAccepted ? colors.success : colors.warning },
                        ]}
                      >
                        {isCatAccepted ? '✓ Category accepted by facility' : '⚠ Category not listed by facility'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          {/* ── Section 3: Delivery Notes & Summary ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle} accessibilityRole="header">
              3. Consignment Notes & Summary
            </Text>

            <Text style={styles.inputLabel}>Delivery / Handling Notes (Optional):</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="e.g., Aggregated smartphone and laptop batch from South Delhi pickups..."
              placeholderTextColor={colors.textSecondary}
              value={deliveryNotes}
              onChangeText={setDeliveryNotes}
              maxLength={500}
              multiline
              numberOfLines={3}
              accessibilityLabel="Delivery notes for formal recycler"
            />
            <Text style={styles.charCountText}>{deliveryNotes.length}/500 chars</Text>

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
                Review Consignment ({selectedItemIds.size} items) →
              </Text>
            </TouchableOpacity>

            {!isConnected && (
              <Text style={styles.offlineHintText}>
                📡 Internet connection required to create consignments.
              </Text>
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
              Confirm Consignment
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
              <Text style={modalStyles.lockNoticeText}>
                🔒 Once confirmed, these items will be locked to this consignment and the recycler will be notified of incoming delivery.
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
                <Text style={modalStyles.cancelButtonText}>Go Back</Text>
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
    color: colors.textPrimary,
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
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: spacing.spaceMd,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  recyclerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recyclerIcon: {
    fontSize: 24,
  },
  recyclerName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  recyclerAddress: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  acceptedCatsRow: {
    marginTop: spacing.spaceSm,
    paddingTop: spacing.spaceSm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  acceptedCatsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  acceptedCatsList: {
    fontSize: 12,
    color: colors.textPrimary,
    marginTop: 2,
  },
  recyclerSelectorContainer: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: spacing.spaceMd,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  selectPromptText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
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
    borderColor: colors.divider,
    marginBottom: spacing.spaceXs,
    backgroundColor: '#FAFAFA',
  },
  recyclerOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}12`,
  },
  recyclerOptionName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
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
    backgroundColor: colors.surface,
    padding: spacing.spaceLg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.divider,
    alignItems: 'center',
  },
  noItemsIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  noItemsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
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
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: spacing.spaceMd,
    marginBottom: spacing.spaceSm,
    borderWidth: 1,
    borderColor: colors.divider,
    minHeight: 56,
  },
  itemCardSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}08`,
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
    color: colors.textPrimary,
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
    marginTop: 3,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  notesInput: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.divider,
    padding: spacing.spaceSm,
    fontSize: 13,
    color: colors.textPrimary,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  charCountText: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: 4,
  },
  summaryBox: {
    backgroundColor: '#F5F5F5',
    padding: spacing.spaceMd,
    borderRadius: 8,
    marginTop: spacing.spaceSm,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
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
    backgroundColor: '#BDBDBD',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: typography.Button.fontSize,
    fontWeight: '700',
  },
  offlineHintText: {
    fontSize: 11,
    color: colors.warning,
    textAlign: 'center',
    marginTop: 6,
  },
  warningBanner: {
    backgroundColor: '#FFF3E0',
    padding: spacing.spaceSm,
    borderRadius: 8,
    margin: spacing.spaceMd,
    marginBottom: 0,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  warningBannerText: {
    fontSize: 12,
    color: '#E65100',
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
    backgroundColor: '#E8F5E9',
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
    color: colors.textPrimary,
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
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.spaceMd,
    borderWidth: 1,
    borderColor: colors.divider,
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
    color: colors.primaryDark,
  },
  receiptDivider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.spaceSm,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  receiptLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  receiptValue: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textPrimary,
    flexShrink: 1,
    textAlign: 'right',
  },
  notificationNotice: {
    backgroundColor: '#E3F2FD',
    padding: spacing.spaceMd,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBDEFB',
    marginBottom: spacing.spaceLg,
    width: '100%',
  },
  notificationNoticeText: {
    fontSize: 12,
    color: '#0D47A1',
    lineHeight: 18,
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
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    minHeight: 48,
  },
  doneButtonText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.spaceMd,
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: spacing.spaceLg,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.spaceMd,
  },
  detailsCard: {
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: spacing.spaceSm,
    borderWidth: 1,
    borderColor: colors.divider,
    marginBottom: spacing.spaceMd,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  value: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    flexShrink: 1,
    textAlign: 'right',
  },
  lockNotice: {
    backgroundColor: '#FFF3E0',
    padding: spacing.spaceSm,
    borderRadius: 6,
    marginBottom: spacing.spaceMd,
  },
  lockNoticeText: {
    fontSize: 11,
    color: '#E65100',
    lineHeight: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.spaceSm,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.divider,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#BDBDBD',
  },
  confirmButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default CreateConsignmentScreen;
