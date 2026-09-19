package com.ecosetu

import android.speech.tts.TextToSpeech
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.util.Locale

/**
 * EcoSetuTTSModule
 * Native Android Text-to-Speech bridge for ECOSETU accessibility voice assistance.
 *
 * Provides on-device, offline-capable speech output using native android.speech.tts.TextToSpeech.
 * Zero cloud dependencies, zero audio recording, zero microphone access.
 */
class EcoSetuTTSModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), TextToSpeech.OnInitListener {

    private var tts: TextToSpeech? = null
    private var isInitialized = false

    init {
        try {
            tts = TextToSpeech(reactContext, this)
        } catch (e: Exception) {
            isInitialized = false
        }
    }

    override fun getName(): String {
        return "EcoSetuTTS"
    }

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            isInitialized = true
        } else {
            isInitialized = false
        }
    }

    @ReactMethod
    fun speak(text: String, langCode: String, promise: Promise) {
        try {
            if (!isInitialized || tts == null) {
                promise.resolve(false)
                return
            }

            val locale = when (langCode.lowercase()) {
                "hi" -> Locale("hi", "IN")
                "mr" -> Locale("mr", "IN")
                "or" -> Locale("or", "IN")
                else -> Locale("en", "IN")
            }

            tts?.language = locale
            tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "EcoSetuTTS_${System.currentTimeMillis()}")
            promise.resolve(true)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun stop(promise: Promise) {
        try {
            tts?.stop()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun isAvailable(promise: Promise) {
        promise.resolve(isInitialized && tts != null)
    }

    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        try {
            tts?.stop()
            tts?.shutdown()
        } catch (e: Exception) {
            // Ignore teardown exceptions
        }
    }
}
