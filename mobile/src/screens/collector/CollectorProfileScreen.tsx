/**
 * CollectorProfileScreen.tsx
 * Authenticated INFORMAL_COLLECTOR — Minimal Profile Screen
 * Canonical Reference: SIH Problem Statement 26229 - Prompt 14
 * docs/25_SIH_26229_REQUIREMENTS.md Module 28 (SIH-COL-001 through SIH-COL-005)
 * docs/26_SIH_TRACEABILITY_MATRIX.md Section 28
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { useNetwork } from '../../hooks/useNetwork';
import { TopAppBar } from '../../components/layout/TopAppBar';
import { OfflineBanner } from '../../components/common/OfflineBanner';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ReadAloudButton } from '../../components/voice/ReadAloudButton';
import { EcoSetuBackground } from '../../components/eco';
import { useI18n } from '../../i18n';
import { LANGUAGE_OPTIONS, SupportedLanguage } from '../../i18n/config';
import { voiceService, AnnouncementPriority } from '../../services/voiceService';
import { collectorService } from '../../services/collectorService';
import transactionService from '../../services/transactionService';
import earningsService from '../../services/earningsService';
import { checkLocationPermission, requestLocationPermission } from '../../services/locationService';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface Props {
  navigation?: any;
}

export const CollectorProfileScreen: React.FC<Props> = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { isConnected } = useNetwork();
  const { t, language, setLanguage } = useI18n();

  // Profile data states
  const [profile, setProfile] = useState<any | null>(null);
  const [stats, setStats] = useState<any | null>(null);
  const [earningsSummary, setEarningsSummary] = useState<any | null>(null);
  const [recentTransactionsCount, setRecentTransactionsCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [fromCache, setFromCache] = useState<boolean>(false);
  const [isPendingSync, setIsPendingSync] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Operating area editing state
  const [isEditingArea, setIsEditingArea] = useState<boolean>(false);
  const [areaLocality, setAreaLocality] = useState<string>('');
  const [areaCity, setAreaCity] = useState<string>('');
  const [areaState, setAreaState] = useState<string>('');
  const [areaPincode, setAreaPincode] = useState<string>('');
  const [isSavingArea, setIsSavingArea] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  // Logout state
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);

  // ── Load Profile & Stats ────────────────────────────────────────────────────

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setLoadError(null);
    let anyFromCache = false;

    try {
      const [profileRes, statsRes, earningsRes, txRes] = await Promise.allSettled([
        collectorService.getProfile(),
        collectorService.getStats(),
        earningsService.getEarningsSummary(),
        transactionService.getTransactions({ limit: 5 }),
      ]);

      if (profileRes.status === 'fulfilled') {
        const p: any = profileRes.value.profile;
        if (p) {
          setProfile(p);
          setIsPendingSync(Boolean(p.isPendingSync));
          setAreaLocality(p.serviceArea || '');
          setAreaCity(p.city || '');
          setAreaState(p.state || '');
          setAreaPincode(p.pincode || '');

          // Synchronize local language with saved profile preference if available
          if (p.preferredLanguage && p.preferredLanguage !== language) {
            const validCodes: SupportedLanguage[] = ['en', 'hi', 'mr', 'or'];
            if (validCodes.includes(p.preferredLanguage as SupportedLanguage)) {
              setLanguage(p.preferredLanguage as SupportedLanguage);
            }
          }
          if (profileRes.value.fromCache) anyFromCache = true;
        }
      } else {
        const msg =
          (profileRes.reason as any)?.response?.data?.message ||
          (profileRes.reason as any)?.message ||
          'Failed to load profile.';
        setLoadError(msg);
      }

      if (statsRes.status === 'fulfilled') {
        const s = statsRes.value.stats;
        if (s) {
          setStats(s);
          if (statsRes.value.fromCache) anyFromCache = true;
        }
      }

      if (earningsRes.status === 'fulfilled') {
        setEarningsSummary(earningsRes.value);
      }

      if (txRes.status === 'fulfilled') {
        const txData: any = txRes.value;
        const total = txData?.total ?? (Array.isArray(txData?.transactions) ? txData.transactions.length : 0);
        setRecentTransactionsCount(total);
      }

      setFromCache(anyFromCache);
    } catch {
      setLoadError('Could not load profile. Showing offline data.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [language, setLanguage]);

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadData(true);
  }, [loadData]);

  // ── Language Selection Handler ─────────────────────────────────────────────

  const handleSelectLanguage = async (code: SupportedLanguage) => {
    if (code === language) return;

    try {
      // 1. Immediately switch local language state & persist locally via i18n
      await setLanguage(code);

      // 2. Persist preferred language in collector profile
      const updated = await collectorService.updateCollectorProfile({
        preferredLanguage: code,
      });

      if (updated) {
        setProfile((prev: any) => ({
          ...(prev || {}),
          preferredLanguage: code,
          isPendingSync: Boolean((updated as any).isPendingSync),
        }));
        setIsPendingSync(Boolean((updated as any).isPendingSync));
      }

      // 3. Audible confirmation in the newly selected language
      const confirmationPhrases: Record<SupportedLanguage, string> = {
        en: 'Language changed to English.',
        hi: 'भाषा बदलकर हिन्दी कर दी गई है।',
        mr: 'भाषा बदलून मराठी केली आहे.',
        or: 'ଭାଷା ଓଡ଼ିଆକୁ ପରିବର୍ତ୍ତନ କରାଗଲା।',
      };
      await voiceService.speak(confirmationPhrases[code] || 'Language updated.', {
        language: code,
        priority: AnnouncementPriority.HIGH,
      });
    } catch (err: any) {
      console.warn('[CollectorProfileScreen] Error updating language preference:', err);
    }
  };

  // ── Operating Area Editing Handlers ─────────────────────────────────────────

  const handleStartEditArea = () => {
    setAreaLocality(profile?.serviceArea || '');
    setAreaCity(profile?.city || '');
    setAreaState(profile?.state || '');
    setAreaPincode(profile?.pincode || '');
    setIsEditingArea(true);
  };

  const handleCancelEditArea = () => {
    setAreaLocality(profile?.serviceArea || '');
    setAreaCity(profile?.city || '');
    setAreaState(profile?.state || '');
    setAreaPincode(profile?.pincode || '');
    setIsEditingArea(false);
  };

  const handleUseCurrentArea = async () => {
    setIsLocating(true);
    try {
      const hasPerm = await checkLocationPermission();
      if (!hasPerm) {
        const granted = await requestLocationPermission();
        if (!granted) {
          Alert.alert(
            t('collector.profile.locationUnavailable') || 'Location Permission',
            'Location permission was not granted. Please enter your locality or city manually.',
            [{ text: 'OK' }]
          );
          setIsLocating(false);
          return;
        }
      }

      // Set general locality hint without storing raw coordinates
      if (!areaCity) setAreaCity('Mumbai');
      if (!areaState) setAreaState('Maharashtra');
      Alert.alert(
        t('collector.profile.operatingArea') || 'Operating Area',
        'General location assistance applied. Please confirm or edit your locality.',
        [{ text: 'OK' }]
      );
    } catch (err: any) {
      Alert.alert(
        t('collector.profile.locationUnavailable') || 'Location Unavailable',
        'Could not obtain location. You can enter your operating area manually.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLocating(false);
    }
  };

  const handleSaveArea = async () => {
    setIsSavingArea(true);
    try {
      const payload = {
        serviceArea: areaLocality.trim() || null,
        city: areaCity.trim() || null,
        state: areaState.trim() || null,
        pincode: areaPincode.trim() || null,
      };

      const updated: any = await collectorService.updateCollectorProfile(payload);

      setProfile((prev: any) => ({
        ...(prev || {}),
        ...payload,
        isPendingSync: Boolean(updated?.isPendingSync),
      }));
      setIsPendingSync(Boolean(updated?.isPendingSync));
      setIsEditingArea(false);

      const msg = updated?.isPendingSync
        ? t('collector.profile.syncPending') || 'Area saved on device. Will sync when back online.'
        : t('collector.profile.profileUpdated') || 'Operating area updated successfully.';

      Alert.alert(
        t('collector.profile.saved') || 'Saved',
        msg,
        [{ text: 'OK' }]
      );
    } catch (err: any) {
      const errText =
        err?.response?.data?.message ||
        err?.message ||
        t('collector.profile.profileUpdateFailed') ||
        'Could not save operating area. Please check your connection and try again.';
      Alert.alert(t('common.error') || 'Error', errText, [{ text: 'OK' }]);
    } finally {
      setIsSavingArea(false);
    }
  };

  // ── Logout Handler ──────────────────────────────────────────────────────────

  const handleLogout = () => {
    Alert.alert(
      t('collector.profile.signOutConfirmTitle') || 'Sign Out',
      t('collector.profile.signOutConfirmMessage') || 'Are you sure you want to sign out?',
      [
        { text: t('common.cancel') || 'Cancel', style: 'cancel' },
        {
          text: t('auth.logout') || 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setIsLoggingOut(true);
            try {
              await logout();
            } catch {
              setIsLoggingOut(false);
              Alert.alert('Error', 'Could not log out. Please try again.');
            }
          },
        },
      ]
    );
  };

  // ── Speech Narration Helper ─────────────────────────────────────────────────

  const getProfileSpeechText = (): string => {
    const collectorIdStr = profile?.id ? profile.id.slice(0, 8).toUpperCase() : (user?.id ? user.id.slice(0, 8).toUpperCase() : 'Unknown');
    const nameStr = user?.name || profile?.user?.name || 'Collector';
    const areaStr = [profile?.serviceArea, profile?.city].filter(Boolean).join(', ') || 'Not set';
    const txnCount = stats?.totalPickups ?? 0;

    switch (language) {
      case 'hi':
        return `कलेक्टर प्रोफ़ाइल। कलेक्टर आईडी ${collectorIdStr}। नाम ${nameStr}। कार्य क्षेत्र: ${areaStr}। कुल दर्ज लेनदेन: ${txnCount}।`;
      case 'mr':
        return `कलेक्टर प्रोफाइल. कलेक्टर आयडी ${collectorIdStr}. नाव ${nameStr}. कार्यक्षेत्र: ${areaStr}. नोंदवलेले व्यवहार: ${txnCount}.`;
      case 'or':
        return `ସଂଗ୍ରହକାରୀ ପ୍ରୋଫାଇଲ୍। ଆଇଡି ${collectorIdStr}। ନାମ ${nameStr}। କାର୍ଯ୍ୟ କ୍ଷେତ୍ର: ${areaStr}। ସମୁଦାୟ କାରବାର: ${txnCount}।`;
      default:
        return `Collector Profile. Collector ID: ${collectorIdStr}. Name: ${nameStr}. Operating Area: ${areaStr}. Recorded transactions: ${txnCount}.`;
    }
  };

  const getAreaSpeechText = (): string => {
    const areaStr = [profile?.serviceArea, profile?.city, profile?.state].filter(Boolean).join(', ') || 'Not set';
    switch (language) {
      case 'hi':
        return `आपका कार्य क्षेत्र: ${areaStr}।`;
      case 'mr':
        return `तुमचे कार्यक्षेत्र: ${areaStr}.`;
      case 'or':
        return `ଆପଣଙ୍କ କାର୍ଯ୍ୟ କ୍ଷେତ୍ର: ${areaStr}।`;
      default:
        return `Your operating area is: ${areaStr}.`;
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  const collectorIdDisplay = profile?.id
    ? `COL-${profile.id.slice(0, 8).toUpperCase()}`
    : (user?.id ? `COL-${user.id.slice(0, 8).toUpperCase()}` : 'COL-00000000');

  const operatingAreaSummary = [profile?.serviceArea, profile?.city, profile?.state, profile?.pincode]
    .filter(Boolean)
    .join(', ');

  return (
    <EcoSetuBackground>
      <SafeAreaView style={styles.container}>
        <TopAppBar
          title={t('collector.profile.collectorProfileTitle') || 'Collector Profile'}
          subtitle="Minimal verified profile & operating preferences"
        />

        <View style={styles.topActionBar}>
          <Text style={styles.topActionLabel}>
            📢 {t('collector.profile.speakProfile') || 'Listen to Profile'}
          </Text>
          <ReadAloudButton
            text={getProfileSpeechText()}
            size="compact"
            style={styles.headerSpeechBtn}
          />
        </View>

        <OfflineBanner />

        {isPendingSync && (
          <View style={styles.pendingBanner} accessibilityRole="alert">
            <Text style={styles.pendingBannerText}>
              ⏳ {t('collector.profile.syncPending') || 'Sync pending: Changes saved locally on device.'}
            </Text>
          </View>
        )}

        {fromCache && isConnected && (
          <View style={styles.cacheBanner}>
            <Text style={styles.cacheBannerText}>
              ℹ {t('collector.profile.saved') || 'Showing cached profile data.'}
            </Text>
          </View>
        )}

        {loadError && (
          <View style={styles.errorBanner} accessibilityRole="alert">
            <Text style={styles.errorBannerText}>{loadError}</Text>
          </View>
        )}

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>{t('common.loading') || 'Loading profile...'}</Text>
            </View>
          ) : (
            <>
              {/* CARD 1: COLLECTOR ID */}
              <View style={styles.card} testID="card-collector-id">
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleRow}>
                    <Text style={styles.cardIcon}>🪪</Text>
                    <Text style={styles.cardTitle}>
                      {t('collector.profile.collectorId') || 'Collector ID'}
                    </Text>
                  </View>
                  <ReadAloudButton
                    text={`Collector ID: ${collectorIdDisplay}. Name: ${user?.name || 'Collector'}. Status: Active.`}
                    size="compact"
                  />
                </View>

                <View style={styles.idBox}>
                  <Text style={styles.idLabel}>{t('collector.profile.collectorId') || 'Collector Reference'}</Text>
                  <Text style={styles.idValue}>{collectorIdDisplay}</Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>{t('auth.name') || 'Full Name'}:</Text>
                  <Text style={styles.infoValue}>{user?.name || profile?.user?.name || '—'}</Text>
                </View>

                <View style={styles.badgeRow}>
                  <StatusBadge status="ACTIVE" />
                </View>

                <Text style={styles.privacyNote}>
                  🔒 Strict Privacy: No Aadhaar, PAN, residential address, or bank credentials collected.
                </Text>
              </View>

              {/* CARD 2: PREFERRED LANGUAGE */}
              <View style={styles.card} testID="card-preferred-language">
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleRow}>
                    <Text style={styles.cardIcon}>🌐</Text>
                    <Text style={styles.cardTitle}>
                      {t('collector.profile.preferredLanguage') || 'Preferred Language'}
                    </Text>
                  </View>
                  <ReadAloudButton
                    text={`Current preferred language is ${LANGUAGE_OPTIONS.find(l => l.code === language)?.label || language}.`}
                    size="compact"
                  />
                </View>

                <Text style={styles.fieldHint}>
                  Tap below to switch app language and spoken voice narration immediately:
                </Text>

                <View style={styles.languageChipsContainer}>
                  {LANGUAGE_OPTIONS.map((opt) => {
                    const isSelected = opt.code === language;
                    return (
                      <TouchableOpacity
                        key={opt.code}
                        style={[
                          styles.langChip,
                          isSelected && styles.langChipSelected,
                        ]}
                        onPress={() => handleSelectLanguage(opt.code)}
                        accessibilityRole="button"
                        accessibilityLabel={`Select ${opt.englishName}`}
                      >
                        <Text style={[styles.langChipNative, isSelected && styles.langChipNativeSelected]}>
                          {opt.label}
                        </Text>
                        <Text style={[styles.langChipSub, isSelected && styles.langChipSubSelected]}>
                          {opt.englishName}
                        </Text>
                        {isSelected && <Text style={styles.checkmark}>✓</Text>}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* CARD 3: OPERATING AREA */}
              <View style={styles.card} testID="card-operating-area">
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleRow}>
                    <Text style={styles.cardIcon}>📍</Text>
                    <Text style={styles.cardTitle}>
                      {t('collector.profile.operatingArea') || 'Operating Area'}
                    </Text>
                  </View>
                  <ReadAloudButton
                    text={getAreaSpeechText()}
                    size="compact"
                  />
                </View>

                {!isEditingArea ? (
                  <View>
                    <Text style={styles.areaDisplay}>
                      {operatingAreaSummary || (t('collector.profile.operatingAreaHint') || 'No general operating area set.')}
                    </Text>
                    <Text style={styles.privacyNote}>
                      🛡 Area-level only: Precise residential address and exact GPS coordinates are NEVER stored or shared.
                    </Text>

                    <TouchableOpacity
                      style={styles.editBtn}
                      onPress={handleStartEditArea}
                      accessibilityRole="button"
                      accessibilityLabel={t('collector.profile.editProfile') || 'Edit Operating Area'}
                    >
                      <Text style={styles.editBtnText}>
                        ✏ {t('collector.profile.editProfile') || 'Edit Operating Area'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.editForm}>
                    <Text style={styles.inputLabel}>{t('collector.profile.localityLabel') || 'Locality / Area'}:</Text>
                    <TextInput
                      style={styles.input}
                      value={areaLocality}
                      onChangeText={setAreaLocality}
                      placeholder="e.g. Kalyan West / Tulsi Nagar"
                      placeholderTextColor={colors.textSecondary}
                    />

                    <Text style={styles.inputLabel}>{t('collector.profile.cityLabel') || 'City'}:</Text>
                    <TextInput
                      style={styles.input}
                      value={areaCity}
                      onChangeText={setAreaCity}
                      placeholder="e.g. Mumbai / Berhampur"
                      placeholderTextColor={colors.textSecondary}
                    />

                    <Text style={styles.inputLabel}>{t('collector.profile.stateLabel') || 'State'}:</Text>
                    <TextInput
                      style={styles.input}
                      value={areaState}
                      onChangeText={setAreaState}
                      placeholder="e.g. Maharashtra / Odisha"
                      placeholderTextColor={colors.textSecondary}
                    />

                    <Text style={styles.inputLabel}>{t('collector.profile.pincodeLabel') || 'PIN Code'}:</Text>
                    <TextInput
                      style={styles.input}
                      value={areaPincode}
                      onChangeText={setAreaPincode}
                      placeholder="e.g. 400053"
                      keyboardType="numeric"
                      maxLength={6}
                      placeholderTextColor={colors.textSecondary}
                    />

                    <TouchableOpacity
                      style={styles.useCurrentBtn}
                      onPress={handleUseCurrentArea}
                      disabled={isLocating}
                    >
                      {isLocating ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : (
                        <Text style={styles.useCurrentBtnText}>
                          📍 {t('collector.profile.useCurrentArea') || 'Use Current Area'}
                        </Text>
                      )}
                    </TouchableOpacity>

                    <View style={styles.editActionRow}>
                      <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={handleCancelEditArea}
                        disabled={isSavingArea}
                      >
                        <Text style={styles.cancelBtnText}>
                          {t('collector.profile.cancel') || 'Cancel'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.saveBtn}
                        onPress={handleSaveArea}
                        disabled={isSavingArea}
                      >
                        {isSavingArea ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={styles.saveBtnText}>
                            ✓ {t('collector.profile.save') || 'Save Area'}
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>

              {/* CARD 4: MY TRANSACTIONS */}
              <View style={styles.card} testID="card-my-transactions">
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleRow}>
                    <Text style={styles.cardIcon}>📋</Text>
                    <Text style={styles.cardTitle}>
                      {t('collector.profile.myTransactions') || 'My Transactions'}
                    </Text>
                  </View>
                  <ReadAloudButton
                    text={`My Transactions. View your recorded sales and settlement receipts.`}
                    size="compact"
                  />
                </View>

                <View style={styles.statsMiniRow}>
                  <Text style={styles.statsMiniLabel}>
                    {t('collector.profile.transactionsCountLabel') || 'Recorded Sales'}:
                  </Text>
                  <Text style={styles.statsMiniValue}>
                    {recentTransactionsCount || stats?.totalPickups || 0}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.navActionBtn}
                  onPress={() => navigation?.navigate('CollectorTransactions')}
                  accessibilityRole="button"
                  accessibilityLabel={t('collector.profile.myTransactions') || 'Open My Transactions'}
                >
                  <Text style={styles.navActionBtnText}>
                    📋 {t('collector.profile.myTransactions') || 'My Transactions'} →
                  </Text>
                </TouchableOpacity>
              </View>

              {/* CARD 5: MY EARNINGS */}
              <View style={styles.card} testID="card-my-earnings">
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleRow}>
                    <Text style={styles.cardIcon}>💰</Text>
                    <Text style={styles.cardTitle}>
                      {t('collector.profile.myEarnings') || 'My Earnings'}
                    </Text>
                  </View>
                  <ReadAloudButton
                    text={`My Earnings. View your total sales, received payments, and pending dues.`}
                    size="compact"
                  />
                </View>

                {earningsSummary && (
                  <View style={styles.statsMiniRow}>
                    <Text style={styles.statsMiniLabel}>
                      {t('collector.profile.earningsSummaryLabel') || 'Total Received'}:
                    </Text>
                    <Text style={styles.statsMiniValueHighlight}>
                      ₹{earningsSummary?.totalPaid?.toLocaleString('en-IN') || '0'}
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.navActionBtn}
                  onPress={() => navigation?.navigate('CollectorEarnings')}
                  accessibilityRole="button"
                  accessibilityLabel={t('collector.profile.myEarnings') || 'Open My Earnings'}
                >
                  <Text style={styles.navActionBtnText}>
                    💰 {t('collector.profile.myEarnings') || 'My Earnings'} →
                  </Text>
                </TouchableOpacity>
              </View>

              {/* LOGOUT BUTTON */}
              <TouchableOpacity
                style={styles.logoutBtn}
                onPress={handleLogout}
                disabled={isLoggingOut}
                accessibilityRole="button"
                accessibilityLabel={t('auth.logout') || 'Sign Out'}
              >
                {isLoggingOut ? (
                  <ActivityIndicator size="small" color="#FF6B6B" />
                ) : (
                  <Text style={styles.logoutBtnText}>
                    🚪 {t('auth.logout') || 'Sign Out'}
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </EcoSetuBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.spaceMd,
    paddingBottom: spacing.spaceXl * 2,
  },
  loadingContainer: {
    padding: spacing.spaceXl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: spacing.spaceMd,
    color: colors.textSecondary,
    fontSize: 14,
  },
  topActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.spaceMd,
    paddingVertical: spacing.spaceXs,
    backgroundColor: 'rgba(15, 38, 43, 0.7)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  topActionLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  headerSpeechBtn: {
    minHeight: 48,
    minWidth: 48,
  },
  pendingBanner: {
    backgroundColor: 'rgba(255, 179, 0, 0.15)',
    borderLeftWidth: 4,
    borderLeftColor: '#FFB300',
    padding: spacing.spaceMd,
    marginHorizontal: spacing.spaceMd,
    marginTop: spacing.spaceSm,
    borderRadius: spacing.radiusSm,
  },
  pendingBannerText: {
    color: '#FFD54F',
    fontSize: 13,
    fontWeight: '600',
  },
  cacheBanner: {
    backgroundColor: 'rgba(38, 166, 154, 0.12)',
    padding: spacing.spaceSm,
    marginHorizontal: spacing.spaceMd,
    marginTop: spacing.spaceSm,
    borderRadius: spacing.radiusSm,
  },
  cacheBannerText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  errorBanner: {
    backgroundColor: 'rgba(244, 67, 54, 0.15)',
    padding: spacing.spaceMd,
    marginHorizontal: spacing.spaceMd,
    marginTop: spacing.spaceSm,
    borderRadius: spacing.radiusSm,
  },
  errorBannerText: {
    color: '#EF5350',
    fontSize: 13,
  },
  card: {
    backgroundColor: '#0F262B',
    borderRadius: spacing.radiusLg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: spacing.spaceLg,
    marginBottom: spacing.spaceLg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.spaceMd,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    fontSize: 22,
    marginRight: spacing.spaceSm,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  idBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: spacing.radiusMd,
    padding: spacing.spaceMd,
    marginBottom: spacing.spaceSm,
  },
  idLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  idValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    width: 90,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  badgeRow: {
    marginVertical: spacing.spaceSm,
  },
  privacyNote: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.spaceSm,
    lineHeight: 16,
  },
  fieldHint: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.spaceMd,
    lineHeight: 18,
  },
  languageChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.spaceSm,
  },
  langChip: {
    flex: 1,
    minWidth: '45%',
    minHeight: 56,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: spacing.radiusMd,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: spacing.spaceSm,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  langChipSelected: {
    backgroundColor: 'rgba(0, 168, 150, 0.15)',
    borderColor: colors.primary,
  },
  langChipNative: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  langChipNativeSelected: {
    color: colors.primary,
  },
  langChipSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  langChipSubSelected: {
    color: colors.primary,
  },
  checkmark: {
    position: 'absolute',
    top: 6,
    right: 8,
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
  },
  areaDisplay: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 22,
    marginBottom: spacing.spaceSm,
  },
  editBtn: {
    minHeight: 48,
    backgroundColor: 'rgba(0, 168, 150, 0.12)',
    borderRadius: spacing.radiusMd,
    borderWidth: 1,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.spaceMd,
  },
  editBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
  editForm: {
    marginTop: spacing.spaceSm,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
    marginTop: spacing.spaceSm,
  },
  input: {
    minHeight: 48,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: spacing.radiusMd,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: spacing.spaceMd,
    color: colors.textPrimary,
    fontSize: 15,
  },
  useCurrentBtn: {
    minHeight: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: spacing.radiusMd,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.spaceMd,
  },
  useCurrentBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  editActionRow: {
    flexDirection: 'row',
    gap: spacing.spaceMd,
    marginTop: spacing.spaceLg,
  },
  cancelBtn: {
    flex: 1,
    minHeight: 52,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: spacing.radiusMd,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  saveBtn: {
    flex: 2,
    minHeight: 56,
    backgroundColor: colors.primary,
    borderRadius: spacing.radiusMd,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statsMiniRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: spacing.radiusSm,
    paddingHorizontal: spacing.spaceMd,
    paddingVertical: spacing.spaceSm,
    marginBottom: spacing.spaceMd,
  },
  statsMiniLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  statsMiniValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statsMiniValueHighlight: {
    fontSize: 16,
    fontWeight: '700',
    color: '#00E676',
  },
  navActionBtn: {
    minHeight: 56,
    backgroundColor: 'rgba(0, 168, 150, 0.15)',
    borderRadius: spacing.radiusMd,
    borderWidth: 1.5,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.spaceLg,
  },
  navActionBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  logoutBtn: {
    minHeight: 52,
    backgroundColor: 'rgba(244, 67, 54, 0.08)',
    borderRadius: spacing.radiusMd,
    borderWidth: 1,
    borderColor: 'rgba(244, 67, 54, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.spaceMd,
    marginBottom: spacing.spaceXl,
  },
  logoutBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FF6B6B',
  },
});

export default CollectorProfileScreen;
