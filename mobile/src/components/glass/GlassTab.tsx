/**
 * GlassTab
 * Segmented control / filter tab bar with glass aesthetics and >= 44dp touch targets.
 */

import React, { memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  ScrollView,
} from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

export interface TabItem {
  key: string;
  label: string;
  count?: number;
  icon?: string;
}

interface GlassTabProps {
  tabs: TabItem[];
  activeKey: string;
  onChangeTab: (key: string) => void;
  scrollable?: boolean;
  style?: ViewStyle;
}

export const GlassTab: React.FC<GlassTabProps> = memo(({
  tabs,
  activeKey,
  onChangeTab,
  scrollable = false,
  style,
}) => {
  const content = tabs.map((tab) => {
    const isActive = tab.key === activeKey;
    return (
      <TouchableOpacity
        key={tab.key}
        onPress={() => onChangeTab(tab.key)}
        style={[styles.tab, isActive && styles.tabActive]}
        accessibilityRole="tab"
        accessibilityState={{ selected: isActive }}
        accessibilityLabel={`${tab.label}${tab.count !== undefined ? ` (${tab.count})` : ''}`}
        activeOpacity={0.75}
      >
        <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
          {tab.icon ? `${tab.icon} ` : ''}
          {tab.label}
        </Text>
        {tab.count !== undefined ? (
          <View style={[styles.countBadge, isActive && styles.countBadgeActive]}>
            <Text style={[styles.countText, isActive && styles.countTextActive]}>
              {tab.count}
            </Text>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  });

  if (scrollable) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.container, style]}
      >
        {content}
      </ScrollView>
    );
  }

  return <View style={[styles.container, style]}>{content}</View>;
});

GlassTab.displayName = 'GlassTab';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'rgba(241, 245, 249, 0.85)',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.90)',
    marginVertical: spacing.spaceXs,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.spaceSm,
    paddingVertical: 8,
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: typography.Caption.fontSize,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  countBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    backgroundColor: 'rgba(15, 41, 66, 0.08)',
  },
  countBadgeActive: {
    backgroundColor: 'rgba(5, 150, 105, 0.12)',
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  countTextActive: {
    color: colors.accent,
  },
});

export default GlassTab;
