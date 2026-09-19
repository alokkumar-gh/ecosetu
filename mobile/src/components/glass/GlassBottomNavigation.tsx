/**
 * GlassBottomNavigation
 * Floating translucent glass bottom bar for EcoSetu role screens.
 * Features rounded pill container, subtle border glow, and vibrant active states.
 */

import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';

export interface TabItem {
  key: string;
  label: string;
  icon: string;
  isCenterAction?: boolean;
}

interface GlassBottomNavigationProps {
  tabs: TabItem[];
  activeTab: string;
  onTabPress: (key: string) => void;
  style?: ViewStyle;
}

export const GlassBottomNavigation: React.FC<GlassBottomNavigationProps> = memo(({
  tabs,
  activeTab,
  onTabPress,
  style,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 8) }, style]}>
      <View style={styles.container}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;

          if (tab.isCenterAction) {
            return (
              <TouchableOpacity
                key={tab.key}
                style={styles.centerButton}
                onPress={() => onTabPress(tab.key)}
                accessibilityRole="button"
                accessibilityLabel={tab.label}
                activeOpacity={0.8}
              >
                <Text style={styles.centerIcon}>{tab.icon}</Text>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabButton, isActive && styles.activeTabButton]}
              onPress={() => onTabPress(tab.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={tab.label}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabIcon, isActive ? styles.activeIcon : styles.inactiveIcon]}>
                {tab.icon}
              </Text>
              <Text style={[styles.tabLabel, isActive ? styles.activeLabel : styles.inactiveLabel]} numberOfLines={1}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
});

GlassBottomNavigation.displayName = 'GlassBottomNavigation';

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 4,
    backgroundColor: 'transparent',
  },
  container: {
    flexDirection: 'row',
    backgroundColor: 'rgba(7, 30, 34, 0.90)',
    borderRadius: 32,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'space-around',
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: 20,
  },
  activeTabButton: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  inactiveIcon: {
    color: 'rgba(255, 255, 255, 0.45)',
  },
  activeIcon: {
    color: '#10B981',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  inactiveLabel: {
    color: 'rgba(255, 255, 255, 0.50)',
  },
  activeLabel: {
    color: '#10B981',
    fontWeight: '700',
  },
  centerButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#34D399',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    elevation: 6,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  centerIcon: {
    fontSize: 24,
    color: '#051417',
    fontWeight: 'bold',
  },
});

export default GlassBottomNavigation;
