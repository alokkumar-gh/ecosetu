/**
 * RecyclerProfileScreen — COMPLETELY NEW
 *
 * Not a settings form. Not a giant glass card dump.
 *
 * Layout:
 *  1. Facility header — name, authorization badge, city
 *  2. Authorization status block — factual (AUTHORIZED / PENDING)
 *  3. BUSINESS group — Rates, Sourcing, Transactions, Bills, Pickups
 *  4. COMPLIANCE group — Authorization, Traceability, Disputes
 *  5. ACCOUNT group — Language (inline), Notifications, Offline
 *  6. Sign Out
 *
 * Authorization badge is prominent — this is the key credential for a recycler.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import { useI18n } from '../../i18n';
import { LANGUAGE_OPTIONS, SupportedLanguage } from '../../i18n/config';
import { EcoSetuBackground } from '../../components/glass/EcoSetuBackground';
import { recyclingService } from '../../services/recyclingService';

// ─── MENU ROW ─────────────────────────────────────────────────────────────────
const MenuRow: React.FC<{
  icon: string;
  label: string;
  sub?: string;
  onPress?: () => void;
  rightContent?: React.ReactNode;
  destructive?: boolean;
}> = ({ icon, label, sub, onPress, rightContent, destructive = false }) => (
  <TouchableOpacity
    style={styles.menuRow}
    onPress={onPress}
    disabled={!onPress}
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
    {rightContent ?? (onPress ? <Text style={styles.menuChevron}>›</Text> : null)}
  </TouchableOpacity>
);

const MenuGroup: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <View style={styles.group}>
    <Text style={styles.groupLabel}>{label}</Text>
    <View style={styles.groupCard}>{children}</View>
  </View>
);

// ─── SCREEN ───────────────────────────────────────────────────────────────────
export const RecyclerNewProfileScreen: React.FC = () => {
  const navigation                    = useNavigation<any>();
  const { user, logout }              = useAuth();
  const { t, language, setLanguage }  = useI18n();

  const [profile, setProfile]           = useState<any>(null);
  const [isLoading, setIsLoading]       = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const res = await recyclingService.getProfile();
      if ((res as any)?.profile) setProfile((res as any).profile);
      else if (res) setProfile(res);
    } catch (e) {
      console.warn('[RecyclerProfile] load error', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);
  const onRefresh = () => { setIsRefreshing(true); loadProfile(); };

  const handleLogout = () => {
    Alert.alert(t('profile.signOut', 'Sign Out'), t('profile.signOutConfirm', 'Sign out from EcoSetu?'), [
      { text: t('common.cancel', 'Cancel'), style: 'cancel' },
      {
        text: t('profile.signOut', 'Sign Out'), style: 'destructive',
        onPress: async () => {
          setIsLoggingOut(true);
          try { await logout(); } catch { setIsLoggingOut(false); }
        },
      },
    ]);
  };

  const handleLangSelect = async (code: SupportedLanguage) => {
    await setLanguage(code);
    setShowLangPicker(false);
  };

  const facilityName   = profile?.facilityName || user?.name || t('recycler.facility', 'Recycler Facility');
  const city           = profile?.city ? `${profile.city}${profile.state ? ', ' + profile.state : ''}` : '';
  const isAuthorized   = profile?.user?.status === 'ACTIVE' || user?.status === 'ACTIVE';
  const authStatus     = isAuthorized ? t('recycler.authorized', 'AUTHORIZED') : t('recycler.pendingAuth', 'PENDING AUTHORIZATION');
  const initial        = (facilityName || 'R').charAt(0).toUpperCase();
  const currentLang    = LANGUAGE_OPTIONS.find((l) => l.code === language);
  const cpcbRef        = profile?.cpcbAuthorizationNumber;
  const spcbRef        = profile?.spcbRegistrationNumber;

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
              colors={['#22D3EE']}
              tintColor="#22D3EE"
            />
          }
        >
          {/* ── FACILITY HEADER ──────────────────────────────────────── */}
          <View style={styles.facilityHeader}>
            <View style={styles.facilityAvatar}>
              <Text style={styles.facilityAvatarText}>{initial}</Text>
            </View>

            <Text style={styles.facilityName}>{facilityName}</Text>

            {city ? <Text style={styles.facilityCity}>📍 {city}</Text> : null}

            {/* Authorization status block */}
            <View style={[styles.authBlock, isAuthorized ? styles.authBlockOk : styles.authBlockPending]}>
              <View style={[styles.authDot, { backgroundColor: isAuthorized ? '#10B981' : '#F59E0B' }]} />
              <Text style={[styles.authLabel, { color: isAuthorized ? '#10B981' : '#F59E0B' }]}>
                {authStatus}
              </Text>
            </View>

            {/* License refs */}
            {(cpcbRef || spcbRef) && (
              <View style={styles.licenseRow}>
                {cpcbRef ? <Text style={styles.licenseText}>CPCB: {cpcbRef}</Text> : null}
                {spcbRef ? <Text style={styles.licenseText}>SPCB: {spcbRef}</Text> : null}
              </View>
            )}
          </View>

          {/* ── BUSINESS ─────────────────────────────────────────────── */}
          <MenuGroup label={t('collector.business', 'BUSINESS')}>
            <MenuRow
              icon="📈"
              label={t('recycler.myBuyingRates', 'My Buying Rates')}
              sub={t('recycler.ratesSub', 'Rates you pay per material category')}
              onPress={() => navigation.navigate('RecyclerRates')}
            />
            <View style={styles.rowDivider} />
            <MenuRow
              icon="📡"
              label={t('recycler.sourcingRequests', 'Sourcing Requests')}
              sub={t('recycler.sourcingSub', 'Find material to match your needs')}
              onPress={() => navigation.navigate('RecyclerSourcing')}
            />
            <View style={styles.rowDivider} />
            <MenuRow
              icon="🚚"
              label={t('recycler.pickupManagement', 'Pickup Management')}
              sub={t('recycler.pickupSub', 'Scheduled and completed pickups')}
              onPress={() => navigation.navigate('RecyclerPickupManagement')}
            />
            <View style={styles.rowDivider} />
            <MenuRow
              icon="💳"
              label={t('recycler.transactions', 'Transactions')}
              sub={t('recycler.txSub', 'Purchase and payment history')}
              onPress={() => navigation.navigate('RecyclerTransactions')}
            />
            <View style={styles.rowDivider} />
            <MenuRow
              icon="🧾"
              label={t('recycler.bills', 'Bills')}
              sub={t('recycler.billsSub', 'Transaction bills and receipts')}
              onPress={() => navigation.navigate('RecyclerBills')}
            />
          </MenuGroup>

          {/* ── COMPLIANCE ───────────────────────────────────────────── */}
          <MenuGroup label={t('recycler.compliance', 'COMPLIANCE')}>
            <MenuRow
              icon="🏛️"
              label={t('recycler.authorization', 'Authorization')}
              sub={isAuthorized ? t('recycler.authSubOk', 'CPCB/SPCB authorized') : t('recycler.authSubPending', 'Submit authorization documents')}
              onPress={() => navigation.navigate('Verification')}
            />
            <View style={styles.rowDivider} />
            <MenuRow
              icon="🔗"
              label={t('recycler.traceability', 'Traceability')}
              sub={t('recycler.traceSub', 'Lot-level material chain of custody')}
              onPress={() => navigation.navigate('RecyclerLotTrace', { lotId: '' })}
            />
            <View style={styles.rowDivider} />
            <MenuRow
              icon="⚠️"
              label={t('recycler.disputes', 'Disputes')}
              sub={t('recycler.disputesSub', 'Raise or view dispute cases')}
              onPress={() => navigation.navigate('RecyclerDisputes')}
            />
          </MenuGroup>

          {/* ── ACCOUNT ──────────────────────────────────────────────── */}
          <MenuGroup label={t('collector.account', 'ACCOUNT')}>
            <MenuRow
              icon="🌐"
              label={t('profile.language', 'Language')}
              sub={currentLang?.label ?? language}
              onPress={() => setShowLangPicker(!showLangPicker)}
            />
            {showLangPicker && (
              <View style={styles.langPicker}>
                {LANGUAGE_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.code}
                    style={[styles.langOption, language === opt.code && styles.langOptionSel]}
                    onPress={() => handleLangSelect(opt.code as SupportedLanguage)}
                    accessibilityRole="radio"
                  >
                    <Text style={[styles.langLabel, language === opt.code && { color: '#22D3EE', fontWeight: '800' }]}>
                      {opt.label}
                    </Text>
                    {language === opt.code && <Text style={{ color: '#22D3EE', fontSize: 14, fontWeight: '900' }}>✓</Text>}
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <View style={styles.rowDivider} />
            <MenuRow
              icon="🔔"
              label={t('profile.notifications', 'Notifications')}
              sub={t('recycler.notifSub', 'Offer and pickup alerts')}
              onPress={() => Alert.alert(t('profile.notifications', 'Notifications'), t('common.comingSoon', 'Coming soon'))}
            />
            <View style={styles.rowDivider} />
            <MenuRow
              icon="📡"
              label={t('profile.offlineData', 'Offline Data')}
              sub={t('profile.offlineSub', 'Manage cached data')}
              onPress={() => Alert.alert(t('profile.offlineData', 'Offline Data'), t('common.comingSoon', 'Coming soon'))}
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
                {isLoggingOut ? t('profile.signingOut', 'Signing out…') : `↩ ${t('profile.signOut', 'Sign Out')}`}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </EcoSetuBackground>
  );
};

const styles = StyleSheet.create({
  safeArea:      { flex: 1 },
  scroll:        { flex: 1 },
  scrollContent: { gap: 20, paddingBottom: 40, paddingTop: 20 },

  // Facility header
  facilityHeader: { alignItems: 'center', paddingHorizontal: 20, gap: 8, paddingBottom: 8 },
  facilityAvatar: {
    width: 80, height: 80, borderRadius: 20,
    backgroundColor: 'rgba(6,182,212,0.12)',
    borderWidth: 2, borderColor: 'rgba(6,182,212,0.4)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 4,
  },
  facilityAvatarText: { color: '#22D3EE', fontSize: 34, fontWeight: '900' },
  facilityName:       { color: '#FFFFFF', fontSize: 20, fontWeight: '900', letterSpacing: -0.3, textAlign: 'center' },
  facilityCity:       { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '500' },
  authBlock: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
  },
  authBlockOk:      { backgroundColor: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.3)' },
  authBlockPending: { backgroundColor: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.3)' },
  authDot:   { width: 8, height: 8, borderRadius: 4 },
  authLabel: { fontSize: 13, fontWeight: '800', letterSpacing: 0.3 },
  licenseRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', justifyContent: 'center' },
  licenseText: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '500', fontFamily: 'monospace' },

  // Groups
  group:      { paddingHorizontal: 20, gap: 8 },
  groupLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' },
  groupCard:  { backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 18, overflow: 'hidden' },

  // Menu row
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, minHeight: 56, gap: 14 },
  menuIconBox: { width: 38, height: 38, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.07)', justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  menuIcon:    { fontSize: 20 },
  menuTextCol: { flex: 1, gap: 2 },
  menuLabel:   { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  menuSub:     { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: '500' },
  menuChevron: { color: 'rgba(255,255,255,0.2)', fontSize: 22 },
  rowDivider:  { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginLeft: 68 },

  // Language picker
  langPicker:      { backgroundColor: 'rgba(255,255,255,0.04)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', paddingVertical: 8 },
  langOption:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 13, minHeight: 48 },
  langOptionSel:   { backgroundColor: 'rgba(34,211,238,0.07)' },
  langLabel:       { color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: '600' },

  // Sign out
  signOutSection: { paddingHorizontal: 20 },
  signOutBtn:     { backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)', borderRadius: 16, paddingVertical: 16, alignItems: 'center', minHeight: 56 },
  signOutText:    { color: '#FCA5A5', fontSize: 15, fontWeight: '700' },
});

export default RecyclerNewProfileScreen;
