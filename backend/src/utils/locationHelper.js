// EcoSetu Location Utilities (Haversine distance calculation)
// Canonical Reference: docs/10_BACKEND_ARCHITECTURE.md Section 2

/**
 * Calculates the great-circle distance between two geographic coordinates using the Haversine formula
 * @param {number} lat1 - Latitude of point 1 in degrees
 * @param {number} lon1 - Longitude of point 1 in degrees
 * @param {number} lat2 - Latitude of point 2 in degrees
 * @param {number} lon2 - Longitude of point 2 in degrees
 * @returns {number} Distance in kilometers
 */
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const p1Lat = parseFloat(lat1);
  const p1Lon = parseFloat(lon1);
  const p2Lat = parseFloat(lat2);
  const p2Lon = parseFloat(lon2);

  if (isNaN(p1Lat) || isNaN(p1Lon) || isNaN(p2Lat) || isNaN(p2Lon)) {
    return Infinity;
  }

  const R = 6371; // Earth's mean radius in km
  const dLat = ((p2Lat - p1Lat) * Math.PI) / 180;
  const dLon = ((p2Lon - p1Lon) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1Lat * Math.PI) / 180) *
      Math.cos((p2Lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Validates whether latitude and longitude are within legitimate geographic ranges.
 * @param {number|string} lat - Latitude (-90 to 90)
 * @param {number|string} lng - Longitude (-180 to 180)
 * @returns {boolean}
 */
function isValidCoordinate(lat, lng) {
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return false;
  }
  const parsedLat = parseFloat(lat);
  const parsedLng = parseFloat(lng);
  if (isNaN(parsedLat) || isNaN(parsedLng)) {
    return false;
  }
  return parsedLat >= -90 && parsedLat <= 90 && parsedLng >= -180 && parsedLng <= 180;
}

/**
 * Validates Indian postal PIN code format: 6 digits, first digit 1-9.
 * @param {string} pincode
 * @returns {boolean}
 */
function isValidIndianPin(pincode) {
  if (!pincode || typeof pincode !== 'string') return false;
  return /^[1-9][0-9]{5}$/.test(pincode.trim());
}

/**
 * Applies privacy masking to geographic coordinates by truncating precision.
 * 2 decimal places provides ~1.1 km neighborhood-level approximation.
 * @param {number|string} lat
 * @param {number|string} lng
 * @param {number} [decimals=2]
 * @returns {{ maskedLat: number|null, maskedLng: number|null }}
 */
function maskCoordinates(lat, lng, decimals = 2) {
  const parsedLat = parseFloat(lat);
  const parsedLng = parseFloat(lng);
  if (isNaN(parsedLat) || isNaN(parsedLng)) {
    return { maskedLat: null, maskedLng: null };
  }
  const factor = Math.pow(10, decimals);
  return {
    maskedLat: Math.round(parsedLat * factor) / factor,
    maskedLng: Math.round(parsedLng * factor) / factor,
  };
}

/**
 * Formats a canonical human-readable address from structured components.
 * @param {object} components
 * @returns {string}
 */
function formatAddress({ houseNumber, street, landmark, city, district, state, pincode, pickupAddress } = {}) {
  const parts = [];
  if (houseNumber && houseNumber.trim()) parts.push(houseNumber.trim());
  if (street && street.trim()) parts.push(street.trim());
  if (landmark && landmark.trim()) parts.push(`Near ${landmark.trim()}`);
  if (city && city.trim()) parts.push(city.trim());
  if (district && district.trim() && district.trim().toLowerCase() !== city?.trim().toLowerCase()) {
    parts.push(district.trim());
  }
  if (state && state.trim()) parts.push(state.trim());
  if (pincode && pincode.trim()) parts.push(pincode.trim());

  if (parts.length > 0) {
    return parts.join(', ');
  }
  return pickupAddress ? pickupAddress.trim() : '';
}

module.exports = {
  calculateDistanceKm,
  isValidCoordinate,
  isValidIndianPin,
  maskCoordinates,
  formatAddress,
};
