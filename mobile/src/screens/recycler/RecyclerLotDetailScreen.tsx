/**
 * EcoSetu Recycler Marketplace Lot Detail Screen
 * Canonical Reference: docs/25_SIH_26229_REQUIREMENTS.md Section 4 & 10
 *
 * Real two-sided e-waste marketplace product page:
 * - Photo gallery of real lot photos
 * - Material information (category, subcategory, condition, weight, lot reference)
 * - Location (area, city, state)
 * - Market activity (real offer count, listing timestamp, lot status)
 * - Price / offer information (real active quotes or "No offers yet")
 * - Primary CTA: "Make Offer"
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useI18n } from '../../i18n';
import { EcoSetuBackground } from '../../components/eco';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import apiClient from '../../services/apiClient';
import networkService from '../../services/networkService';
import { ReportProblemModal } from '../../components/dispute/ReportProblemModal';

const space = {
  xs: spacing.spaceXs,
  sm: spacing.spaceSm,
  md: spacing.spaceMd,
  lg: spacing.spaceLg,
  xl: spacing.spaceXl,
};

export const RecyclerLotDetailScreen: React.FC = () => {
  const { width: screenWidth } = useWindowDimensions();
  const { t } = useI18n();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();

  const lotId = route.params?.lotId;
  const initialLot = route.params?.lot;

  const [lot, setLot] = useState<any>(initialLot || null);
  const [loading, setLoading] = useState(!initialLot);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [problemModalVisible, setProblemModalVisible] = useState(false);

  const fetchLot = useCallback(async () => {
    if (!lotId && !initialLot?.id) return;
    const targetId = lotId || initialLot?.id;
    setError(null);
    try {
      const response = await apiClient.get(`/material-lots/${targetId}`);
      if (response.data && response.data.success) {
        setLot(response.data.data);
      }
    } catch (err: any) {
      if (!networkService.isOnline()) {
        setError(t('common.offline') || 'Offline — showing cached lot details');
      } else {
        setError(err.message || 'Failed to load lot details');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [lotId, initialLot, t]);

  useEffect(() => {
    fetchLot();
  }, [fetchLot]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLot();
  };

  if (loading && !refreshing) {
    return (
      <EcoSetuBackground>
        <SafeAreaView style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={styles.loadingText}>{t('common.loading') || 'Loading...'}</Text>
        </SafeAreaView>
      </EcoSetuBackground>
    );
  }

  if (error && !lot) {
    return (
      <EcoSetuBackground>
        <SafeAreaView style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchLot}>
            <Text style={styles.retryButtonText}>{t('common.retry') || 'Retry'}</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </EcoSetuBackground>
    );
  }

  const photos = lot?.photos || [];
  const offerCount = lot?._count?.quotes || 0;
  const weight = lot?.approximateTotalWeightKg || '—';
  const location = lot?.collector?.city
    ? `${lot.collector.city}${lot.collector.state ? `, ${lot.collector.state}` : ''}`
    : (lot?.collector?.serviceArea || 'Location on file');

  return (
    <EcoSetuBackground>
      <SafeAreaView style={styles.safeArea}>
        {/* Navigation Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
          >
            <Text style={styles.backButtonText}>← {t('common.back')}</Text>
          </TouchableOpacity>
          <View style={styles.headerTitleBlock}>
            <Text style={styles.headerTitle}>{lot?.referenceNumber || 'Lot Detail'}</Text>
            <Text style={styles.headerSubtitle}>
              {lot?.category} {lot?.subcategory ? `• ${lot.subcategory}` : ''}
            </Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#10B981']} tintColor="#10B981" />}
        >
          {/* Photo Gallery Carousel */}
          {photos.length > 0 ? (
            <View style={styles.galleryContainer}>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                  const idx = Math.round(e.nativeEvent.contentOffset.x / (screenWidth - 32));
                  setActivePhotoIndex(idx);
                }}
              >
                {photos.map((photo: any, index: number) => (
                  <Image
                    key={photo.id || index}
                    source={{ uri: photo.photoUrl }}
                    style={[styles.galleryImage, { width: screenWidth - 32 }]}
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
              {photos.length > 1 ? (
                <View style={styles.paginationDots}>
                  {photos.map((_: any, idx: number) => (
                    <View
                      key={idx}
                      style={[styles.dot, activePhotoIndex === idx && styles.activeDot]}
                    />
                  ))}
                </View>
              ) : null}
            </View>
          ) : (
            <View style={styles.noPhotoBox}>
              <Text style={styles.noPhotoIcon}>📷</Text>
              <Text style={styles.noPhotoText}>{t('materialLots.noPhotos') || 'No photos attached'}</Text>
            </View>
          )}

          {/* Core Product Info Card */}
          <View style={styles.card}>
            <View style={styles.badgeRow}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>📦 {lot?.category}</Text>
              </View>
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>● {lot?.status}</Text>
              </View>
            </View>

            <Text style={styles.lotTitle}>{lot?.referenceNumber}</Text>
            {lot?.subcategory ? (
              <Text style={styles.lotSubtitle}>Subcategory: {lot.subcategory}</Text>
            ) : null}

            {/* Spec Matrix */}
            <View style={styles.specGrid}>
              <View style={styles.specItem}>
                <Text style={styles.specLabel}>⚖️ {t('materialLots.weight') || 'Weight'}</Text>
                <Text style={styles.specValue}>{weight} kg</Text>
              </View>
              <View style={styles.specItem}>
                <Text style={styles.specLabel}>🔧 {t('materialLots.condition') || 'Condition'}</Text>
                <Text style={styles.specValue}>{lot?.condition || 'UNKNOWN'}</Text>
              </View>
              <View style={styles.specItem}>
                <Text style={styles.specLabel}>🏷️ Source</Text>
                <Text style={styles.specValue}>{lot?.sourceType || 'HOUSEHOLD'}</Text>
              </View>
              <View style={styles.specItem}>
                <Text style={styles.specLabel}>📍 Location</Text>
                <Text style={styles.specValue}>{location}</Text>
              </View>
            </View>

            {lot?.description ? (
              <View style={styles.descriptionBox}>
                <Text style={styles.descriptionLabel}>📝 Description:</Text>
                <Text style={styles.descriptionText}>{lot.description}</Text>
              </View>
            ) : null}
          </View>

          {/* Market Activity & Competition */}
          <View style={styles.card}>
            <Text style={styles.sectionHeading}>📊 Market Activity</Text>
            <View style={styles.activityRow}>
              <Text style={styles.activityLabel}>Active Offers:</Text>
              <Text style={styles.activityValueHighlight}>
                {offerCount} {offerCount === 1 ? 'offer received' : 'offers received'}
              </Text>
            </View>
            <View style={styles.activityRow}>
              <Text style={styles.activityLabel}>Listed On:</Text>
              <Text style={styles.activityValue}>
                {lot?.createdAt ? new Date(lot.createdAt).toLocaleString() : '—'}
              </Text>
            </View>
            <View style={styles.activityRow}>
              <Text style={styles.activityLabel}>Pricing Status:</Text>
              <Text style={styles.activityValue}>
                {offerCount > 0 ? 'Competitive Bidding Open' : 'No offers yet'}
              </Text>
            </View>
          </View>

          {/* Seller / Contact Privacy Information */}
          <View style={styles.card}>
            <Text style={styles.sectionHeading}>🏢 Seller Profile</Text>
            <View style={styles.activityRow}>
              <Text style={styles.activityLabel}>Seller ID:</Text>
              <Text style={styles.activityValue}>
                {lot?.collector?.user?.name || 'Verified Collector'}
              </Text>
            </View>
            <View style={styles.activityRow}>
              <Text style={styles.activityLabel}>Service Area:</Text>
              <Text style={styles.activityValue}>{location}</Text>
            </View>
            <View style={styles.privacyNote}>
              <Text style={styles.privacyNoteText}>
                🔒 Direct phone and contact information are protected until quotation acceptance.
              </Text>
            </View>
          </View>

          {/* Sourcing Economic Guidance */}
          <View style={styles.card}>
            <Text style={styles.sectionHeading}>💡 Factual Sourcing Guidance</Text>
            <Text style={styles.guidanceText}>
              • Make offers in INR (₹) per kg or unit based on your facility's processing capacity.
            </Text>
            <Text style={styles.guidanceText}>
              • Specify pickup availability accurately. Sellers compare offers based on both unit rate and logistics feasibility.
            </Text>
            <Text style={styles.guidanceText}>
              • Total offer amount is calculated strictly as Rate × Weight.
            </Text>
          </View>
        </ScrollView>

        {/* Primary Bottom Action CTA */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.primaryActionButton}
            onPress={() => navigation.navigate('RecyclerCreateQuote', { lot })}
            accessibilityRole="button"
            accessibilityLabel={t('recycler.marketplace.makeOffer') || 'Make Offer'}
          >
            <Text style={styles.primaryActionText}>
              💰 {t('recycler.marketplace.makeOffer') || 'Make Offer'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.problemActionButton}
            onPress={() => setProblemModalVisible(true)}
            accessibilityRole="button"
          >
            <Text style={styles.problemActionText}>🚨 Report Issue / Reject</Text>
          </TouchableOpacity>
        </View>

        {lot && (
          <ReportProblemModal
            visible={problemModalVisible}
            onClose={() => setProblemModalVisible(false)}
            materialLotId={lot.id}
            initialDisputeType="MATERIAL_MISMATCH"
            estimatedWeightKg={Number(lot.approximateTotalWeightKg)}
            onDisputeCreated={() => {
              navigation.navigate('RecyclerDisputes');
            }}
          />
        )}
      </SafeAreaView>
    </EcoSetuBackground>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: space.md,
  },
  loadingText: {
    marginTop: 12,
    color: '#94A3B8',
    fontSize: 14,
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#10B981',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#071E22',
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginRight: space.sm,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  headerTitleBlock: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
  },
  scrollContent: {
    padding: space.md,
    paddingBottom: 90,
  },
  galleryContainer: {
    marginBottom: space.md,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  galleryImage: {
    height: 220,
  },
  paginationDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#10B981',
    width: 16,
  },
  noPhotoBox: {
    height: 140,
    borderRadius: 16,
    backgroundColor: 'rgba(15, 35, 40, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: space.md,
  },
  noPhotoIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  noPhotoText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  card: {
    backgroundColor: 'rgba(15, 35, 40, 0.85)',
    borderRadius: 16,
    padding: space.md,
    marginBottom: space.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  categoryBadgeText: {
    color: '#34D399',
    fontSize: 12,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  statusBadgeText: {
    color: '#60A5FA',
    fontSize: 12,
    fontWeight: '700',
  },
  lotTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  lotSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 12,
  },
  specGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: space.sm,
    marginBottom: 12,
  },
  specItem: {
    width: '47%',
    padding: 6,
  },
  specLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 2,
  },
  specValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  descriptionBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    padding: space.sm,
    borderRadius: 10,
  },
  descriptionLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 4,
    fontWeight: '600',
  },
  descriptionText: {
    fontSize: 13,
    color: '#E2E8F0',
    lineHeight: 18,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  activityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  activityLabel: {
    fontSize: 13,
    color: '#94A3B8',
  },
  activityValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  activityValueHighlight: {
    fontSize: 13,
    fontWeight: '700',
    color: '#34D399',
  },
  privacyNote: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 8,
    padding: space.sm,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  privacyNoteText: {
    fontSize: 11,
    color: '#FDE68A',
    lineHeight: 16,
  },
  guidanceText: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 18,
    marginBottom: 6,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(7, 30, 34, 0.95)',
    paddingHorizontal: space.md,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
  },
  primaryActionButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryActionText: {
    color: '#071E22',
    fontSize: 16,
    fontWeight: '800',
  },
  problemActionButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  problemActionText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default RecyclerLotDetailScreen;
