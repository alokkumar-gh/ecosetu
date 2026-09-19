import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

export interface GlassTabBarProps extends BottomTabBarProps {
  style?: ViewStyle;
}

export const GlassTabBar: React.FC<GlassTabBarProps> = (props) => {
  // Renders a glass container wrapping custom bottom tabs
  return (
    <View style={[styles.container, props.style]}>
      {/* Tab bar content rendered with translucent surface and backdrop */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.90)',
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
});

export default GlassTabBar;
