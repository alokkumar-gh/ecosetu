/**
 * ConnectivityDot
 * Compact global network status indicator.
 * ONLINE = solid emerald dot
 * OFFLINE = amber pulsing dot
 * SYNCING = spinning dot
 */

import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useNetwork } from '../../hooks/useNetwork';

export const ConnectivityDot: React.FC = () => {
  const { isConnected } = useNetwork();
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isConnected) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 0.3, duration: 700, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        ])
      );
      anim.start();
      return () => anim.stop();
    } else {
      pulse.setValue(1);
    }
  }, [isConnected, pulse]);

  return (
    <View style={styles.wrapper} accessibilityLabel={isConnected ? 'Online' : 'Offline'}>
      <Animated.View
        style={[
          styles.dot,
          { backgroundColor: isConnected ? '#10B981' : '#F59E0B', opacity: pulse },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

export default ConnectivityDot;
