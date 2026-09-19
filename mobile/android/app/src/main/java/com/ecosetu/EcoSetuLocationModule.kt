package com.ecosetu

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * EcoSetuLocationModule
 * Native Android LocationManager bridge.
 * Reads device GPS/Network location directly without external Google Play Services dependencies.
 * Respects runtime permissions and zero background tracking policies.
 */
class EcoSetuLocationModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "EcoSetuLocation"

    @ReactMethod
    fun getCurrentLocation(promise: Promise) {
        val finePerm = ContextCompat.checkSelfPermission(
            reactContext,
            Manifest.permission.ACCESS_FINE_LOCATION
        )
        val coarsePerm = ContextCompat.checkSelfPermission(
            reactContext,
            Manifest.permission.ACCESS_COARSE_LOCATION
        )

        if (finePerm != PackageManager.PERMISSION_GRANTED && coarsePerm != PackageManager.PERMISSION_GRANTED) {
            promise.reject("PERMISSION_DENIED", "Location permission is not granted.")
            return
        }

        val locationManager = reactContext.getSystemService(Context.LOCATION_SERVICE) as? LocationManager
        if (locationManager == null) {
            promise.reject("UNAVAILABLE", "LocationManager service is not available.")
            return
        }

        val isGpsEnabled = locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)
        val isNetworkEnabled = locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)

        if (!isGpsEnabled && !isNetworkEnabled) {
            promise.reject("LOCATION_DISABLED", "Location services are turned off on this device.")
            return
        }

        // Try getting last known location first for immediate responsiveness
        var bestLocation: Location? = null
        if (isGpsEnabled) {
            try {
                val loc = locationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER)
                if (loc != null) bestLocation = loc
            } catch (ignored: SecurityException) {}
        }
        if (bestLocation == null && isNetworkEnabled) {
            try {
                val loc = locationManager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER)
                if (loc != null) bestLocation = loc
            } catch (ignored: SecurityException) {}
        }

        // If last known location exists and is relatively fresh (within 5 minutes), return it immediately
        if (bestLocation != null && (System.currentTimeMillis() - bestLocation.time) < 300000) {
            val map = Arguments.createMap().apply {
                putDouble("latitude", bestLocation.latitude)
                putDouble("longitude", bestLocation.longitude)
                putDouble("accuracy", bestLocation.accuracy.toDouble())
            }
            promise.resolve(map)
            return
        }

        // Otherwise request a single fresh location update
        val provider = if (isGpsEnabled) LocationManager.GPS_PROVIDER else LocationManager.NETWORK_PROVIDER
        val mainHandler = Handler(Looper.getMainLooper())
        var isResolved = false

        val listener = object : LocationListener {
            override fun onLocationChanged(location: Location) {
                if (isResolved) return
                isResolved = true
                try {
                    locationManager.removeUpdates(this)
                } catch (ignored: Exception) {}

                val map = Arguments.createMap().apply {
                    putDouble("latitude", location.latitude)
                    putDouble("longitude", location.longitude)
                    putDouble("accuracy", location.accuracy.toDouble())
                }
                promise.resolve(map)
            }
            override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
            override fun onProviderEnabled(provider: String) {}
            override fun onProviderDisabled(provider: String) {}
        }

        try {
            locationManager.requestSingleUpdate(provider, listener, Looper.getMainLooper())

            // 10 second timeout
            mainHandler.postDelayed({
                if (!isResolved) {
                    isResolved = true
                    try {
                        locationManager.removeUpdates(listener)
                    } catch (ignored: Exception) {}

                    if (bestLocation != null) {
                        val map = Arguments.createMap().apply {
                            putDouble("latitude", bestLocation.latitude)
                            putDouble("longitude", bestLocation.longitude)
                            putDouble("accuracy", bestLocation.accuracy.toDouble())
                        }
                        promise.resolve(map)
                    } else {
                        promise.reject("TIMEOUT", "Location request timed out. Please drag the pin manually.")
                    }
                }
            }, 10000)
        } catch (e: Exception) {
            if (bestLocation != null) {
                val map = Arguments.createMap().apply {
                    putDouble("latitude", bestLocation.latitude)
                    putDouble("longitude", bestLocation.longitude)
                    putDouble("accuracy", bestLocation.accuracy.toDouble())
                }
                promise.resolve(map)
            } else {
                promise.reject("LOCATION_UNAVAILABLE", e.message ?: "Could not request location update.")
            }
        }
    }

    @ReactMethod
    fun reverseGeocode(latitude: Double, longitude: Double, promise: Promise) {
        Thread {
            try {
                if (!android.location.Geocoder.isPresent()) {
                    promise.reject("GEOCODER_UNAVAILABLE", "Geocoder service is not present.")
                    return@Thread
                }

                val geocoder = android.location.Geocoder(reactContext, java.util.Locale.getDefault())
                val addresses = geocoder.getFromLocation(latitude, longitude, 1)

                if (addresses != null && addresses.isNotEmpty()) {
                    val addr = addresses[0]
                    val map = Arguments.createMap().apply {
                        putString("houseNumber", addr.subThoroughfare ?: addr.featureName ?: "")
                        putString("street", addr.thoroughfare ?: "")
                        putString("landmark", addr.subLocality ?: "")
                        putString("city", addr.locality ?: addr.subAdminArea ?: "")
                        putString("district", addr.subAdminArea ?: addr.locality ?: "")
                        putString("state", addr.adminArea ?: "")
                        putString("pincode", addr.postalCode ?: "")
                        putString("formattedAddress", if (addr.maxAddressLineIndex >= 0) addr.getAddressLine(0) else "")
                    }
                    promise.resolve(map)
                } else {
                    promise.reject("NO_ADDRESS", "No address found for these coordinates.")
                }
            } catch (e: Exception) {
                promise.reject("GEOCODE_ERROR", e.message ?: "Reverse geocoding failed.")
            }
        }.start()
    }

    @ReactMethod
    fun searchLocations(query: String, promise: Promise) {
        if (query.trim().isEmpty()) {
            promise.resolve(Arguments.createArray())
            return
        }

        Thread {
            try {
                if (!android.location.Geocoder.isPresent()) {
                    promise.reject("GEOCODER_UNAVAILABLE", "Geocoder service is not present.")
                    return@Thread
                }

                val geocoder = android.location.Geocoder(reactContext, java.util.Locale.getDefault())
                val addresses = geocoder.getFromLocationName(query, 5)

                val array = Arguments.createArray()
                if (addresses != null) {
                    for (addr in addresses) {
                        val map = Arguments.createMap().apply {
                            putDouble("latitude", addr.latitude)
                            putDouble("longitude", addr.longitude)
                            putString("title", addr.featureName ?: addr.thoroughfare ?: query)
                            putString(
                                "formattedAddress",
                                if (addr.maxAddressLineIndex >= 0) addr.getAddressLine(0) else (addr.featureName ?: "")
                            )
                            putString("city", addr.locality ?: addr.subAdminArea ?: "")
                            putString("state", addr.adminArea ?: "")
                            putString("pincode", addr.postalCode ?: "")
                        }
                        array.pushMap(map)
                    }
                }
                promise.resolve(array)
            } catch (e: Exception) {
                promise.reject("SEARCH_ERROR", e.message ?: "Location search failed.")
            }
        }.start()
    }
}
