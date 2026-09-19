/**
 * locationService.ts
 * Scoped, on-demand device location and runtime permission service for EcoSetu.
 *
 * PRIVACY & LIFECYCLE INVARIANTS:
 * - NO background location.
 * - NO location tracking or history.
 * - NO startup/login/onboarding permission requests.
 * - NO hardcoded default city / Delhi coordinates.
 * - Only requested when the user triggers location or opens the pickup map.
 */

import { Platform, PermissionsAndroid, NativeModules } from 'react-native';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number | null;
}

export interface LocationResult {
  success: boolean;
  coords?: LocationCoordinates;
  error?: 'PERMISSION_DENIED' | 'LOCATION_UNAVAILABLE' | 'TIMEOUT' | 'UNKNOWN';
  message?: string;
}

/**
 * Check if fine location permission is currently granted.
 * Does NOT prompt the user.
 */
export async function checkLocationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }
  try {
    return await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
    );
  } catch (err) {
    console.warn('[locationService] Failed to check permission:', err);
    return false;
  }
}

/**
 * Request runtime location permission when citizen triggers location.
 * Does NOT run on app startup, login, or dashboard load.
 */
export async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }

  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'EcoSetu Pickup Location',
        message:
          'EcoSetu uses your location to place the e-waste pickup pin on the map. You can always adjust the pin manually.',
        buttonNeutral: 'Ask Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'Allow',
      }
    );

    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    console.warn('[locationService] Permission request error:', err);
    return false;
  }
}

/**
 * One-shot fetch of the device's current location.
 * Uses native EcoSetuLocation module on Android, falling back to Geolocation API if polyfilled.
 * Zero hardcoded Delhi or default city coordinates.
 */
export async function getCurrentLocation(): Promise<LocationResult> {
  const hasPermission = await checkLocationPermission();
  if (!hasPermission) {
    const requested = await requestLocationPermission();
    if (!requested) {
      return {
        success: false,
        error: 'PERMISSION_DENIED',
        message: 'Location permission was denied.',
      };
    }
  }

  // 1. First priority: Native Android LocationManager module
  const { EcoSetuLocation } = NativeModules;
  if (EcoSetuLocation && typeof EcoSetuLocation.getCurrentLocation === 'function') {
    try {
      const coords = await EcoSetuLocation.getCurrentLocation();
      if (
        coords &&
        typeof coords.latitude === 'number' &&
        typeof coords.longitude === 'number' &&
        !isNaN(coords.latitude) &&
        !isNaN(coords.longitude)
      ) {
        return {
          success: true,
          coords: {
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy ?? null,
          },
        };
      }
    } catch (nativeErr: any) {
      const code = nativeErr?.code;
      if (code === 'PERMISSION_DENIED') {
        return {
          success: false,
          error: 'PERMISSION_DENIED',
          message: 'Location permission was denied.',
        };
      }
      if (code === 'TIMEOUT') {
        return {
          success: false,
          error: 'TIMEOUT',
          message: 'Location request timed out. Please drag the pin manually or retry.',
        };
      }
      console.warn('[locationService] EcoSetuLocation native module notice:', nativeErr?.message || nativeErr);
    }
  }

  // 2. Second priority: Geolocation API (browser / polyfill if present)
  const geo = typeof navigator !== 'undefined' ? (navigator as any).geolocation : null;
  if (geo && typeof geo.getCurrentPosition === 'function') {
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        resolve({
          success: false,
          error: 'TIMEOUT',
          message: 'Location request timed out. Please drag the pin manually or retry.',
        });
      }, 10000);

      geo.getCurrentPosition(
        (position: any) => {
          clearTimeout(timeoutId);
          resolve({
            success: true,
            coords: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy ?? null,
            },
          });
        },
        (err: any) => {
          clearTimeout(timeoutId);
          console.warn('[locationService] getCurrentPosition error:', err?.message || err);
          resolve({
            success: false,
            error: 'LOCATION_UNAVAILABLE',
            message: err?.message || 'Unable to retrieve current location.',
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000,
        }
      );
    });
  }

  // 3. If hardware location is unavailable, return explicit failure — NEVER return Delhi
  return {
    success: false,
    error: 'LOCATION_UNAVAILABLE',
    message: 'Current location unavailable. Please drag the pin on the map or retry.',
  };
}

export interface ResolvedAddress {
  houseNumber: string;
  street: string;
  landmark: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  formattedAddress: string;
}

// In-memory cache for reverse geocoding to prevent repeat requests
const addressCache = new Map<string, ResolvedAddress>();
let lastNominatimRequestTime = 0;

/**
 * Reverse geocodes coordinates to a human-readable structured address.
 * 1. Checks in-memory coordinate cache.
 * 2. Attempts native Android Geocoder via EcoSetuLocation.
 * 3. Falls back to OpenStreetMap Nominatim with strict 1s debounce and user-agent.
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<ResolvedAddress | null> {
  if (isNaN(latitude) || isNaN(longitude)) return null;

  const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
  if (addressCache.has(cacheKey)) {
    return addressCache.get(cacheKey)!;
  }

  // 1. Try Native Android Geocoder
  const { EcoSetuLocation } = NativeModules;
  if (EcoSetuLocation && typeof EcoSetuLocation.reverseGeocode === 'function') {
    try {
      const result = await EcoSetuLocation.reverseGeocode(latitude, longitude);
      if (result && (result.city || result.state || result.formattedAddress || result.street)) {
        const resolved: ResolvedAddress = {
          houseNumber: result.houseNumber || '',
          street: result.street || '',
          landmark: result.landmark || '',
          city: result.city || '',
          district: result.district || '',
          state: result.state || '',
          pincode: result.pincode || '',
          formattedAddress: result.formattedAddress || '',
        };
        addressCache.set(cacheKey, resolved);
        return resolved;
      }
    } catch (nativeErr) {
      console.warn('[locationService] Native reverseGeocode warning:', nativeErr);
    }
  }

  // 2. Fallback: OpenStreetMap Nominatim with strict 1s rate limiting
  try {
    const now = Date.now();
    const elapsed = now - lastNominatimRequestTime;
    if (elapsed < 1000) {
      await new Promise((r) => setTimeout(r, 1000 - elapsed));
    }
    lastNominatimRequestTime = Date.now();

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
      {
        headers: {
          'User-Agent': 'EcoSetu-Ewaste-Management/1.0 (contact@ecosetu.in)',
          Accept: 'application/json',
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      const addr = data.address || {};
      const resolved: ResolvedAddress = {
        houseNumber: addr.house_number || addr.building || '',
        street: addr.road || addr.street || addr.neighbourhood || '',
        landmark: addr.suburb || addr.neighbourhood || '',
        city: addr.city || addr.town || addr.village || addr.suburb || '',
        district: addr.state_district || addr.county || '',
        state: addr.state || '',
        pincode: addr.postcode || '',
        formattedAddress: data.display_name || '',
      };
      addressCache.set(cacheKey, resolved);
      return resolved;
    }
  } catch (osmErr) {
    console.warn('[locationService] Nominatim fallback failed:', osmErr);
  }

  return null;
}
