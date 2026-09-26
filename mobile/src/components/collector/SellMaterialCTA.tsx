/**
 * SellMaterialCTA
 * The dominant primary action for the Collector.
 * Large, visually heavy, impossible to miss.
 * NOT a button — a call-to-action surface.
 */

import React, { useRef } from 'react';
import { TouchableOpacity, View, Text, StyleSheet, Animated } from 'react-native';
import { AppIcon } from '../ui/AppIcon';

interface SellMaterialCTAProps {
  onPress: () => void;
  subtitle?: string;
}

export const SellMaterialCTA: React.FC<SellMaterialCTAProps> = ({
  onPress,
  subtitle = 'Photograph material · Set price · List for sale',
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, tension: 200, friction: 12 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 12 }).start();
  };

  return (
    <View style={styles.wrapper}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <TouchableOpacity
          style={styles.cta}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={1}
          accessibilityRole="button"
          accessibilityLabel="Sell Material"
        >
          {/* Left: icon block */}
          <View style={styles.iconBlock}>
            <AppIcon name="camera" size={22} color="#064E3B" />
          </View>

          {/* Center: text */}
          <View style={styles.textCol}>
            <Text style={styles.mainLabel}>SELL MATERIAL</Text>
            <Text style={styles.subLabel} numberOfLines={1}>{subtitle}</Text>
          </View>

          {/* Right: arrow */}
          <View style={styles.arrowBlock}>
            <Text style={styles.arrow}>→</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 20,
  },
  cta: {
    backgroundColor: '#10B981',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 8,
    minHeight: 76,
  },
  iconBlock: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(7, 30, 26, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    flexShrink: 0,
  },
  icon: {
    fontSize: 26,
  },
  textCol: {
    flex: 1,
  },
  mainLabel: {
    color: '#071E22',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  subLabel: {
    color: 'rgba(7, 30, 26, 0.7)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 3,
  },
  arrowBlock: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(7, 30, 26, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    flexShrink: 0,
  },
  arrow: {
    color: '#071E22',
    fontSize: 18,
    fontWeight: '900',
  },
});

export default SellMaterialCTA;
