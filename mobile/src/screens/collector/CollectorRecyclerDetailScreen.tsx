/**
 * CollectorRecyclerDetailScreen.tsx
 * Recycler Facility Detail Screen for Informal Collectors
 * Canonical Reference: SIH 26229 Prompt 10, docs/25_SIH_26229_REQUIREMENTS.md Section 7
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useNetwork } from '../../hooks/useNetwork';
import { TopAppBar } from '../../components/layout/TopAppBar';
import { EcoSetuBackground } from '../../components/eco';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { useI18n } from '../../i18n';
import {
  recyclerDirectoryService,
  RecyclerDetail,
} from '../../services/recyclerDirectoryService';
import { voiceService } from '../../services/voiceService';

interface Props {
  navigation?: any;
  route?: {
    params?: {
      recyclerId?: string;
      recycler?: any;
      lotId?: string;
      preselectedCategory?: string;
    };
  };
}

export const CollectorRecyclerDetailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { isConnected } = useNetwork();
  const { t, language } = useI18n();

  const routeRecycler = route?.params?.recycler;
  const recyclerId = route?.params?.recyclerId || routeRecycler?.id;
  const lotId = route?.params?.lotId;

  const [recycler, setRecycler] = useState<RecyclerDetail | null>(routeRecycler || null);
  const [isLoading, setIsLoading] = useState<boolean>(!routeRecycler);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isOfflineCached, setIsOfflineCached] = useState<boolean>(false);
  const [isStale, setIsStale] = useState<boolean>(false);
  const [cachedAt, setCachedAt] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  const loadDetails = useCallback(async () => {
    if (!recyclerId) {
      setErrorMessage(t('recyclerDirectory.invalidId') || 'Invalid recycler ID');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);
      const res = await recyclerDirectoryService.getRecyclerDetail(recyclerId);
      setRecycler(res.recycler);
      setIsOfflineCached(Boolean(res.isOfflineCached));
      setIsStale(Boolean(res.isStale));
      setCachedAt(res.cachedAt || null);
    } catch (err: any) {
      console.warn('[CollectorRecyclerDetailScreen] Fetch error:', err.message);
      if (!recycler) {
        setErrorMessage(t('recyclerDirectory.loadDetailError') || 'Failed to load recycler details');
      }
    } finally {
      setIsLoading(false);
    }
  }, [recyclerId, recycler, t]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  // Audio / TTS Action
  const handleSpeakDetails = async () => {
    if (!recycler) return;
    try {
      setIsSpeaking(true);
      const speechText = recyclerDirectoryService.generateRecyclerSpeechText(recycler, language);
      await voiceService.speak(speechText, { language });
    } catch (err) {
      console.warn('[CollectorRecyclerDetailScreen] TTS error:', err);
    } finally {
      setIsSpeaking(false);
    }
  };

  // Safe Call Action
  const handleCall = (phone?: string | null) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`);
  };

  // Safe SMS Action
  const handleMessage = (phone?: string | null) => {
    if (!phone) return;
    Linking.openURL(`sms:${phone.replace(/\s+/g, '')}`);
  };

  // Safe External Map Action
  const handleOpenMap = (lat?: number | null, lng?: number | null, label?: string) => {
    if (lat == null || lng == null) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    Linking.openURL(url);
  };

  const facilityName = recycler?.facilityName || 'Recycling Facility';
  const authorizationStatus = recycler?.authorizationStatus;
  const licenseNumber = (recycler as RecyclerDetail | null)?.licenseNumber;
  const authorizationNumber = (recycler as RecyclerDetail | null)?.authorizationNumber || licenseNumber;
  const issuingAuthority = (recycler as RecyclerDetail | null)?.issuingAuthority;
  const validFrom = (recycler as RecyclerDetail | null)?.authorizationValidFrom;
  const validTill = (recycler as RecyclerDetail | null)?.authorizationValidTill;
  const address = recycler?.facilityAddress;
  const city = recycler?.city;
  const state = recycler?.state;
  const pincode = recycler?.pincode;
  const serviceArea = recycler?.serviceArea || city || 'Standard Area';
  const serviceRadius = recycler?.serviceRadiusKm;
  const pickup = recycler?.pickupAvailable || 'UNKNOWN';
  const categories = recycler?.acceptedCategories || [];
  const rates = recycler?.offeredRates || [];
  const phone = recycler?.contact?.phone || recycler?.user?.phone;
  const email = recycler?.contact?.email || recycler?.user?.email;
  const contactName = recycler?.contact?.name || recycler?.user?.name;
  const hasCoordinates = recycler?.facilityLat != null && recycler?.facilityLng != null;
  const distanceKm = recycler?.distanceKm;

  // Authorization banner styling & label
  const getAuthBadge = () => {
    if (authorizationStatus === 'AUTHORIZED') {
      return {
        label: t('recyclerDirectory.statusAuthorized') || '✓ AUTHORIZED RECYCLER',
        sublabel: t('recyclerDirectory.authorizedDesc') || 'Active CPCB / SPCB Registration',
        bg: 'rgba(16, 185, 129, 0.18)',
        border: '#10B981',
        color: '#10B981',
      };
    }
    if (authorizationStatus === 'PROVISIONAL') {
      return {
        label: t('recyclerDirectory.statusProvisional') || '⚠️ PROVISIONAL AUTHORIZATION',
        sublabel: t('recyclerDirectory.provisionalDesc') || 'Conditional state authorization permit',
        bg: 'rgba(245, 158, 11, 0.18)',
        border: '#F59E0B',
        color: '#F59E0B',
      };
    }
    if (authorizationStatus === 'PENDING' || authorizationStatus === 'PENDING_REVIEW') {
      return {
        label: t('recyclerDirectory.statusPending') || '⏳ PENDING VERIFICATION',
        sublabel: t('recyclerDirectory.pendingDesc') || 'Authorization under administrative verification',
        bg: 'rgba(56, 189, 248, 0.18)',
        border: '#38BDF8',
        color: '#38BDF8',
      };
    }
    if (authorizationStatus === 'SUSPENDED') {
      return {
        label: t('recyclerDirectory.statusSuspended') || '⏸️ SUSPENDED FACILITY',
        sublabel: t('recyclerDirectory.suspendedDesc') || 'Facility authorization suspended by administration',
        bg: 'rgba(249, 115, 22, 0.18)',
        border: '#F97316',
        color: '#F97316',
      };
    }
    if (authorizationStatus === 'REJECTED') {
      return {
        label: t('recyclerDirectory.statusRejected') || '❌ REJECTED APPLICATION',
        sublabel: t('recyclerDirectory.rejectedDesc') || 'Facility authorization application rejected',
        bg: 'rgba(239, 68, 68, 0.18)',
        border: '#EF4444',
        color: '#EF4444',
      };
    }
    if (authorizationStatus === 'EXPIRED') {
      return {
        label: t('recyclerDirectory.statusExpired') || '⌛ EXPIRED AUTHORIZATION',
        sublabel: t('recyclerDirectory.expiredDesc') || 'State registration or permit has expired',
        bg: 'rgba(239, 68, 68, 0.18)',
        border: '#EF4444',
        color: '#EF4444',
      };
    }
    if (authorizationStatus === 'INACTIVE') {
      return {
        label: t('recyclerDirectory.statusInactive') || '⛔ INACTIVE FACILITY',
        sublabel: t('recyclerDirectory.inactiveDesc') || 'Facility is currently inactive',
        bg: 'rgba(100, 116, 139, 0.18)',
        border: '#64748B',
        color: '#94A3B8',
      };
    }
    return {
      label: t('recyclerDirectory.statusUnavailable') || 'ℹ️ Authorization information unavailable',
      sublabel: t('recyclerDirectory.unavailableDesc') || 'Not verified by central registry',
      bg: 'rgba(148, 163, 184, 0.18)',
      border: '#94A3B8',
      color: '#94A3B8',
    };
  };

  const authBadge = getAuthBadge();

  return (
    <EcoSetuBackground>
      <SafeAreaView style={styles.safeArea}>
        <TopAppBar
          title={t('recyclerDirectory.detailTitle') || 'Recycler Facility'}
          showBack
          onBack={() => navigation?.goBack()}
        />

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Offline / Cache Banner */}
          {isOfflineCached && (
            <View style={styles.cacheBanner}>
              <Text style={styles.cacheBannerText}>
                📴 {t('recyclerDirectory.offlineBanner') || 'Offline — showing cached recycler information'}
              </Text>
              {isStale && (
                <Text style={styles.staleBannerText}>
                  ⚠️ {t('recyclerDirectory.staleCacheWarning') || 'Cached more than 24 hours ago'}
                </Text>
              )}
            </View>
          )}

          {/* Loading Indicator */}
          {isLoading && (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={colors.primary || '#14B8A6'} />
              <Text style={styles.loadingText}>
                {t('recyclerDirectory.loading') || 'Loading recycler facility...'}
              </Text>
            </View>
          )}

          {/* Error Message */}
          {errorMessage && !isLoading && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={loadDetails}>
                <Text style={styles.retryBtnText}>{t('common.retry') || 'Retry'}</Text>
              </TouchableOpacity>
            </View>
          )}

          {recycler && (
            <>
              {/* ── CARD 1: Facility Header & Authorization Status ── */}
              <View style={styles.card}>
                <View style={styles.facilityHeaderRow}>
                  <View style={styles.facilityIconCircle}>
                    <Text style={{ fontSize: 28 }}>🏢</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: spacing.spaceSm }}>
                    <Text style={styles.facilityNameText} numberOfLines={2}>
                      {facilityName}
                    </Text>
                    {Boolean(city || state) && (
                      <Text style={styles.cityStateText}>
                        📍 {[city, state].filter(Boolean).join(', ')}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Strict Non-collapsed Authorization Banner */}
                <View style={[styles.authBanner, { backgroundColor: authBadge.bg, borderColor: authBadge.border }]}>
                  <Text style={[styles.authBannerLabel, { color: authBadge.color }]}>
                    {authBadge.label}
                  </Text>
                  <Text style={styles.authBannerSublabel}>
                    {authBadge.sublabel}
                  </Text>
                  {/* Show license / registration number if available (read from DB, never fabricated) */}
                  {Boolean(authorizationNumber) ? (
                    <Text style={styles.licenseNumberText}>
                      {t('recyclerDirectory.regNumber') || 'Reg. No.'}: {authorizationNumber}
                    </Text>
                  ) : (
                    <Text style={[styles.licenseNumberText, { fontStyle: 'italic', opacity: 0.85 }]}>
                      {t('recyclerDirectory.noRefSubmitted') || 'No registration certificate submitted — status unverified'}
                    </Text>
                  )}
                  {Boolean(issuingAuthority) && (
                    <Text style={[styles.licenseNumberText, { marginTop: 2 }]}>
                      🏛️ {t('recyclerDirectory.issuingAuthority') || 'Authority'}: {issuingAuthority}
                    </Text>
                  )}
                  {Boolean(validTill) && (
                    <Text style={[styles.licenseNumberText, { marginTop: 2 }]}>
                      📅 {t('recyclerDirectory.validUntil') || 'Valid until'}: {validTill}
                    </Text>
                  )}
                </View>

                {/* TTS Voice Read Aloud Button */}
                <TouchableOpacity
                  style={styles.voiceButton}
                  onPress={handleSpeakDetails}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={t('recyclerDirectory.speakDetails')}
                >
                  <Text style={styles.voiceButtonText}>
                    {isSpeaking ? '🔊 Speaking...' : '🔊 ' + (t('recyclerDirectory.speakDetails') || 'Listen to Facility Details')}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* ── CARD 2: Location & Service Area ── */}
              <View style={styles.card}>
                <Text style={styles.sectionHeader}>
                  📍 {t('recyclerDirectory.locationCoverage') || 'Location & Service Area'}
                </Text>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{t('recyclerDirectory.address') || 'Address'}:</Text>
                  <Text style={styles.infoValue}>
                    {address || t('recyclerDirectory.addressUnavailable') || 'Address information unavailable'}
                  </Text>
                </View>

                {Boolean(pincode) && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>{t('recyclerDirectory.pincode') || 'PIN Code'}:</Text>
                    <Text style={styles.infoValue}>{pincode}</Text>
                  </View>
                )}

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{t('recyclerDirectory.serviceArea') || 'Service Coverage'}:</Text>
                  <Text style={styles.infoValue}>
                    {serviceArea} {serviceRadius ? `(approx. ${serviceRadius} km radius)` : ''}
                  </Text>
                </View>

                {distanceKm !== null && distanceKm !== undefined && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>{t('recyclerDirectory.distance') || 'Approx. Distance'}:</Text>
                    <Text style={[styles.infoValue, { color: '#38BDF8', fontWeight: 'bold' }]}>
                      ~{distanceKm} km from your registered location
                    </Text>
                  </View>
                )}

                {/* Safe Map Button (Only enabled if actual coordinates exist) */}
                {hasCoordinates ? (
                  <TouchableOpacity
                    style={styles.mapButton}
                    onPress={() => handleOpenMap(recycler.facilityLat, recycler.facilityLng, facilityName)}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={t('recyclerDirectory.viewOnMap')}
                  >
                    <Text style={styles.mapButtonText}>
                      🗺️ {t('recyclerDirectory.viewOnMap') || 'View on Google Maps'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.mapUnavailableBox}>
                    <Text style={styles.mapUnavailableText}>
                      ℹ️ {t('recyclerDirectory.mapCoordsUnavailable') || 'Exact GPS coordinates unavailable for map navigation'}
                    </Text>
                  </View>
                )}
              </View>

              {/* ── CARD 3: Accepted Materials & Pickup ── */}
              <View style={styles.card}>
                <Text style={styles.sectionHeader}>
                  ♻️ {t('recyclerDirectory.materialsAndPickup') || 'Accepted Materials & Pickup'}
                </Text>

                {/* Pickup availability badge */}
                <View style={styles.pickupRow}>
                  <Text style={styles.pickupLabel}>{t('recyclerDirectory.pickupService') || 'Pickup Availability'}:</Text>
                  <View
                    style={[
                      styles.pickupBadge,
                      pickup === 'AVAILABLE'
                        ? styles.pickupAvailable
                        : pickup === 'NOT_AVAILABLE'
                        ? styles.pickupUnavailable
                        : styles.pickupUnknown,
                    ]}
                  >
                    <Text style={styles.pickupBadgeText}>
                      {pickup === 'AVAILABLE'
                        ? '🚚 ' + (t('recyclerDirectory.pickupAvailable') || 'Pickup Available')
                        : pickup === 'NOT_AVAILABLE'
                        ? '🏢 ' + (t('recyclerDirectory.dropoffRequired') || 'Facility Drop-off Required')
                        : '❓ ' + (t('recyclerDirectory.pickupUnknown') || 'Pickup Unknown')}
                    </Text>
                  </View>
                </View>

                {/* Material category chips */}
                <Text style={[styles.infoLabel, { marginTop: spacing.spaceSm, marginBottom: 6 }]}>
                  {t('recyclerDirectory.acceptedCategories') || 'Accepted Categories'}:
                </Text>
                {categories.length > 0 ? (
                  <View style={styles.categoryChipsWrap}>
                    {categories.map((cat, idx) => (
                      <View key={idx} style={styles.categoryChip}>
                        <Text style={styles.categoryChipText}>
                          ♻️ {cat.replace(/_/g, ' ')}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.emptyNoticeText}>
                    {t('recyclerDirectory.noCategoriesListed') || 'Specific material categories not listed'}
                  </Text>
                )}
              </View>

              {/* ── CARD 4: Recycler Offered Rates ── */}
              <View style={styles.card}>
                <View style={styles.ratesHeaderRow}>
                  <Text style={styles.sectionHeader}>
                    💰 {t('recyclerDirectory.offeredRates') || 'Recycler Offered Rates'}
                  </Text>
                  <View style={styles.ratesDisclaimerTag}>
                    <Text style={styles.ratesDisclaimerTagText}>
                      {t('recyclerDirectory.ratesNotMarket') || 'Recycler Offer · Not Market Price'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.ratesNote}>
                  {t('recyclerDirectory.ratesNote') ||
                    'These prices represent published buying offers from this specific facility, not general benchmark market averages.'}
                </Text>

                {rates.length > 0 ? (
                  rates.map((rate) => (
                    <View key={rate.id} style={styles.rateCard}>
                      <View style={styles.rateCardHeader}>
                        <Text style={styles.rateCategoryText}>
                          {rate.category.replace(/_/g, ' ')}
                          {rate.subcategory ? ` · ${rate.subcategory}` : ''}
                        </Text>
                        <Text style={styles.rateAmountText}>
                          ₹{rate.rate} <Text style={styles.rateUnitText}>/{rate.unit.replace('PER_', '').toLowerCase()}</Text>
                        </Text>
                      </View>

                      <View style={styles.rateMetaRow}>
                        {Boolean(rate.effectiveDate) && (
                          <Text style={styles.rateMetaText}>
                            ⏱️ Effective: {new Date(rate.effectiveDate).toLocaleDateString()}
                          </Text>
                        )}
                        {Boolean(rate.sourceReference) && (
                          <Text style={styles.rateMetaText}>
                            📋 Ref: {rate.sourceReference}
                          </Text>
                        )}
                      </View>
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyRatesBox}>
                    <Text style={styles.emptyRatesText}>
                      ℹ️ {t('recyclerDirectory.ratesUnavailable') || 'Current offered rate unavailable'}
                    </Text>
                    <Text style={styles.emptyRatesSubtext}>
                      {t('recyclerDirectory.ratesUnavailableDesc') ||
                        'This recycler has not published active buying rates for browsing. Contact them directly or create a quote request.'}
                    </Text>
                  </View>
                )}
              </View>

              {/* ── CARD 5: Contact Information & Actions ── */}
              <View style={styles.card}>
                <Text style={styles.sectionHeader}>
                  📞 {t('recyclerDirectory.contactFacility') || 'Contact Facility'}
                </Text>

                {phone || email || contactName ? (
                  <>
                    {Boolean(contactName) && (
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>{t('recyclerDirectory.contactPerson') || 'Representative'}:</Text>
                        <Text style={styles.infoValue}>{contactName}</Text>
                      </View>
                    )}

                    {Boolean(email) && (
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>{t('recyclerDirectory.email') || 'Email'}:</Text>
                        <Text style={styles.infoValue}>{email}</Text>
                      </View>
                    )}

                    {Boolean(phone) && (
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>{t('recyclerDirectory.phone') || 'Phone'}:</Text>
                        <Text style={styles.infoValue}>{phone}</Text>
                      </View>
                    )}

                    {/* Quick Call & Message Buttons */}
                    {Boolean(phone) && (
                      <View style={styles.contactActionsRow}>
                        <TouchableOpacity
                          style={styles.callButton}
                          onPress={() => handleCall(phone)}
                          activeOpacity={0.8}
                          accessibilityRole="button"
                          accessibilityLabel={`Call ${facilityName}`}
                        >
                          <Text style={styles.callButtonText}>
                            📞 {t('recyclerDirectory.call') || 'Call Recycler'}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.messageButton}
                          onPress={() => handleMessage(phone)}
                          activeOpacity={0.8}
                          accessibilityRole="button"
                          accessibilityLabel={`Send SMS to ${facilityName}`}
                        >
                          <Text style={styles.messageButtonText}>
                            💬 {t('recyclerDirectory.message') || 'Send SMS'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </>
                ) : (
                  <View style={styles.contactUnavailableBox}>
                    <Text style={styles.contactUnavailableText}>
                      ℹ️ {t('recyclerDirectory.contactUnavailable') || 'Contact information unavailable'}
                    </Text>
                  </View>
                )}
              </View>

              {/* ── Action: Material Lot Matching Connection ── */}
              {lotId ? (
                <TouchableOpacity
                  style={styles.primaryActionBtn}
                  onPress={() => navigation?.navigate('CollectorRecyclerMatches', { lotId })}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={t('recyclerDirectory.backToMatches')}
                >
                  <Text style={styles.primaryActionBtnText}>
                    📦 {t('recyclerDirectory.backToMatches') || 'Return to Lot Matches'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.primaryActionBtn}
                  onPress={() => navigation?.navigate('CollectorLots')}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={t('recyclerDirectory.matchMaterialLot')}
                >
                  <Text style={styles.primaryActionBtnText}>
                    📦 {t('recyclerDirectory.matchMaterialLot') || 'Match a Material Lot with Recyclers'}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Data Freshness Indicator */}
              <View style={styles.freshnessFooter}>
                <Text style={styles.freshnessText}>
                  {isOfflineCached
                    ? `📴 Cached: ${cachedAt ? new Date(cachedAt).toLocaleString() : 'Recently'}`
                    : `🟢 Live Data · Last updated: ${recycler.updatedAt ? new Date(recycler.updatedAt).toLocaleDateString() : 'Active'}`}
                </Text>
              </View>
            </>
          )}
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
  scrollContent: {
    padding: spacing.spaceMd,
    paddingBottom: 40,
  },
  cacheBanner: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 8,
    padding: spacing.spaceSm,
    marginBottom: spacing.spaceMd,
  },
  cacheBannerText: {
    color: '#F59E0B',
    fontSize: 13,
    fontWeight: '600',
  },
  staleBannerText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
  loadingBox: {
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    color: colors.textSecondary || '#94A3B8',
    marginTop: 8,
    fontSize: 14,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 8,
    padding: spacing.spaceMd,
    marginBottom: spacing.spaceMd,
    alignItems: 'center',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    minHeight: 48,
    justifyContent: 'center',
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  card: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: spacing.spaceMd,
    marginBottom: spacing.spaceMd,
  },
  facilityHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.spaceSm,
  },
  facilityIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(20, 184, 166, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  facilityNameText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cityStateText: {
    color: colors.textSecondary || '#94A3B8',
    fontSize: 13,
    marginTop: 2,
  },
  authBanner: {
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.spaceSm,
    marginVertical: spacing.spaceSm,
  },
  authBannerLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  authBannerSublabel: {
    color: '#CBD5E1',
    fontSize: 12,
    marginTop: 2,
  },
  licenseNumberText: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 4,
    fontFamily: 'monospace',
  },
  voiceButton: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: '#38BDF8',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  voiceButtonText: {
    color: '#38BDF8',
    fontSize: 14,
    fontWeight: '600',
  },
  sectionHeader: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: spacing.spaceSm,
  },
  infoRow: {
    marginBottom: 8,
  },
  infoLabel: {
    color: colors.textSecondary || '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  infoValue: {
    color: '#F1F5F9',
    fontSize: 14,
    marginTop: 1,
  },
  mapButton: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 8,
    paddingVertical: 12,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  mapButtonText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '600',
  },
  mapUnavailableBox: {
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
    borderRadius: 6,
    padding: 8,
    marginTop: 6,
  },
  mapUnavailableText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  pickupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.spaceSm,
  },
  pickupLabel: {
    color: colors.textSecondary || '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  pickupBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pickupAvailable: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  pickupUnavailable: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  pickupUnknown: {
    backgroundColor: 'rgba(148, 163, 184, 0.2)',
    borderWidth: 1,
    borderColor: '#94A3B8',
  },
  pickupBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  categoryChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  categoryChip: {
    backgroundColor: 'rgba(20, 184, 166, 0.15)',
    borderColor: 'rgba(20, 184, 166, 0.4)',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  categoryChipText: {
    color: '#2DD4BF',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyNoticeText: {
    color: '#94A3B8',
    fontSize: 13,
    fontStyle: 'italic',
  },
  ratesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 4,
  },
  ratesDisclaimerTag: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  ratesDisclaimerTagText: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: 'bold',
  },
  ratesNote: {
    color: '#94A3B8',
    fontSize: 11,
    marginBottom: spacing.spaceSm,
    marginTop: 2,
  },
  rateCard: {
    backgroundColor: 'rgba(2, 6, 23, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    padding: spacing.spaceSm,
    marginBottom: 8,
  },
  rateCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rateCategoryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
  },
  rateAmountText: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: 'bold',
  },
  rateUnitText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: 'normal',
  },
  rateMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  rateMetaText: {
    color: '#64748B',
    fontSize: 11,
  },
  emptyRatesBox: {
    backgroundColor: 'rgba(148, 163, 184, 0.08)',
    borderRadius: 8,
    padding: spacing.spaceSm,
  },
  emptyRatesText: {
    color: '#F59E0B',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyRatesSubtext: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  contactActionsRow: {
    flexDirection: 'row',
    gap: spacing.spaceSm,
    marginTop: spacing.spaceSm,
  },
  callButton: {
    flex: 1,
    backgroundColor: '#10B981',
    borderRadius: 8,
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callButtonText: {
    color: '#051417',
    fontWeight: 'bold',
    fontSize: 14,
  },
  messageButton: {
    flex: 1,
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    borderWidth: 1,
    borderColor: '#38BDF8',
    borderRadius: 8,
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageButtonText: {
    color: '#38BDF8',
    fontWeight: 'bold',
    fontSize: 14,
  },
  contactUnavailableBox: {
    backgroundColor: 'rgba(148, 163, 184, 0.08)',
    borderRadius: 6,
    padding: 8,
  },
  contactUnavailableText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  primaryActionBtn: {
    backgroundColor: colors.primary || '#14B8A6',
    borderRadius: 10,
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.spaceSm,
    marginBottom: spacing.spaceMd,
  },
  primaryActionBtnText: {
    color: '#051417',
    fontWeight: 'bold',
    fontSize: 15,
  },
  freshnessFooter: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  freshnessText: {
    color: '#64748B',
    fontSize: 12,
  },
});

export default CollectorRecyclerDetailScreen;
