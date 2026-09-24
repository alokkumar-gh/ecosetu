/**
 * CollectorProfileScreen — COMPLETE REDESIGN
 *
 * New concept: Compact identity + grouped action menu
 * NOT a settings dump. NOT a giant scrollable form.
 *
 * Structure:
 *  1. PROFILE HEADER — name, area, verification, availability
 *  2. BUSINESS group — Marketplace, Recycler Relationships, Price Info, Transactions
 *  3. SAFETY group — Safety Center
 *  4. ACCOUNT group — Language, Offline Data, Settings, Sign Out
 *
 * Language picker is inline — no nested modal.
 * Each item = clean row with icon, label, chevron.
 * Touch targets ≥ 52dp.
 *
 * Preserves: collectorService, useAuth logout, language switching,
 *   navigation to all existing sub-screens.
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import { useI18n } from '../../i18n';
import { LANGUAGE_OPTIONS, SupportedLanguage } from '../../i18n/config';
import { EcoSetuBackground } from '../../components/glass/EcoSetuBackground';
import { CollectorHeader } from '../../components/collector/CollectorHeader';
import { colors } from '../../theme/colors';
import { collectorService } from '../../services/collectorService';

// ─────────────────────────────────────────────────────────────────────────────
// MENU ROW
// ─────────────────────────────────────────────────────────────────────────────
interface MenuRowProps {
  icon: string;
  label: string;
  sub?: string;
  onPress?: () => void;
  rightContent?: React.ReactNode;
  destructive?: boolean;
  disabled?: boolean;
}

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
      <Text style={styles.menuIcon}>{icon}</Text>
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

  const [profile, setProfile]       = useState<any>(null);
  const [isAvailable, setIsAvailable] = useState(true);
  const [isLoading, setIsLoading]   = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);

  const loadProfile = useCallback(async (silent = false) => {
    try {
      const res = await collectorService.getProfile();
      if (res?.profile) {
        setProfile(res.profile);
        setIsAvailable(Boolean((res.profile as any).isAvailable));
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

  // Derived
  const name          = profile?.user?.name || user?.name || 'Collector';
  const area          = profile?.serviceArea || profile?.city || '';
  const isVerified    = profile?.user?.status === 'ACTIVE' || user?.status === 'ACTIVE';
  const initial       = (name || 'C').charAt(0).toUpperCase();
  const currentLang   = LANGUAGE_OPTIONS.find((l) => l.code === language);

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
            {/* Large avatar */}
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

            {area ? (
              <Text style={styles.profileArea}>📍 {area}</Text>
            ) : null}

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

          {/* ── BUSINESS ─────────────────────────────────────────────── */}
          <MenuGroup label={t('profile.business', 'BUSINESS')}>
            <MenuRow
              icon="📦"
              label={t('collector.myMarketplace', 'My Marketplace')}
              sub={t('collector.myMarketplaceSub', 'Listings, offers, negotiations')}
              onPress={() => navigation.navigate('CollectorDeals')}
            />
            <View style={styles.rowDivider} />
            <MenuRow
              icon="🏭"
              label={t('collector.recyclerDirectory', 'Recycler Directory')}
              sub={t('collector.recyclerDirectorySub', 'Find and contact authorized recyclers')}
              onPress={() => navigation.navigate('CollectorRecyclerDirectory')}
            />
            <View style={styles.rowDivider} />
            <MenuRow
              icon="📈"
              label={t('collector.priceInformation', 'Price Information')}
              sub={t('collector.priceInformationSub', 'Market rates for e-waste')}
              onPress={() => navigation.navigate('CollectorPriceBoard')}
            />
            <View style={styles.rowDivider} />
            <MenuRow
              icon="📋"
              label={t('collector.transactionHistory', 'Transaction History')}
              sub={t('collector.transactionHistorySub', 'All completed sales and payments')}
              onPress={() => navigation.navigate('CollectorTransactions')}
            />
            <View style={styles.rowDivider} />
            <MenuRow
              icon="📄"
              label={t('navigation.bills', 'Bills')}
              sub={t('bills.collectorSub', 'Transaction bills and receipts')}
              onPress={() => navigation.navigate('CollectorBills')}
            />
          </MenuGroup>

          {/* ── SAFETY ───────────────────────────────────────────────── */}
          <MenuGroup label={t('profile.safety', 'SAFETY')}>
            <MenuRow
              icon="🛡️"
              label={t('collector.safetyCenter', 'Safety Center')}
              sub={t('collector.safetyCenterSub', 'Guidelines, emergency contacts, protocols')}
              onPress={() => navigation.navigate('CollectorSafetyCenter')}
            />
            <View style={styles.rowDivider} />
            <MenuRow
              icon="⚠️"
              label={t('collector.disputes', 'Disputes')}
              sub={t('collector.disputesSub', 'Raise or view dispute cases')}
              onPress={() => navigation.navigate('CollectorDisputes')}
            />
          </MenuGroup>

          {/* ── ACCOUNT ──────────────────────────────────────────────── */}
          <MenuGroup label={t('profile.account', 'ACCOUNT')}>
            {/* Language */}
            <MenuRow
              icon="🌐"
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
                      <Text style={styles.langCheck}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <View style={styles.rowDivider} />
            <MenuRow
              icon="📡"
              label={t('profile.offlineData', 'Offline Data')}
              sub={t('profile.offlineDataSub', 'Manage cached data and sync')}
              onPress={() => Alert.alert(t('profile.offlineData', 'Offline Data'), t('common.comingSoon', 'Coming soon.'))}
            />
            <View style={styles.rowDivider} />
            <MenuRow
              icon="🔔"
              label={t('profile.notifications', 'Notifications')}
              sub={t('profile.notificationsSub', 'Alerts and offer notifications')}
              onPress={() => Alert.alert(t('profile.notifications', 'Notifications'), t('common.comingSoon', 'Coming soon.'))}
            />
          </MenuGroup>

          {/* ── SIGN OUT ─────────────────────────────────────────────── */}
          <View style={styles.signOutSection}>
            <TouchableOpacity
              style={styles.signOutBtn}
              onPress={handleLogout}
              disabled={isLoggingOut}
              activeOpacity={0.8}
            >
              <Text style={styles.signOutText}>
                {isLoggingOut ? t('auth.signingOut', 'Signing out…') : `↩ ${t('auth.logout', 'Sign Out')}`}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </EcoSetuBackground>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea:      { flex: 1 },
  scroll:        { flex: 1 },
  scrollContent: { gap: 20, paddingBottom: 40, paddingTop: 20 },

  // Profile header
  profileHeader: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 8,
    gap: 8,
  },
  largeAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderWidth: 2,
    borderColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  largeAvatarText: { color: '#10B981', fontSize: 34, fontWeight: '900' },
  profileName:     { color: '#FFFFFF', fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
  verifiedRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderWidth: 1, borderColor: 'rgba(16,185,129,0.25)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
  },
  verifiedDot:   { width: 7, height: 7, borderRadius: 4, backgroundColor: '#10B981' },
  verifiedLabel: { color: '#10B981', fontSize: 12, fontWeight: '700' },
  profileArea:   { color: 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: '500' },
  availRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12,
    width: '100%', marginTop: 4,
  },
  availLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '600', flex: 1 },

  // Group
  group:      { paddingHorizontal: 20, gap: 8 },
  groupLabel: {
    color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '800',
    letterSpacing: 1.5, textTransform: 'uppercase',
  },
  groupCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 18, overflow: 'hidden',
  },

  // Menu row
  menuRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, minHeight: 56, gap: 14,
  },
  menuIconBox: {
    width: 38, height: 38, borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.07)',
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  menuIcon:    { fontSize: 20 },
  menuTextCol: { flex: 1, gap: 2 },
  menuLabel:   { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  menuSub:     { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '500' },
  menuChevron: { color: 'rgba(255,255,255,0.2)', fontSize: 22, fontWeight: '300' },
  rowDivider:  { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginLeft: 68 },

  // Language picker
  langPicker: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
    paddingVertical: 8,
  },
  langOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 13, minHeight: 48,
  },
  langOptionSelected: { backgroundColor: 'rgba(16,185,129,0.08)' },
  langOptionLabel:    { color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: '600' },
  langOptionLabelSelected: { color: '#10B981', fontWeight: '700' },
  langCheck:          { color: '#10B981', fontSize: 16, fontWeight: '900' },

  // Sign out
  signOutSection: { paddingHorizontal: 20 },
  signOutBtn: {
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)',
    borderRadius: 16, paddingVertical: 16,
    alignItems: 'center', minHeight: 56,
  },
  signOutText: { color: '#FCA5A5', fontSize: 15, fontWeight: '700' },
});

export default CollectorProfileScreen;
