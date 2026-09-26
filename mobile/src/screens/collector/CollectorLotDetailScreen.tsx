/**
 * CollectorLotDetailScreen.tsx
 * Authenticated INFORMAL_COLLECTOR — View Full Details of a Material Lot
 *
 * Requirements:
 * SIH-LOT-005: Lot reference number on detail screen
 * SIH-LOT-006: Status badge using icon + text
 * SIH-LOT-007: Multiple photos preview
 * SIH-LOT-008: GPS collection coordinates & accuracy display
 *
 * Canonical Reference: docs/25_SIH_26229_REQUIREMENTS.md Section 4 Module 2
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useI18n } from '../../i18n';
import { TopAppBar } from '../../components/layout/TopAppBar';
import { ReadAloudButton } from '../../components/voice/ReadAloudButton';
import { EcoSetuBackground } from '../../components/eco';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { materialLotService, MaterialLotItem } from '../../services/materialLotService';
import sourcingService from '../../services/sourcingService';
import { MATERIAL_TAXONOMY } from '../../config/materialTaxonomy';
import { getSafetyTopicByCategory } from '../../data/safetyGuidance';
import { ReportProblemModal } from '../../components/dispute/ReportProblemModal';
import { AppIcon } from '../../components/ui/AppIcon';

const space = {
  xs: spacing.spaceXs,
  sm: spacing.spaceSm,
  md: spacing.spaceMd,
  lg: spacing.spaceLg,
  xl: spacing.spaceXl,
};

interface CollectorLotDetailScreenProps {
  navigation?: any;
  route?: {
    params?: {
      lotId?: string;
      lot?: MaterialLotItem;
    };
  };
}

export const CollectorLotDetailScreen: React.FC<CollectorLotDetailScreenProps> = ({
  navigation,
  route,
}) => {
  const { t } = useI18n();
  const lotId = route?.params?.lotId || '';
  const initialLot = route?.params?.lot || null;

  const [lot, setLot] = useState<MaterialLotItem | null>(initialLot);
  const [isLoading, setIsLoading] = useState<boolean>(!initialLot && Boolean(lotId));
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [problemModalVisible, setProblemModalVisible] = useState<boolean>(false);

  useEffect(() => {
    if (!lotId) return;
    async function loadLot() {
      try {
        const data = await materialLotService.getLotById(lotId);
        setLot(data);
      } catch (err: any) {
        console.warn('[CollectorLotDetailScreen] Error loading lot:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadLot();
  }, [lotId]);

  const handleSubmitDraft = async () => {
    if (!lot) return;
    try {
      setIsSubmitting(true);
      const updated = await materialLotService.updateLot(lot.id, {
        status: 'OPEN',
      });
      setLot(updated);
      Alert.alert(t('common.success'), t('materialLots.lotSubmittedSuccess'));
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message || 'Failed to submit lot');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryIcon = (cat: string): any => {
    const map: Record<string, string> = {
      CRT: 'tv',
      LCD_PANEL: 'computer',
      PCB: 'grid',
      CABLE: 'link',
      BATTERY: 'battery',
      MOTOR: 'settings',
      MAGNET_ASSEMBLY: 'refresh',
      MIXED_PLASTIC: 'recycle',
      MOBILE_PHONE: 'mobile',
      LAPTOP: 'laptop',
      MONITOR: 'computer',
      PRINTER: 'file',
      KEYBOARD_MOUSE: 'grid',
      DESKTOP_COMPUTER: 'computer',
      TABLET: 'mobile',
    };
    return map[cat] || 'package';
  };

  const getSafetyIcon = (topicId: string): any => {
    const upper = (topicId || '').toUpperCase();
    if (upper.includes('BATTER')) return 'battery';
    if (upper.includes('CRT') || upper.includes('TV') || upper.includes('MONITOR')) return 'tv';
    if (upper.includes('PCB') || upper.includes('CIRCUIT')) return 'cpu';
    if (upper.includes('LAMP') || upper.includes('BULB') || upper.includes('MERCURY')) return 'lightbulb';
    if (upper.includes('WIRE') || upper.includes('CABLE') || upper.includes('BURN')) return 'cable';
    return 'shieldCheck';
  };

  if (isLoading || !lot) {
    return (
      <EcoSetuBackground>
        <SafeAreaView style={styles.safeArea}>
          <TopAppBar
            title={t('materialLots.detailTitle')}
            showBack={true}
            onBack={() => navigation.goBack()}
          />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary || '#14B8A6'} />
          </View>
        </SafeAreaView>
      </EcoSetuBackground>
    );
  }

  const categoryDef = MATERIAL_TAXONOMY[lot.category] || {
    symbol: '',
    defaultName: lot.category,
    i18nKey: 'materialLots.categories.OTHER',
  };

  const isDraft = lot.status === 'DRAFT' || lot.isOfflineDraft;

  return (
    <EcoSetuBackground>
      <SafeAreaView style={styles.safeArea}>
        <TopAppBar
          title={lot.referenceNumber}
          subtitle={t('materialLots.detailTitle')}
          showBack={true}
          onBack={() => navigation.goBack()}
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Reference & Status Hero Card */}
          <View style={styles.heroCard}>
            <View style={styles.heroHeader}>
              <View style={styles.categorySymbolCircle}>
                <AppIcon name={getCategoryIcon(lot.category)} size={26} color="#14B8A6" />
              </View>
              <View style={styles.heroTextContainer}>
                <Text style={styles.lotReferenceText}>{lot.referenceNumber}</Text>
                <Text style={styles.categoryTitleText}>
                  {t(categoryDef.i18nKey) || categoryDef.defaultName}
                </Text>
              </View>
              <ReadAloudButton
                textToRead={`${t('lowLiteracy.materialBatch')}: ${lot.referenceNumber}. ${t(categoryDef.i18nKey) || categoryDef.defaultName}. ${lot.approximateTotalWeightKg || 0} kg. ${t('lowLiteracy.status')}: ${lot.status}.`}
                variant="compact"
              />
            </View>

            <View style={styles.heroBadgeRow}>
              <View
                style={[
                  styles.statusBadge,
                  isDraft ? styles.statusBadgeDraft : styles.statusBadgeOpen,
                ]}
              >
                <View style={styles.rowCentered}>
                  <AppIcon
                    name={isDraft ? 'edit' : 'checkCircle'}
                    size={12}
                    color={isDraft ? '#F59E0B' : '#10B981'}
                  />
                  <Text style={styles.statusBadgeText}>
                    {isDraft ? t('materialLots.offlineDraftBadge') : lot.status}
                  </Text>
                </View>
              </View>

              {lot.isOfflineDraft && (
                <View style={styles.offlineBadge}>
                  <View style={styles.rowCentered}>
                    <AppIcon
                      name={lot.pendingSync ? 'clock' : 'hardDrive'}
                      size={11}
                      color="rgba(255, 255, 255, 0.8)"
                    />
                    <Text style={styles.offlineBadgeText}>
                      {lot.pendingSync ? t('materialLots.pendingSyncBadge') : t('materialLots.offlineDraftBadge')}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* Photo Gallery */}
          {lot.photos && lot.photos.length > 0 && (
            <View style={styles.sectionCard}>
              <View style={[styles.rowCentered, { marginBottom: space.sm }]}>
                <AppIcon name="camera" size={16} color="#FFFFFF" />
                <Text style={styles.sectionTitle}>{t('materialLots.photos')} ({lot.photos.length})</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoGallery}>
                {lot.photos.map((p, idx) => (
                  <Image key={idx} source={{ uri: p.photoUrl }} style={styles.galleryImage} />
                ))}
              </ScrollView>
            </View>
          )}

          {/* Core Specifications Card */}
          <View style={styles.sectionCard}>
            <View style={[styles.rowCentered, { marginBottom: space.sm }]}>
              <AppIcon name="fileText" size={16} color="#FFFFFF" />
              <Text style={styles.sectionTitle}>{t('materialLots.specifications')}</Text>
            </View>

            <View style={styles.specRow}>
              <Text style={styles.specLabel}>{t('materialLots.approximateWeight')}</Text>
              <Text style={styles.specValueHighlight}>
                {lot.approximateTotalWeightKg ? `${lot.approximateTotalWeightKg} kg` : '—'}
              </Text>
            </View>

            <View style={styles.specRow}>
              <Text style={styles.specLabel}>{t('materialLots.category')}</Text>
              <View style={styles.rowCentered}>
                <AppIcon name={getCategoryIcon(lot.category)} size={14} color="#94A3B8" />
                <Text style={styles.specValue}>
                  {t(categoryDef.i18nKey) || categoryDef.defaultName}
                </Text>
              </View>
            </View>

            {lot.subcategory ? (
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>{t('materialLots.subcategory')}</Text>
                <Text style={styles.specValue}>{lot.subcategory}</Text>
              </View>
            ) : null}

            <View style={styles.specRow}>
              <Text style={styles.specLabel}>{t('materialLots.condition')}</Text>
              <Text style={styles.specValue}>{lot.condition || 'UNKNOWN'}</Text>
            </View>

            <View style={styles.specRow}>
              <Text style={styles.specLabel}>{t('materialLots.sourceType')}</Text>
              <Text style={styles.specValue}>{lot.sourceType || 'OTHER'}</Text>
            </View>

            {lot.collectionTimestamp ? (
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>{t('materialLots.collectedAt')}</Text>
                <Text style={styles.specValue}>
                  {new Date(lot.collectionTimestamp).toLocaleDateString()}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Description */}
          {lot.description ? (
            <View style={styles.sectionCard}>
              <View style={[styles.rowCentered, { marginBottom: space.sm }]}>
                <AppIcon name="fileText" size={16} color="#FFFFFF" />
                <Text style={styles.sectionTitle}>{t('materialLots.description')}</Text>
              </View>
              <Text style={styles.descriptionText}>{lot.description}</Text>
            </View>
          ) : null}

          {/* GPS Location Card */}
          <View style={styles.sectionCard}>
            <View style={[styles.rowCentered, { marginBottom: space.sm }]}>
              <AppIcon name="mapPin" size={16} color="#FFFFFF" />
              <Text style={styles.sectionTitle}>{t('materialLots.locationEvidence')}</Text>
            </View>
            {(lot.collectionLatitude || lot.collectionLat) && (lot.collectionLongitude || lot.collectionLng) ? (
              <View style={styles.gpsContainer}>
                <Text style={styles.gpsCoordsText}>
                  Lat: {Number(lot.collectionLatitude ?? lot.collectionLat).toFixed(6)}, Lon: {Number(lot.collectionLongitude ?? lot.collectionLng).toFixed(6)}
                </Text>
                {(lot.locationAccuracyMeters ?? lot.collectionAccuracy) ? (
                  <Text style={styles.gpsAccuracyText}>
                    Accuracy: ±{Math.round(Number(lot.locationAccuracyMeters ?? lot.collectionAccuracy))} meters
                  </Text>
                ) : null}
              </View>
            ) : (
              <Text style={styles.gpsMissingText}>
                {t('materialLots.gpsUnavailable')}
              </Text>
            )}
          </View>

          {/* SIH-MATCH-001..006: Find Recycler Action */}
          <TouchableOpacity
            style={styles.findRecyclerButton}
            onPress={() => navigation?.navigate('CollectorRecyclerMatches', { lotId: lot.id, lot })}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t('recyclerMatching.findRecycler')}
          >
            <View style={styles.btnRow}>
              <AppIcon name="search" size={18} color={colors.primary || '#14B8A6'} />
              <Text style={styles.findRecyclerButtonText}>
                {t('recyclerMatching.findRecycler')}
              </Text>
            </View>
          </TouchableOpacity>

          {/* SIH-QUOTE-001..006: View Quotes Action */}
          <TouchableOpacity
            style={styles.viewQuotesButton}
            onPress={() => navigation?.navigate('CollectorQuotes', { lotId: lot.id, lot })}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t('quotation.quotes')}
          >
            <View style={styles.btnRow}>
              <AppIcon name="mail" size={18} color="#34D399" />
              <Text style={styles.viewQuotesButtonText}>
                {t('quotation.quotes')}
              </Text>
            </View>
          </TouchableOpacity>

          {/* SIH-HAND-001..007: Handover Action */}
          {(lot.status === 'ACCEPTED' || lot.status === 'HANDOVER_PENDING' || lot.status === 'CONFIRMED') && (
            <TouchableOpacity
              style={styles.handoverActionButton}
              onPress={() => navigation?.navigate('CollectorQuotes', { lotId: lot.id, lot })}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t('handover.digitalHandover')}
            >
              <View style={styles.btnRow}>
                <AppIcon name="users" size={18} color="#A7F3D0" />
                <Text style={styles.handoverActionButtonText}>
                  {t('handover.digitalHandover')}
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {/* SIH-SAFE Contextual Material Safety Guidance Link */}
          {(() => {
            const safetyTopic = getSafetyTopicByCategory(lot.category);
            return (
              <TouchableOpacity
                style={styles.safetyGuidanceButton}
                onPress={() =>
                  navigation?.navigate('CollectorSafetyDetail', {
                    topicId: safetyTopic.id,
                  })
                }
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`Safety Guidance for ${lot.category}`}
              >
                <View style={styles.btnRow}>
                  <AppIcon name={getSafetyIcon(safetyTopic.id)} size={18} color="#38bdf8" />
                  <Text style={styles.safetyGuidanceButtonText}>
                    {t(safetyTopic.titleKey as any) || safetyTopic.category} Guide
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })()}

          {/* SIH-TRACE-001..006: View Journey / Trace Lot Action */}
          <TouchableOpacity
            style={styles.traceLotButton}
            onPress={() => navigation?.navigate('CollectorLotTrace', { lotId: lot.id, lot })}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={t('lotTrace.viewJourney')}
          >
            <View style={styles.btnRow}>
              <AppIcon name="search" size={18} color="#7DD3FC" />
              <Text style={styles.traceLotButtonText}>
                {t('lotTrace.viewJourney')}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Phase 6: Sell Again for Completed Lot */}
          {lot.status === 'COMPLETED' && (
            <TouchableOpacity
              style={styles.sellAgainButton}
              onPress={async () => {
                try {
                  const template = await sourcingService.getSellAgainTemplate(lot.id);
                  navigation?.navigate('CollectorCreateLot', {
                    category: template.category,
                    subcategory: template.subcategory,
                    condition: template.condition,
                  });
                } catch (err: any) {
                  Alert.alert(t('common.error'), err.message || 'Failed to generate template');
                }
              }}
              activeOpacity={0.8}
            >
              <View style={styles.btnRow}>
                <AppIcon name="refresh" size={18} color="#34D399" />
                <Text style={styles.sellAgainButtonText}>
                  {t('sourcing.sellAgain', 'Sell Again')}
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {/* If Draft, Show Submit/Open Lot CTA */}
          {isDraft && (
            <TouchableOpacity
              style={styles.submitDraftButton}
              onPress={handleSubmitDraft}
              disabled={isSubmitting}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={t('materialLots.submitLot')}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#071E22" />
              ) : (
                <View style={styles.btnRow}>
                  <AppIcon name="send" size={18} color="#071E22" />
                  <Text style={styles.submitDraftButtonText}>
                    {t('materialLots.submitLot')}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          {/* Phase 7: Report a Problem / Open Dispute */}
          {!isDraft && (
            <TouchableOpacity
              style={styles.reportProblemButton}
              onPress={() => setProblemModalVisible(true)}
              activeOpacity={0.8}
            >
              <View style={styles.btnRow}>
                <AppIcon name="alertTriangle" size={18} color="#EF4444" />
                <Text style={styles.reportProblemButtonText}>
                  {t('disputes.reportProblem', 'Report a Problem')}
                </Text>
              </View>
            </TouchableOpacity>
          )}

          <ReportProblemModal
            visible={problemModalVisible}
            onClose={() => setProblemModalVisible(false)}
            materialLotId={lot.id}
            estimatedWeightKg={lot.approximateTotalWeightKg}
            onDisputeCreated={() => {
              navigation?.navigate('CollectorDisputes');
            }}
          />
        </ScrollView>
      </SafeAreaView>
    </EcoSetuBackground>
  );
};

const styles = StyleSheet.create({
  safeArea: {

    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: space.md,
    paddingBottom: space.xl * 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroCard: {
    backgroundColor: 'rgba(15, 35, 40, 0.85)',
    borderRadius: 18,
    padding: space.md,
    marginBottom: space.md,
    borderWidth: 1.5,
    borderColor: 'rgba(20, 184, 166, 0.35)',
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: space.sm,
  },
  categorySymbolCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(20, 184, 166, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: space.sm,
  },
  categorySymbol: {
    fontSize: 26,
  },
  heroTextContainer: {
    flex: 1,
  },
  lotReferenceText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 0.5,
  },
  categoryTitleText: {
    fontSize: 13,
    color: colors.textSecondary || '#94A3B8',
    marginTop: 2,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: space.xs,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeDraft: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderColor: '#F59E0B',
    borderWidth: 1,
  },
  statusBadgeOpen: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: '#10B981',
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  offlineBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  offlineBadgeText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
  },
  sectionCard: {
    backgroundColor: 'rgba(15, 35, 40, 0.75)',
    borderRadius: 16,
    padding: space.md,
    marginBottom: space.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: space.sm,
  },
  photoGallery: {
    flexDirection: 'row',
    marginTop: space.xs,
  },
  galleryImage: {
    width: 140,
    height: 140,
    borderRadius: 12,
    marginRight: space.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  specLabel: {
    fontSize: 13,
    color: colors.textSecondary || '#94A3B8',
  },
  specValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  specValueHighlight: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primary || '#14B8A6',
  },
  descriptionText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 20,
  },
  gpsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 10,
    padding: space.sm,
  },
  gpsCoordsText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  gpsAccuracyText: {
    fontSize: 11,
    color: colors.textSecondary || '#94A3B8',
    marginTop: 2,
  },
  gpsMissingText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    fontStyle: 'italic',
  },
  findRecyclerButton: {
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    borderColor: colors.primary || '#14B8A6',
    borderWidth: 1.5,
    borderRadius: 14,
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: space.sm,
    marginBottom: space.xs,
  },
  findRecyclerButtonText: {
    color: colors.primary || '#14B8A6',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  viewQuotesButton: {
    backgroundColor: '#0F2D2E',
    borderColor: '#10B981',
    borderWidth: 1.5,
    borderRadius: 14,
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: space.xs,
    marginBottom: space.sm,
  },
  viewQuotesButtonText: {
    color: '#34D399',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  handoverActionButton: {
    backgroundColor: '#064E3B',
    borderColor: '#10B981',
    borderWidth: 1.5,
    borderRadius: 14,
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: space.xs,
    marginBottom: space.sm,
  },
  handoverActionButtonText: {
    color: '#A7F3D0',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  submitDraftButton: {
    backgroundColor: colors.primary || '#14B8A6',
    borderRadius: 14,
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: space.xs,
    shadowColor: '#14B8A6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  submitDraftButtonText: {
    color: '#071E22',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  safetyGuidanceButton: {
    backgroundColor: '#0c4a6e',
    borderColor: '#38bdf8',
    borderWidth: 1.5,
    borderRadius: 14,
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: space.xs,
    marginBottom: space.sm,
  },
  safetyGuidanceButtonText: {
    color: '#e0f2fe',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  traceLotButton: {
    backgroundColor: '#0F2A38',
    borderColor: '#38BDF8',
    borderWidth: 1.5,
    borderRadius: 14,
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: space.xs,
    marginBottom: space.sm,
  },
  traceLotButtonText: {
    color: '#7DD3FC',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  sellAgainButton: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10B981',
    borderWidth: 1.5,
    borderRadius: 14,
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: space.xs,
    marginBottom: space.sm,
  },
  sellAgainButtonText: {
    color: '#34D399',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  reportProblemButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: '#EF4444',
    borderWidth: 1.5,
    borderRadius: 14,
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: space.xs,
    marginBottom: space.sm,
  },
  reportProblemButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
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


