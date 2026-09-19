package com.ecosetu

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.BaseActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * EcoSetuSpeechModule
 * Native Android Speech-to-Text bridge for ECOSETU Informal Collector voice commands.
 *
 * Architecture & Safety:
 * - On-device, user-initiated speech recognition via standard Android RecognizerIntent.
 * - Zero background listening, zero continuous recording, zero always-on wake word.
 * - Zero raw audio recordings stored or uploaded to server.
 * - Only recognized string transcripts are transiently processed in memory.
 * - Multi-language support matching ECOSETU application language (en, hi, mr, or).
 * - Safe cancel/error handling with normalized state codes.
 */
class EcoSetuSpeechModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var activePromise: Promise? = null
    private val SPEECH_REQUEST_CODE = 9241

    private val activityEventListener: ActivityEventListener = object : BaseActivityEventListener() {
        override fun onActivityResult(
            activity: Activity?,
            requestCode: Int,
            resultCode: Int,
            data: Intent?
        ) {
            if (requestCode == SPEECH_REQUEST_CODE) {
                val promise = activePromise
                activePromise = null
                if (promise == null) return

                if (resultCode == Activity.RESULT_OK && data != null) {
                    val matches = data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)
                    if (matches != null && matches.isNotEmpty()) {
                        val array = Arguments.createArray()
                        for (text in matches) {
                            array.pushString(text)
                        }
                        promise.resolve(array)
                    } else {
                        promise.reject("NO_SPEECH", "No speech detected")
                    }
                } else if (resultCode == Activity.RESULT_CANCELED) {
                    promise.reject("NO_SPEECH", "Speech recognition was cancelled")
                } else {
                    promise.reject("ERROR", "Speech recognition failed with code: $resultCode")
                }
            }
        }
    }

    init {
        reactContext.addActivityEventListener(activityEventListener)
    }

    override fun getName(): String {
        return "EcoSetuSpeech"
    }

    @ReactMethod
    fun isRecognitionAvailable(promise: Promise) {
        try {
            val isAvailable = SpeechRecognizer.isRecognitionAvailable(reactContext)
            promise.resolve(isAvailable)
        } catch (e: Exception) {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun startListening(language: String, promise: Promise) {
        val currentActivity = currentActivity
        if (currentActivity == null) {
            promise.reject("UNAVAILABLE", "Activity not available")
            return
        }

        if (activePromise != null) {
            promise.reject("ALREADY_ACTIVE", "A voice recognition session is already in progress")
            return
        }

        try {
            activePromise = promise
            val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                putExtra(
                    RecognizerIntent.EXTRA_LANGUAGE_MODEL,
                    RecognizerIntent.LANGUAGE_MODEL_FREE_FORM
                )
                val langTag = when (language.lowercase()) {
                    "hi" -> "hi-IN"
                    "mr" -> "mr-IN"
                    "or" -> "or-IN"
                    else -> "en-IN"
                }
                putExtra(RecognizerIntent.EXTRA_LANGUAGE, langTag)
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, langTag)
                putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 5)
                putExtra(RecognizerIntent.EXTRA_PROMPT, "EcoSetu Voice Command")
            }
            currentActivity.startActivityForResult(intent, SPEECH_REQUEST_CODE)
        } catch (e: Exception) {
            activePromise = null
            promise.reject("UNAVAILABLE", e.message ?: "Failed to start speech recognition")
        }
    }

    @ReactMethod
    fun stopListening(promise: Promise) {
        activePromise = null
        promise.resolve(true)
    }
}
