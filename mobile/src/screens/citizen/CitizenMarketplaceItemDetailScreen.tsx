/**
 * CitizenMarketplaceItemDetailScreen — COMPLETE REBUILD
 * Consumer product detail page.
 * Goal: USER DECIDES TO BUY / MAKE OFFER with full product context.
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useI18n } from '../../i18n';
import { useNetwork } from '../../hooks/useNetwork';
import { EcoSetuBackground } from '../../components/glass/EcoSetuBackground';
import { AppIcon } from '../../components/ui/AppIcon';
import { quoteService } from '../../services/quoteService';
import { MaterialLotItem } from '../../services/materialLotService';
import { MATERIAL_TAXONOMY } from '../../config/materialTaxonomy';
import { colors } from '../../theme/colors';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function conditionMeta(condition: string) {
  switch (condition) {
    case 'WORKING':
    case 'TESTED_WORKING':
      return { label: 'Tested & Working', desc: 'Powers on. Core functions verified by collector.', color: '#10B981', bg: 'rgba(16,185,129,0.15)' };
    case 'REPAIRABLE':
    case 'PARTIALLY_WORKING':
      return { label: 'Repairable', desc: 'Has issues. Good for repair, parts, or projects.', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' };
    case 'REFURBISHED':
      return { label: 'Refurbished', desc: 'Restored to working condition.', color: '#60A5FA', bg: 'rgba(59,130,246,0.12)' };
    default:
      return { label: condition || 'Reusable', desc: 'Usable electronic item.', color: '#A78BFA', bg: 'rgba(139,92,246,0.12)' };
  }
}

// ─── Make Offer Modal ─────────────────────────────────────────────────────────

interface OfferModalProps {
  visible: boolean;
  askingPrice: number | null;
  initialPrice: string;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (amount: number, notes: string) => void;
}

const OfferModal: React.FC<OfferModalProps> = ({
  visible, askingPrice, initialPrice, isSubmitting, onClose, onSubmit,
}) => {
  const { t } = useI18n();
  const [price, setPrice] = useState(initialPrice);
  const [notes, setNotes] = useState('');

  const parsed = parseFloat(price);
  const isValid = !isNaN(parsed) && parsed > 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose} />
      <View style={styles.modalSheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.modalTitle}>{t('marketplace.makeCustomOffer', 'Make an Offer')}</Text>

        {askingPrice && askingPrice > 0 && (
          <View style={styles.askingPriceBox}>
            <Text style={styles.askingLabel}>{t('marketplace.sellerAskingPrice', 'Asking price')}</Text>
            <Text style={styles.askingValue}>₹{Number(askingPrice).toLocaleString('en-IN')}</Text>
          </View>
        )}

        <Text style={styles.modalFieldLabel}>{t('marketplace.offerPriceLabel', 'Your Offer (₹) *')}</Text>
        <TextInput
          style={styles.modalInput}
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
          placeholder={t('marketplace.offerPriceLabel', 'Enter amount')}
          placeholderTextColor="rgba(255,255,255,0.30)"
          autoFocus
          returnKeyType="next"
          accessibilityLabel="Offer amount"
        />

        <Text style={styles.modalFieldLabel}>{t('marketplace.offerNotesLabel', 'Note to seller (optional)')}</Text>
        <TextInput
          style={[styles.modalInput, styles.modalTextArea]}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          placeholder={t('marketplace.offerNotesLabel', 'Why you want this, pickup flexibility…')}
          placeholderTextColor="rgba(255,255,255,0.30)"
          textAlignVertical="top"
          accessibilityLabel="Note to seller"
        />

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }}>
          <AppIcon name="info" size={14} color="#34D399" />
          <Text style={[styles.modalNote, { marginTop: 0, flex: 1 }]}>
            {t('marketplace.bannerDesc', 'The seller reviews your offer and can accept, counter, or decline.')}
          </Text>
        </View>

        <View style={styles.modalActions}>
          <TouchableOpacity style={styles.modalCancelBtn} onPress={onClose} disabled={isSubmitting}>
            <Text style={styles.modalCancelText}>{t('common.cancel', 'Cancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modalSubmitBtn, !isValid && styles.modalSubmitDisabled]}
            onPress={() => isValid && onSubmit(parsed, notes.trim())}
            disabled={!isValid || isSubmitting}
          >
            {isSubmitting
              ? <ActivityIndicator size="small" color="#FFF" />
              : <Text style={styles.modalSubmitText}>{t('marketplace.sendOffer', 'Send Offer')}</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export const CitizenMarketplaceItemDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { isConnected } = useNetwork();
  const { t } = useI18n();

  const lot: MaterialLotItem = route.params?.lot;
  const lotId: string = route.params?.lotId || lot?.id;

  const [selectedPhoto, setSelectedPhoto] = useState(0);
  const [showOffer, setShowOffer] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cat = MATERIAL_TAXONOMY[lot?.category || 'OTHER'] || { symbol: '', defaultName: 'Electronics' };
  const cond = conditionMeta(lot?.condition || '');
  const photos = lot?.photos?.length ? lot.photos : [];
  const hasAskingPrice = lot?.askingPrice && lot.askingPrice > 0;
  const priceStr = hasAskingPrice ? `₹${Number(lot.askingPrice).toLocaleString('en-IN')}` : t('marketplace.makeCustomOffer', 'Open for Offers');

  const submitOffer = async (amount: number, notes: string) => {
    if (!isConnected) {
      Alert.alert(t('common.offline', 'Offline'), t('citizen.profile.offlineError', 'An internet connection is required to submit offers.'));
      return;
    }
    setIsSubmitting(true);
    try {
      await quoteService.submitCitizenOffer({
        materialLotId: lotId,
        offeredPrice: amount,
        notes: notes || 'Citizen purchase offer.',
      });
      setShowOffer(false);
      Alert.alert(
        t('marketplace.offerSubmitted', 'Offer Sent'),
        t('marketplace.offerSubmittedDesc', 'Your offer has been sent. You can track the seller\'s response in My Orders.'),
        [
          { text: t('marketplace.viewPurchases', 'View My Orders'), onPress: () => navigation.navigate('CitizenPurchases') },
          { text: t('common.done', 'Done'), onPress: () => navigation.goBack() },
        ],
      );
    } catch (err: any) {
      Alert.alert(t('common.error', 'Error'), err?.message || 'Failed to submit offer. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBuyAtPrice = () => {
    if (!hasAskingPrice) { setShowOffer(true); return; }
    Alert.alert(
      t('marketplace.confirmBuyTitle', 'Confirm Offer'),
      `${t('marketplace.confirmOffer', 'Send a purchase offer at the asking price of')} ${priceStr}?`,
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        { text: t('marketplace.sendOffer', 'Send Offer'), onPress: () => submitOffer(Number(lot.askingPrice), 'Buying at asking price.') },
      ],
    );
  };

  if (!lot) {
    return (
      <EcoSetuBackground>
        <SafeAreaView style={styles.safe}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <AppIcon name="arrowLeft" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.centerBox}>
            <AppIcon name="alert" size={40} color="#F59E0B" />
            <Text style={[styles.errorText, { marginTop: 12 }]}>Item details not available.</Text>
          </View>
        </SafeAreaView>
      </EcoSetuBackground>
    );
  }

  return (
    <EcoSetuBackground>
      <View style={styles.safe}>

        {/* ── Photo Gallery (full width, no SafeArea padding) ── */}
        <View style={styles.gallery}>
          {photos.length > 0 ? (
            <Image
              source={{ uri: photos[selectedPhoto]?.photoUrl }}
              style={styles.mainPhoto}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.photoPlaceholder}>
              <AppIcon name="box" size={48} color="rgba(255,255,255,0.4)" />
              <Text style={styles.photoPlaceholderLabel}>{cat.defaultName}</Text>
            </View>
          )}

          {/* Back button over photo */}
          <SafeAreaView style={styles.photoOverlay} pointerEvents="box-none">
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <AppIcon name="arrowLeft" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </SafeAreaView>

          {/* Condition pill over photo */}
          <View style={[styles.photoCondPill, { backgroundColor: cond.bg }]}>
            <Text style={[styles.photoCondText, { color: cond.color }]}>{cond.label}</Text>
          </View>

          {/* Thumbnail strip */}
          {photos.length > 1 && (
            <View style={styles.thumbStrip}>
              {photos.map((p, i) => (
                <TouchableOpacity key={p.id || i} onPress={() => setSelectedPhoto(i)}>
                  <Image
                    source={{ uri: p.photoUrl }}
                    style={[styles.thumb, i === selectedPhoto && styles.thumbActive]}
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* ── Scrollable content below photo ── */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Title + Price hero */}
          <View style={styles.titleRow}>
            <View style={styles.titleBlock}>
              <Text style={styles.itemTitle}>{lot.subcategory || (cat.i18nKey ? t(cat.i18nKey, cat.defaultName) : cat.defaultName)}</Text>
              <Text style={styles.itemCategory}>{cat.i18nKey ? t(cat.i18nKey, cat.defaultName) : cat.defaultName}</Text>
            </View>
            <View style={styles.priceBlock}>
              <Text style={styles.priceValue}>{priceStr}</Text>
              <Text style={styles.priceLabel}>{t('marketplace.sellerAskingPrice', 'Asking Price')}</Text>
            </View>
          </View>

          {/* Location + weight */}
          {(lot.collector?.city || lot.approximateTotalWeightKg) ? (
            <View style={styles.metaRow}>
              {lot.collector?.city && (
                <View style={[styles.metaPill, { flexDirection: 'row', alignItems: 'center', gap: 5 }]}>
                  <AppIcon name="location" size={13} color="#34D399" />
                  <Text style={styles.metaPillText}>{lot.collector.city}</Text>
                </View>
              )}
              {lot.approximateTotalWeightKg ? (
                <View style={[styles.metaPill, { flexDirection: 'row', alignItems: 'center', gap: 5 }]}>
                  <AppIcon name="box" size={13} color="#34D399" />
                  <Text style={styles.metaPillText}>{lot.approximateTotalWeightKg} kg</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Description */}
          {lot.description ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('marketplace.description', 'About this item')}</Text>
              <Text style={styles.descText}>{lot.description}</Text>
            </View>
          ) : null}

          {/* Condition detail */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('marketplace.conditionHeading', 'Condition')}</Text>
            <View style={[styles.condBox, { backgroundColor: cond.bg, borderColor: cond.color + '55' }]}>
              <Text style={[styles.condTitle, { color: cond.color }]}>{cond.label}</Text>
              <Text style={styles.condDesc}>{cond.desc}</Text>
            </View>
          </View>

          {/* Transparency notice */}
          <View style={styles.trustBox}>
            <AppIcon name="shieldCheck" size={18} color="#10B981" />
            <Text style={styles.trustText}>
              {t('auth.trustStatement', 'Peer-to-peer price. EcoSetu facilitates collection — no hidden fees. Pickup is arranged through a local informal collector.')}
            </Text>
          </View>

          {/* Spec grid */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('collector.pickups.pickupDetails', 'Details')}</Text>
            <View style={styles.specGrid}>
              <SpecRow label={t('collector.browse.items', 'Category')} value={cat.i18nKey ? t(cat.i18nKey, cat.defaultName) : cat.defaultName} />
              {lot.approximateTotalWeightKg ? <SpecRow label={t('billing.weight', 'Weight')} value={`${lot.approximateTotalWeightKg} kg`} /> : null}
              {lot.collector?.city ? <SpecRow label={t('marketplace.collectorLocation', 'Pickup Area')} value={lot.collector.city} /> : null}
              <SpecRow label="Ref #" value={`…${(lot.referenceNumber || '').slice(-6)}`} />
            </View>
          </View>

          <View style={{ height: 140 }} />
        </ScrollView>

        {/* ── Sticky Action Bar ── */}
        <SafeAreaView style={styles.actionBar} edges={['bottom']}>
          <TouchableOpacity
            style={styles.offerBtn}
            onPress={() => setShowOffer(true)}
            disabled={isSubmitting}
            accessibilityRole="button"
            accessibilityLabel={t('marketplace.makeCustomOffer', 'Make Offer')}
          >
            <Text style={styles.offerBtnText}>{t('marketplace.makeCustomOffer', 'Make Offer')}</Text>
          </TouchableOpacity>
          {hasAskingPrice && (
            <TouchableOpacity
              style={styles.buyBtn}
              onPress={handleBuyAtPrice}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityLabel={`${t('marketplace.confirmOffer', 'Buy at')} ${priceStr}`}
            >
              {isSubmitting
                ? <ActivityIndicator size="small" color="#FFF" />
                : <Text style={styles.buyBtnText}>{t('marketplace.confirmOffer', 'Buy at')} {priceStr}</Text>}
            </TouchableOpacity>
          )}
        </SafeAreaView>

        {/* ── Offer Modal ── */}
        <OfferModal
          visible={showOffer}
          askingPrice={lot.askingPrice ?? null}
          initialPrice={lot.askingPrice ? String(lot.askingPrice) : ''}
          isSubmitting={isSubmitting}
          onClose={() => setShowOffer(false)}
          onSubmit={submitOffer}
        />
      </View>
    </EcoSetuBackground>
  );
};

// ─── Spec Row ─────────────────────────────────────────────────────────────────

const SpecRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.specRow}>
    <Text style={styles.specLabel}>{label}</Text>
    <Text style={styles.specValue}>{value}</Text>
  </View>
);

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },

  // ── Gallery ──
  gallery: {
    width: SCREEN_W,
    height: SCREEN_W * 0.72,
    backgroundColor: '#071E22',
    position: 'relative',
  },
  mainPhoto: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  photoPlaceholderIcon: { fontSize: 56 },
  photoPlaceholderLabel: { fontSize: 14, color: 'rgba(255,255,255,0.50)', fontWeight: '600' },
  photoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  backBtn: {
    margin: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.50)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  photoCondPill: {
    position: 'absolute',
    bottom: 12,
    right: 14,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  photoCondText: {
    fontSize: 12,
    fontWeight: '700',
  },
  thumbStrip: {
    position: 'absolute',
    bottom: 12,
    left: 14,
    flexDirection: 'row',
    gap: 6,
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  thumbActive: {
    borderColor: '#10B981',
    borderWidth: 2.5,
  },

  // ── Scroll Content ──
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  // ── Title ──
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  titleBlock: { flex: 1 },
  itemTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  itemCategory: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.50)',
    fontWeight: '500',
    marginTop: 2,
  },
  priceBlock: { alignItems: 'flex-end' },
  priceValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#34D399',
    letterSpacing: -0.5,
  },
  priceLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.40)',
    fontWeight: '500',
    marginTop: 2,
  },

  // ── Meta ──
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  metaPill: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  metaPillText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '500',
  },

  // ── Section ──
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 0.5,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  descText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.80)',
    lineHeight: 22,
  },

  // ── Condition ──
  condBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 4,
  },
  condTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  condDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.70)',
    lineHeight: 19,
  },

  // ── Trust ──
  trustBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  trustIcon: { fontSize: 16, marginTop: 1 },
  trustText: {
    flex: 1,
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    lineHeight: 18,
  },

  // ── Spec Grid ──
  specGrid: {
    backgroundColor: 'rgba(16,44,48,0.80)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  specLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.50)',
    fontWeight: '500',
  },
  specValue: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'right',
    maxWidth: '55%',
  },

  // ── Action Bar ──
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(7,30,34,0.96)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.10)',
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
  },
  offerBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(52,211,153,0.40)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  offerBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#34D399',
  },
  buyBtn: {
    flex: 2,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ── Error / Center ──
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errorIcon: { fontSize: 48, marginBottom: 12 },
  errorText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
  },

  // ── Offer Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.60)',
  },
  modalSheet: {
    backgroundColor: '#0D2E32',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.20)',
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  askingPriceBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  askingLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '500',
  },
  askingValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#34D399',
  },
  modalFieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 0.3,
    marginBottom: 6,
    marginTop: 10,
  },
  modalInput: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  modalTextArea: {
    height: 80,
    paddingTop: 12,
  },
  modalNote: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 12,
    lineHeight: 18,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalCancelBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '600',
  },
  modalSubmitBtn: {
    flex: 2,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubmitDisabled: {
    opacity: 0.4,
  },
  modalSubmitText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});

export default CitizenMarketplaceItemDetailScreen;
