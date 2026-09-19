import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { colors } from '../../../../theme/colors';

interface MapGraphicProps {
  active?: boolean;
}

export const MapGraphic: React.FC<MapGraphicProps> = ({ active = true }) => {
  const radarAnim = useRef(new Animated.Value(0)).current;
  const pinBounceAnim = useRef(new Animated.Value(0)).current;
  const routeDashAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) return;

    // Radar pulse wave expanding
    const radarLoop = Animated.loop(
      Animated.timing(radarAnim, {
        toValue: 1,
        duration: 2500,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      })
    );

    // Subtle pin floating/bouncing
    const pinLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pinBounceAnim, {
          toValue: -6,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pinBounceAnim, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    // Vehicle traveling along the route
    const routeLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(routeDashAnim, {
          toValue: 1,
          duration: 3200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(routeDashAnim, {
          toValue: 0,
          duration: 500,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    );

    radarLoop.start();
    pinLoop.start();
    routeLoop.start();

    return () => {
      radarLoop.stop();
      pinLoop.stop();
      routeLoop.stop();
    };
  }, [active, radarAnim, pinBounceAnim, routeDashAnim]);

  const radarScale = radarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1.8],
  });

  const radarOpacity = radarAnim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0.8, 0.4, 0],
  });

  const vehicleTranslateX = routeDashAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 100],
  });

  const vehicleTranslateY = routeDashAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -35, -45],
  });

  return (
    <View style={styles.container}>
      {/* Abstract Map Grid Lines */}
      <View style={styles.gridContainer}>
        <View style={[styles.gridLineH, { top: 35 }]} />
        <View style={[styles.gridLineH, { top: 90 }]} />
        <View style={[styles.gridLineH, { top: 145 }]} />
        <View style={[styles.gridLineH, { top: 195 }]} />

        <View style={[styles.gridLineV, { left: 45 }]} />
        <View style={[styles.gridLineV, { left: 110 }]} />
        <View style={[styles.gridLineV, { left: 180 }]} />
        <View style={[styles.gridLineV, { left: 245 }]} />
      </View>

      {/* Citizen Location Hub (Left) */}
      <View style={styles.originHub}>
        <View style={styles.originCircle}>
          <Text style={styles.hubIcon}>🏠</Text>
        </View>
        <Text style={styles.hubBadge}>DOORSTEP</Text>
      </View>

      {/* Dispatch Route Highway (Connecting Citizen to Pickup Hub) */}
      <View style={styles.routeTrack}>
        <View style={styles.routeSegment1} />
        <View style={styles.routeSegment2} />
      </View>

      {/* Traveling Collector Vehicle */}
      <Animated.View
        style={[
          styles.vehiclePill,
          {
            transform: [{ translateX: vehicleTranslateX }, { translateY: vehicleTranslateY }],
          },
        ]}
      >
        <Text style={styles.vehicleIcon}>🛵</Text>
      </Animated.View>

      {/* Destination Pin (Right) with Radar Waves */}
      <View style={styles.destinationArea}>
        <Animated.View
          style={[
            styles.radarWave,
            {
              transform: [{ scale: radarScale }],
              opacity: radarOpacity,
            },
          ]}
        />
        <Animated.View style={[styles.pinWrapper, { transform: [{ translateY: pinBounceAnim }] }]}>
          <View style={styles.pinHead}>
            <View style={styles.pinCenterDot} />
          </View>
          <View style={styles.pinPoint} />
        </Animated.View>
        <Text style={styles.destinationBadge}>COLLECTOR HUB</Text>
      </View>

      {/* Geofence Range Ring */}
      <View style={styles.rangeRing} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 290,
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  gridContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.8,
  },
  gridLineH: {
    position: 'absolute',
    left: 10,
    right: 10,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  gridLineV: {
    position: 'absolute',
    top: 10,
    bottom: 10,
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  rangeRing: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 105,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(20, 184, 166, 0.22)',
  },
  // Citizen origin
  originHub: {
    position: 'absolute',
    left: 28,
    bottom: 40,
    alignItems: 'center',
  },
  originCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(6, 21, 27, 0.92)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubIcon: {
    fontSize: 18,
  },
  hubBadge: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.carousel.textMicro,
    letterSpacing: 0.8,
    marginTop: 4,
  },
  // Route track
  routeTrack: {
    position: 'absolute',
    left: 65,
    bottom: 60,
    width: 120,
    height: 60,
  },
  routeSegment1: {
    position: 'absolute',
    left: 10,
    bottom: 5,
    width: 65,
    height: 2.5,
    backgroundColor: 'rgba(16, 185, 129, 0.5)',
    transform: [{ rotate: '-25deg' }],
  },
  routeSegment2: {
    position: 'absolute',
    left: 65,
    bottom: 32,
    width: 65,
    height: 2.5,
    backgroundColor: 'rgba(6, 182, 212, 0.5)',
    transform: [{ rotate: '-10deg' }],
  },
  // Vehicle
  vehiclePill: {
    position: 'absolute',
    left: 65,
    bottom: 52,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(8, 37, 42, 0.95)',
    borderWidth: 1.5,
    borderColor: colors.carousel.accentEmerald,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  vehicleIcon: {
    fontSize: 12,
  },
  // Destination
  destinationArea: {
    position: 'absolute',
    right: 32,
    top: 35,
    alignItems: 'center',
  },
  radarWave: {
    position: 'absolute',
    top: 5,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    borderWidth: 1.5,
    borderColor: colors.carousel.accentEmerald,
  },
  pinWrapper: {
    alignItems: 'center',
  },
  pinHead: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.carousel.accentEmerald,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.carousel.accentEmerald,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 5,
  },
  pinCenterDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
  pinPoint: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.carousel.accentEmerald,
    marginTop: -2,
  },
  destinationBadge: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.carousel.accentEmerald,
    letterSpacing: 0.8,
    marginTop: 6,
  },
});
