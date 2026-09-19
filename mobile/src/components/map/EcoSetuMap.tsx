/**
 * EcoSetuMap.tsx
 * Reusable Google Maps Component for Android (and iOS fallback)
 *
 * Implements:
 * - Google Maps provider on Android (PROVIDER_GOOGLE)
 * - Initial region and dynamic region updates
 * - Single draggable pickup pin for Citizen doorstep refinement
 * - Current device location indicator layer
 * - Loading, offline, permission denied, and location error states
 * - Accessible labels & 48dp touch targets
 * - Glassmorphism floating HUD overlays matching EcoSetu design tokens
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  ViewStyle,
} from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { useI18n } from '../../i18n';

export interface EcoSetuPin {
  id: string;
  latitude: number;
  longitude: number;
  title?: string;
  description?: string;
  isApproximate?: boolean;
  data?: any;
}

export type EcoSetuMarker = EcoSetuPin;

export interface EcoSetuMapProps {
  latitude: number;
  longitude: number;
  onLocationChange?: (lat: number, lng: number) => void;
  draggable?: boolean;
  isLoading?: boolean;
  isOffline?: boolean;
  permissionDenied?: boolean;
  onRequestPermission?: () => void;
  style?: ViewStyle;
  testID?: string;
  markers?: EcoSetuPin[];
  pins?: EcoSetuPin[];
  onMarkerPress?: (pin: EcoSetuPin) => void;
  onPinPress?: (pin: EcoSetuPin) => void;
  showApproximateCircles?: boolean;
  circleRadius?: number;
  pinTitle?: string;
  pinDescription?: string;
}

export const EcoSetuMap: React.FC<EcoSetuMapProps> = ({
  latitude,
  longitude,
  onLocationChange,
  draggable = true,
  isLoading = false,
  isOffline = false,
  permissionDenied = false,
  onRequestPermission,
  style,
  testID = 'ecosetu-map',
  markers,
  pins,
  onMarkerPress,
  onPinPress,
  showApproximateCircles = true,
  circleRadius = 700,
  pinTitle,
  pinDescription,
}) => {
  const { t } = useI18n();
  const mapRef = useRef<MapView | null>(null);
  const pinList = pins || markers;
  const onSelectPin = onPinPress || onMarkerPress;
  const hasPins = Array.isArray(pinList) && pinList.length > 0;

  // Animate camera when coordinates change (e.g. from GPS)
  useEffect(() => {
    if (mapRef.current && latitude && longitude) {
      const region: Region = {
        latitude,
        longitude,
        latitudeDelta: hasPins ? 0.04 : 0.008,
        longitudeDelta: hasPins ? 0.04 : 0.008,
      };
      mapRef.current.animateToRegion(region, 500);
    }
  }, [latitude, longitude, hasPins]);

  // Render Offline State
  if (isOffline) {
    return (
      <View style={[styles.container, styles.fallbackContainer, style]} testID={testID}>
        <Text style={styles.fallbackIcon}>📡</Text>
        <Text style={styles.fallbackTitle}>
          {t('citizen.submit.mapUnavailable') || 'Map Unavailable (Offline)'}
        </Text>
        <Text style={styles.fallbackSubtitle}>
          {t('citizen.submit.offlineMapHelp') ||
            'Network disconnected. Your manually entered address and selected coordinates are preserved locally.'}
        </Text>
        <View style={styles.coordsBadge}>
          <Text style={styles.coordsText}>
            {t('citizen.submit.latitude') || 'Lat'}: {latitude ? latitude.toFixed(2) : '—'} |{' '}
            {t('citizen.submit.longitude') || 'Lng'}: {longitude ? longitude.toFixed(2) : '—'}
          </Text>
        </View>
      </View>
    );
  }

  // Render Permission Denied State
  if (permissionDenied) {
    return (
      <View style={[styles.container, styles.fallbackContainer, style]} testID={testID}>
        <Text style={styles.fallbackIcon}>📍</Text>
        <Text style={styles.fallbackTitle}>
          {t('citizen.submit.locPermissionDenied') || 'Location Permission Denied'}
        </Text>
        <Text style={styles.fallbackSubtitle}>
          {t('citizen.submit.locPermissionHelp') ||
            'Enable location permissions to automatically center the map on your doorstep.'}
        </Text>
        {onRequestPermission && (
          <TouchableOpacity
            style={styles.retryButton}
            onPress={onRequestPermission}
            accessibilityRole="button"
            accessibilityLabel={t('citizen.submit.useCurrentLocation') || 'Grant Location Permission'}
            activeOpacity={0.8}
          >
            <Text style={styles.retryButtonText}>
              {t('citizen.submit.useCurrentLocation') || 'Grant Permission'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // Render Location Unavailable State when coordinates are not yet obtained
  if ((!latitude || !longitude) && !hasPins && !isLoading) {
    return (
      <View style={[styles.container, styles.fallbackContainer, style]} testID={testID}>
        <Text style={styles.fallbackIcon}>📍</Text>
        <Text style={styles.fallbackTitle}>
          {t('citizen.submit.locUnavailable') || 'Location Unavailable'}
        </Text>
        <Text style={styles.fallbackSubtitle}>
          {t('citizen.submit.locPermissionHelp') ||
            'Location coordinates could not be determined. Tap below to obtain your current GPS coordinates.'}
        </Text>
        {onRequestPermission && (
          <TouchableOpacity
            style={styles.retryButton}
            onPress={onRequestPermission}
            accessibilityRole="button"
            accessibilityLabel="Obtain GPS Location"
            activeOpacity={0.8}
          >
            <Text style={styles.retryButtonText}>
              {t('citizen.submit.useCurrentLocation') || 'Obtain Location'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, style]} testID={testID} accessibilityLabel="Interactive pickup location map">
      <MapView
        ref={mapRef}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        style={styles.map}
        initialRegion={{
          latitude: latitude || 20.5937,
          longitude: longitude || 78.9629,
          latitudeDelta: hasPins ? 0.04 : (latitude ? 0.008 : 16.0),
          longitudeDelta: hasPins ? 0.04 : (longitude ? 0.008 : 16.0),
        }}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsCompass={true}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
        loadingEnabled={true}
        loadingIndicatorColor={colors.primary}
        loadingBackgroundColor={colors.backgroundBase}
        onUserLocationChange={(e) => {
          const coord = e.nativeEvent.coordinate;
          if (coord && (!latitude || !longitude) && onLocationChange) {
            onLocationChange(coord.latitude, coord.longitude);
          }
        }}
      >
        {hasPins ? (
          <>
            {showApproximateCircles &&
              pinList
                .filter((m) => m.isApproximate !== false)
                .map((m) => (
                  <Circle
                    key={`circle-${m.id}`}
                    center={{ latitude: m.latitude, longitude: m.longitude }}
                    radius={circleRadius}
                    fillColor="rgba(46, 125, 50, 0.18)"
                    strokeColor="rgba(46, 125, 50, 0.55)"
                    strokeWidth={1.5}
                  />
                ))}
            {pinList.map((m) => (
              <Marker
                key={`marker-${m.id}`}
                coordinate={{ latitude: m.latitude, longitude: m.longitude }}
                title={m.title || (m.isApproximate !== false ? (t('collector.browse.approximatePickupArea') || 'Approximate Pickup Area') : (t('collector.pickups.exactPickupLocation') || 'Exact Pickup Location'))}
                description={
                  m.description ||
                  (m.isApproximate !== false
                    ? (t('collector.browse.exactLocationAfterAcceptance') || 'Exact location available after acceptance')
                    : (t('collector.pickups.exactLocationAuthorized') || 'Authorized Citizen Doorstep'))
                }
                pinColor={colors.primary}
                onPress={() => onSelectPin && onSelectPin(m)}
                accessibilityLabel={m.isApproximate !== false ? `Approximate request marker for ${m.title || 'collection request'}` : `Exact pickup marker for ${m.title || 'collection request'}`}
              />
            ))}
          </>
        ) : (
          latitude && longitude ? (
            <Marker
              coordinate={{
                latitude,
                longitude,
              }}
              draggable={draggable}
              onDragEnd={(e) => {
                const coord = e.nativeEvent.coordinate;
                if (onLocationChange) {
                  onLocationChange(coord.latitude, coord.longitude);
                }
              }}
              title={pinTitle || t('citizen.submit.selectedLocation') || 'Selected Pickup Location'}
              description={pinDescription || t('citizen.submit.movePin') || 'Drag this marker to adjust exact pickup point'}
              pinColor={colors.primary}
              accessibilityLabel="Pickup location pin. Draggable to adjust location."
            />
          ) : null
        )}
      </MapView>

      {/* Floating Header Hint */}
      {!hasPins && draggable && Boolean(latitude && longitude) && (
        <View style={styles.hintContainer} pointerEvents="none">
          <Text style={styles.hintText}>
            📍 {t('citizen.submit.movePin') || 'Drag pin to adjust exact pickup point'}
          </Text>
        </View>
      )}

      {/* Floating Header Privacy Hint for Markers */}
      {hasPins && (
        <View style={styles.hintContainer} pointerEvents="none">
          <Text style={styles.hintText}>
            🛡️ {t('collector.browse.privacyProtected') || 'Approximate Areas · Privacy Protected'}
          </Text>
        </View>
      )}

      {/* Floating Coordinate Pill / Count Pill */}
      <View style={styles.coordsPill} pointerEvents="none">
        {hasPins ? (
          <Text style={styles.coordsPillText}>
            📍 {pinList.length} {t('collector.browse.nearbyRequests') || 'Nearby Requests'}
          </Text>
        ) : (
          <Text style={styles.coordsPillText}>
            {latitude && longitude
              ? `${t('citizen.submit.latitude') || 'Lat'}: ${latitude.toFixed(5)}  |  ${t('citizen.submit.longitude') || 'Lng'}: ${longitude.toFixed(5)}`
              : (t('citizen.submit.locUnavailable') || 'Location pending — Tap Use Location')}
          </Text>
        )}
      </View>

      {/* Loading Overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>
            {t('citizen.submit.mapLoading') || 'Finding your location...'}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 240,
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.backgroundBase,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    position: 'relative',
    marginVertical: spacing.spaceSm,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  hintContainer: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    backgroundColor: 'rgba(10, 26, 13, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  hintText: {
    fontSize: typography.Caption.fontSize,
    color: colors.primaryLight,
    fontWeight: '600',
  },
  coordsPill: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    backgroundColor: 'rgba(10, 26, 13, 0.88)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.glassBorderStrong,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  coordsPillText: {
    fontSize: typography.Caption.fontSize,
    color: colors.textPrimary,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 26, 13, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: typography.Body.fontSize,
    color: colors.textPrimary,
    marginTop: spacing.spaceSm,
  },
  fallbackContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.spaceMd,
  },
  fallbackIcon: {
    fontSize: 32,
    marginBottom: spacing.spaceXs,
  },
  fallbackTitle: {
    fontSize: typography.Title.fontSize,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  fallbackSubtitle: {
    fontSize: typography.Caption.fontSize,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
    marginBottom: spacing.spaceSm,
  },
  retryButton: {
    minHeight: 48,
    paddingHorizontal: spacing.spaceMd,
    paddingVertical: spacing.spaceXs,
    backgroundColor: colors.primary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryButtonText: {
    fontSize: typography.Button.fontSize,
    color: colors.textInverse,
    fontWeight: '700',
  },
  coordsBadge: {
    backgroundColor: colors.glassFill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    marginTop: spacing.spaceXs,
  },
  coordsText: {
    fontSize: typography.Caption.fontSize,
    color: colors.primaryLight,
    fontVariant: ['tabular-nums'],
  },
});
