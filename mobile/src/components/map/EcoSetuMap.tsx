/**
 * EcoSetuMap.tsx
 * Reusable Google Maps Component for Android (and iOS fallback)
 *
 * Implements:
 * - Google Maps provider on Android (PROVIDER_GOOGLE)
 * - Map Type Switcher: Standard, Satellite, Terrain, Hybrid (with persistent storage)
 * - Initial region and dynamic region updates
 * - Interactive pickup location selection: Tap, Long-press, Draggable pin, Center-pin mode
 * - Current device location indicator layer vs Distinct EcoSetu Emerald Pickup Marker
 * - Real GPS accuracy circle indicator
 * - Floating glassmorphism controls: Map Type, My Location, Zoom In (+), Zoom Out (-), Recenter
 * - Free address and landmark search overlay (native Geocoder / Nominatim)
 * - Loading, offline, permission denied, and location error states
 * - Accessible labels & >= 48dp touch targets
 * - Glassmorphism floating HUD overlays matching EcoSetu design tokens
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Platform,
  ViewStyle,
  Modal,
} from 'react-native';
import MapView, { Marker, Circle, PROVIDER_GOOGLE, Region, MapType } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { useI18n } from '../../i18n';
import { AppIcon } from '../ui/AppIcon';
import {
  getCurrentLocation,
  searchLocations,
  SearchLocationResult,
} from '../../services/locationService';

export type MapTypeOption = 'standard' | 'satellite' | 'terrain' | 'hybrid';

const MAP_TYPE_STORAGE_KEY = '@ecosetu_map_type';

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

  // ── Advanced Controls (Phase 19 Task 37) ──
  mapType?: MapTypeOption;
  initialMapType?: MapTypeOption;
  showMapTypeControl?: boolean;
  showZoomControls?: boolean;
  showMyLocationButton?: boolean;
  showRecenterButton?: boolean;
  allowLocationSelection?: boolean;
  allowTapSelection?: boolean;
  allowLongPressSelection?: boolean;
  accuracy?: number | null;
  showAccuracyCircle?: boolean;
  showSearch?: boolean;
  showCoordinatesPill?: boolean;
  onLocationSelectWithAccuracy?: (lat: number, lng: number, accuracy?: number | null) => void;
  centerPinMode?: boolean;
  controlsTopOffset?: number;
  onRegionChangeComplete?: (region: Region) => void;
  onMapReady?: () => void;
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
  mapType: propMapType,
  initialMapType = 'standard',
  showMapTypeControl = true,
  showZoomControls = true,
  showMyLocationButton = true,
  showRecenterButton = true,
  controlsTopOffset = 10,
  centerPinMode = false,
  allowLocationSelection = true,
  allowTapSelection = true,
  allowLongPressSelection = true,
  accuracy,
  showAccuracyCircle = true,
  showSearch = false,
  showCoordinatesPill = true,
  onLocationSelectWithAccuracy,
  onRegionChangeComplete,
  onMapReady,
}) => {
  const { t } = useI18n();
  const mapRef = useRef<MapView | null>(null);
  const currentRegionRef = useRef<Region | null>(null);

  const [activeMapType, setActiveMapType] = useState<MapTypeOption>(
    propMapType || initialMapType
  );
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const [isLocatingUser, setIsLocatingUser] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchLocationResult[]>([]);
  const [showResultsDropdown, setShowResultsDropdown] = useState(false);

  const pinList = pins || markers;
  const onSelectPin = onPinPress || onMarkerPress;
  const hasPins = Array.isArray(pinList) && pinList.length > 0;

  // Load persisted map type preference on mount
  useEffect(() => {
    if (propMapType) {
      setActiveMapType(propMapType);
      return;
    }
    AsyncStorage.getItem(MAP_TYPE_STORAGE_KEY).then((stored) => {
      if (
        stored === 'standard' ||
        stored === 'satellite' ||
        stored === 'terrain' ||
        stored === 'hybrid'
      ) {
        setActiveMapType(stored);
      }
    }).catch(() => {});
  }, [propMapType]);

  // Change and persist map type
  const handleSelectMapType = useCallback((type: MapTypeOption) => {
    setActiveMapType(type);
    setShowTypeMenu(false);
    AsyncStorage.setItem(MAP_TYPE_STORAGE_KEY, type).catch(() => {});
  }, []);

  // Animate camera when coordinates change
  useEffect(() => {
    if (mapRef.current && latitude && longitude) {
      const region: Region = {
        latitude,
        longitude,
        latitudeDelta: hasPins ? 0.04 : 0.008,
        longitudeDelta: hasPins ? 0.04 : 0.008,
      };
      currentRegionRef.current = region;
      mapRef.current.animateToRegion(region, 500);
    }
  }, [latitude, longitude, hasPins]);

  // Zoom In handler
  const handleZoomIn = useCallback(() => {
    if (!mapRef.current) return;
    const cur = currentRegionRef.current || {
      latitude: latitude || 20.5937,
      longitude: longitude || 78.9629,
      latitudeDelta: 0.008,
      longitudeDelta: 0.008,
    };
    const nextRegion: Region = {
      ...cur,
      latitudeDelta: Math.max(cur.latitudeDelta / 2, 0.0005),
      longitudeDelta: Math.max(cur.longitudeDelta / 2, 0.0005),
    };
    currentRegionRef.current = nextRegion;
    mapRef.current.animateToRegion(nextRegion, 300);
  }, [latitude, longitude]);

  // Zoom Out handler
  const handleZoomOut = useCallback(() => {
    if (!mapRef.current) return;
    const cur = currentRegionRef.current || {
      latitude: latitude || 20.5937,
      longitude: longitude || 78.9629,
      latitudeDelta: 0.008,
      longitudeDelta: 0.008,
    };
    const nextRegion: Region = {
      ...cur,
      latitudeDelta: Math.min(cur.latitudeDelta * 2, 80),
      longitudeDelta: Math.min(cur.longitudeDelta * 2, 80),
    };
    currentRegionRef.current = nextRegion;
    mapRef.current.animateToRegion(nextRegion, 300);
  }, [latitude, longitude]);

  // Recenter to current selected point
  const handleRecenter = useCallback(() => {
    if (mapRef.current && latitude && longitude) {
      const region: Region = {
        latitude,
        longitude,
        latitudeDelta: 0.006,
        longitudeDelta: 0.006,
      };
      currentRegionRef.current = region;
      mapRef.current.animateToRegion(region, 400);
    }
  }, [latitude, longitude]);

  // My Location GPS fetch
  const handleMyLocationPress = useCallback(async () => {
    setIsLocatingUser(true);
    try {
      const result = await getCurrentLocation();
      if (result.success && result.coords) {
        const { latitude: userLat, longitude: userLng, accuracy: userAcc } = result.coords;
        const region: Region = {
          latitude: userLat,
          longitude: userLng,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        };
        currentRegionRef.current = region;
        if (mapRef.current) {
          mapRef.current.animateToRegion(region, 500);
        }
        if (onLocationSelectWithAccuracy && allowLocationSelection) {
          onLocationSelectWithAccuracy(userLat, userLng, userAcc);
        } else if (onLocationChange) {
          onLocationChange(userLat, userLng);
        }
      } else if (result.error === 'PERMISSION_DENIED' && onRequestPermission) {
        onRequestPermission();
      }
    } catch (err) {
      console.warn('[EcoSetuMap] My Location error:', err);
    } finally {
      setIsLocatingUser(false);
    }
  }, [allowLocationSelection, onLocationChange, onLocationSelectWithAccuracy, onRequestPermission]);

  // Search input change handler
  const handleSearchSubmit = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const results = await searchLocations(searchQuery.trim());
      setSearchResults(results);
      setShowResultsDropdown(results.length > 0);
    } catch (err) {
      console.warn('[EcoSetuMap] Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  // Select Search Result
  const handleSelectSearchResult = useCallback((result: SearchLocationResult) => {
    setShowResultsDropdown(false);
    setSearchQuery(result.title || result.formattedAddress);
    const region: Region = {
      latitude: result.latitude,
      longitude: result.longitude,
      latitudeDelta: 0.006,
      longitudeDelta: 0.006,
    };
    currentRegionRef.current = region;
    if (mapRef.current) {
      mapRef.current.animateToRegion(region, 500);
    }
    if (allowLocationSelection) {
      if (onLocationSelectWithAccuracy) {
        onLocationSelectWithAccuracy(result.latitude, result.longitude, null);
      } else if (onLocationChange) {
        onLocationChange(result.latitude, result.longitude);
      }
    }
  }, [allowLocationSelection, onLocationChange, onLocationSelectWithAccuracy]);

  // Handle Map Tap Selection
  const handleMapPress = useCallback((e: any) => {
    if (!allowLocationSelection || !allowTapSelection || hasPins) return;
    const coord = e.nativeEvent?.coordinate;
    if (coord && typeof coord.latitude === 'number' && typeof coord.longitude === 'number') {
      if (onLocationSelectWithAccuracy) {
        onLocationSelectWithAccuracy(coord.latitude, coord.longitude, null);
      } else if (onLocationChange) {
        onLocationChange(coord.latitude, coord.longitude);
      }
    }
  }, [allowLocationSelection, allowTapSelection, hasPins, onLocationChange, onLocationSelectWithAccuracy]);

  // Handle Map Long Press Selection
  const handleMapLongPress = useCallback((e: any) => {
    if (!allowLocationSelection || !allowLongPressSelection || hasPins) return;
    const coord = e.nativeEvent?.coordinate;
    if (coord && typeof coord.latitude === 'number' && typeof coord.longitude === 'number') {
      if (onLocationSelectWithAccuracy) {
        onLocationSelectWithAccuracy(coord.latitude, coord.longitude, null);
      } else if (onLocationChange) {
        onLocationChange(coord.latitude, coord.longitude);
      }
    }
  }, [allowLocationSelection, allowLongPressSelection, hasPins, onLocationChange, onLocationSelectWithAccuracy]);

  // Render Offline State
  if (isOffline) {
    return (
      <View style={[styles.container, styles.fallbackContainer, style]} testID={testID}>
        <View style={styles.fallbackIconWrap}>
          <AppIcon name="alert" size={32} color="#F59E0B" />
        </View>
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
        <View style={styles.fallbackIconWrap}>
          <AppIcon name="location" size={32} color={colors.primary} />
        </View>
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
        <View style={styles.fallbackIconWrap}>
          <AppIcon name="location" size={32} color={colors.primary} />
        </View>
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
        mapType={activeMapType as MapType}
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
        onPress={handleMapPress}
        onLongPress={handleMapLongPress}
        onRegionChangeComplete={(region) => {
          currentRegionRef.current = region;
          if (onRegionChangeComplete) {
            onRegionChangeComplete(region);
          }
          if (centerPinMode && allowLocationSelection) {
            if (onLocationSelectWithAccuracy) {
              onLocationSelectWithAccuracy(region.latitude, region.longitude, null);
            } else if (onLocationChange) {
              onLocationChange(region.latitude, region.longitude);
            }
          }
        }}
        onMapReady={onMapReady}
        onUserLocationChange={(e) => {
          const coord = e.nativeEvent?.coordinate;
          if (coord && (!latitude || !longitude) && onLocationChange) {
            onLocationChange(coord.latitude, coord.longitude);
          }
        }}
      >
        {/* Accuracy Circle */}
        {showAccuracyCircle && Boolean(accuracy && accuracy > 0 && latitude && longitude && !hasPins) && (
          <Circle
            center={{ latitude, longitude }}
            radius={accuracy!}
            fillColor="rgba(16, 185, 129, 0.16)"
            strokeColor="rgba(16, 185, 129, 0.45)"
            strokeWidth={1.5}
          />
        )}

        {/* Pin List (Recyclers, Collector Requests) */}
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
          /* Single Doorstep Pickup Marker */
          latitude && longitude && !centerPinMode ? (
            <Marker
              coordinate={{
                latitude,
                longitude,
              }}
              draggable={draggable}
              onDragEnd={(e) => {
                const coord = e.nativeEvent?.coordinate;
                if (coord) {
                  if (onLocationSelectWithAccuracy) {
                    onLocationSelectWithAccuracy(coord.latitude, coord.longitude, null);
                  } else if (onLocationChange) {
                    onLocationChange(coord.latitude, coord.longitude);
                  }
                }
              }}
              title={pinTitle || t('citizen.submit.selectedLocation') || 'Selected Pickup Location'}
              description={pinDescription || t('citizen.submit.movePin') || 'Drag this marker or tap to adjust exact pickup point'}
              accessibilityLabel="Pickup location pin. Draggable to adjust location."
            >
              {/* Custom Emerald Pickup Pin (Visually Distinct from User Location) */}
              <View style={styles.customPickupMarker}>
                <View style={styles.markerHalo} />
                <View style={styles.markerTeardrop}>
                  <AppIcon name="recycle" size={18} color="#FFFFFF" />
                </View>
                <View style={styles.markerBaseDot} />
              </View>
            </Marker>
          ) : null
        )}
      </MapView>

      {/* Center-Pin Fixed Target Overlay */}
      {centerPinMode && (
        <View style={styles.centerPinFixedContainer} pointerEvents="none">
          <View style={styles.markerHalo} />
          <View style={styles.markerTeardrop}>
            <AppIcon name="location" size={18} color="#FFFFFF" />
          </View>
          <View style={styles.markerBaseDot} />
        </View>
      )}

      {/* Floating Search Bar (Optional) */}
      {showSearch && (
        <View style={styles.searchBarContainer}>
          <View style={styles.searchBarRow}>
            <AppIcon name="search" size={16} color="rgba(255, 255, 255, 0.45)" style={{ marginRight: 6 }} />
            <TextInput
              style={styles.searchInput}
              placeholder={t('location.searchLocation') || 'Search location or landmark...'}
              placeholderTextColor="rgba(255, 255, 255, 0.45)"
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                if (!text.trim()) setShowResultsDropdown(false);
              }}
              onSubmitEditing={handleSearchSubmit}
              returnKeyType="search"
            />
            {isSearching ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 6 }} />
            ) : searchQuery.length > 0 ? (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('');
                  setShowResultsDropdown(false);
                }}
                style={styles.searchClearBtn}
              >
                <AppIcon name="close" size={14} color="rgba(255, 255, 255, 0.65)" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Search Results Dropdown */}
          {showResultsDropdown && searchResults.length > 0 && (
            <View style={styles.searchResultsDropdown}>
              {searchResults.map((res, idx) => (
                <TouchableOpacity
                  key={`sr-${idx}`}
                  style={styles.searchResultItem}
                  onPress={() => handleSelectSearchResult(res)}
                  activeOpacity={0.7}
                >
                  <View style={styles.searchResultRow}>
                    <AppIcon name="location" size={12} color="#34D399" />
                    <Text style={styles.searchResultTitle} numberOfLines={1}>
                      {res.title}
                    </Text>
                  </View>
                  <Text style={styles.searchResultAddress} numberOfLines={1}>
                    {res.formattedAddress}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Floating Header Interaction Hint */}
      {!hasPins && draggable && Boolean(latitude && longitude) && !showSearch && (
        <View style={styles.hintContainer} pointerEvents="none">
          <View style={styles.hintRow}>
            <AppIcon name="location" size={12} color="#34D399" />
            <Text style={styles.hintText}>
              {t('citizen.submit.movePin') || 'Tap map or drag pin to adjust doorstep'}
            </Text>
          </View>
        </View>
      )}

      {/* Floating Privacy Protected Hint for Collector Markers */}
      {hasPins && (
        <View style={styles.hintContainer} pointerEvents="none">
          <View style={styles.hintRow}>
            <AppIcon name="shield" size={12} color="#34D399" />
            <Text style={styles.hintText}>
              {t('collector.browse.privacyProtected') || 'Approximate Areas · Privacy Protected'}
            </Text>
          </View>
        </View>
      )}

      {/* Floating HUD Control Stack (Map Type, My Location, Zoom, Recenter) */}
      <View style={[styles.floatingControlsStack, { top: controlsTopOffset }]}>
        {/* Map Type Capsule Button */}
        {showMapTypeControl && (
          <TouchableOpacity
            style={styles.glassControlBtn}
            onPress={() => setShowTypeMenu(true)}
            accessibilityRole="button"
            accessibilityLabel={`${t('location.mapType') || 'Map Type'}: ${activeMapType}`}
            activeOpacity={0.8}
          >
            <AppIcon name="globe" size={18} color="#FFFFFF" />
            <Text style={styles.glassControlSubtext}>
              {activeMapType === 'satellite' ? 'SAT' : activeMapType === 'terrain' ? 'TER' : 'MAP'}
            </Text>
          </TouchableOpacity>
        )}

        {/* My Location Button */}
        {showMyLocationButton && (
          <TouchableOpacity
            style={[styles.glassControlBtn, isLocatingUser && styles.glassControlBtnActive]}
            onPress={handleMyLocationPress}
            disabled={isLocatingUser}
            accessibilityRole="button"
            accessibilityLabel={t('location.useMyLocation') || 'My Location'}
            activeOpacity={0.8}
          >
            {isLocatingUser ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <AppIcon name="location" size={18} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        )}

        {/* Zoom Controls */}
        {showZoomControls && (
          <View style={styles.zoomControlsContainer}>
            <TouchableOpacity
              style={styles.zoomButton}
              onPress={handleZoomIn}
              accessibilityRole="button"
              accessibilityLabel={t('location.zoomIn') || 'Zoom In'}
              activeOpacity={0.8}
            >
              <Text style={styles.zoomButtonText}>+</Text>
            </TouchableOpacity>
            <View style={styles.zoomDivider} />
            <TouchableOpacity
              style={styles.zoomButton}
              onPress={handleZoomOut}
              accessibilityRole="button"
              accessibilityLabel={t('location.zoomOut') || 'Zoom Out'}
              activeOpacity={0.8}
            >
              <Text style={styles.zoomButtonText}>−</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Recenter Button */}
        {showRecenterButton && Boolean(latitude && longitude) && (
          <TouchableOpacity
            style={styles.glassControlBtn}
            onPress={handleRecenter}
            accessibilityRole="button"
            accessibilityLabel={t('location.recenter') || 'Recenter Map'}
            activeOpacity={0.8}
          >
            <AppIcon name="refresh" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Floating Coordinate / Accuracy Pill (Shown only for single doorstep selection) */}
      {!hasPins && showCoordinatesPill && (
        <View style={styles.coordsPill} pointerEvents="none">
          <Text style={styles.coordsPillText}>
            {latitude && longitude
              ? `${t('citizen.submit.latitude') || 'Lat'}: ${latitude.toFixed(5)}  |  ${t('citizen.submit.longitude') || 'Lng'}: ${longitude.toFixed(5)}${accuracy ? `  (±${Math.round(accuracy)}m)` : ''}`
              : (t('citizen.submit.locUnavailable') || 'Location pending — Tap Use Location')}
          </Text>
        </View>
      )}

      {/* Map Type Switcher Glass Modal Sheet */}
      <Modal
        visible={showTypeMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTypeMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowTypeMenu(false)}
        >
          <View style={styles.mapTypeCard}>
            <View style={styles.mapTypeHeader}>
              <View style={styles.mapTypeHeaderRow}>
                <AppIcon name="globe" size={18} color="#FFFFFF" />
                <Text style={styles.mapTypeHeaderTitle}>
                  {t('location.mapType') || 'Select Map View'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowTypeMenu(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <AppIcon name="close" size={16} color="rgba(255, 255, 255, 0.65)" />
              </TouchableOpacity>
            </View>

            {/* Standard Mode */}
            <TouchableOpacity
              style={[styles.mapTypeOption, activeMapType === 'standard' && styles.mapTypeOptionActive]}
              onPress={() => handleSelectMapType('standard')}
              activeOpacity={0.7}
            >
              <View style={styles.mapTypeIconWrap}>
                <AppIcon name="globe" size={20} color={activeMapType === 'standard' ? '#34D399' : 'rgba(255,255,255,0.7)'} />
              </View>
              <View style={styles.mapTypeOptionTextCol}>
                <Text style={[styles.mapTypeOptionTitle, activeMapType === 'standard' && styles.mapTypeTextActive]}>
                  {t('location.standard') || 'Standard'}
                </Text>
                <Text style={styles.mapTypeOptionSub}>Clean vector map with streets and labels</Text>
              </View>
              <Text style={styles.mapTypeRadio}>
                {activeMapType === 'standard' ? '●' : '○'}
              </Text>
            </TouchableOpacity>

            {/* Satellite Mode */}
            <TouchableOpacity
              style={[styles.mapTypeOption, activeMapType === 'satellite' && styles.mapTypeOptionActive]}
              onPress={() => handleSelectMapType('satellite')}
              activeOpacity={0.7}
            >
              <View style={styles.mapTypeIconWrap}>
                <AppIcon name="sparkles" size={20} color={activeMapType === 'satellite' ? '#34D399' : 'rgba(255,255,255,0.7)'} />
              </View>
              <View style={styles.mapTypeOptionTextCol}>
                <Text style={[styles.mapTypeOptionTitle, activeMapType === 'satellite' && styles.mapTypeTextActive]}>
                  {t('location.satellite') || 'Satellite'}
                </Text>
                <Text style={styles.mapTypeOptionSub}>High-resolution aerial satellite imagery</Text>
              </View>
              <Text style={styles.mapTypeRadio}>
                {activeMapType === 'satellite' ? '●' : '○'}
              </Text>
            </TouchableOpacity>

            {/* Terrain Mode */}
            <TouchableOpacity
              style={[styles.mapTypeOption, activeMapType === 'terrain' && styles.mapTypeOptionActive]}
              onPress={() => handleSelectMapType('terrain')}
              activeOpacity={0.7}
            >
              <View style={styles.mapTypeIconWrap}>
                <AppIcon name="grid" size={20} color={activeMapType === 'terrain' ? '#34D399' : 'rgba(255,255,255,0.7)'} />
              </View>
              <View style={styles.mapTypeOptionTextCol}>
                <Text style={[styles.mapTypeOptionTitle, activeMapType === 'terrain' && styles.mapTypeTextActive]}>
                  {t('location.terrain') || 'Terrain'}
                </Text>
                <Text style={styles.mapTypeOptionSub}>Topographic contour lines and elevations</Text>
              </View>
              <Text style={styles.mapTypeRadio}>
                {activeMapType === 'terrain' ? '●' : '○'}
              </Text>
            </TouchableOpacity>

            {/* Hybrid Mode */}
            <TouchableOpacity
              style={[styles.mapTypeOption, activeMapType === 'hybrid' && styles.mapTypeOptionActive]}
              onPress={() => handleSelectMapType('hybrid')}
              activeOpacity={0.7}
            >
              <View style={styles.mapTypeIconWrap}>
                <AppIcon name="factory" size={20} color={activeMapType === 'hybrid' ? '#34D399' : 'rgba(255,255,255,0.7)'} />
              </View>
              <View style={styles.mapTypeOptionTextCol}>
                <Text style={[styles.mapTypeOptionTitle, activeMapType === 'hybrid' && styles.mapTypeTextActive]}>
                  {t('location.hybrid') || 'Hybrid'}
                </Text>
                <Text style={styles.mapTypeOptionSub}>Satellite imagery with road and landmark overlays</Text>
              </View>
              <Text style={styles.mapTypeRadio}>
                {activeMapType === 'hybrid' ? '●' : '○'}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

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
    height: 280,
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.backgroundBase,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    position: 'relative',
    marginVertical: spacing.spaceSm,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },

  // ── Custom Emerald Pickup Marker ──
  customPickupMarker: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 56,
  },
  markerHalo: {
    position: 'absolute',
    bottom: 2,
    width: 22,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  markerTeardrop: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10B981',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 6,
  },
  markerTeardropIcon: {
    fontSize: 18,
  },
  markerBaseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#34D399',
    marginTop: 2,
  },

  centerPinFixedContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -24,
    marginTop: -48,
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 56,
  },

  // ── Floating Search Bar ──
  searchBarContainer: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 68,
    zIndex: 20,
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(6, 21, 27, 0.90)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    minHeight: 44,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#FFFFFF',
    paddingVertical: 6,
  },
  searchClearBtn: {
    padding: 6,
  },
  searchClearText: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 14,
    fontWeight: '700',
  },
  searchResultsDropdown: {
    marginTop: 4,
    backgroundColor: 'rgba(6, 21, 27, 0.95)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  searchResultItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  searchResultTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#34D399',
    flex: 1,
  },
  searchResultAddress: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.70)',
    marginTop: 2,
  },

  // ── Floating Controls Stack ──
  floatingControlsStack: {
    position: 'absolute',
    top: 10,
    right: 10,
    gap: 8,
    alignItems: 'center',
    zIndex: 10,
  },
  glassControlBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(6, 21, 27, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  glassControlBtnActive: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.20)',
  },
  glassControlIcon: {
    fontSize: 18,
  },
  glassControlSubtext: {
    fontSize: 8,
    fontWeight: '800',
    color: '#34D399',
    marginTop: -2,
    letterSpacing: 0.5,
  },

  // ── Zoom Controls Column ──
  zoomControlsContainer: {
    width: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(6, 21, 27, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  zoomButton: {
    width: 48,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  zoomDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    width: '80%',
    alignSelf: 'center',
  },

  // ── Hints & Badges ──
  hintContainer: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    backgroundColor: 'rgba(6, 21, 27, 0.88)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hintText: {
    fontSize: 11,
    color: '#34D399',
    fontWeight: '600',
  },
  coordsPill: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    backgroundColor: 'rgba(6, 21, 27, 0.90)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  coordsPillText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.90)',
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },

  // ── Modal Map Type Selector ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.70)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.spaceMd,
  },
  mapTypeCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: 'rgba(10, 36, 44, 0.96)',
    borderRadius: 20,
    padding: spacing.spaceMd,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
    gap: 8,
  },
  mapTypeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.10)',
    marginBottom: 4,
  },
  mapTypeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mapTypeHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  mapTypeClose: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.65)',
    fontWeight: '700',
    paddingHorizontal: 6,
  },
  mapTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  mapTypeOptionActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
    borderColor: '#10B981',
  },
  mapTypeIconWrap: {
    marginRight: 10,
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapTypeOptionTextCol: {
    flex: 1,
  },
  mapTypeOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  mapTypeTextActive: {
    color: '#34D399',
  },
  mapTypeOptionSub: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.60)',
    marginTop: 2,
  },
  mapTypeRadio: {
    fontSize: 16,
    fontWeight: '800',
    color: '#10B981',
    marginLeft: 8,
  },

  // ── Fallbacks ──
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(6, 21, 27, 0.75)',
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
  fallbackIconWrap: {
    marginBottom: spacing.spaceXs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackTitle: {
    fontSize: typography.Title.fontSize,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  fallbackSubtitle: {
    fontSize: typography.Caption.fontSize,
    color: 'rgba(255, 255, 255, 0.65)',
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
    backgroundColor: 'rgba(6, 21, 27, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    marginTop: spacing.spaceXs,
  },
  coordsText: {
    fontSize: typography.Caption.fontSize,
    color: '#34D399',
    fontVariant: ['tabular-nums'],
  },
});

export default EcoSetuMap;
