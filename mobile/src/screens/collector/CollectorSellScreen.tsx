/**
 * CollectorSellScreen — NEW GUIDED SELL WORKFLOW
 *
 * Replaces the old form-heavy CollectorMaterialCaptureScreen as the Sell tab entry.
 * Camera-first, guided assistant flow:
 *
 *  STEP 1 — WHAT DID YOU COLLECT?   (large material category tiles)
 *  STEP 2 — SHOW US THE MATERIAL    (camera-first photo capture)
 *  STEP 3 — HOW IS IT?              (condition: Working / Repairable / Partial / Not Working)
 *  STEP 4 — HOW MUCH?               (approximate weight in kg)
 *  STEP 5 — WHERE SHOULD IT GO?     (Reuse / Recycling intent)
 *
 *  Then: List for Sale → CollectorCreateLot with all captured data
 *
 * Design:
 *  - Step indicator at top (not overwhelming)
 *  - One decision per screen/section
 *  - Large touch targets ≥52dp
 *  - Camera is first class, not buried
 *  - "Continue" always visible — no hunting for next button
 *  - Progressive disclosure: later fields revealed as needed
 *
 * Preserves existing: capturePhoto(), navigation to CollectorCreateLot,
 * MATERIAL_TAXONOMY, condition/source/photo params
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useI18n } from '../../i18n';
import { EcoSetuBackground } from '../../components/glass/EcoSetuBackground';
import { CollectorHeader } from '../../components/collector/CollectorHeader';
import { AppIcon, AppIconName } from '../../components/ui/AppIcon';
import { colors } from '../../theme/colors';
import { MATERIAL_TAXONOMY, MATERIAL_TAXONOMY_LIST } from '../../config/materialTaxonomy';
import { capturePhoto } from '../../services/cameraService';

// ─────────────────────────────────────────────────────────────────────────────
// STEP CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const TOTAL_STEPS = 5;

const CONDITIONS: { id: string; iconName: AppIconName; label: string; sub: string }[] = [
  { id: 'WORKING',         iconName: 'sparkles', label: 'Working',          sub: 'Powers on, functions' },
  { id: 'REPAIRABLE',      iconName: 'wrench',   label: 'Repairable',       sub: 'Fixable, some defects' },
  { id: 'DAMAGED',         iconName: 'hammer',   label: 'Partially Working', sub: 'Some parts work' },
  { id: 'NOT_WORKING',     iconName: 'xCircle',  label: 'Not Working',       sub: 'Dead, no function' },
  { id: 'UNKNOWN',         iconName: 'help',     label: 'Unknown',           sub: "Can't tell" },
];

const INTENT_OPTIONS: { id: string; iconName: AppIconName; label: string; sub: string }[] = [
  { id: 'REUSE',      iconName: 'recycle', label: 'Reuse',      sub: 'Can be refurbished / resold' },
  { id: 'RECYCLING',  iconName: 'factory', label: 'Recycling',  sub: 'Parts / raw materials' },
];

const WEIGHT_PRESETS = [
  { label: '< 1 kg',  value: '0.5' },
  { label: '1–5 kg',  value: '3'   },
  { label: '5–10 kg', value: '7'   },
  { label: '10+ kg',  value: '15'  },
];

// ─────────────────────────────────────────────────────────────────────────────
// STEP INDICATOR
// ─────────────────────────────────────────────────────────────────────────────
const StepIndicator: React.FC<{ current: number; total: number }> = ({ current, total }) => (
  <View style={si.row}>
    {Array.from({ length: total }).map((_, i) => (
      <View
        key={i}
        style={[
          si.dot,
          i < current  ? si.dotDone    : null,
          i === current ? si.dotActive : null,
        ]}
      />
    ))}
  </View>
);

const si = StyleSheet.create({
  row:       { flexDirection: 'row', gap: 6, paddingHorizontal: 20, paddingBottom: 8 },
  dot:       { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.12)' },
  dotDone:   { backgroundColor: 'rgba(16,185,129,0.5)' },
  dotActive: { backgroundColor: '#10B981' },
});

// ─────────────────────────────────────────────────────────────────────────────
// STEP HEADER
// ─────────────────────────────────────────────────────────────────────────────
const StepHeader: React.FC<{ step: number; question: string; sub?: string }> = ({
  step,
  question,
  sub,
}) => (
  <View style={sh.container}>
    <Text style={sh.stepNum}>STEP {step} OF {TOTAL_STEPS}</Text>
    <Text style={sh.question}>{question}</Text>
    {sub && <Text style={sh.sub}>{sub}</Text>}
  </View>
);

const sh = StyleSheet.create({
  container: { paddingHorizontal: 20, gap: 4 },
  stepNum:   { color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
  question:  { color: '#FFFFFF', fontSize: 24, fontWeight: '900', letterSpacing: -0.5, lineHeight: 30 },
  sub:       { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '500' },
});

// ─────────────────────────────────────────────────────────────────────────────
// CONTINUE BUTTON
// ─────────────────────────────────────────────────────────────────────────────
const ContinueButton: React.FC<{ onPress: () => void; label?: string; disabled?: boolean }> = ({
  onPress,
  label = 'Continue →',
  disabled = false,
}) => (
  <View style={cb.wrapper}>
    <TouchableOpacity
      style={[cb.btn, disabled && cb.btnDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      accessibilityRole="button"
    >
      <Text style={[cb.label, disabled && cb.labelDisabled]}>{label}</Text>
    </TouchableOpacity>
  </View>
);

const cb = StyleSheet.create({
  wrapper:       { paddingHorizontal: 20, paddingVertical: 16 },
  btn:           { backgroundColor: '#10B981', borderRadius: 16, paddingVertical: 16, alignItems: 'center',
                   shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6 },
  btnDisabled:   { backgroundColor: 'rgba(255,255,255,0.1)', shadowOpacity: 0 },
  label:         { color: '#071E22', fontSize: 17, fontWeight: '900', letterSpacing: 0.3 },
  labelDisabled: { color: 'rgba(255,255,255,0.3)' },
});

const getCategoryIcon = (catId: string): AppIconName => {
  switch (catId) {
    case 'BATTERY': return 'battery';
    case 'MOBILE': return 'phone';
    case 'LAPTOP':
    case 'COMPUTER': return 'laptop';
    case 'TV': return 'tv';
    case 'APPLIANCE': return 'zap';
    case 'CIRCUIT_BOARD':
    case 'PCB': return 'cpu';
    case 'SOLAR_PANEL': return 'sun';
    case 'AUTOMOTIVE_EWASTE': return 'truck';
    case 'CABLE': return 'cable';
    case 'BULB': return 'lightbulb';
    default: return 'box';
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN
// ─────────────────────────────────────────────────────────────────────────────
interface Props {
  navigation: any;
  route?: any;
}

export const CollectorSellScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useI18n();

  const [step, setStep] = useState(1);

  // Step 1
  const [category, setCategory]       = useState<string>('PCB');
  const [subcategory, setSubcategory] = useState<string>('');

  // Step 2
  const [photos, setPhotos]           = useState<string[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);

  // Step 3
  const [condition, setCondition]     = useState<string>('DAMAGED');

  // Step 4
  const [weightKg, setWeightKg]       = useState<string>('');
  const [weightCustom, setWeightCustom] = useState<string>('');

  // Step 5
  const [intent, setIntent]           = useState<string>('RECYCLING');

  const activeCat = MATERIAL_TAXONOMY[category];

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleSelectCategory = (catId: string) => {
    setCategory(catId);
    const def = MATERIAL_TAXONOMY[catId];
    setSubcategory(def?.subcategories?.[0]?.id || '');
  };

  const handleTakePhoto = async () => {
    try {
      setIsCapturing(true);
      const result = await capturePhoto();
      if (result.success && result.uri) {
        setPhotos((prev) => [...prev, result.uri!]);
      } else if (result.error && result.error !== 'USER_CANCELLED') {
        Alert.alert(t('common.error', 'Error'), result.error);
      }
    } catch (err: any) {
      Alert.alert(t('common.error', 'Error'), err.message || 'Camera capture failed');
    } finally {
      setIsCapturing(false);
    }
  };

  const handleRemovePhoto = (idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleListForSale = () => {
    const finalWeight = weightKg || weightCustom;
    navigation.navigate('CollectorCreateLot', {
      category,
      subcategory,
      condition,
      sourceType: 'HOUSEHOLD',
      photos,
      approximateTotalWeightKg: finalWeight ? parseFloat(finalWeight) : undefined,
      intent,
    });
  };

  const nextStep = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  const prevStep = () => {
    if (step === 1) navigation.goBack();
    else setStep((s) => s - 1);
  };

  // ── Step renders ─────────────────────────────────────────────────────────────
  const renderStep = () => {
    switch (step) {
      // ── STEP 1: CATEGORY ──────────────────────────────────────────────────
      case 1:
        return (
          <>
            <StepHeader
              step={1}
              question={t('collector.whatDidYouCollect', 'What did you collect?')}
              sub={t('collector.tapMatchingMaterial', 'Tap the matching material type')}
            />
            <View style={styles.categoryGrid}>
              {MATERIAL_TAXONOMY_LIST.map((cat) => {
                const isSelected = category === cat.id;
                const catName = cat.i18nKey ? t(cat.i18nKey, cat.defaultName) : cat.defaultName;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryTile,
                      isSelected && { borderColor: cat.color || '#10B981', backgroundColor: `${cat.color}18` || 'rgba(16,185,129,0.1)' },
                    ]}
                    onPress={() => handleSelectCategory(cat.id)}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityLabel={catName}
                  >
                    <View style={{ marginBottom: 8, alignItems: 'center', justifyContent: 'center' }}>
                      <AppIcon
                        name={getCategoryIcon(cat.id)}
                        size={28}
                        color={isSelected ? (cat.color || '#10B981') : 'rgba(255,255,255,0.75)'}
                      />
                    </View>
                    <Text
                      style={[styles.categoryTileLabel, isSelected && { color: cat.color || '#10B981' }]}
                      numberOfLines={2}
                    >
                      {catName}
                    </Text>
                    {isSelected && (
                      <View style={[styles.categoryCheck, { backgroundColor: cat.color || '#10B981' }]}>
                        <AppIcon name="check" size={11} color="#FFFFFF" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Subcategory if available */}
            {activeCat?.subcategories?.length > 0 && (
              <View style={styles.subcategoryRow}>
                {activeCat.subcategories.map((sub: any) => (
                  <TouchableOpacity
                    key={sub.id}
                    style={[styles.subPill, subcategory === sub.id && styles.subPillSelected]}
                    onPress={() => setSubcategory(sub.id)}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.subPillText, subcategory === sub.id && styles.subPillTextSelected]}>
                      {sub.label || sub.id}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <ContinueButton
              onPress={nextStep}
              disabled={!category}
              label={`${t('common.continue', 'Continue')} →`}
            />
          </>
        );

      // ── STEP 2: CAMERA ────────────────────────────────────────────────────
      case 2:
        return (
          <>
            <StepHeader
              step={2}
              question={t('collector.showUsMaterial', 'Show us the material')}
              sub={t('collector.clearPhotosHint', 'Clear photos help recyclers make better offers')}
            />

            {/* Primary camera action */}
            <TouchableOpacity
              style={[styles.cameraHero, photos.length > 0 && styles.cameraHeroSmall]}
              onPress={handleTakePhoto}
              disabled={isCapturing}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t('collector.takePhoto', 'Take photo')}
            >
              <View style={{ marginBottom: 6 }}>
                <AppIcon name={isCapturing ? 'clock' : 'camera'} size={32} color="#10B981" />
              </View>
              <Text style={styles.cameraHeroLabel}>
                {photos.length === 0 ? t('collector.takePhotoCaps', 'TAKE PHOTO') : t('collector.addMorePhotos', 'ADD MORE PHOTOS')}
              </Text>
              {photos.length === 0 && (
                <Text style={styles.cameraHeroSub}>{t('collector.tapToOpenCamera', 'Tap to open camera')}</Text>
              )}
            </TouchableOpacity>

            {/* Photo strip */}
            {photos.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.photoStrip}
              >
                {photos.map((uri, idx) => (
                  <View key={idx} style={styles.photoThumb}>
                    <Image source={{ uri }} style={styles.photoThumbImg} />
                    <TouchableOpacity
                      style={styles.photoRemove}
                      onPress={() => handleRemovePhoto(idx)}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    >
                      <AppIcon name="close" size={10} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            <ContinueButton
              onPress={nextStep}
              label={photos.length === 0
                ? `${t('collector.skipPhotos', 'Skip Photos')} →`
                : `${t('collector.continueWithPhotos', { count: photos.length }, `Continue with ${photos.length} photo${photos.length > 1 ? 's' : ''}`)} →`}
            />
          </>
        );

      // ── STEP 3: CONDITION ─────────────────────────────────────────────────
      case 3:
        return (
          <>
            <StepHeader
              step={3}
              question={t('collector.howIsIt', 'How is it?')}
              sub={t('collector.bestGuessFine', 'Best guess is fine')}
            />
            <View style={styles.optionList}>
              {[
                { id: 'WORKING',         iconName: 'sparkles' as AppIconName, label: t('condition.working', 'Working'),          sub: t('condition.workingSub', 'Powers on, functions') },
                { id: 'REPAIRABLE',      iconName: 'wrench' as AppIconName,   label: t('condition.repairable', 'Repairable'),       sub: t('condition.repairableSub', 'Fixable, some defects') },
                { id: 'DAMAGED',         iconName: 'hammer' as AppIconName,   label: t('condition.partiallyWorking', 'Partially Working'), sub: t('condition.partiallyWorkingSub', 'Some parts work') },
                { id: 'NOT_WORKING',     iconName: 'xCircle' as AppIconName,  label: t('condition.notWorking', 'Not Working'),       sub: t('condition.notWorkingSub', 'Dead, no function') },
                { id: 'UNKNOWN',         iconName: 'help' as AppIconName,     label: t('condition.unknown', 'Unknown'),           sub: t('condition.unknownSub', "Can't tell") },
              ].map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.optionRow, condition === c.id && styles.optionRowSelected]}
                  onPress={() => setCondition(c.id)}
                  activeOpacity={0.8}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: condition === c.id }}
                >
                  <View style={{ width: 36, alignItems: 'center', justifyContent: 'center' }}>
                    <AppIcon
                      name={c.iconName}
                      size={22}
                      color={condition === c.id ? '#10B981' : 'rgba(255,255,255,0.7)'}
                    />
                  </View>
                  <View style={styles.optionTextCol}>
                    <Text style={[styles.optionLabel, condition === c.id && styles.optionLabelSelected]}>
                      {c.label}
                    </Text>
                    <Text style={styles.optionSub}>{c.sub}</Text>
                  </View>
                  <View style={[styles.radioOuter, condition === c.id && styles.radioOuterSelected]}>
                    {condition === c.id && <View style={styles.radioInner} />}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
            <ContinueButton
              onPress={nextStep}
              label={`${t('common.continue', 'Continue')} →`}
            />
          </>
        );

      // ── STEP 4: WEIGHT ────────────────────────────────────────────────────
      case 4:
        return (
          <>
            <StepHeader
              step={4}
              question={t('collector.howMuchWeight', 'How much?')}
              sub={t('collector.approxWeightFine', 'Approximate weight is fine')}
            />
            <View style={styles.weightGrid}>
              {WEIGHT_PRESETS.map((w) => (
                <TouchableOpacity
                  key={w.value}
                  style={[styles.weightTile, weightKg === w.value && styles.weightTileSelected]}
                  onPress={() => { setWeightKg(w.value); setWeightCustom(''); }}
                  activeOpacity={0.8}
                  accessibilityRole="radio"
                >
                  <Text style={[styles.weightTileLabel, weightKg === w.value && styles.weightTileLabelSelected]}>
                    {w.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <ContinueButton
              onPress={nextStep}
              disabled={!weightKg && !weightCustom}
              label={`${t('common.continue', 'Continue')} →`}
            />
          </>
        );

      // ── STEP 5: INTENT ────────────────────────────────────────────────────
      case 5:
        return (
          <>
            <StepHeader
              step={5}
              question={t('collector.whereShouldItGo', 'Where should it go?')}
              sub={t('collector.intentSubHeader', 'This helps match you with the right recycler')}
            />
            <View style={styles.optionList}>
              {[
                { id: 'REUSE',      iconName: 'recycle' as AppIconName, label: t('collector.reuse', 'Reuse'),      sub: t('collector.reuseSub', 'Can be refurbished / resold') },
                { id: 'RECYCLING',  iconName: 'factory' as AppIconName, label: t('collector.recycling', 'Recycling'),  sub: t('collector.recyclingSub', 'Parts / raw materials') },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.intentCard, intent === opt.id && styles.intentCardSelected]}
                  onPress={() => setIntent(opt.id)}
                  activeOpacity={0.8}
                  accessibilityRole="radio"
                >
                  <View style={{ width: 36, alignItems: 'center', justifyContent: 'center' }}>
                    <AppIcon
                      name={opt.iconName}
                      size={22}
                      color={intent === opt.id ? '#10B981' : 'rgba(255,255,255,0.7)'}
                    />
                  </View>
                  <View style={styles.intentTextCol}>
                    <Text style={[styles.intentLabel, intent === opt.id && styles.intentLabelSelected]}>
                      {opt.label}
                    </Text>
                    <Text style={styles.intentSub}>{opt.sub}</Text>
                  </View>
                  {intent === opt.id && (
                    <View style={styles.intentCheck}>
                      <AppIcon name="check" size={12} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Value expectation hint */}
            <View style={styles.valueHint}>
              <Text style={styles.valueHintLabel}>{t('collector.whatToExpect', 'WHAT TO EXPECT')}</Text>
              <Text style={styles.valueHintText}>
                {t('collector.whatToExpectText', 'After listing, authorized recyclers on EcoSetu will send you price offers. You decide who to sell to and at what price.')}
              </Text>
            </View>

            <ContinueButton
              onPress={handleListForSale}
              label={`${t('collector.listForSale', 'LIST FOR SALE')} →`}
            />
          </>
        );

      default:
        return null;
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <EcoSetuBackground>
      <SafeAreaView style={styles.safeArea}>
        <CollectorHeader
          name={t('collector.sellMaterial', 'Sell Material')}
          showBack
          onBack={prevStep}
        />

        <StepIndicator current={step - 1} total={TOTAL_STEPS} />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderStep()}
          <View style={{ height: 32 }} />
        </ScrollView>
      </SafeAreaView>
    </EcoSetuBackground>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea:   { flex: 1 },
  scroll:     { flex: 1 },
  scrollContent: { gap: 20, paddingBottom: 40, paddingTop: 12 },

  // Category grid
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 10,
  },
  categoryTile: {
    width: '30%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    gap: 6,
    minHeight: 80,
    justifyContent: 'center',
  },
  categoryTileIcon:  { fontSize: 28 },
  categoryTileLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '700', textAlign: 'center' },
  categoryCheck: {
    position: 'absolute', top: 6, right: 6,
    width: 18, height: 18, borderRadius: 9,
    justifyContent: 'center', alignItems: 'center',
  },
  categoryCheckText: { color: '#071E22', fontSize: 10, fontWeight: '900' },

  // Subcategory
  subcategoryRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 8 },
  subPill: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    minHeight: 36,
  },
  subPillSelected:     { backgroundColor: 'rgba(16,185,129,0.15)', borderColor: '#10B981' },
  subPillText:         { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '600' },
  subPillTextSelected: { color: '#10B981', fontWeight: '700' },

  // Camera
  cameraHero: {
    marginHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20, borderStyle: 'dashed',
    paddingVertical: 40, alignItems: 'center', gap: 10,
  },
  cameraHeroSmall: { paddingVertical: 24 },
  cameraHeroIcon:  { fontSize: 52 },
  cameraHeroLabel: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', letterSpacing: 0.3 },
  cameraHeroSub:   { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '500' },
  photoStrip: { paddingHorizontal: 20, gap: 10 },
  photoThumb: { width: 90, height: 90, borderRadius: 14, overflow: 'hidden' },
  photoThumbImg:    { width: '100%', height: '100%' },
  photoRemove: {
    position: 'absolute', top: 6, right: 6,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center',
  },
  photoRemoveText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },

  // Condition options
  optionList:      { paddingHorizontal: 20, gap: 10 },
  optionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, minHeight: 60,
  },
  optionRowSelected: { backgroundColor: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.35)' },
  optionIcon:        { fontSize: 26, width: 34, textAlign: 'center' },
  optionTextCol:     { flex: 1 },
  optionLabel:       { color: 'rgba(255,255,255,0.8)', fontSize: 15, fontWeight: '700' },
  optionLabelSelected: { color: '#FFFFFF' },
  optionSub:         { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '500', marginTop: 2 },
  radioOuter: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  radioOuterSelected: { borderColor: '#10B981' },
  radioInner: { width: 11, height: 11, borderRadius: 6, backgroundColor: '#10B981' },

  // Weight
  weightGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 20, gap: 10,
  },
  weightTile: {
    flex: 1, minWidth: '44%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16, paddingVertical: 22, alignItems: 'center', minHeight: 64,
  },
  weightTileSelected: { backgroundColor: 'rgba(16,185,129,0.12)', borderColor: '#10B981' },
  weightTileLabel:         { color: 'rgba(255,255,255,0.7)', fontSize: 16, fontWeight: '800' },
  weightTileLabelSelected: { color: '#10B981' },

  // Intent
  intentCard: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 18, paddingHorizontal: 18, paddingVertical: 18, minHeight: 72,
  },
  intentCardSelected: { backgroundColor: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.35)' },
  intentIcon:     { fontSize: 32 },
  intentTextCol:  { flex: 1 },
  intentLabel:    { color: 'rgba(255,255,255,0.8)', fontSize: 17, fontWeight: '800' },
  intentLabelSelected: { color: '#FFFFFF' },
  intentSub:      { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '500', marginTop: 3 },
  intentCheck: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#10B981',
    justifyContent: 'center', alignItems: 'center',
  },
  intentCheckText: { color: '#071E22', fontSize: 14, fontWeight: '900' },

  // Value hint
  valueHint: {
    marginHorizontal: 20,
    backgroundColor: 'rgba(16,185,129,0.06)',
    borderWidth: 1, borderColor: 'rgba(16,185,129,0.15)',
    borderRadius: 14, padding: 16, gap: 6,
  },
  valueHintLabel: { color: '#10B981', fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  valueHintText:  { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '500', lineHeight: 19 },
});

export default CollectorSellScreen;
