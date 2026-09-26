/**
 * CollectorBrowseScreen
 * Authenticated INFORMAL_COLLECTOR — Browse / Available Collection Requests screen.
 *
 * ECOSETU Business Chain: CITIZEN → LOCAL INFORMAL COLLECTOR / KABADIWALA → FORMAL RECYCLER
 *
 * This screen allows verified collectors to:
 *   - Browse SUBMITTED citizen collection requests available for pickup
 *   - Accept a request (POST /api/v1/collection-requests/:id/accept)
 *   - Paginate through results (page/limit supported by backend)
 *   - Pull-to-refresh the list
 *   - Browse cached results while offline (accept blocked offline)
 *
 * PRIVACY INVARIANTS (server-enforced, must not be reconstructed client-side):
 *   pickupAddress = "Approximate Location (Exact address revealed upon acceptance)"
 *   pickupLat/pickupLng = rounded to 2 decimal places until accepted
 *   No citizen email, phone, or exact address/coordinates displayed
 *
 * DOES NOT IMPLEMENT:
 *   - Pickup execution (start/complete)
 *   - Consignment creation
 *   - Recycler search or discovery
 *   - Citizen→Recycler interactions
 *   - Maps (deferred future task)
 *   - Admin functionality
 *
 * API Endpoints (all verified from backend source):
 *   GET  /api/v1/collection-requests/available  — params: lat, lng, radiusKm, page, limit
 *   POST /api/v1/collection-requests/:id/accept — server-authoritative, requires online
 *
 * Source of Truth:
 *   docs/05_API_SPECIFICATION.md Sections 4, 7
 *   docs/07_BUSINESS_WORKFLOWS.md Section 2
 *   docs/08_UI_UX_SPECIFICATION.md
 *   docs/09_FRONTEND_ARCHITECTURE.md
 *   docs/13_SECURITY_PRIVACY.md
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { useNetwork } from '../../hooks/useNetwork';
import { TopAppBar } from '../../components/layout/TopAppBar';
import { Skeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { OfflineBanner } from '../../components/common/OfflineBanner';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EcoSetuMap, EcoSetuPin } from '../../components/map/EcoSetuMap';
import { getCurrentLocation } from '../../services/locationService';
import { collectorService } from '../../services/collectorService';
import { collectorSyncService } from '../../services/collectorSyncService';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { useI18n } from '../../i18n';
import { voiceService, AnnouncementPriority } from '../../services/voiceService';
import { AppIcon } from '../../components/ui/AppIcon';
import { AuthorizedImage } from '../../components/common/AuthorizedImage';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Canonical UserStatus values from Prisma schema */
const USER_STATUS = Object.freeze({
  PENDING_VERIFICATION: 'PENDING_VERIFICATION',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  DEACTIVATED: 'DEACTIVATED',
});

const PAGE_SIZE = 20; // Matches backend default (max 50)

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (iso?: string | null): string => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
};

const fmtTime = (iso?: string | null): string => {
  if (!iso) return '';
  try {
    // preferredTimeStart/End stored as 1970-01-01T{HH:mm}:00Z
    const d = new Date(iso);
    const h = d.getUTCHours().toString().padStart(2, '0');
    const m = d.getUTCMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  } catch {
    return '';
  }
};

const fmtCategory = (cat: string): string => {
  if (!cat) return '—';
  return cat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};

const summarizeCategories = (ewasteItems: any[]): string => {
  if (!Array.isArray(ewasteItems) || ewasteItems.length === 0) return '—';
  const cats = [...new Set(ewasteItems.map((i) => fmtCategory(i.category)))];
  return cats.slice(0, 2).join(', ') + (cats.length > 2 ? ` +${cats.length - 2}` : '');
};

const countTotalItems = (ewasteItems: any[]): number =>
  Array.isArray(ewasteItems)
    ? ewasteItems.reduce((sum, i) => sum + (parseInt(i.quantity) || 1), 0)
    : 0;

const totalEstimatedWeight = (ewasteItems: any[]): string => {
  if (!Array.isArray(ewasteItems) || ewasteItems.length === 0) return '';
  const total = ewasteItems.reduce((sum, i) => {
    const w = parseFloat(i.estimatedWeightKg);
    return sum + (isNaN(w) ? 0 : w);
  }, 0);
  return total > 0 ? `~${total.toFixed(1)} kg` : '';
};

const fmtStandardPrice = (priceObj: any): string | null => {
  if (!priceObj) return null;
  if (priceObj.minEstimate && priceObj.maxEstimate) {
    if (priceObj.minEstimate === priceObj.maxEstimate) {
      return `₹${priceObj.minEstimate}`;
    }
    return `₹${priceObj.minEstimate} - ₹${priceObj.maxEstimate}`;
  }
  if (priceObj.estimatedTotal) {
    return `₹${priceObj.estimatedTotal}`;
  }
  return null;
};

// ─── Loading Skeletons ─────────────────────────────────────────────────────────

const RequestCardSkeleton: React.FC = () => (
  <View style={skeletonStyles.card}>
    <View style={skeletonStyles.row}>
      <Skeleton width={40} height={40} borderRadius={20} />
      <View style={{ flex: 1, marginLeft: spacing.spaceSm }}>
        <Skeleton height={14} width="65%" style={{ marginBottom: 6 }} />
        <Skeleton height={12} width="45%" />
      </View>
      <Skeleton width={64} height={20} borderRadius={10} />
    </View>
    <View style={{ height: spacing.spaceXs }} />
    <Skeleton height={12} width="80%" style={{ marginBottom: 5 }} />
    <Skeleton height={12} width="60%" style={{ marginBottom: spacing.spaceSm }} />
    <Skeleton height={40} borderRadius={8} />
  </View>
);

const skeletonStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: spacing.spaceMd,
    marginBottom: spacing.spaceSm,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
});

// ─── Offer Modal Component ───────────────────────────────────────────────────

interface OfferModalProps {
  visible: boolean;
  request: any;
  isSubmitting: boolean;
  error: string | null;
  offeredPrice: string;
  notes: string;
  onChangePrice: (val: string) => void;
  onChangeNotes: (val: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}

const OfferModal: React.FC<OfferModalProps> = ({
  visible,
  request,
  isSubmitting,
  error,
  offeredPrice,
  notes,
  onChangePrice,
  onChangeNotes,
  onSubmit,
  onClose,
}) => {
  const { t } = useI18n();
  if (!request) return null;

  const firstItem = (request.ewasteItems || [])[0] || {};
  const primaryImage = firstItem?.imageUrl || (request.ewasteItems || []).find((i: any) => i.imageUrl)?.imageUrl;
  const categories = summarizeCategories(request.ewasteItems);
  const itemCount = countTotalItems(request.ewasteItems);
  const standardPriceStr = fmtStandardPrice(request.standardPrice);
  const hasExistingOffer = Boolean(request.myOffer);
  const aiPredCat = firstItem?.aiPredictions?.[0]?.predictedCategory || firstItem?.aiDetectedCategory;
  const confirmedCat = firstItem?.category ? fmtCategory(firstItem.category) : categories;
  const estWeight = totalEstimatedWeight(request.ewasteItems) || (firstItem?.estimatedWeightKg ? `~${firstItem.estimatedWeightKg} kg` : '');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={modalStyles.overlay} activeOpacity={1} onPress={onClose} />
      <View style={modalStyles.sheet}>
        <View style={modalStyles.sheetHandle} />

        <View style={modalStyles.header}>
          <Text style={modalStyles.title}>
            {hasExistingOffer ? 'Update Your Offer' : 'Place Pickup Offer'}
          </Text>
          <Text style={modalStyles.subtitle}>
            {confirmedCat} {estWeight ? `· ${estWeight}` : ''} ({itemCount} {itemCount === 1 ? 'item' : 'items'})
          </Text>
        </View>

        <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
          {/* Citizen's Uploaded Image Preview */}
          {primaryImage ? (
            <View style={modalStyles.imageBox}>
              <AuthorizedImage
                uri={primaryImage}
                style={modalStyles.imagePreview}
                resizeMode="cover"
                allowFullscreen={true}
                categoryLabel={confirmedCat}
              />
              <View style={modalStyles.imageBadge}>
                <AppIcon name="camera" size={12} color="#10B981" style={{ marginRight: 4 }} />
                <Text style={modalStyles.imageBadgeText}>Citizen Uploaded Photo · Tap to Zoom</Text>
              </View>
            </View>
          ) : (
            <View style={modalStyles.noImageBox}>
              <AppIcon name="alert" size={16} color="#EF4444" style={{ marginRight: 6 }} />
              <Text style={modalStyles.noImageText}>
                Material image required before submitting an offer.
              </Text>
            </View>
          )}

          {/* AI vs Citizen Category Comparison */}
          <View style={modalStyles.metaCard}>
            <View style={modalStyles.metaRow}>
              <Text style={modalStyles.metaLabel}>AI Suggestion:</Text>
              <Text style={modalStyles.metaVal}>
                {aiPredCat ? fmtCategory(aiPredCat) : 'Unclassified'}
              </Text>
            </View>
            <View style={modalStyles.metaRow}>
              <Text style={modalStyles.metaLabel}>Citizen Confirmed:</Text>
              <Text style={[modalStyles.metaVal, { color: '#34D399', fontWeight: '700' }]}>
                {confirmedCat}
              </Text>
            </View>
            {Boolean(firstItem?.condition) && (
              <View style={modalStyles.metaRow}>
                <Text style={modalStyles.metaLabel}>Condition:</Text>
                <Text style={modalStyles.metaVal}>{firstItem.condition}</Text>
              </View>
            )}
            {Boolean(request.distanceKm) && (
              <View style={modalStyles.metaRow}>
                <Text style={modalStyles.metaLabel}>Distance:</Text>
                <Text style={modalStyles.metaVal}>~{request.distanceKm} km away</Text>
              </View>
            )}
          </View>

          {/* Reference standard price banner if available */}
          {Boolean(standardPriceStr) && (
            <View style={modalStyles.standardPriceBox}>
              <AppIcon name="award" size={16} color="#10B981" />
              <View style={{ flex: 1 }}>
                <Text style={modalStyles.standardPriceLabel}>Standard Reference Price</Text>
                <Text style={modalStyles.standardPriceValue}>{standardPriceStr}</Text>
              </View>
            </View>
          )}

          {hasExistingOffer && (
            <View style={modalStyles.existingOfferNotice}>
              <AppIcon name="info" size={14} color="#38BDF8" />
              <Text style={modalStyles.existingOfferText}>
                Current offer: ₹{request.myOffer.offeredPrice} ({request.myOffer.status}). You can update your price.
              </Text>
            </View>
          )}

          {/* Offered Price Input */}
          <Text style={modalStyles.inputLabel}>Your Price Offer (₹) *</Text>
          <TextInput
            style={modalStyles.priceInput}
            value={offeredPrice}
            onChangeText={onChangePrice}
            placeholder="e.g. 2850"
            placeholderTextColor="#64748B"
            keyboardType="numeric"
            autoFocus
          />

          {/* Notes Input */}
          <Text style={modalStyles.inputLabel}>Notes for Citizen (Optional)</Text>
          <TextInput
            style={modalStyles.notesInput}
            value={notes}
            onChangeText={onChangeNotes}
            placeholder="e.g. Can collect today with digital weighing scale."
            placeholderTextColor="#64748B"
            multiline
            numberOfLines={2}
            textAlignVertical="top"
          />

          {Boolean(error) && <Text style={modalStyles.errorText}>{error}</Text>}
        </ScrollView>

        <View style={modalStyles.actionsRow}>
          <TouchableOpacity
            style={modalStyles.cancelBtn}
            onPress={onClose}
            disabled={isSubmitting}
          >
            <Text style={modalStyles.cancelBtnText}>{t('common.cancel') || 'Cancel'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              modalStyles.submitBtn,
              (isSubmitting || !primaryImage) && { opacity: 0.6 },
            ]}
            onPress={onSubmit}
            disabled={isSubmitting || !primaryImage}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={modalStyles.submitBtnText}>
                {hasExistingOffer ? 'Update Offer' : 'Submit Offer'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' },
  sheet: {
    backgroundColor: '#071E22',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.spaceMd,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#64748B',
    alignSelf: 'center',
    marginBottom: spacing.spaceSm,
  },
  header: { marginBottom: spacing.spaceSm },
  title: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  subtitle: { fontSize: 13, color: '#94A3B8', marginTop: 2 },
  imageBox: {
    height: 150,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.30)',
  },
  imagePreview: { width: '100%', height: '100%' },
  imageBadge: {
    position: 'absolute',
    bottom: 6,
    left: 8,
    backgroundColor: 'rgba(7, 30, 34, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageBadgeText: { fontSize: 10, color: '#34D399', fontWeight: '700' },
  noImageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.35)',
  },
  noImageText: { fontSize: 12, color: '#F87171', flex: 1, fontWeight: '600' },
  metaCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  metaLabel: { fontSize: 12, color: '#94A3B8' },
  metaVal: { fontSize: 12, color: '#FFFFFF', fontWeight: '600' },
  standardPriceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderRadius: 8,
    padding: 10,
    marginBottom: spacing.spaceSm,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.25)',
  },
  standardPriceLabel: { fontSize: 11, color: colors.primary, fontWeight: '600' },
  standardPriceValue: { fontSize: 14, color: colors.primary, fontWeight: '700' },
  existingOfferNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(56,189,248,0.1)',
    borderRadius: 8,
    padding: 8,
    marginBottom: spacing.spaceSm,
  },
  existingOfferText: { fontSize: 12, color: '#38BDF8', flex: 1 },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#CBD5E1',
    marginBottom: 4,
    marginTop: 4,
  },
  priceInput: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '800',
    marginBottom: spacing.spaceSm,
  },
  notesInput: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#FFFFFF',
    height: 60,
    marginBottom: spacing.spaceSm,
  },
  errorText: { fontSize: 12, color: '#F87171', marginBottom: spacing.spaceSm },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  cancelBtn: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: { color: '#94A3B8', fontSize: 14, fontWeight: '600' },
  submitBtn: {
    flex: 1.5,
    backgroundColor: '#10B981',
    borderRadius: 8,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: { color: '#02080D', fontSize: 14, fontWeight: '800' },
});

// ─── Request Item Card ─────────────────────────────────────────────────────────

interface RequestCardProps {
  request: any;
  isAccepting: boolean;
  isConnected: boolean;
  isVerified: boolean;
  onAccept: (requestId: string) => void;
  onOpenOfferModal: (request: any) => void;
  onReadAloud?: (request: any) => void;
}

const cardStyles = StyleSheet.create({
  container: {
    backgroundColor: '#071E22',
    borderRadius: 16,
    padding: spacing.spaceMd,
    marginBottom: spacing.spaceMd,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  badgeCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  offersPill: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.35)',
  },
  offersPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#38BDF8',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 10,
  },

  // ── Image preview in card ──
  cardImageBox: {
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  cardImagePreview: { width: '100%', height: '100%' },
  cardImageBadge: {
    position: 'absolute',
    bottom: 6,
    left: 8,
    backgroundColor: 'rgba(7, 30, 34, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardImageBadgeText: { fontSize: 10, color: '#34D399', fontWeight: '700' },
  missingImageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
  },
  missingImageText: { fontSize: 11.5, color: '#F87171', flex: 1, fontWeight: '600' },

  // ── AI vs Confirmed Box ──
  aiVsConfirmedBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  aiVsConfirmedText: {
    fontSize: 11.5,
    color: '#CBD5E1',
  },

  standardPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.10)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 8,
  },
  standardPriceText: {
    fontSize: 12,
    color: '#CBD5E1',
  },
  myOfferBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.30)',
  },
  myOfferText: {
    fontSize: 12,
    color: '#38BDF8',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginVertical: 3,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#CBD5E1',
    lineHeight: 18,
  },
  notesText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#94A3B8',
    marginTop: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    padding: 8,
    borderRadius: 6,
  },
  itemsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  itemChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
  },
  itemChipMore: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.30)',
  },
  itemChipText: {
    fontSize: 11.5,
    color: '#E2E8F0',
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  readAloudBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44,
  },
  readAloudBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6EE7B7',
  },
  offerButton: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44,
  },
  acceptButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  offerButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#02080D',
  },
  disabledHint: {
    fontSize: 11,
    color: '#94A3B8',
  },
});

const RequestCard = React.memo<RequestCardProps>(
  ({ request, isAccepting, isConnected, isVerified, onAccept, onOpenOfferModal, onReadAloud }) => {
    const { t } = useI18n();
    const firstItem = (request.ewasteItems || [])[0] || {};
    const primaryImage = firstItem?.imageUrl || (request.ewasteItems || []).find((i: any) => i.imageUrl)?.imageUrl;
    const hasImage = Boolean(primaryImage);
    const itemCount = countTotalItems(request.ewasteItems);
    const categories = summarizeCategories(request.ewasteItems);
    const estWeight = totalEstimatedWeight(request.ewasteItems) || (firstItem?.estimatedWeightKg ? `~${firstItem.estimatedWeightKg} kg` : '');
    const canAccept = isConnected && isVerified && !isAccepting && hasImage;
    const standardPriceStr = fmtStandardPrice(request.standardPrice);
    const offersCount = request.offersCount || 0;
    const myOffer = request.myOffer;
    const aiPredCat = firstItem?.aiPredictions?.[0]?.predictedCategory || firstItem?.aiDetectedCategory;
    const confirmedCat = firstItem?.category ? fmtCategory(firstItem.category) : categories;

    const preferredDateLabel =
      request.preferredDate ? fmtDate(request.preferredDate) : null;
    const timeStart = request.preferredTimeStart ? fmtTime(request.preferredTimeStart) : null;
    const timeEnd = request.preferredTimeEnd ? fmtTime(request.preferredTimeEnd) : null;
    const timeWindow =
      timeStart && timeEnd
        ? `${timeStart}–${timeEnd}`
        : timeStart
        ? timeStart
        : null;

    const accessLabel = [
      `Collection request: ${categories}`,
      `${itemCount} ${itemCount === 1 ? (t('collector.browse.item') || 'item') : (t('collector.browse.items') || 'items')}`,
      estWeight ? estWeight : '',
      preferredDateLabel ? `Preferred ${preferredDateLabel}` : '',
    ]
      .filter(Boolean)
      .join(', ');

    return (
      <View
        style={cardStyles.container}
        accessibilityRole="none"
        accessibilityLabel={accessLabel}
      >
        {/* ── Header row: icon + categories + item count ── */}
        <View style={cardStyles.headerRow}>
          <View style={cardStyles.iconCircle} accessibilityElementsHidden>
            <AppIcon name="package" size={20} color="#10B981" />
          </View>
          <View style={{ flex: 1, marginLeft: spacing.spaceSm }}>
            <Text style={cardStyles.categoryText} numberOfLines={1}>
              {confirmedCat}
            </Text>
            <Text style={cardStyles.subText}>
              {itemCount} {itemCount === 1 ? (t('collector.browse.item') || 'item') : (t('collector.browse.items') || 'items')}
              {estWeight ? ` · ${estWeight}` : ''}
              {firstItem?.condition ? ` · ${firstItem.condition}` : ''}
            </Text>
          </View>
          <View style={cardStyles.badgeCol}>
            <StatusBadge status="SUBMITTED" />
            <View style={cardStyles.offersPill}>
              <Text style={cardStyles.offersPillText}>
                {offersCount} {offersCount === 1 ? 'Offer' : 'Offers'}
              </Text>
            </View>
          </View>
        </View>

        <View style={cardStyles.divider} />

        {/* ── Citizen Uploaded Image Preview (MANDATORY BEFORE OFFERING) ── */}
        {hasImage ? (
          <View style={cardStyles.cardImageBox}>
            <AuthorizedImage
              uri={primaryImage}
              style={cardStyles.cardImagePreview}
              resizeMode="cover"
              allowFullscreen={true}
              categoryLabel={confirmedCat}
            />
            <View style={cardStyles.cardImageBadge}>
              <AppIcon name="camera" size={11} color="#10B981" style={{ marginRight: 4 }} />
              <Text style={cardStyles.cardImageBadgeText}>Citizen Uploaded Photo · Tap to Zoom</Text>
            </View>
          </View>
        ) : (
          <View style={cardStyles.missingImageBox}>
            <AppIcon name="alert" size={15} color="#EF4444" style={{ marginRight: 6 }} />
            <Text style={cardStyles.missingImageText}>
              Material image required before submitting an offer.
            </Text>
          </View>
        )}

        {/* ── AI vs Confirmed Category Transparency ── */}
        <View style={cardStyles.aiVsConfirmedBox}>
          <Text style={cardStyles.aiVsConfirmedText}>
            <Text style={{ color: '#94A3B8' }}>AI suggestion: </Text>
            <Text style={{ fontWeight: '700', color: '#E2E8F0' }}>{aiPredCat ? fmtCategory(aiPredCat) : 'Unclassified'}</Text>
            <Text style={{ color: '#94A3B8' }}> · Confirmed: </Text>
            <Text style={{ fontWeight: '700', color: '#34D399' }}>{confirmedCat}</Text>
          </Text>
        </View>

        {/* ── Standard Reference Price badge if available ── */}
        {Boolean(standardPriceStr) && (
          <View style={cardStyles.standardPriceRow}>
            <AppIcon name="award" size={13} color="#10B981" />
            <Text style={cardStyles.standardPriceText}>
              Standard Price: <Text style={{ fontWeight: '700', color: colors.primary }}>{standardPriceStr}</Text>
            </Text>
          </View>
        )}

        {/* ── My existing offer banner ── */}
        {Boolean(myOffer) && (
          <View style={cardStyles.myOfferBanner}>
            <AppIcon name="check" size={13} color="#38BDF8" />
            <Text style={cardStyles.myOfferText}>
              Your Offer: <Text style={{ fontWeight: '700' }}>₹{myOffer.offeredPrice}</Text> ({myOffer.status})
            </Text>
          </View>
        )}

        {/* ── Doorstep pickup address (Privacy-safe) ── */}
        <View style={cardStyles.infoRow}>
          <AppIcon name="location" size={14} color="#10B981" style={{ marginTop: 2 }} />
          <Text style={cardStyles.infoText} numberOfLines={4}>
            {request.pickupAddress || t('collector.browse.approximateLocation') || 'Approximate location'}
          </Text>
        </View>

        {/* ── Preferred pickup date ── */}
        {Boolean(preferredDateLabel) && (
          <View style={cardStyles.infoRow}>
            <AppIcon name="calendar" size={14} color="#10B981" style={{ marginTop: 2 }} />
            <Text style={cardStyles.infoText}>
              {t('collector.browse.preferred') || 'Preferred'}: {preferredDateLabel}
              {timeWindow ? ` · ${timeWindow}` : ''}
            </Text>
          </View>
        )}

        {/* ── Submission date ── */}
        <View style={cardStyles.infoRow}>
          <AppIcon name="clock" size={14} color="#94A3B8" style={{ marginTop: 2 }} />
          <Text style={cardStyles.infoText}>
            Submitted {fmtDate(request.createdAt || request.submittedAt)}
          </Text>
        </View>

        {/* ── Notes (if any) ── */}
        {Boolean(request.notes) && (
          <Text style={cardStyles.notesText} numberOfLines={3}>
            "{request.notes}"
          </Text>
        )}

        {/* ── E-waste item breakdown ── */}
        {Array.isArray(request.ewasteItems) && request.ewasteItems.length > 0 && (
          <View style={cardStyles.itemsRow}>
            {request.ewasteItems.slice(0, 3).map((item: any, idx: number) => (
              <View key={item.id || idx} style={cardStyles.itemChip}>
                <Text style={cardStyles.itemChipText} numberOfLines={1}>
                  {fmtCategory(item.category)}
                  {item.quantity && item.quantity > 1 ? ` ×${item.quantity}` : ''}
                </Text>
              </View>
            ))}
            {request.ewasteItems.length > 3 && (
              <View style={[cardStyles.itemChip, cardStyles.itemChipMore]}>
                <Text style={cardStyles.itemChipText}>
                  +{request.ewasteItems.length - 3} more
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ── Actions: Read Aloud & Place Offer ── */}
        <View style={cardStyles.actionsRow}>
          {Boolean(onReadAloud) && (
            <TouchableOpacity
              style={cardStyles.readAloudBtn}
              onPress={() => onReadAloud && onReadAloud(request)}
              accessibilityRole="button"
              accessibilityLabel={t('voice.readAloud') || 'Read Aloud'}
              accessibilityHint="Reads request summary aloud"
              activeOpacity={0.75}
            >
              <View style={styles.btnRow}>
                <AppIcon name="mic" size={14} color="#10B981" />
                <Text style={cardStyles.readAloudBtnText}>{t('voice.readAloud') || 'Read Aloud'}</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Place / Edit Offer button (Primary Bidding Workflow) */}
          <TouchableOpacity
            style={[
              cardStyles.offerButton,
              !canAccept && cardStyles.acceptButtonDisabled,
            ]}
            onPress={() => onOpenOfferModal(request)}
            disabled={!canAccept}
            activeOpacity={0.75}
          >
            <View style={styles.btnRow}>
              <AppIcon name="award" size={15} color="#FFFFFF" />
              <Text style={cardStyles.offerButtonText}>
                {myOffer ? `Edit Offer (₹${myOffer.offeredPrice})` : 'Place Offer'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Contextual disable hints ── */}
        {!isConnected && (
          <View style={[styles.rowCentered, { marginTop: 4 }]}>
            <AppIcon name="refresh" size={13} color="#94A3B8" />
            <Text
              style={cardStyles.disabledHint}
              accessibilityRole="text"
              accessibilityLabel="Internet connection required to place offers"
            >
              {t('collector.dashboard.offlineHint') || 'Internet required to place offers'}
            </Text>
          </View>
        )}
        {isConnected && !isVerified && (
          <View style={[styles.rowCentered, { marginTop: 4 }]}>
            <AppIcon name="lock" size={13} color={colors.warning} />
            <Text
              style={[cardStyles.disabledHint, { color: colors.warning }]}
              accessibilityRole="text"
              accessibilityLabel="Account verification required to place offers"
            >
              {t('collector.browse.verificationRequired') || 'Verification required to place offers'}
            </Text>
          </View>
        )}
      </View>
    );
  },
);

// ─── Load-more footer ─────────────────────────────────────────────────────────

const LoadMoreFooter: React.FC<{ isLoadingMore: boolean }> = ({ isLoadingMore }) => {
  if (!isLoadingMore) return <View style={{ height: spacing.spaceXl }} />;
  return (
    <View style={footerStyles.container} accessibilityRole="progressbar" accessibilityLabel="Loading more requests">
      <ActivityIndicator size="small" color={colors.primary} />
      <Text style={footerStyles.text}>Loading more…</Text>
    </View>
  );
};

const footerStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.spaceSm,
    padding: spacing.spaceMd,
  },
  text: { fontSize: 13, color: colors.textSecondary },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export const CollectorBrowseScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const { isConnected } = useNetwork();
  const { t, language } = useI18n();

  // ── Voice Assistance state ────────────────────────────────────────────────
  const [isVoiceEnabled, setIsVoiceEnabled] = useState<boolean>(false);
  const previousRequestIdsRef = useRef<Set<string>>(new Set());
  const hasInitialLoadRef = useRef<boolean>(false);

  useEffect(() => {
    voiceService.isVoiceAssistanceEnabled().then(setIsVoiceEnabled);
    const unsub = voiceService.subscribe(setIsVoiceEnabled);
    return () => unsub();
  }, []);

  const handleReadAloudRequest = useCallback(
    (req: any) => {
      const cats = summarizeCategories(req?.ewasteItems);
      const count = countTotalItems(req?.ewasteItems);
      const area = t('collector.browse.approximatePickupArea') || 'Approximate pickup area';
      const distText = req?.distanceKm ? ` ${req.distanceKm} km` : '';
      const spokenText = `${cats}, ${count} ${count === 1 ? (t('collector.browse.item') || 'item') : (t('collector.browse.items') || 'items')}. ${area}.${distText ? ' Distance: ' + distText : ''}`;

      voiceService.speak(spokenText, {
        priority: AnnouncementPriority.LOW,
        language,
        force: true,
      });
    },
    [language, t],
  );

  // ── Data state ─────────────────────────────────────────────────────────────
  const [requests, setRequests] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [fromCache, setFromCache] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isVerificationError, setIsVerificationError] = useState<boolean>(false);

  // ── View mode state (List vs Map) ───────────────────────────────────────────
  const [activeView, setActiveView] = useState<'LIST' | 'MAP'>('LIST');
  const [selectedMapRequest, setSelectedMapRequest] = useState<any | null>(null);
  const [collectorLocation, setCollectorLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationPermissionDenied, setLocationPermissionDenied] = useState<boolean>(false);

  // ── Accept state ───────────────────────────────────────────────────────────
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const acceptingRef = useRef<boolean>(false);
  const refreshingRef = useRef<boolean>(false);
  const loadingMoreRef = useRef<boolean>(false);

  // ── Offer Modal state ──────────────────────────────────────────────────────
  const [offerModalVisible, setOfferModalVisible] = useState<boolean>(false);
  const [offerTargetRequest, setOfferTargetRequest] = useState<any | null>(null);
  const [offeredPrice, setOfferedPrice] = useState<string>('');
  const [offerNotes, setOfferNotes] = useState<string>('');
  const [isSubmittingOffer, setIsSubmittingOffer] = useState<boolean>(false);
  const [offerError, setOfferError] = useState<string | null>(null);

  const handleOpenOfferModal = useCallback((req: any) => {
    setOfferTargetRequest(req);
    setOfferedPrice(req?.myOffer?.offeredPrice ? String(req.myOffer.offeredPrice) : '');
    setOfferNotes(req?.myOffer?.notes || '');
    setOfferError(null);
    setOfferModalVisible(true);
  }, []);

  const handleSubmitOffer = useCallback(async () => {
    if (!offerTargetRequest) return;
    const priceNum = parseFloat(offeredPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      setOfferError('Please enter a valid positive offer price in ₹.');
      return;
    }
    if (!isConnected) {
      setOfferError('An internet connection is required to submit offers.');
      return;
    }

    setIsSubmittingOffer(true);
    setOfferError(null);

    try {
      const payload: any = {
        offeredPrice: priceNum,
        notes: offerNotes.trim() || undefined,
      };
      const resultOffer = await collectorService.submitOffer(offerTargetRequest.id, payload);

      // Update state locally
      setRequests((prev) =>
        prev.map((r) => {
          if (r.id === offerTargetRequest.id) {
            const hadOffer = Boolean(r.myOffer);
            return {
              ...r,
              myOffer: resultOffer,
              offersCount: hadOffer ? r.offersCount : (r.offersCount || 0) + 1,
            };
          }
          return r;
        }),
      );

      if (selectedMapRequest?.id === offerTargetRequest.id) {
        setSelectedMapRequest((prev: any) =>
          prev
            ? {
                ...prev,
                myOffer: resultOffer,
                offersCount: prev.myOffer ? prev.offersCount : (prev.offersCount || 0) + 1,
              }
            : null,
        );
      }

      setOfferModalVisible(false);
      setOfferTargetRequest(null);
      setOfferedPrice('');
      setOfferNotes('');

      if (isVoiceEnabled) {
        voiceService.speak('Offer submitted successfully.', {
          priority: AnnouncementPriority.HIGH,
          language,
        });
      }

      Alert.alert(
        'Offer Submitted',
        `Your offer of ₹${priceNum} has been sent to the citizen. You will be notified when they accept.`,
        [{ text: t('common.done') || 'OK' }],
      );
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to submit offer. Please check your price and try again.';
      setOfferError(msg);
    } finally {
      setIsSubmittingOffer(false);
    }
  }, [offerTargetRequest, offeredPrice, offerNotes, isConnected, selectedMapRequest, isVoiceEnabled, language, t]);

  // ── Verification check ─────────────────────────────────────────────────────
  // Backend enforces this via checkVerified — we provide a UI hint only.
  const collectorStatus = user?.status;
  const isVerified = collectorStatus === USER_STATUS.ACTIVE;

  // ── On-demand "Use My Location" action ─────────────────────────────────────
  const handleUseMyLocation = useCallback(async () => {
    setIsLocating(true);
    setLocationPermissionDenied(false);

    try {
      const result = await getCurrentLocation();
      if (result.success && result.coords) {
        setCollectorLocation({
          latitude: result.coords.latitude,
          longitude: result.coords.longitude,
        });

        if (isConnected) {
          try {
            const res = await collectorService.getAvailableRequests({
              lat: result.coords.latitude,
              lng: result.coords.longitude,
              page: 1,
              limit: PAGE_SIZE,
            });
            setRequests(res.requests);
            setPagination(res.pagination);
            setFromCache(res.fromCache);
          } catch {
            // Non-fatal, local coordinates update is preserved
          }
        }
      } else if (result.error === 'PERMISSION_DENIED') {
        setLocationPermissionDenied(true);
        Alert.alert(
          t('collector.browse.locPermissionRequired') || 'Location Permission Required',
          t('collector.browse.locPermissionDenied') ||
            'Location permission was denied. Available requests remain visible on the map.',
          [{ text: t('common.done') || 'OK' }]
        );
      }
    } catch {
      // Non-fatal
    } finally {
      setIsLocating(false);
    }
  }, [isConnected, t]);

  // ── Transform available requests into approximate map pins ──────────────────
  const mapPins: EcoSetuPin[] = useMemo(() => {
    return requests
      .filter((r) => {
        const lat = parseFloat(r.pickupLat);
        const lng = parseFloat(r.pickupLng);
        return !isNaN(lat) && !isNaN(lng);
      })
      .map((r) => ({
        id: r.id,
        latitude: parseFloat(r.pickupLat),
        longitude: parseFloat(r.pickupLng),
        title: summarizeCategories(r.ewasteItems),
        description:
          t('collector.browse.approximatePickupArea') || 'Approximate Pickup Area',
        isApproximate: true,
        data: r,
      }));
  }, [requests, t]);

  // ── Load page 1 ────────────────────────────────────────────────────────────

  const loadRequests = useCallback(async (silent = false) => {
    if (!silent) setError(null);
    setIsVerificationError(false);

    try {
      const result = await collectorService.getAvailableRequests({ page: 1, limit: PAGE_SIZE });
      setRequests(result.requests);
      setPagination(result.pagination);
      setFromCache(result.fromCache);

      if (hasInitialLoadRef.current && isVoiceEnabled) {
        const newOnes = result.requests.filter((r: any) => !previousRequestIdsRef.current.has(r.id));
        if (newOnes.length > 0) {
          voiceService.speak(
            t('voice.newCollectionRequest') || 'New collection request available nearby.',
            { priority: AnnouncementPriority.HIGH, language }
          );
        }
      }
      hasInitialLoadRef.current = true;
      previousRequestIdsRef.current = new Set(result.requests.map((r: any) => r.id));
    } catch (err: any) {
      const status = err?.response?.status;
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Unable to load available requests.';

      if (status === 403) {
        // checkVerified returned 403 — collector not ACTIVE
        setIsVerificationError(true);
        setRequests([]);
        setPagination(null);
      } else {
        setError(msg);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isVoiceEnabled, language, t]);

  useEffect(() => {
    loadRequests(false);

    // Subscribe to dynamic realtime feed updates (from FCM / CollectorSyncService)
    const unsubscribeSync = collectorSyncService.subscribe((syncData) => {
      if (syncData && Array.isArray(syncData.availableRequests) && syncData.availableRequests.length > 0) {
        setRequests((prev) => {
          const map = new Map<string, any>();
          // Existing items
          prev.forEach((r) => map.set(String(r.id || r.requestId), r));
          // Merge newly available items
          syncData.availableRequests.forEach((r) => {
            const id = String(r.id || r.requestId);
            const existing = map.get(id);
            map.set(id, { ...existing, ...r });
          });
          const merged = Array.from(map.values());
          merged.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
          return merged;
        });
      }
    });

    return () => {
      unsubscribeSync();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Pull-to-refresh ────────────────────────────────────────────────────────

  const handleRefresh = useCallback(() => {
    if (refreshingRef.current) return; // Prevent double refresh
    refreshingRef.current = true;
    setIsRefreshing(true);
    loadRequests(true).finally(() => {
      refreshingRef.current = false;
    });
  }, [loadRequests]);

  // ── Load more (pagination) ─────────────────────────────────────────────────

  const handleLoadMore = useCallback(async () => {
    if (!isConnected) return; // No offline pagination
    if (loadingMoreRef.current) return;
    if (!pagination) return;
    const currentPage = pagination.page ?? 1;
    const totalPages = pagination.totalPages ?? 1;
    if (currentPage >= totalPages) return; // Already on last page

    loadingMoreRef.current = true;
    setIsLoadingMore(true);

    try {
      const nextPage = currentPage + 1;
      const result = await collectorService.getAvailableRequests({
        page: nextPage,
        limit: PAGE_SIZE,
      });
      // Append new results, avoiding duplicates by id
      setRequests((prev) => {
        const existingIds = new Set(prev.map((r) => r.id));
        const newItems = result.requests.filter((r: any) => !existingIds.has(r.id));
        return [...prev, ...newItems];
      });
      setPagination(result.pagination);
    } catch {
      // Non-fatal — just stop loading more
    } finally {
      loadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  }, [isConnected, pagination]);

  // ── Accept request ─────────────────────────────────────────────────────────

  const handleAccept = useCallback(
    async (requestId: string) => {
      if (acceptingRef.current) return;

      if (!isConnected) {
        Alert.alert(
          t('collector.browse.offlineAlert') || 'Offline',
          t('collector.browse.offlineAcceptMessage') || 'An internet connection is required to accept collection requests.\nReal-time availability check is required.',
          [{ text: t('common.done') || 'OK' }],
        );
        return;
      }

      if (!isVerified) {
        Alert.alert(
          t('collector.browse.verificationAlert') || 'Verification Required',
          t('collector.browse.verificationRequiredDesc') || 'Your account must be approved before you can accept collection requests.',
          [{ text: t('common.done') || 'OK' }],
        );
        return;
      }

      Alert.alert(
        t('collector.dashboard.acceptConfirmTitle') || 'Accept Request',
        t('collector.dashboard.acceptConfirmMessage') || 'Accept this collection request? You will be responsible for collecting the e-waste.',
        [
          { text: t('common.cancel') || 'Cancel', style: 'cancel' },
          {
            text: t('collector.dashboard.acceptRequest') || 'Accept',
            style: 'default',
            onPress: async () => {
              acceptingRef.current = true;
              setAcceptingId(requestId);

              try {
                const acceptResult: any = await collectorService.acceptRequest(requestId);
                const newPickupId = acceptResult?.pickup?.id || acceptResult?.data?.pickup?.id;

                // Remove accepted request from the list immediately
                setRequests((prev) => prev.filter((r) => r.id !== requestId));
                setSelectedMapRequest((prev: any) => (prev?.id === requestId ? null : prev));
                // Adjust pagination total if known
                setPagination((prev: any) =>
                  prev ? { ...prev, total: Math.max(0, (prev.total ?? 1) - 1) } : prev,
                );

                if (isVoiceEnabled) {
                  voiceService.speak(
                    t('voice.requestAccepted') || 'Collection request accepted.',
                    { priority: AnnouncementPriority.HIGH, language }
                  );
                }

                Alert.alert(
                  t('collector.dashboard.acceptSuccessTitle') || 'Request Accepted',
                  t('collector.dashboard.acceptSuccessMessage') || 'The citizen has been notified. A pickup has been scheduled for you.',
                  [
                    { text: t('common.done') || 'OK' },
                    ...(newPickupId
                      ? [
                          {
                            text: t('collector.pickups.pickupDetails') || 'View Details',
                            onPress: () => {
                              navigation?.navigate('CollectorPickups', {
                                screen: 'CollectorPickupDetail',
                                params: { pickupId: newPickupId },
                              });
                            },
                          },
                        ]
                      : []),
                  ],
                );
              } catch (err: any) {
                const status = err?.response?.status;
                const msg = err?.response?.data?.message || err?.message || (t('collector.dashboard.error') || 'Failed to accept request.');

                if (status === 409) {
                  // Another collector already accepted this — remove from list
                  setRequests((prev) => prev.filter((r) => r.id !== requestId));
                  setSelectedMapRequest((prev: any) => (prev?.id === requestId ? null : prev));
                  if (isVoiceEnabled) {
                    voiceService.speak(
                      t('collector.dashboard.conflictMessage') || 'This request was just accepted by another collector.',
                      { priority: AnnouncementPriority.HIGH, language }
                    );
                  }
                  Alert.alert(
                    t('collector.dashboard.conflictTitle') || 'Request No Longer Available',
                    t('collector.dashboard.conflictMessage') || 'This request was just accepted by another collector.',
                    [{ text: t('common.done') || 'OK' }],
                  );
                } else if (status === 403) {
                  Alert.alert(
                    t('collector.dashboard.accessDenied') || 'Access Denied',
                    t('collector.dashboard.accessDeniedMessage') || 'You do not have permission to accept this request. Ensure your account is verified.',
                    [{ text: t('common.done') || 'OK' }],
                  );
                } else if (status === 404) {
                  setRequests((prev) => prev.filter((r) => r.id !== requestId));
                  setSelectedMapRequest((prev: any) => (prev?.id === requestId ? null : prev));
                  Alert.alert(
                    t('collector.dashboard.notFoundTitle') || 'Request Not Found',
                    t('collector.dashboard.notFoundMessage') || 'This request may have been cancelled or already accepted.',
                    [{ text: t('common.done') || 'OK' }],
                  );
                } else if (status === 429) {
                  Alert.alert(
                    'Too Many Requests',
                    'You are sending requests too quickly. Please try again in a moment.',
                    [{ text: t('common.done') || 'OK' }],
                  );
                } else if (err?.isOfflineError) {
                  Alert.alert(
                    t('collector.browse.offlineAlert') || 'Offline',
                    t('collector.browse.offlineAcceptMessage') || 'Cannot accept requests without an internet connection.',
                    [{ text: t('common.done') || 'OK' }],
                  );
                } else {
                  Alert.alert(t('common.error') || 'Error', msg, [{ text: t('common.done') || 'OK' }]);
                }
              } finally {
                acceptingRef.current = false;
                setAcceptingId(null);
              }
            },
          },
        ],
        { cancelable: true },
      );
    },
    [isConnected, isVerified, isVoiceEnabled, language, navigation, t],
  );

  // ── Render helpers ─────────────────────────────────────────────────────────

  const renderItem = useCallback(
    ({ item }: { item: any }) => (
      <RequestCard
        request={item}
        isAccepting={acceptingId === item.id}
        isConnected={isConnected}
        isVerified={isVerified}
        onAccept={handleAccept}
        onOpenOfferModal={handleOpenOfferModal}
        onReadAloud={handleReadAloudRequest}
      />
    ),
    [acceptingId, isConnected, isVerified, handleAccept, handleOpenOfferModal, handleReadAloudRequest],
  );

  const keyExtractor = useCallback((item: any) => item.id, []);

  // ─── Initial loading state ────────────────────────────────────────────────

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <TopAppBar
          title="Available Requests"
          subtitle="Browse collection opportunities"
          roleBadge="INFORMAL_COLLECTOR"
        />
        <View style={styles.scrollContent}>
          {[0, 1, 2].map((i) => (
            <RequestCardSkeleton key={i} />
          ))}
        </View>
      </SafeAreaView>
    );
  }

  // ─── Main render ──────────────────────────────────────────────────────────

  const totalCount = pagination?.total ?? requests.length;
  const subtitle =
    totalCount > 0
      ? `${totalCount} ${totalCount === 1 ? (t('collector.browse.item') || 'request') : (t('collector.browse.items') || 'requests')} ${t('collector.browse.availableBadge') || 'available'}`
      : (t('collector.browse.subtitle') || 'Browse collection opportunities');

  return (
    <SafeAreaView style={styles.container}>
      <TopAppBar
        title={t('collector.browse.title') || 'Available Requests'}
        subtitle={subtitle}
        roleBadge="INFORMAL_COLLECTOR"
      />

      {/* ── Segmented View Toggle (List vs Map) ── */}
      <View style={styles.viewToggleBar}>
        <TouchableOpacity
          style={[styles.toggleBtn, activeView === 'LIST' && styles.toggleBtnActive]}
          onPress={() => setActiveView('LIST')}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeView === 'LIST' }}
          accessibilityLabel={t('collector.browse.list') || 'List view'}
          activeOpacity={0.8}
        >
          <View style={styles.btnRow}>
            <AppIcon name="clipboard" size={15} color={activeView === 'LIST' ? '#FFFFFF' : '#94A3B8'} />
            <Text style={[styles.toggleBtnText, activeView === 'LIST' && styles.toggleBtnTextActive]}>
              {t('collector.browse.list') || 'List'}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, activeView === 'MAP' && styles.toggleBtnActive]}
          onPress={() => setActiveView('MAP')}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeView === 'MAP' }}
          accessibilityLabel={t('collector.browse.map') || 'Map view'}
          activeOpacity={0.8}
        >
          <View style={styles.btnRow}>
            <AppIcon name="location" size={15} color={activeView === 'MAP' ? '#FFFFFF' : '#94A3B8'} />
            <Text style={[styles.toggleBtnText, activeView === 'MAP' && styles.toggleBtnTextActive]}>
              {t('collector.browse.map') || 'Map'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* ── Account status banners ── */}
      {collectorStatus === USER_STATUS.SUSPENDED && (
        <View style={styles.alertBanner} accessibilityRole="alert">
          <View style={styles.rowCentered}>
            <AppIcon name="warning" size={15} color="#B71C1C" />
            <Text style={[styles.alertText, { color: '#B71C1C' }]}>
              {t('collector.dashboard.suspendedNotice') || 'Your account is suspended. You cannot place offers. Contact support.'}
            </Text>
          </View>
        </View>
      )}
      {collectorStatus === USER_STATUS.DEACTIVATED && (
        <View style={styles.alertBanner} accessibilityRole="alert">
          <View style={styles.rowCentered}>
            <AppIcon name="warning" size={15} color="#B71C1C" />
            <Text style={[styles.alertText, { color: '#B71C1C' }]}>
              {t('collector.dashboard.deactivatedNotice') || 'This account has been deactivated.'}
            </Text>
          </View>
        </View>
      )}
      {collectorStatus === USER_STATUS.PENDING_VERIFICATION && (
        <View style={[styles.alertBanner, { backgroundColor: '#FFF3E0' }]} accessibilityRole="alert">
          <View style={styles.rowCentered}>
            <AppIcon name="clock" size={15} color="#BF360C" />
            <Text style={[styles.alertText, { color: '#BF360C' }]}>
              {t('collector.dashboard.pendingNotice') || 'Pending verification. Available requests shown after your account is approved.'}
            </Text>
          </View>
        </View>
      )}

      {activeView === 'MAP' ? (
        <View style={styles.mapViewContainer}>
          {/* Map Offline Notice */}
          {!isConnected && (
            <View style={styles.mapOfflineNotice}>
              <View style={styles.rowCentered}>
                <AppIcon name="refresh" size={12} color="#FFFFFF" />
                <Text style={styles.mapOfflineNoticeText}>
                  {t('collector.dashboard.offlineHint') || 'Internet required to place offers'}
                </Text>
              </View>
            </View>
          )}

          {/* EcoSetuMap with Unified Glass HUD */}
          <EcoSetuMap
            latitude={
              collectorLocation?.latitude ||
              (mapPins.length > 0 ? mapPins[0].latitude : 19.3149)
            }
            longitude={
              collectorLocation?.longitude ||
              (mapPins.length > 0 ? mapPins[0].longitude : 84.7941)
            }
            pins={mapPins}
            onPinPress={(pin) => setSelectedMapRequest(pin.data)}
            showApproximateCircles={true}
            circleRadius={700}
            draggable={false}
            showMapTypeControl={true}
            showZoomControls={true}
            showMyLocationButton={true}
            showRecenterButton={true}
            controlsTopOffset={14}
            showCoordinatesPill={false}
            onLocationChange={(lat, lng) => {
              setCollectorLocation({ latitude: lat, longitude: lng });
            }}
            isOffline={!isConnected && mapPins.length === 0}
            permissionDenied={locationPermissionDenied}
            onRequestPermission={handleUseMyLocation}
            style={styles.fullScreenMap}
          />

          {/* Selected Request Detail Card */}
          {selectedMapRequest && (
            <View
              style={styles.selectedCard}
              accessibilityRole="none"
              accessibilityLabel="Selected request details"
            >
              <View style={styles.selectedCardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.selectedCardCategory} numberOfLines={1}>
                    {summarizeCategories(selectedMapRequest.ewasteItems)}
                  </Text>
                  <Text style={styles.selectedCardSub}>
                    {countTotalItems(selectedMapRequest.ewasteItems)}{' '}
                    {countTotalItems(selectedMapRequest.ewasteItems) === 1
                      ? (t('collector.browse.item') || 'item')
                      : (t('collector.browse.items') || 'items')}
                    {totalEstimatedWeight(selectedMapRequest.ewasteItems)
                      ? ` · ${totalEstimatedWeight(selectedMapRequest.ewasteItems)}`
                      : ''}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.closeCardBtn}
                  onPress={() => setSelectedMapRequest(null)}
                  accessibilityRole="button"
                  accessibilityLabel={t('collector.browse.closeDetails') || 'Close'}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <AppIcon name="close" size={14} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              <View style={styles.selectedDivider} />

              {/* Standard Price in Map detail if present */}
              {Boolean(fmtStandardPrice(selectedMapRequest.standardPrice)) && (
                <View style={styles.selectedInfoRow}>
                  <AppIcon name="award" size={14} color="#10B981" style={{ marginTop: 2, marginRight: 6 }} />
                  <Text style={styles.selectedInfoText}>
                    Standard Price: <Text style={{ fontWeight: '700', color: colors.primary }}>{fmtStandardPrice(selectedMapRequest.standardPrice)}</Text>
                  </Text>
                </View>
              )}

              {/* My Offer if present */}
              {Boolean(selectedMapRequest.myOffer) && (
                <View style={styles.selectedInfoRow}>
                  <AppIcon name="check" size={14} color="#38BDF8" style={{ marginTop: 2, marginRight: 6 }} />
                  <Text style={[styles.selectedInfoText, { color: '#38BDF8' }]}>
                    Your Offer: ₹{selectedMapRequest.myOffer.offeredPrice} ({selectedMapRequest.myOffer.status})
                  </Text>
                </View>
              )}

              <View style={styles.selectedInfoRow}>
                <AppIcon name="location" size={14} color="#10B981" style={{ marginTop: 2, marginRight: 6 }} />
                <Text style={styles.selectedInfoText} numberOfLines={2}>
                  {selectedMapRequest.pickupAddress ||
                    t('collector.browse.approximateLocation') ||
                    'Approximate Location'}
                </Text>
              </View>

              {Boolean(selectedMapRequest.distanceKm) && (
                <View style={styles.selectedInfoRow}>
                  <AppIcon name="mapPin" size={14} color="#38BDF8" style={{ marginTop: 2, marginRight: 6 }} />
                  <Text style={styles.selectedInfoText}>
                    {t('collector.browse.distance') || 'Distance'}: ~{selectedMapRequest.distanceKm} km
                  </Text>
                </View>
              )}

              <View style={styles.selectedPrivacyNote}>
                <View style={styles.rowCentered}>
                  <AppIcon name="lock" size={13} color="#94A3B8" />
                  <Text style={styles.selectedPrivacyText}>
                    {t('collector.browse.exactLocationAfterAcceptance') || 'Exact location available after acceptance'}
                  </Text>
                </View>
              </View>

              <View style={styles.selectedActionsRow}>
                <TouchableOpacity
                  style={styles.selectedReadAloudBtn}
                  onPress={() => handleReadAloudRequest(selectedMapRequest)}
                  accessibilityRole="button"
                  accessibilityLabel={t('voice.readAloud') || 'Read Aloud'}
                  accessibilityHint="Reads request summary aloud"
                  activeOpacity={0.75}
                >
                  <View style={styles.btnRow}>
                    <AppIcon name="mic" size={14} color="#10B981" />
                    <Text style={styles.selectedReadAloudBtnText}>{t('voice.readAloud') || 'Read Aloud'}</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.selectedAcceptBtn,
                    { flex: 1, marginTop: 0 },
                    (!isConnected || !isVerified) && styles.selectedAcceptBtnDisabled,
                  ]}
                  onPress={() => handleOpenOfferModal(selectedMapRequest)}
                  disabled={!isConnected || !isVerified}
                  activeOpacity={0.8}
                >
                  <View style={styles.btnRow}>
                    <AppIcon name="award" size={15} color="#FFFFFF" />
                    <Text style={styles.selectedAcceptBtnText}>
                      {selectedMapRequest.myOffer ? `Edit Offer (₹${selectedMapRequest.myOffer.offeredPrice})` : 'Place Offer'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Summary / Guidance Card when no pin is selected */}
          {!selectedMapRequest && (
            <View
              style={styles.mapSummaryCard}
              accessibilityRole="summary"
              accessibilityLabel="Available requests summary"
            >
              <View style={styles.mapSummaryHeader}>
                <View style={styles.radarBadgeRow}>
                  <View style={styles.rowCentered}>
                    <AppIcon name="location" size={16} color="#10B981" />
                    <Text style={styles.mapSummaryTitle}>
                      {mapPins.length} {t('collector.browse.nearbyRequests') || 'Neighborhood Pickup Zones'}
                    </Text>
                  </View>
                  <View style={styles.radarLivePill}>
                    <Text style={styles.radarLiveText}>RADAR ACTIVE</Text>
                  </View>
                </View>
                <Text style={styles.mapSummarySub}>
                  {mapPins.length > 0
                    ? 'Each green zone is a ~1.1 km approximate area where citizens have requested doorstep pickup. Tap a zone to inspect items & place offer.'
                    : 'Searching for open collection requests nearby. Tap Locate Me or pull list to scan for new pickups.'}
                </Text>
              </View>

              <View style={styles.mapSummaryActionsRow}>
                {mapPins.length > 0 && (
                  <TouchableOpacity
                    style={styles.inspectFirstBtn}
                    onPress={() => setSelectedMapRequest(mapPins[0].data)}
                    accessibilityRole="button"
                    accessibilityLabel={t('collector.browse.viewRequest') || 'Inspect Nearest Request'}
                    activeOpacity={0.8}
                  >
                    <View style={styles.btnRow}>
                      <AppIcon name="search" size={14} color="#10B981" />
                      <Text style={styles.inspectFirstBtnText}>
                        {t('collector.browse.viewRequest') || 'Inspect Nearest'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.switchToListBtn}
                  onPress={() => setActiveView('LIST')}
                  accessibilityRole="button"
                  accessibilityLabel="Switch to List View"
                  activeOpacity={0.8}
                >
                  <View style={styles.btnRow}>
                    <AppIcon name="clipboard" size={14} color="#CBD5E1" />
                    <Text style={styles.switchToListBtnText}>List View</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      ) : (
        <FlatList
          data={requests}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListHeaderComponent={
            <>
              {/* ── Offline banner ── */}
              {!isConnected && <OfflineBanner />}

              {/* ── Stale cache notice ── */}
              {fromCache && (
                <View style={styles.cacheNotice}>
                  <View style={styles.rowCentered}>
                    <AppIcon name="refresh" size={14} color="#F59E0B" />
                    <Text style={styles.cacheNoticeText}>
                      {t('offline.cachedNotice') || 'Showing cached requests (last synced while online)'}
                    </Text>
                  </View>
                </View>
              )}

              {/* ── Privacy note ── */}
              <View style={styles.privacyNote}>
                <View style={styles.rowCentered}>
                  <AppIcon name="lock" size={14} color="#10B981" />
                  <Text style={styles.privacyNoteText}>
                    {t('collector.browse.privacyBanner') || 'Exact pickup address is revealed only after an offer is accepted.'}
                  </Text>
                </View>
              </View>

              {/* ── Verification required state ── */}
              {isVerificationError && (
                <EmptyState
                  icon="lock"
                  title={t('collector.browse.verificationRequired') || 'Verification Required'}
                  message={t('collector.browse.verificationRequiredDesc') || 'Your account must be approved before you can browse available collection requests.'}
                />
              )}

              {/* ── Error state ── */}
              {Boolean(error) && !isVerificationError && (
                <View style={styles.errorCard} accessibilityRole="alert">
                  <Text style={styles.errorText}>{error}</Text>
                  <TouchableOpacity
                    onPress={handleRefresh}
                    style={styles.retryBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Retry loading available requests"
                  >
                    <Text style={styles.retryBtnText}>{t('collector.dashboard.retry') || 'Try Again'}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          }
          ListEmptyComponent={
            !error && !isVerificationError ? (
              <EmptyState
                icon="search"
                title={t('collector.browse.noRequestsTitle') || 'No Requests Available'}
                message={
                  !isConnected && !fromCache
                    ? (t('collector.browse.noRequestsDesc') || 'You are offline and no cached requests are available. Go online and pull down to refresh.')
                    : (t('collector.browse.noRequestsDesc') || 'There are no collection requests available in your service area right now. Pull down to refresh.')
                }
                actionLabel={isConnected ? (t('collector.dashboard.refresh') || 'Refresh') : undefined}
                onAction={isConnected ? handleRefresh : undefined}
              />
            ) : null
          }
          ListFooterComponent={<LoadMoreFooter isLoadingMore={isLoadingMore} />}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
        />
      )}

      {/* ── Offer Modal ── */}
      <OfferModal
        visible={offerModalVisible}
        request={offerTargetRequest}
        isSubmitting={isSubmittingOffer}
        error={offerError}
        offeredPrice={offeredPrice}
        notes={offerNotes}
        onChangePrice={setOfferedPrice}
        onChangeNotes={setOfferNotes}
        onSubmit={handleSubmitOffer}
        onClose={() => {
          setOfferModalVisible(false);
          setOfferTargetRequest(null);
        }}
      />
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.spaceMd,
  },
  listContent: {
    padding: spacing.spaceMd,
    paddingBottom: spacing.spaceXl,
  },

  // ── Segmented view toggle ──
  viewToggleBar: {
    flexDirection: 'row',
    marginHorizontal: spacing.spaceMd,
    marginVertical: spacing.spaceXs,
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  toggleBtn: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: colors.primary,
  },
  toggleBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  toggleBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // ── Map view container & overlay HUD ──
  mapViewContainer: {
    flex: 1,
    position: 'relative',
  },
  fullScreenMap: {
    flex: 1,
    width: '100%',
    height: '100%',
    borderRadius: 0,
    marginVertical: 0,
    borderWidth: 0,
  },
  mapHeaderRow: {
    position: 'absolute',
    top: 10,
    left: 12,
    right: 12,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  privacyBadge: {
    backgroundColor: 'rgba(10, 26, 13, 0.88)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    elevation: 3,
  },
  privacyBadgeText: {
    fontSize: 11,
    color: colors.primaryLight,
    fontWeight: '600',
  },
  myLocationBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    minHeight: 48,
    minWidth: 48,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  myLocationBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  mapOfflineNotice: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    zIndex: 9,
    backgroundColor: 'rgba(211, 47, 47, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  mapOfflineNoticeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },

  // ── Selected Pin Bottom Card ──
  selectedCard: {
    position: 'absolute',
    bottom: 14,
    left: 12,
    right: 82,
    zIndex: 10,
    backgroundColor: 'rgba(6, 21, 27, 0.95)',
    borderRadius: 14,
    padding: spacing.spaceMd,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  mapSummaryCard: {
    position: 'absolute',
    bottom: 14,
    left: 12,
    right: 82,
    zIndex: 10,
    backgroundColor: 'rgba(6, 21, 27, 0.92)',
    borderRadius: 14,
    padding: spacing.spaceSm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  mapSummaryHeader: {
    marginBottom: 6,
  },
  mapSummaryTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#34D399',
  },
  mapSummarySub: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.70)',
    marginTop: 2,
    lineHeight: 15,
  },
  radarBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  radarLivePill: {
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  radarLiveText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#34D399',
    letterSpacing: 0.5,
  },
  mapSummaryActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  inspectFirstBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.20)',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 38,
  },
  inspectFirstBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#34D399',
  },
  switchToListBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 38,
  },
  switchToListBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  selectedCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  selectedCardCategory: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  selectedCardSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeCardBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.spaceSm,
  },
  closeCardBtnText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: 'bold',
  },
  selectedDivider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.spaceXs,
  },
  selectedInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 4,
  },
  selectedInfoIcon: {
    fontSize: 12,
    marginTop: 2,
  },
  selectedInfoText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  selectedPrivacyNote: {
    backgroundColor: `${colors.secondary}12`,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginVertical: spacing.spaceXs,
  },
  selectedPrivacyText: {
    fontSize: 11,
    color: colors.secondary,
    lineHeight: 16,
  },
  selectedActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.spaceSm,
    marginTop: spacing.spaceXs,
  },
  selectedReadAloudBtn: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    minHeight: 48,
    paddingHorizontal: spacing.spaceSm + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedReadAloudBtnText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  selectedAcceptBtn: {
    marginTop: spacing.spaceXs,
    backgroundColor: colors.primary,
    borderRadius: 8,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedAcceptBtnDisabled: {
    opacity: 0.4,
  },
  selectedAcceptBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // ── Banners ──
  alertBanner: {
    backgroundColor: '#FFEBEE',
    padding: spacing.spaceMd,
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
  },
  alertText: {
    fontSize: 13,
    lineHeight: 19,
  },
  cacheNotice: {
    backgroundColor: '#FFF9C4',
    borderRadius: 6,
    padding: spacing.spaceXs,
    marginBottom: spacing.spaceSm,
  },
  cacheNoticeText: {
    fontSize: 12,
    color: '#F57F17',
  },
  privacyNote: {
    backgroundColor: `${colors.secondary}10`,
    borderRadius: 6,
    padding: spacing.spaceXs,
    marginBottom: spacing.spaceSm,
  },
  privacyNoteText: {
    fontSize: 11,
    color: colors.secondary,
    lineHeight: 16,
  },

  // ── Error card ──
  errorCard: {
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: spacing.spaceMd,
    marginBottom: spacing.spaceMd,
  },
  errorText: {
    fontSize: 13,
    color: colors.error,
    marginBottom: spacing.spaceSm,
    lineHeight: 19,
  },
  retryBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.spaceMd,
    paddingVertical: spacing.spaceXs + 2,
    backgroundColor: colors.primary,
    borderRadius: 6,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  rowCentered: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});

export default CollectorBrowseScreen;
