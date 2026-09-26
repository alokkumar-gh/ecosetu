/**
 * SyncStatusBanner.tsx
 * Collector-facing accessible sync status and conflict indicator.
 *
 * Implements SIH 26229 Prompt 15 Requirements:
 * - Clear distinction of 6 states: Offline, Pending Sync, Syncing, Synced, Failed, Conflict
 * - Low-literacy design: icons + plain text (never color alone)
 * - Minimum 48dp touch targets for interactive controls
 * - Manual "Sync Now" button with debounce and offline protection
 * - Voice assistance integration via ReadAloudButton
 * - Vernacular support across English, Hindi, Marathi, and Odia
 */

import React, { memo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetwork } from '../../hooks/useNetwork';
import { useI18n } from '../../i18n';
import { ReadAloudButton } from '../voice/ReadAloudButton';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

import { AppIcon } from '../ui/AppIcon';

export interface SyncStatusBannerProps {
  showWhenAllSynced?: boolean;
  showSyncingBanner?: boolean;
}

export const SyncStatusBanner: React.FC<SyncStatusBannerProps> = memo(({ showWhenAllSynced = false, showSyncingBanner = false }) => {
  const insets = useSafeAreaInsets();
  const { isConnected, pendingActionsCount, failedActionsCount, conflictActionsCount, isSyncing, triggerSync } = useNetwork();
  const { t, language } = useI18n();
  const [localSyncing, setLocalSyncing] = useState(false);
  const containerPaddingTop = { paddingTop: (insets?.top || 0) > 0 ? insets.top + 4 : (spacing.spaceSm || 10) };

  const handleSyncNow = async () => {
    if (!isConnected || isSyncing || localSyncing) return;
    setLocalSyncing(true);
    try {
      await triggerSync();
    } catch (err) {
      console.warn('[SyncStatusBanner] Sync error:', err);
    } finally {
      setLocalSyncing(false);
    }
  };

  // 1. Offline Mode State
  if (!isConnected) {
    const textToRead = `${t('sync.offlineMode')}. ${t('sync.offlineNotice')}. ${
      pendingActionsCount > 0 ? `${pendingActionsCount} ${t('sync.changesWaiting')}` : ''
    }`;

    return (
      <View style={[styles.container, styles.offlineContainer, containerPaddingTop]} accessibilityRole="alert" accessibilityLiveRegion="polite">
        <View style={styles.stateIconBox}>
          <AppIcon name="alert" size={18} color="#EAB308" />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.title, styles.offlineTitle]}>{t('sync.offlineMode')}</Text>
          <Text style={styles.subtitle}>
            {t('sync.offlineNotice')}
            {pendingActionsCount > 0 ? ` (${pendingActionsCount} ${t('sync.changesWaiting')})` : ''}
          </Text>
        </View>
        <ReadAloudButton
          text={textToRead}
          language={language}
          style={styles.voiceButton}
        />
      </View>
    );
  }

  // 2. Conflict State (server-authoritative change rejected client change)
  if (conflictActionsCount > 0) {
    const textToRead = `${t('sync.conflict')}. ${t('sync.conflictReview')}`;

    return (
      <View style={[styles.container, styles.conflictContainer, containerPaddingTop]} accessibilityRole="alert" accessibilityLiveRegion="assertive">
        <View style={styles.stateIconBox}>
          <AppIcon name="alert" size={18} color="#EF4444" />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.title, styles.conflictTitle]}>{t('sync.conflict')}</Text>
          <Text style={styles.subtitle}>
            {t('sync.conflictReview')} ({conflictActionsCount})
          </Text>
        </View>
        <ReadAloudButton
          text={textToRead}
          language={language}
          style={styles.voiceButton}
        />
      </View>
    );
  }

  // 3. Failed State (retry exhausted or validation error)
  if (failedActionsCount > 0) {
    const textToRead = `${t('common.error')}. ${t('sync.syncFailed')}`;

    return (
      <View style={[styles.container, styles.failedContainer, containerPaddingTop]} accessibilityRole="alert" accessibilityLiveRegion="polite">
        <View style={styles.stateIconBox}>
          <AppIcon name="alert" size={18} color="#F97316" />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.title, styles.failedTitle]}>{t('sync.syncFailed')}</Text>
          <Text style={styles.subtitle}>
            {failedActionsCount} {t('sync.pendingCount')}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.syncButton}
          onPress={handleSyncNow}
          disabled={isSyncing || localSyncing}
          accessibilityRole="button"
          accessibilityLabel={t('sync.syncNow')}
          activeOpacity={0.7}
        >
          {isSyncing || localSyncing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <View style={styles.btnContent}>
              <AppIcon name="refresh" size={13} color="#FFFFFF" />
              <Text style={styles.syncButtonText}>{t('sync.syncNow')}</Text>
            </View>
          )}
        </TouchableOpacity>
        <ReadAloudButton
          text={textToRead}
          language={language}
          style={styles.voiceButton}
        />
      </View>
    );
  }

  // 4. Actively Syncing State (silent background sync by default; banner only when explicitly requested)
  if (showSyncingBanner && (isSyncing || localSyncing)) {
    return (
      <View style={[styles.container, styles.syncingContainer, containerPaddingTop]} accessibilityLiveRegion="polite">
        <ActivityIndicator size="small" color="#0EA5E9" style={styles.indicator} />
        <View style={styles.textContainer}>
          <Text style={[styles.title, styles.syncingTitle]}>{t('sync.syncing')}</Text>
          {pendingActionsCount > 0 && (
            <Text style={styles.subtitle}>
              {pendingActionsCount} {t('sync.pendingCount')}
            </Text>
          )}
        </View>
      </View>
    );
  }

  // 5. Pending Sync State (online but queue has items waiting)
  if (pendingActionsCount > 0) {
    const textToRead = `${t('sync.pendingSync')}. ${pendingActionsCount} ${t('sync.pendingCount')}`;

    return (
      <View style={[styles.container, styles.pendingContainer, containerPaddingTop]} accessibilityLiveRegion="polite">
        <View style={styles.stateIconBox}>
          <AppIcon name="clock" size={18} color="#38BDF8" />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.title, styles.pendingTitle]}>{t('sync.pendingSync')}</Text>
          <Text style={styles.subtitle}>
            {pendingActionsCount} {t('sync.pendingCount')}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.syncButton}
          onPress={handleSyncNow}
          disabled={isSyncing || localSyncing}
          accessibilityRole="button"
          accessibilityLabel={t('sync.syncNow')}
          activeOpacity={0.7}
        >
          <View style={styles.btnContent}>
            <AppIcon name="refresh" size={13} color="#FFFFFF" />
            <Text style={styles.syncButtonText}>{t('sync.syncNow')}</Text>
          </View>
        </TouchableOpacity>
        <ReadAloudButton
          text={textToRead}
          language={language}
          style={styles.voiceButton}
        />
      </View>
    );
  }

  // 6. All Synced State (optional display)
  if (showWhenAllSynced) {
    return (
      <View style={[styles.container, styles.syncedContainer, containerPaddingTop]}>
        <View style={styles.stateIconBox}>
          <AppIcon name="shieldCheck" size={18} color="#22C55E" />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.title, styles.syncedTitle]}>{t('sync.allSynced')}</Text>
        </View>
      </View>
    );
  }

  return null;
});

SyncStatusBanner.displayName = 'SyncStatusBanner';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.spaceMd || 16,
    paddingVertical: spacing.spaceSm || 10,
    minHeight: 52,
    borderBottomWidth: 1,
  },
  offlineContainer: {
    backgroundColor: 'rgba(234, 179, 8, 0.15)',
    borderBottomColor: 'rgba(234, 179, 8, 0.35)',
  },
  conflictContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderBottomColor: 'rgba(239, 68, 68, 0.4)',
  },
  failedContainer: {
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    borderBottomColor: 'rgba(249, 115, 22, 0.35)',
  },
  syncingContainer: {
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
    borderBottomColor: 'rgba(14, 165, 233, 0.35)',
  },
  pendingContainer: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderBottomColor: 'rgba(59, 130, 246, 0.35)',
  },
  syncedContainer: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderBottomColor: 'rgba(34, 197, 94, 0.35)',
  },
  stateIconBox: {
    marginRight: spacing.spaceSm || 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  indicator: {
    marginRight: spacing.spaceSm || 10,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  offlineTitle: {
    color: '#EAB308',
  },
  conflictTitle: {
    color: '#EF4444',
  },
  failedTitle: {
    color: '#F97316',
  },
  syncingTitle: {
    color: '#0EA5E9',
  },
  pendingTitle: {
    color: '#38BDF8',
  },
  syncedTitle: {
    color: '#22C55E',
  },
  subtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
    lineHeight: 14,
  },
  syncButton: {
    minHeight: 48,
    minWidth: 80,
    paddingHorizontal: 12,
    backgroundColor: colors.primary || '#059669',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  syncButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  voiceButton: {
    minHeight: 48,
    minWidth: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
});

export default SyncStatusBanner;
