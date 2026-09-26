/**
 * CollectorProfileScreen — Dynamic Location & Dark Glass Redesign
 *
 * Concepts:
 *  1. PROFILE HEADER — name, dynamic operating area/city, verification, availability toggle
 *  2. OPERATING LOCATION — Auto-detect GPS, Edit city & service area, real-time sync
 *  3. BUSINESS — Marketplace, Recycler Relationships, Price Info, Transactions, Bills
 *  4. SAFETY — Safety Center, Disputes
 *  5. ACCOUNT — Language, Offline Data, Settings, Sign Out
 *
 * Preserves: collectorService, useAuth logout, language switching, navigation to all existing sub-screens.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  RefreshControl,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import { useI18n } from '../../i18n';
import { LANGUAGE_OPTIONS, SupportedLanguage } from '../../i18n/config';
import { EcoSetuBackground } from '../../components/glass/EcoSetuBackground';
import { colors } from '../../theme/colors';
import { collectorService } from '../../services/collectorService';
import { getCurrentLocation, reverseGeocode } from '../../services/locationService';
import { useEcoSaathi } from '../../context/EcoSaathiContext';
import { AppIcon, AppIconName } from '../../components/ui/AppIcon';

// ─────────────────────────────────────────────────────────────────────────────
// MENU ROW
// ─────────────────────────────────────────────────────────────────────────────
interface MenuRowProps {
  icon: AppIconName | string;
  label: string;
  sub?: string;
  onPress?: () => void;
  rightContent?: React.ReactNode;
  destructive?: boolean;
  disabled?: boolean;
}

const mapMenuIcon = (icon: AppIconName | string): AppIconName => {
  return (icon as AppIconName) || 'chevron-right';
};

const MenuRow: React.FC<MenuRowProps> = ({
  icon,
  label,
  sub,
  onPress,
  rightContent,
  destructive = false,
  disabled = false,
}) => (
  <TouchableOpacity
    style={[styles.menuRow, disabled && { opacity: 0.5 }]}
    onPress={onPress}
    disabled={!onPress || disabled}
    activeOpacity={onPress ? 0.7 : 1}
    accessibilityRole={onPress ? 'button' : 'text'}
  >
    <View style={styles.menuIconBox}>
      <AppIcon
        name={mapMenuIcon(icon)}
        size={18}
        color={destructive ? '#EF4444' : '#10B981'}
      />
    </View>
    <View style={styles.menuTextCol}>
      <Text style={[styles.menuLabel, destructive && { color: '#FCA5A5' }]}>{label}</Text>
      {sub && <Text style={styles.menuSub}>{sub}</Text>}
    </View>
    {rightContent ?? (
      onPress ? <Text style={styles.menuChevron}>›</Text> : null
    )}
  </TouchableOpacity>
);

// ─────────────────────────────────────────────────────────────────────────────
// SECTION GROUP
// ─────────────────────────────────────────────────────────────────────────────
const MenuGroup: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <View style={styles.group}>
    <Text style={styles.groupLabel}>{label}</Text>
    <View style={styles.groupCard}>{children}</View>
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export const CollectorProfileScreen: React.FC<{ navigation?: any }> = ({
  navigation: navProp,
}) => {
  const navigation        = useNavigation<any>();
  const { user, logout }  = useAuth();
  const { t, language, setLanguage } = useI18n();
  const { openChat } = useEcoSaathi();

  const [profile, setProfile]             = useState<any>(null);
  const [isAvailable, setIsAvailable]     = useState(true);
  const [isLoading, setIsLoading]         = useState(true);
  const [isRefreshing, setIsRefreshing]   = useState(false);
  const [isLoggingOut, setIsLoggingOut]   = useState(false);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);

  // Dynamic Location state
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isSavingLocation, setIsSavingLocation]       = useState(false);
  const [editCity, setEditCity]                       = useState('');
  const [editArea, setEditArea]                       = useState('');
  const [editState, setEditState]                     = useState('');
  const [editPincode, setEditPincode]                 = useState('');
  const [editRadius, setEditRadius]                   = useState('10');

  const loadProfile = useCallback(async (silent = false) => {
    try {
      const res = await collectorService.getProfile();
      if (res?.profile) {
        const prof: any = res.profile;
        setProfile(prof);
        setIsAvailable(Boolean(prof.isAvailable));
        setEditCity(prof.city || '');
        setEditArea(prof.serviceArea || '');
        setEditState(prof.state || '');
        setEditPincode(prof.pincode || '');
        setEditRadius(String(prof.serviceRadiusKm || 10));
      }
    } catch (e) {
      console.warn('[CollectorProfile] load error', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const onRefresh = () => { setIsRefreshing(true); loadProfile(true); };

  const handleLogout = () => {
    Alert.alert(
      t('auth.logout', 'Sign Out'),
      t('collector.profile.logoutConfirm', 'Sign out from EcoSetu?'),
      [
        { text: t('common.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('auth.logout', 'Sign Out'),
          style: 'destructive',
          onPress: async () => {
            setIsLoggingOut(true);
            try { await logout(); } catch { setIsLoggingOut(false); }
          },
        },
      ]
    );
  };

  const handleAvailabilityToggle = async (val: boolean) => {
    setIsAvailable(val);
    try { await (collectorService as any).toggleAvailability(val); }
    catch { setIsAvailable(!val); }
  };

  const handleLanguageSelect = async (code: SupportedLanguage) => {
    await setLanguage(code);
    setShowLanguagePicker(false);
  };

  // ── Auto-Detect Location with GPS ──────────────────────────────────────────
  const handleAutoDetectLocation = async () => {
    setIsDetectingLocation(true);
    try {
      const locResult = await getCurrentLocation();
      if (locResult.success && locResult.coords) {
        const { latitude, longitude } = locResult.coords;
        const resolved = await reverseGeocode(latitude, longitude);

        const newCity = resolved?.city || resolved?.district || 'My City';
        const newState = resolved?.state || '';
        const newArea = resolved?.formattedAddress || resolved?.street || newCity;
        const newPincode = resolved?.pincode || '';

        const updated = await collectorService.updateCollectorProfile({
          city: newCity,
          state: newState,
          serviceArea: newArea,
          pincode: newPincode || undefined,
          serviceAreaLat: latitude,
          serviceAreaLng: longitude,
        });

        setProfile((prev: any) => ({
          ...prev,
          ...updated,
          city: newCity,
          state: newState,
          serviceArea: newArea,
          pincode: newPincode,
          serviceAreaLat: latitude,
          serviceAreaLng: longitude,
        }));

        setEditCity(newCity);
        setEditState(newState);
        setEditArea(newArea);
        setEditPincode(newPincode);

        Alert.alert(
          t('common.success', 'Location Updated'),
          `Operating area set to: ${newCity}${newState ? `, ${newState}` : ''}`
        );
      } else {
        Alert.alert(
          t('common.locationUnavailable', 'Location Unavailable'),
          locResult.message || 'Please check device GPS permissions or enter location manually.'
        );
      }
    } catch (err: any) {
      Alert.alert(t('common.error', 'Error'), err?.message || 'Failed to detect GPS location');
    } finally {
      setIsDetectingLocation(false);
    }
  };

  // ── Save Manual Location ───────────────────────────────────────────────────
  const handleSaveManualLocation = async () => {
    if (!editCity.trim()) {
      Alert.alert(t('common.error', 'Validation Error'), 'City name is required.');
      return;
    }

    setIsSavingLocation(true);
    try {
      const radiusNum = parseFloat(editRadius) || 10;
      const updated = await collectorService.updateCollectorProfile({
        city: editCity.trim(),
        state: editState.trim() || undefined,
        serviceArea: editArea.trim() || editCity.trim(),
        pincode: editPincode.trim() || undefined,
        serviceRadiusKm: Math.min(50, Math.max(1, radiusNum)),
      });

      setProfile((prev: any) => ({
        ...prev,
        ...updated,
        city: editCity.trim(),
        state: editState.trim(),
        serviceArea: editArea.trim() || editCity.trim(),
        pincode: editPincode.trim(),
        serviceRadiusKm: Math.min(50, Math.max(1, radiusNum)),
      }));

      setIsLocationModalOpen(false);
      Alert.alert(t('common.success', 'Saved'), 'Operating location updated successfully.');
    } catch (err: any) {
      Alert.alert(t('common.error', 'Error'), err?.message || 'Failed to save location.');
    } finally {
      setIsSavingLocation(false);
    }
  };

  // Derived location string
  const name        = profile?.user?.name || user?.name || 'Collector';
  const isVerified  = profile?.user?.status === 'ACTIVE' || user?.status === 'ACTIVE';
  const initial     = (name || 'C').charAt(0).toUpperCase();
  const currentLang = LANGUAGE_OPTIONS.find((l) => l.code === language);

  const displayLocation = profile?.city
    ? `${profile.city}${profile?.state ? `, ${profile.state}` : ''}`
    : profile?.serviceArea || '';

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <EcoSetuBackground>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          {/* ── PROFILE HEADER ───────────────────────────────────────── */}
          <View style={styles.profileHeader}>
            <View style={styles.largeAvatar}>
              <Text style={styles.largeAvatarText}>{initial}</Text>
            </View>

            <Text style={styles.profileName}>{name}</Text>

            {isVerified && (
              <View style={styles.verifiedRow}>
                <View style={styles.verifiedDot} />
                <Text style={styles.verifiedLabel}>{t('collector.verifiedCollector', 'Verified Collector')}</Text>
              </View>
            )}

            {/* Dynamic Location Banner with Quick GPS Auto-detect */}
            <View style={styles.locationBadgeContainer}>
              <View style={styles.locationAreaRow}>
                <AppIcon name="map-pin" size={14} color="#10B981" />
                <Text style={styles.profileArea} numberOfLines={1}>
                  {displayLocation || t('collector.noLocationSet', 'Set operating location')}
                </Text>
              </View>
              <View style={styles.locationActionButtons}>
                <TouchableOpacity
                  style={styles.gpsButton}
                  onPress={handleAutoDetectLocation}
                  disabled={isDetectingLocation}
                  activeOpacity={0.7}
                >
                  {isDetectingLocation ? (
                    <ActivityIndicator size="small" color="#34D399" />
                  ) : (
                    <View style={styles.btnRow}>
                      <AppIcon name="navigation" size={12} color="#34D399" />
                      <Text style={styles.gpsButtonText}>GPS</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.editLocButton}
                  onPress={() => setIsLocationModalOpen(true)}
                  activeOpacity={0.7}
                >
                  <View style={styles.btnRow}>
                    <AppIcon name="edit-2" size={12} color="#34D399" />
                    <Text style={styles.editLocButtonText}>Edit</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* Availability toggle inline */}
            <View style={styles.availRow}>
              <Text style={styles.availLabel}>
                {isAvailable ? t('collector.availableForPickups', 'Available for pickups') : t('collector.notAvailable', 'Not available')}
              </Text>
              <Switch
                value={isAvailable}
                onValueChange={handleAvailabilityToggle}
                trackColor={{ false: 'rgba(255,255,255,0.15)', true: 'rgba(16,185,129,0.45)' }}
                thumbColor={isAvailable ? '#10B981' : '#64748B'}
              />
            </View>
          </View>

          {/* ── OPERATING LOCATION ───────────────────────────────────── */}
          <MenuGroup label={t('collector.operatingArea', 'OPERATING LOCATION')}>
            <MenuRow
              icon="map-pin"
              label={t('collector.serviceArea', 'Service Area & City')}
              sub={displayLocation || t('collector.tapToSetLocation', 'Tap to set operational city & service radius')}
              onPress={() => setIsLocationModalOpen(true)}
            />
            <View style={styles.rowDivider} />
            <MenuRow
              icon="navigation"
              label={t('location.detectGps', 'Auto-Detect Current GPS')}
              sub={
                profile?.serviceAreaLat && profile?.serviceAreaLng
                  ? `Lat: ${Number(profile.serviceAreaLat).toFixed(4)}, Lng: ${Number(profile.serviceAreaLng).toFixed(4)}`
                  : t('location.tapToDetect', 'Update coordinates from live device GPS')
              }
              onPress={handleAutoDetectLocation}
              rightContent={
                isDetectingLocation ? <ActivityIndicator size="small" color="#10B981" /> : undefined
              }
            />
          </MenuGroup>

          {/* ── BUSINESS ─────────────────────────────────────────────── */}
          <MenuGroup label={t('profile.business', 'BUSINESS')}>
            <MenuRow
              icon="package"
              label={t('collector.myMarketplace', 'My Marketplace')}
              sub={t('collector.myMarketplaceSub', 'Listings, offers, negotiations')}
              onPress={() => navigation.navigate('CollectorDeals')}
            />
            <View style={styles.rowDivider} />
            <MenuRow
              icon="factory"
              label={t('collector.recyclerDirectory', 'Recycler Directory')}
              sub={t('collector.recyclerDirectorySub', 'Find and contact authorized recyclers')}
              onPress={() => navigation.navigate('CollectorRecyclerDirectory')}
            />
            <View style={styles.rowDivider} />
            <MenuRow
              icon="trending-up"
              label={t('collector.priceInformation', 'Price Information')}
              sub={t('collector.priceInformationSub', 'Market rates for e-waste')}
              onPress={() => navigation.navigate('CollectorPriceBoard')}
            />
            <View style={styles.rowDivider} />
            <MenuRow
              icon="clipboard"
              label={t('collector.transactionHistory', 'Transaction History')}
              sub={t('collector.transactionHistorySub', 'All completed sales and payments')}
              onPress={() => navigation.navigate('CollectorTransactions')}
            />
            <View style={styles.rowDivider} />
            <MenuRow
              icon="file-text"
              label={t('navigation.bills', 'Bills')}
              sub={t('bills.collectorSub', 'Transaction bills and receipts')}
              onPress={() => navigation.navigate('CollectorBills')}
            />
          </MenuGroup>

          {/* ── SAFETY & HELP ────────────────────────────────────────── */}
          <MenuGroup label={t('profile.supportAndHelp', 'HELP & SUPPORT')}>
            <MenuRow
              icon="sparkles"
              label={t('saathi.title', 'Eco-Saathi AI Assistant')}
              sub={t('saathi.collectorProfileSub', 'Ask about scrap prices, lots, buyers & earnings')}
              onPress={() => openChat('CollectorProfile')}
            />
            <View style={styles.rowDivider} />
            <MenuRow
              icon="shield"
              label={t('collector.safetyCenter', 'Safety Center')}
              sub={t('collector.safetyCenterSub', 'Guidelines, emergency contacts, protocols')}
              onPress={() => navigation.navigate('CollectorSafetyCenter')}
            />
            <View style={styles.rowDivider} />
            <MenuRow
              icon="alert-triangle"
              label={t('collector.disputes', 'Disputes')}
              sub={t('collector.disputesSub', 'Raise or view dispute cases')}
              onPress={() => navigation.navigate('CollectorDisputes')}
            />
          </MenuGroup>

          {/* ── ACCOUNT ──────────────────────────────────────────────── */}
          <MenuGroup label={t('profile.account', 'ACCOUNT')}>
            {/* Language */}
            <MenuRow
              icon="globe"
              label={t('profile.language', 'Language')}
              sub={currentLang?.label ?? language}
              onPress={() => setShowLanguagePicker(!showLanguagePicker)}
            />
            {/* Language picker inline */}
            {showLanguagePicker && (
              <View style={styles.langPicker}>
                {LANGUAGE_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.code}
                    style={[
                      styles.langOption,
                      language === opt.code && styles.langOptionSelected,
                    ]}
                    onPress={() => handleLanguageSelect(opt.code as SupportedLanguage)}
                    accessibilityRole="radio"
                  >
                    <Text style={[
                      styles.langOptionLabel,
                      language === opt.code && styles.langOptionLabelSelected,
                    ]}>
                      {opt.label}
                    </Text>
                    {language === opt.code && (
                      <AppIcon name="check" size={16} color="#10B981" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.rowDivider} />
            <MenuRow
              icon="settings"
              label={t('profile.settings', 'Settings')}
              sub={t('profile.settingsSub', 'Notifications, app preferences')}
              onPress={() => navigation.navigate('Settings')}
            />

            <View style={styles.rowDivider} />
            <MenuRow
              icon="log-out"
              label={t('auth.logout', 'Sign Out')}
              destructive
              onPress={handleLogout}
              rightContent={isLoggingOut ? <ActivityIndicator size="small" color="#F87171" /> : undefined}
            />
          </MenuGroup>

          <View style={styles.footerSpace} />
        </ScrollView>

        {/* ── Edit Location Modal ─────────────────────────────────── */}
        <Modal visible={isLocationModalOpen} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalTitleRow}>
                <AppIcon name="map-pin" size={20} color="#10B981" />
                <Text style={styles.modalTitle}>{t('collector.editLocation', 'Edit Operating Location')}</Text>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>{t('location.city', 'Operating City')} *</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. Mumbai, Bhubaneswar, Delhi"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    value={editCity}
                    onChangeText={setEditCity}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>{t('location.serviceArea', 'Service Area / Neighborhood')}</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="e.g. Andheri West, Saheed Nagar"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    value={editArea}
                    onChangeText={setEditArea}
                  />
                </View>

                <View style={styles.formRow}>
                  <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                    <Text style={styles.formLabel}>{t('location.state', 'State')}</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="e.g. Maharashtra"
                      placeholderTextColor="rgba(255,255,255,0.4)"
                      value={editState}
                      onChangeText={setEditState}
                    />
                  </View>

                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.formLabel}>{t('location.pincode', 'Pincode')}</Text>
                    <TextInput
                      style={styles.formInput}
                      keyboardType="numeric"
                      placeholder="e.g. 751007"
                      placeholderTextColor="rgba(255,255,255,0.4)"
                      value={editPincode}
                      onChangeText={setEditPincode}
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>{t('collector.serviceRadius', 'Service Radius (km)')}</Text>
                  <TextInput
                    style={styles.formInput}
                    keyboardType="numeric"
                    placeholder="10"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    value={editRadius}
                    onChangeText={setEditRadius}
                  />
                </View>
              </ScrollView>

              <View style={styles.modalActionsRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setIsLocationModalOpen(false)}
                >
                  <Text style={styles.modalCancelBtnText}>{t('common.cancel', 'Cancel')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalSaveBtn}
                  onPress={handleSaveManualLocation}
                  disabled={isSavingLocation}
                >
                  {isSavingLocation ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalSaveBtnText}>{t('common.save', 'Save Location')}</Text>
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
  safeArea: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  largeAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 2,
    borderColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  largeAvatarText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#34D399',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  verifiedDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  verifiedLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#34D399',
  },
  locationBadgeContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    maxWidth: '92%',
  },
  profileArea: {
    fontSize: 12,
    color: '#CBD5E1',
    fontWeight: '600',
    flexShrink: 1,
  },
  locationActionButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  gpsButton: {
    backgroundColor: 'rgba(20, 184, 166, 0.25)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#14B8A6',
  },
  gpsButtonText: {
    color: '#2DD4BF',
    fontSize: 11,
    fontWeight: '700',
  },
  editLocButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  editLocButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  availRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 35, 40, 0.85)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 4,
    gap: 12,
  },
  availLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  group: {
    marginBottom: 16,
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingLeft: 4,
    textTransform: 'uppercase',
  },
  groupCard: {
    backgroundColor: 'rgba(15, 35, 40, 0.85)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    minHeight: 52,
  },
  menuIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuIcon: {
    fontSize: 18,
  },
  menuTextCol: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  menuSub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  menuChevron: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.35)',
    marginLeft: 8,
  },
  rowDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    marginHorizontal: 14,
  },
  langPicker: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 6,
  },
  langOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  langOptionSelected: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  langOptionLabel: {
    fontSize: 13,
    color: '#CBD5E1',
    fontWeight: '500',
  },
  langOptionLabelSelected: {
    color: '#34D399',
    fontWeight: '700',
  },
  langOptionCheck: {
    color: '#34D399',
    fontSize: 14,
    fontWeight: '800',
  },
  footerSpace: {
    height: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#0F2328',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    padding: 20,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 12,
  },
  formRow: {
    flexDirection: 'row',
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 6,
  },
  formInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 14,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelBtnText: {
    color: '#CBD5E1',
    fontWeight: '600',
    fontSize: 13,
  },
  modalSaveBtn: {
    flex: 1,
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalSaveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  locationAreaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
});
